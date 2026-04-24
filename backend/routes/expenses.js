const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

// Get all expenses
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM expenses ORDER BY expense_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single expense
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM expenses WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create expense
router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, category, description, amount, vendor, expense_date, payment_method, receipt_number, approved_by, budget_category, is_recurring, recurring_frequency, status } = req.body;
    const result = await pool.query(
      `INSERT INTO expenses (book_title, category, description, amount, vendor, expense_date, payment_method, receipt_number, approved_by, budget_category, is_recurring, recurring_frequency, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [book_title, category || 'Production', description, amount || 0, vendor, expense_date, payment_method || 'Bank Transfer', receipt_number, approved_by, budget_category || 'Operating', is_recurring || false, recurring_frequency, status || 'Pending']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update expense
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, category, description, amount, vendor, expense_date, payment_method, receipt_number, approved_by, budget_category, is_recurring, recurring_frequency, status } = req.body;
    const result = await pool.query(
      `UPDATE expenses SET book_title=$1, category=$2, description=$3, amount=$4, vendor=$5, expense_date=$6, payment_method=$7, receipt_number=$8, approved_by=$9, budget_category=$10, is_recurring=$11, recurring_frequency=$12, status=$13, updated_at=NOW()
       WHERE id=$14 RETURNING *`,
      [book_title, category, description, amount, vendor, expense_date, payment_method, receipt_number, approved_by, budget_category, is_recurring, recurring_frequency, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete expense
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('DELETE FROM expenses WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
