const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

// Get all contracts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM contracts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single contract
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM contracts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create contract
router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { contract_title, author_name, book_title, contract_type, advance_amount, royalty_rate, territory, rights_granted, start_date, end_date, option_clause, status, ai_negotiation_tips } = req.body;
    const result = await pool.query(
      `INSERT INTO contracts (contract_title, author_name, book_title, contract_type, advance_amount, royalty_rate, territory, rights_granted, start_date, end_date, option_clause, status, ai_negotiation_tips)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [contract_title, author_name, book_title, contract_type, advance_amount || 0, royalty_rate || 0, territory, rights_granted, start_date, end_date, option_clause, status || 'Draft', ai_negotiation_tips || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update contract
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { contract_title, author_name, book_title, contract_type, advance_amount, royalty_rate, territory, rights_granted, start_date, end_date, option_clause, status, ai_negotiation_tips } = req.body;
    const result = await pool.query(
      `UPDATE contracts SET contract_title=$1, author_name=$2, book_title=$3, contract_type=$4, advance_amount=$5, royalty_rate=$6, territory=$7, rights_granted=$8, start_date=$9, end_date=$10, option_clause=$11, status=$12, ai_negotiation_tips=$13, updated_at=NOW()
       WHERE id=$14 RETURNING *`,
      [contract_title, author_name, book_title, contract_type, advance_amount, royalty_rate, territory, rights_granted, start_date, end_date, option_clause, status, ai_negotiation_tips, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete contract
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('DELETE FROM contracts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
