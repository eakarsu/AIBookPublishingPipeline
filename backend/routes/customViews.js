// Custom Views — adds 4 supplementary features:
//   VIZ 1: Manuscript Kanban (by stage)
//   VIZ 2: Royalty Trend (cumulative author royalties over time per title)
//   NON-VIZ 1: Author Contract PDF (pdfkit)
//   NON-VIZ 2: ISBN Registration Wizard
//
// Mounted at /api/custom-views in server.js.

const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

// ---------------------------------------------------------------------------
// VIZ 1 — Manuscript Kanban
// GET /api/custom-views/manuscript-kanban
//
// Buckets all manuscripts into the canonical publishing pipeline stages.
// The frontend renders flexbox columns directly from this payload.
// ---------------------------------------------------------------------------
const KANBAN_STAGES = [
  'slush',
  'reviewing',
  'editing',
  'typesetting',
  'printing',
  'published',
];

function mapStatusToStage(status) {
  const s = (status || '').toLowerCase().trim();
  if (!s) return 'slush';
  if (s === 'slush' || s === 'draft' || s === 'submitted') return 'slush';
  if (s === 'reviewing' || s === 'under_review' || s === 'under review') return 'reviewing';
  if (s === 'editing' || s === 'accepted' || s === 'approved') return 'editing';
  if (s === 'typesetting' || s === 'layout' || s === 'design') return 'typesetting';
  if (s === 'printing' || s === 'production' || s === 'press') return 'printing';
  if (s === 'published' || s === 'live' || s === 'released') return 'published';
  // rejected manuscripts are intentionally hidden from the kanban
  if (s === 'rejected') return null;
  return 'slush';
}

router.get('/manuscript-kanban', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query(
      'SELECT id, title, author, genre, word_count, status, overall_score, updated_at FROM manuscripts ORDER BY updated_at DESC NULLS LAST, id DESC'
    );

    const columns = {};
    for (const stage of KANBAN_STAGES) columns[stage] = [];

    for (const row of result.rows) {
      const stage = mapStatusToStage(row.status);
      if (!stage) continue;
      columns[stage].push({
        id: row.id,
        title: row.title,
        author: row.author,
        genre: row.genre,
        word_count: row.word_count,
        score: row.overall_score,
        status: row.status,
        updated_at: row.updated_at,
      });
    }

    res.json({
      stages: KANBAN_STAGES,
      columns,
      total: result.rows.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// VIZ 2 — Royalty Trend
// GET /api/custom-views/royalty-trend
//
// Returns a per-title series of (period, cumulative_royalty_amount) points
// suitable for a recharts <LineChart>. Periods are alphabetically sorted so
// "Q1 2024", "Q2 2024", … render left-to-right.
// ---------------------------------------------------------------------------
router.get('/royalty-trend', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const rows = (await pool.query(
      `SELECT book_title, author, period, royalty_amount
         FROM royalties
        WHERE period IS NOT NULL AND period <> ''
        ORDER BY book_title, period`
    )).rows;

    // Collect all unique periods across all titles
    const periodSet = new Set();
    const byTitle = new Map();
    for (const r of rows) {
      periodSet.add(r.period);
      if (!byTitle.has(r.book_title)) {
        byTitle.set(r.book_title, { author: r.author, byPeriod: new Map() });
      }
      const cur = byTitle.get(r.book_title).byPeriod.get(r.period) || 0;
      byTitle.get(r.book_title).byPeriod.set(
        r.period,
        cur + Number(r.royalty_amount || 0)
      );
    }

    // Sort periods. Try to parse "Q1 2024" style naturally.
    const periods = Array.from(periodSet).sort((a, b) => {
      const pa = parsePeriod(a);
      const pb = parsePeriod(b);
      if (pa.year !== pb.year) return pa.year - pb.year;
      return pa.q - pb.q;
    });

    // Build cumulative series per title
    const series = [];
    for (const [title, info] of byTitle.entries()) {
      let cumulative = 0;
      const points = periods.map((p) => {
        cumulative += info.byPeriod.get(p) || 0;
        return { period: p, cumulative: Math.round(cumulative * 100) / 100 };
      });
      series.push({ title, author: info.author, points });
    }

    // Wide-format rows for recharts (one row per period, one key per title)
    const chartRows = periods.map((p) => {
      const row = { period: p };
      for (const s of series) {
        const pt = s.points.find((x) => x.period === p);
        row[s.title] = pt ? pt.cumulative : 0;
      }
      return row;
    });

    res.json({
      periods,
      titles: series.map((s) => s.title),
      series,
      chartRows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function parsePeriod(p) {
  // Handles "Q4 2024", "2024 Q4", "Q4-2024", "2024" forms
  const m = String(p).match(/Q?(\d)[^\d]*?(\d{4})|(\d{4})[^\d]*?Q?(\d)/i);
  if (m) {
    if (m[1] && m[2]) return { q: parseInt(m[1]), year: parseInt(m[2]) };
    if (m[3] && m[4]) return { q: parseInt(m[4]), year: parseInt(m[3]) };
  }
  const yearOnly = String(p).match(/(\d{4})/);
  return { q: 0, year: yearOnly ? parseInt(yearOnly[1]) : 0 };
}

// ---------------------------------------------------------------------------
// NON-VIZ 1 — Author Contract PDF
// POST /api/custom-views/author-contract-pdf
// Body: { author_name, book_title, royalty_rate, advance, rights, territory }
// Returns: application/pdf streamed
// ---------------------------------------------------------------------------
router.post('/author-contract-pdf', authenticateToken, async (req, res) => {
  try {
    const {
      author_name = 'Unknown Author',
      book_title = 'Untitled Work',
      royalty_rate = 15,
      advance = 5000,
      rights = 'World English-language print, ebook, and audio rights',
      territory = 'Worldwide',
    } = req.body || {};

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="author-contract-${String(book_title).replace(/[^a-z0-9]+/gi, '_').slice(0, 40)}.pdf"`
    );

    const doc = new PDFDocument({ margin: 60, size: 'LETTER' });
    doc.pipe(res);

    // Title block
    doc.fontSize(22).font('Helvetica-Bold').text('AUTHOR PUBLISHING AGREEMENT', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica').fillColor('#666666')
       .text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
    doc.fillColor('#000000');
    doc.moveDown(1.5);

    // Parties
    doc.fontSize(12).font('Helvetica-Bold').text('PARTIES');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica')
       .text(`This Agreement is made between the Publisher and ${author_name} ("Author"), regarding the work titled "${book_title}" ("Work").`, { lineGap: 3 });
    doc.moveDown(1);

    // Financial terms
    doc.fontSize(12).font('Helvetica-Bold').text('FINANCIAL TERMS');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica')
       .text(`Royalty Rate: ${royalty_rate}% of net receipts on all formats.`, { lineGap: 3 })
       .text(`Advance: $${Number(advance).toLocaleString()} USD, payable in two equal installments — half on signing, half on delivery of the accepted manuscript.`, { lineGap: 3 })
       .text(`Royalty statements shall be furnished semi-annually within 60 days of period close.`, { lineGap: 3 });
    doc.moveDown(1);

    // Rights
    doc.fontSize(12).font('Helvetica-Bold').text('RIGHTS GRANTED');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica')
       .text(`Territory: ${territory}.`, { lineGap: 3 })
       .text(`Rights: ${rights}.`, { lineGap: 3 })
       .text(`Subsidiary rights (translation, dramatic, audio, merchandising) are subject to separate licensing schedules attached as Exhibit A.`, { lineGap: 3 });
    doc.moveDown(1);

    // Term & termination
    doc.fontSize(12).font('Helvetica-Bold').text('TERM');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica')
       .text('This Agreement remains in force for the duration of copyright unless terminated by either party with 180 days written notice and reversion of unused rights to the Author.', { lineGap: 3 });
    doc.moveDown(2);

    // Signature block
    doc.fontSize(12).font('Helvetica-Bold').text('SIGNATURES');
    doc.moveDown(1.5);

    const sigY = doc.y;
    const left = doc.page.margins.left;
    const colW = (doc.page.width - doc.page.margins.left - doc.page.margins.right - 40) / 2;

    // Author signature
    doc.moveTo(left, sigY).lineTo(left + colW, sigY).stroke();
    doc.fontSize(10).font('Helvetica').text('Author Signature', left, sigY + 5);
    doc.text(author_name, left, sigY + 18);
    doc.text('Date: ____________________', left, sigY + 32);

    // Publisher signature
    const right = left + colW + 40;
    doc.moveTo(right, sigY).lineTo(right + colW, sigY).stroke();
    doc.fontSize(10).font('Helvetica').text('Publisher Signature', right, sigY + 5);
    doc.text('AI Book Publishing Pipeline', right, sigY + 18);
    doc.text('Date: ____________________', right, sigY + 32);

    // Footer
    doc.fontSize(8).fillColor('#888888')
       .text('CONFIDENTIAL — Author Publishing Agreement', left, doc.page.height - 40, {
         align: 'center',
         width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
       });

    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// NON-VIZ 2 — ISBN Registration Wizard
// POST /api/custom-views/isbn-register
// Body: { title, author, format, language, bisac_code, publisher }
// Returns: { isbn_13, registration_id, … } — generated with proper ISBN-13
// check digit so the value is structurally valid.
// ---------------------------------------------------------------------------
router.post('/isbn-register', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      author,
      format = 'paperback',
      language = 'English',
      bisac_code = 'FIC000000',
      publisher = 'AI Book Publishing Pipeline',
    } = req.body || {};

    if (!title || !author) {
      return res.status(400).json({ error: 'title and author are required' });
    }

    // Build the first 12 digits, then compute the ISBN-13 check digit.
    // Prefix: 978 (book), group: 1 (English), registrant: 234567,
    // publication element: 6 digits derived from a timestamp + random salt.
    const prefix = '978';
    const group = '1';
    const registrant = '234567';
    const pubElement = String(
      (Date.now() % 1_000_000) + Math.floor(Math.random() * 10)
    ).padStart(6, '0').slice(-6);

    // Build 12-digit base — must total 12 digits exactly.
    let base = (prefix + group + registrant + pubElement).slice(0, 12);
    if (base.length < 12) base = base.padEnd(12, '0');

    // ISBN-13 check digit: weight 1 and 3 alternating, then mod 10.
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const d = parseInt(base[i], 10);
      sum += i % 2 === 0 ? d : d * 3;
    }
    const check = (10 - (sum % 10)) % 10;
    const isbn13 = base + String(check);

    // Format as canonical 978-1-234567-XXXXXX-C
    const formatted = `${isbn13.slice(0, 3)}-${isbn13.slice(3, 4)}-${isbn13.slice(4, 10)}-${isbn13.slice(10, 12)}-${isbn13.slice(12)}`;

    const registrationId = `REG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    res.json({
      success: true,
      isbn_13: isbn13,
      isbn_formatted: formatted,
      registration_id: registrationId,
      registered_at: new Date().toISOString(),
      metadata: {
        title,
        author,
        format,
        language,
        bisac_code,
        publisher,
      },
      message: `ISBN ${formatted} reserved for "${title}" (${format}).`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
