const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

// Get all events
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await (async () => {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      const countR = await pool.query('SELECT COUNT(*) FROM events');
      const total = parseInt(countR.rows[0].count);
      const r = await pool.query('SELECT * FROM events ORDER BY event_date DESC LIMIT $1 OFFSET $2', [limit, offset]);
      if (!req.query.page && !req.query.limit) return { rows: r.rows };
      return { rows: { data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } };
    })();
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single event
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create event
router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { event_name, event_type, book_title, author_name, venue, city, event_date, start_time, end_time, expected_attendance, actual_attendance, budget, ticket_price, tickets_sold, description, status } = req.body;
    const result = await pool.query(
      `INSERT INTO events (event_name, event_type, book_title, author_name, venue, city, event_date, start_time, end_time, expected_attendance, actual_attendance, budget, ticket_price, tickets_sold, description, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [event_name, event_type || 'Book Signing', book_title, author_name, venue, city, event_date, start_time, end_time, expected_attendance || 0, actual_attendance || 0, budget || 0, ticket_price || 0, tickets_sold || 0, description, status || 'Planned']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update event
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { event_name, event_type, book_title, author_name, venue, city, event_date, start_time, end_time, expected_attendance, actual_attendance, budget, ticket_price, tickets_sold, description, status } = req.body;
    const result = await pool.query(
      `UPDATE events SET event_name=$1, event_type=$2, book_title=$3, author_name=$4, venue=$5, city=$6, event_date=$7, start_time=$8, end_time=$9, expected_attendance=$10, actual_attendance=$11, budget=$12, ticket_price=$13, tickets_sold=$14, description=$15, status=$16, updated_at=NOW()
       WHERE id=$17 RETURNING *`,
      [event_name, event_type, book_title, author_name, venue, city, event_date, start_time, end_time, expected_attendance, actual_attendance, budget, ticket_price, tickets_sold, description, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete event
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
