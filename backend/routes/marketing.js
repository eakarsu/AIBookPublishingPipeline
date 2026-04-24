const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

// Get all marketing campaigns
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM marketing_campaigns ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single marketing campaign
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM marketing_campaigns WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create marketing campaign
router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { campaign_name, book_title, campaign_type, platform, budget, spent, start_date, end_date, impressions, clicks, conversions, roi, status, ai_recommendations } = req.body;
    const result = await pool.query(
      `INSERT INTO marketing_campaigns (campaign_name, book_title, campaign_type, platform, budget, spent, start_date, end_date, impressions, clicks, conversions, roi, status, ai_recommendations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [campaign_name, book_title, campaign_type, platform, budget || 0, spent || 0, start_date, end_date, impressions || 0, clicks || 0, conversions || 0, roi || 0, status || 'Planning', ai_recommendations || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update marketing campaign
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { campaign_name, book_title, campaign_type, platform, budget, spent, start_date, end_date, impressions, clicks, conversions, roi, status, ai_recommendations } = req.body;
    const result = await pool.query(
      `UPDATE marketing_campaigns SET campaign_name=$1, book_title=$2, campaign_type=$3, platform=$4, budget=$5, spent=$6, start_date=$7, end_date=$8, impressions=$9, clicks=$10, conversions=$11, roi=$12, status=$13, ai_recommendations=$14, updated_at=NOW()
       WHERE id=$15 RETURNING *`,
      [campaign_name, book_title, campaign_type, platform, budget, spent, start_date, end_date, impressions, clicks, conversions, roi, status, ai_recommendations, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete marketing campaign
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('DELETE FROM marketing_campaigns WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
