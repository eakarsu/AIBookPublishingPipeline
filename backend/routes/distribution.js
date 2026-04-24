const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM distribution_channels ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM distribution_channels WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, channel_name, channel_type, region, format, price, currency, commission_rate, listing_url, submission_date, approval_status, ai_pricing_suggestion, status } = req.body;
    const result = await pool.query(
      `INSERT INTO distribution_channels (book_title, channel_name, channel_type, region, format, price, currency, commission_rate, listing_url, submission_date, approval_status, ai_pricing_suggestion, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [book_title, channel_name, channel_type, region, format, price || 0, currency || 'USD', commission_rate || 0, listing_url, submission_date || new Date().toISOString().split('T')[0], approval_status || 'Pending', ai_pricing_suggestion || '', status || 'Active']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, channel_name, channel_type, region, format, price, currency, commission_rate, listing_url, submission_date, approval_status, ai_pricing_suggestion, status } = req.body;
    const result = await pool.query(
      `UPDATE distribution_channels SET book_title=$1, channel_name=$2, channel_type=$3, region=$4, format=$5, price=$6, currency=$7, commission_rate=$8, listing_url=$9, submission_date=$10, approval_status=$11, ai_pricing_suggestion=$12, status=$13, updated_at=NOW()
       WHERE id=$14 RETURNING *`,
      [book_title, channel_name, channel_type, region, format, price, currency, commission_rate, listing_url, submission_date, approval_status, ai_pricing_suggestion, status, req.params.id]
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
    const result = await pool.query('DELETE FROM distribution_channels WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
