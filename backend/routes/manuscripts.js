const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

// Get all manuscripts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM manuscripts ORDER BY created_at DESC');
    res.json(result.rows);
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

// Create manuscript
router.post('/', authenticateToken, async (req, res) => {
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

module.exports = router;
