const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

// Get all reader analytics
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await (async () => {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      const countR = await pool.query('SELECT COUNT(*) FROM reader_analytics');
      const total = parseInt(countR.rows[0].count);
      const r = await pool.query('SELECT * FROM reader_analytics ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
      if (!req.query.page && !req.query.limit) return { rows: r.rows };
      return { rows: { data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } };
    })();
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single reader analytics record
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM reader_analytics WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create reader analytics record
router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, period, total_readers, new_readers, returning_readers, avg_reading_time, completion_rate, demographic_data, top_regions, device_breakdown, engagement_score, ai_audience_insights } = req.body;
    const result = await pool.query(
      `INSERT INTO reader_analytics (book_title, period, total_readers, new_readers, returning_readers, avg_reading_time, completion_rate, demographic_data, top_regions, device_breakdown, engagement_score, ai_audience_insights)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [book_title, period, total_readers || 0, new_readers || 0, returning_readers || 0, avg_reading_time, completion_rate || 0, demographic_data, top_regions, device_breakdown, engagement_score || 0, ai_audience_insights || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update reader analytics record
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, period, total_readers, new_readers, returning_readers, avg_reading_time, completion_rate, demographic_data, top_regions, device_breakdown, engagement_score, ai_audience_insights } = req.body;
    const result = await pool.query(
      `UPDATE reader_analytics SET book_title=$1, period=$2, total_readers=$3, new_readers=$4, returning_readers=$5, avg_reading_time=$6, completion_rate=$7, demographic_data=$8, top_regions=$9, device_breakdown=$10, engagement_score=$11, ai_audience_insights=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [book_title, period, total_readers, new_readers, returning_readers, avg_reading_time, completion_rate, demographic_data, top_regions, device_breakdown, engagement_score, ai_audience_insights, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete reader analytics record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('DELETE FROM reader_analytics WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
