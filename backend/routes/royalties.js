const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await (async () => {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      const countR = await pool.query('SELECT COUNT(*) FROM royalties');
      const total = parseInt(countR.rows[0].count);
      const r = await pool.query('SELECT * FROM royalties ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
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
    const result = await pool.query('SELECT * FROM royalties WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, author, channel, period, units_sold, gross_revenue, net_revenue, royalty_rate, royalty_amount, currency, payment_status, payment_date, ai_forecast, status } = req.body;
    const result = await pool.query(
      `INSERT INTO royalties (book_title, author, channel, period, units_sold, gross_revenue, net_revenue, royalty_rate, royalty_amount, currency, payment_status, payment_date, ai_forecast, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [book_title, author, channel, period, units_sold || 0, gross_revenue || 0, net_revenue || 0, royalty_rate || 0, royalty_amount || 0, currency || 'USD', payment_status || 'Pending', payment_date, ai_forecast || '', status || 'Active']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, author, channel, period, units_sold, gross_revenue, net_revenue, royalty_rate, royalty_amount, currency, payment_status, payment_date, ai_forecast, status } = req.body;
    const result = await pool.query(
      `UPDATE royalties SET book_title=$1, author=$2, channel=$3, period=$4, units_sold=$5, gross_revenue=$6, net_revenue=$7, royalty_rate=$8, royalty_amount=$9, currency=$10, payment_status=$11, payment_date=$12, ai_forecast=$13, status=$14, updated_at=NOW()
       WHERE id=$15 RETURNING *`,
      [book_title, author, channel, period, units_sold, gross_revenue, net_revenue, royalty_rate, royalty_amount, currency, payment_status, payment_date, ai_forecast, status, req.params.id]
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
    const result = await pool.query('DELETE FROM royalties WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
