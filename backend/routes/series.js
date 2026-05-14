const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

// Get all book series
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await (async () => {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      const countR = await pool.query('SELECT COUNT(*) FROM book_series');
      const total = parseInt(countR.rows[0].count);
      const r = await pool.query('SELECT * FROM book_series ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
      if (!req.query.page && !req.query.limit) return { rows: r.rows };
      return { rows: { data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } };
    })();
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single book series
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM book_series WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create book series
router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { series_name, author, genre, total_books, published_books, reading_order, description, status, avg_rating, total_series_sales, next_release_date, ai_series_analysis } = req.body;
    const result = await pool.query(
      `INSERT INTO book_series (series_name, author, genre, total_books, published_books, reading_order, description, status, avg_rating, total_series_sales, next_release_date, ai_series_analysis)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [series_name, author, genre, total_books || 0, published_books || 0, reading_order, description, status || 'Ongoing', avg_rating || 0, total_series_sales || 0, next_release_date, ai_series_analysis || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update book series
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { series_name, author, genre, total_books, published_books, reading_order, description, status, avg_rating, total_series_sales, next_release_date, ai_series_analysis } = req.body;
    const result = await pool.query(
      `UPDATE book_series SET series_name=$1, author=$2, genre=$3, total_books=$4, published_books=$5, reading_order=$6, description=$7, status=$8, avg_rating=$9, total_series_sales=$10, next_release_date=$11, ai_series_analysis=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [series_name, author, genre, total_books, published_books, reading_order, description, status, avg_rating, total_series_sales, next_release_date, ai_series_analysis, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete book series
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('DELETE FROM book_series WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
