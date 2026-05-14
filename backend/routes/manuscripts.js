const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const PDFDocument = require('pdfkit');
const fetch = require('node-fetch');

const KNOWN_GENRES = [
  'fiction', 'non-fiction', 'mystery', 'thriller', 'romance', 'science fiction',
  'fantasy', 'horror', 'biography', 'autobiography', 'history', 'self-help',
  'business', 'children', 'young adult', 'literary fiction', 'historical fiction',
  'crime', 'adventure', 'poetry', 'drama', 'comedy', 'memoir', 'travel',
  'science', 'technology', 'philosophy', 'religion', 'health', 'cooking'
];

const manuscriptValidationRules = [
  body('title').notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title must be 200 characters or fewer'),
  body('word_count').isInt({ min: 1 }).withMessage('word_count must be a positive integer'),
  body('genre').notEmpty().withMessage('Genre is required').custom((val) => {
    if (!KNOWN_GENRES.includes((val || '').toLowerCase())) {
      throw new Error(`Genre must be one of: ${KNOWN_GENRES.join(', ')}`);
    }
    return true;
  }),
];

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

// Manuscript status state machine
const STATUS_TRANSITIONS = {
  draft: ['submitted'],
  submitted: ['under_review', 'draft'],
  under_review: ['accepted', 'rejected'],
  accepted: ['editing'],
  rejected: [],
  editing: ['production'],
  production: ['published'],
  published: [],
};

function isValidTransition(from, to) {
  const allowed = STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

// Get all manuscripts (paginated)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : null;
    const status = req.query.status || null;

    const whereParts = [];
    const params = [];
    if (search) { params.push(search); whereParts.push(`(title ILIKE $${params.length} OR author ILIKE $${params.length})`); }
    if (status) { params.push(status); whereParts.push(`status = $${params.length}`); }
    const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const countR = await pool.query(`SELECT COUNT(*) FROM manuscripts ${where}`, params);
    const total = parseInt(countR.rows[0].count);

    params.push(limit); params.push(offset);
    const result = await pool.query(
      `SELECT * FROM manuscripts ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    // Backwards compatible: if client did NOT pass pagination params, return raw array
    if (!req.query.page && !req.query.limit && !search && !status) {
      return res.json(result.rows);
    }
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single manuscript
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM manuscripts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create manuscript (with input validation)
router.post('/', authenticateToken, manuscriptValidationRules, handleValidationErrors, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { title, author, genre, word_count, synopsis, status, overall_score, plot_score, character_score, prose_score, market_score, ai_feedback } = req.body;
    const result = await pool.query(
      `INSERT INTO manuscripts (title, author, genre, word_count, synopsis, status, overall_score, plot_score, character_score, prose_score, market_score, ai_feedback)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [title, author, genre, word_count, synopsis, status || 'Under Review', overall_score || 0, plot_score || 0, character_score || 0, prose_score || 0, market_score || 0, ai_feedback || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update manuscript
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { title, author, genre, word_count, synopsis, status, overall_score, plot_score, character_score, prose_score, market_score, ai_feedback } = req.body;
    const result = await pool.query(
      `UPDATE manuscripts SET title=$1, author=$2, genre=$3, word_count=$4, synopsis=$5, status=$6, overall_score=$7, plot_score=$8, character_score=$9, prose_score=$10, market_score=$11, ai_feedback=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [title, author, genre, word_count, synopsis, status, overall_score, plot_score, character_score, prose_score, market_score, ai_feedback, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete manuscript
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('DELETE FROM manuscripts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/manuscripts/:id/status — status state machine
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { status: newStatus } = req.body;
    if (!newStatus) return res.status(400).json({ error: 'status is required' });
    if (!STATUS_TRANSITIONS.hasOwnProperty(newStatus)) {
      return res.status(400).json({ error: `Unknown status: ${newStatus}. Valid statuses: ${Object.keys(STATUS_TRANSITIONS).join(', ')}` });
    }

    const existing = await pool.query('SELECT * FROM manuscripts WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const currentStatus = existing.rows[0].status || 'draft';
    if (!isValidTransition(currentStatus, newStatus)) {
      return res.status(422).json({
        error: `Invalid transition: ${currentStatus} → ${newStatus}`,
        allowed_transitions: STATUS_TRANSITIONS[currentStatus] || [],
      });
    }

    // Ensure status_history column exists
    await pool.query(`
      ALTER TABLE manuscripts ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE manuscripts ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;
    `).catch(() => {});

    const historyEntry = { from: currentStatus, to: newStatus, at: new Date().toISOString(), by: req.user?.id };
    const result = await pool.query(
      `UPDATE manuscripts
       SET status = $1,
           status_history = COALESCE(status_history, '[]'::jsonb) || $2::jsonb,
           status_changed_at = NOW(),
           updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [newStatus, JSON.stringify(historyEntry), req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manuscripts/:id/royalty-projection
router.get('/:id/royalty-projection', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;

    // Ensure royalty_projections table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS royalty_projections (
        id SERIAL PRIMARY KEY,
        manuscript_id INTEGER NOT NULL,
        projection_data JSONB,
        ai_analysis TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const msResult = await pool.query('SELECT * FROM manuscripts WHERE id = $1', [req.params.id]);
    if (msResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const ms = msResult.rows[0];

    const fetch = require('node-fetch');
    const systemPrompt = `You are a publishing industry financial expert with 20 years of experience in royalty projections. Provide detailed, data-driven royalty forecasts. Always respond with valid JSON only, no markdown.`;
    const userPrompt = `Project 3-year royalties for this manuscript:
Title: ${ms.title}
Genre: ${ms.genre}
Word Count: ${ms.word_count}
Format: print, ebook, audiobook
Territory: worldwide

Return a JSON object with this exact structure:
{
  "year1": { "print": { "conservative": 0, "moderate": 0, "optimistic": 0 }, "ebook": { "conservative": 0, "moderate": 0, "optimistic": 0 }, "audio": { "conservative": 0, "moderate": 0, "optimistic": 0 } },
  "year2": { "print": { "conservative": 0, "moderate": 0, "optimistic": 0 }, "ebook": { "conservative": 0, "moderate": 0, "optimistic": 0 }, "audio": { "conservative": 0, "moderate": 0, "optimistic": 0 } },
  "year3": { "print": { "conservative": 0, "moderate": 0, "optimistic": 0 }, "ebook": { "conservative": 0, "moderate": 0, "optimistic": 0 }, "audio": { "conservative": 0, "moderate": 0, "optimistic": 0 } },
  "assumptions": "brief explanation of assumptions",
  "recommended_royalty_rate": { "print": "percentage", "ebook": "percentage", "audio": "percentage" }
}`;

    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Book Publishing Pipeline',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        max_tokens: 1500,
      }),
    });
    const aiData = await aiResponse.json();
    if (aiData.error) throw new Error(aiData.error.message || JSON.stringify(aiData.error));
    const rawText = aiData.choices[0].message.content;

    let projectionData;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      projectionData = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: rawText };
    } catch {
      projectionData = { raw: rawText };
    }

    const saved = await pool.query(
      `INSERT INTO royalty_projections (manuscript_id, projection_data, ai_analysis) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, JSON.stringify(projectionData), rawText]
    );

    res.json({ manuscript: ms, projection: projectionData, saved_record: saved.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manuscripts/:id/submission-package/pdf — publisher submission package PDF
router.get('/:id/submission-package/pdf', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const msResult = await pool.query('SELECT * FROM manuscripts WHERE id = $1', [req.params.id]);
    if (msResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const ms = msResult.rows[0];

    // Fetch AI-generated submission content
    const systemPrompt = `You are a professional literary agent preparing a publisher submission package. Be concise and compelling.`;
    const userPrompt = `Create a publisher submission package for this manuscript:
Title: ${ms.title}
Author: ${ms.author}
Genre: ${ms.genre}
Word Count: ${ms.word_count}
Synopsis: ${ms.synopsis || 'Not provided'}

Provide the following sections clearly labeled:

SYNOPSIS:
A compelling 150-word synopsis for publishers.

AUTHOR BIO:
A professional 75-word author biography (use "[Author Name]" placeholder).

MARKET ANALYSIS:
Key market opportunity, target readership, and why this book is timely (100 words).

COMPARABLE TITLES:
List 3 comparable published titles with author names and brief explanation of similarity.`;

    const aiContent = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Book Publishing Pipeline',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        max_tokens: 1200,
      }),
    });
    const aiData = await aiContent.json();
    if (aiData.error) throw new Error(aiData.error.message || JSON.stringify(aiData.error));
    const aiText = aiData.choices[0].message.content;

    // Parse sections from AI response
    function extractSection(text, label, nextLabel) {
      const regex = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=${nextLabel}:|$)`, 'i');
      const match = text.match(regex);
      return match ? match[1].trim() : '';
    }
    const synopsis = extractSection(aiText, 'SYNOPSIS', 'AUTHOR BIO');
    const authorBio = extractSection(aiText, 'AUTHOR BIO', 'MARKET ANALYSIS');
    const marketAnalysis = extractSection(aiText, 'MARKET ANALYSIS', 'COMPARABLE TITLES');
    const comparableTitles = extractSection(aiText, 'COMPARABLE TITLES', '~~~END~~~');

    // Build PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="submission-package-${ms.id}.pdf"`);

    const doc = new PDFDocument({ margin: 60, size: 'LETTER' });
    doc.pipe(res);

    // Cover page
    doc.fontSize(24).font('Helvetica-Bold').text('Publisher Submission Package', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(18).font('Helvetica').text(ms.title, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(13).text(`by ${ms.author}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#555555').text(`Genre: ${ms.genre}   |   Word Count: ${(ms.word_count || 0).toLocaleString()}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).text(`Prepared: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
    doc.fillColor('#000000');

    doc.addPage();

    // Helper to add a section
    const addSection = (title, content) => {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a2e').text(title);
      doc.moveDown(0.3);
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke('#cccccc');
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').fillColor('#000000').text(content || 'Not available.', { lineGap: 4 });
      doc.moveDown(1.2);
    };

    addSection('Synopsis', synopsis);
    addSection('Author Biography', authorBio);
    addSection('Market Analysis', marketAnalysis);
    addSection('Comparable Titles', comparableTitles);

    // Footer on each page
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(9).fillColor('#888888').text(
        `${ms.title} — Confidential Submission Package — Page ${i + 1}`,
        doc.page.margins.left,
        doc.page.height - 40,
        { align: 'center', width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
      );
    }

    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

module.exports = router;
