const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await (async () => {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      const countR = await pool.query('SELECT COUNT(*) FROM cover_designs');
      const total = parseInt(countR.rows[0].count);
      const r = await pool.query('SELECT * FROM cover_designs ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
      if (!req.query.page && !req.query.limit) return { rows: r.rows };
      return { rows: { data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } };
    })();
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM cover_designs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, genre, style, color_scheme, typography, mood, target_audience, design_prompt, ai_suggestions, status } = req.body;
    const result = await pool.query(
      `INSERT INTO cover_designs (book_title, genre, style, color_scheme, typography, mood, target_audience, design_prompt, ai_suggestions, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [book_title, genre, style, color_scheme, typography, mood, target_audience, design_prompt, ai_suggestions || '', status || 'Draft']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, genre, style, color_scheme, typography, mood, target_audience, design_prompt, ai_suggestions, status } = req.body;
    const result = await pool.query(
      `UPDATE cover_designs SET book_title=$1, genre=$2, style=$3, color_scheme=$4, typography=$5, mood=$6, target_audience=$7, design_prompt=$8, ai_suggestions=$9, status=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [book_title, genre, style, color_scheme, typography, mood, target_audience, design_prompt, ai_suggestions, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('DELETE FROM cover_designs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
