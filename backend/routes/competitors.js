const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

// Get all competitor books
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await (async () => {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      const countR = await pool.query('SELECT COUNT(*) FROM competitor_books');
      const total = parseInt(countR.rows[0].count);
      const r = await pool.query('SELECT * FROM competitor_books ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
      if (!req.query.page && !req.query.limit) return { rows: r.rows };
      return { rows: { data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } };
    })();
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single competitor book
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM competitor_books WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create competitor book
router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { title, author, genre, publisher, price, rating, reviews_count, rank, release_date, sales_estimate, strengths, weaknesses, our_advantage, ai_competitive_analysis } = req.body;
    const result = await pool.query(
      `INSERT INTO competitor_books (title, author, genre, publisher, price, rating, reviews_count, rank, release_date, sales_estimate, strengths, weaknesses, our_advantage, ai_competitive_analysis)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [title, author, genre, publisher, price || 0, rating || 0, reviews_count || 0, rank || 0, release_date, sales_estimate || 0, strengths, weaknesses, our_advantage, ai_competitive_analysis || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update competitor book
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { title, author, genre, publisher, price, rating, reviews_count, rank, release_date, sales_estimate, strengths, weaknesses, our_advantage, ai_competitive_analysis } = req.body;
    const result = await pool.query(
      `UPDATE competitor_books SET title=$1, author=$2, genre=$3, publisher=$4, price=$5, rating=$6, reviews_count=$7, rank=$8, release_date=$9, sales_estimate=$10, strengths=$11, weaknesses=$12, our_advantage=$13, ai_competitive_analysis=$14, updated_at=NOW()
       WHERE id=$15 RETURNING *`,
      [title, author, genre, publisher, price, rating, reviews_count, rank, release_date, sales_estimate, strengths, weaknesses, our_advantage, ai_competitive_analysis, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete competitor book
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('DELETE FROM competitor_books WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
