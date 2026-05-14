const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

// Get all authors
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await (async () => {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      const countR = await pool.query('SELECT COUNT(*) FROM authors');
      const total = parseInt(countR.rows[0].count);
      const r = await pool.query('SELECT * FROM authors ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
      if (!req.query.page && !req.query.limit) return { rows: r.rows };
      return { rows: { data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } };
    })();
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single author
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM authors WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create author
router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { name, email, bio, website, social_media, genre_specialty, books_published, total_sales, rating, nationality, agent_name, status } = req.body;
    const result = await pool.query(
      `INSERT INTO authors (name, email, bio, website, social_media, genre_specialty, books_published, total_sales, rating, nationality, agent_name, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, email, bio, website, social_media, genre_specialty, books_published || 0, total_sales || 0, rating || 0, nationality, agent_name, status || 'Active']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update author
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { name, email, bio, website, social_media, genre_specialty, books_published, total_sales, rating, nationality, agent_name, status } = req.body;
    const result = await pool.query(
      `UPDATE authors SET name=$1, email=$2, bio=$3, website=$4, social_media=$5, genre_specialty=$6, books_published=$7, total_sales=$8, rating=$9, nationality=$10, agent_name=$11, status=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [name, email, bio, website, social_media, genre_specialty, books_published, total_sales, rating, nationality, agent_name, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete author
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('DELETE FROM authors WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
