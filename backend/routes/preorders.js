const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

// Get all preorders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM preorders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single preorder
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM preorders WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create preorder
router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, launch_date, preorder_start, preorder_count, preorder_revenue, platform, price, marketing_budget, email_signups, social_buzz_score, status, ai_launch_strategy } = req.body;
    const result = await pool.query(
      `INSERT INTO preorders (book_title, launch_date, preorder_start, preorder_count, preorder_revenue, platform, price, marketing_budget, email_signups, social_buzz_score, status, ai_launch_strategy)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [book_title, launch_date, preorder_start, preorder_count || 0, preorder_revenue || 0, platform, price || 0, marketing_budget || 0, email_signups || 0, social_buzz_score || 0, status || 'Planning', ai_launch_strategy || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update preorder
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, launch_date, preorder_start, preorder_count, preorder_revenue, platform, price, marketing_budget, email_signups, social_buzz_score, status, ai_launch_strategy } = req.body;
    const result = await pool.query(
      `UPDATE preorders SET book_title=$1, launch_date=$2, preorder_start=$3, preorder_count=$4, preorder_revenue=$5, platform=$6, price=$7, marketing_budget=$8, email_signups=$9, social_buzz_score=$10, status=$11, ai_launch_strategy=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [book_title, launch_date, preorder_start, preorder_count, preorder_revenue, platform, price, marketing_budget, email_signups, social_buzz_score, status, ai_launch_strategy, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete preorder
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('DELETE FROM preorders WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
