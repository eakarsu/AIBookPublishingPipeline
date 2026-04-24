const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

// Get all print production records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM print_production ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single print production record
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM print_production WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create print production record
router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, format, print_run, unit_cost, total_cost, printer, paper_type, binding_type, page_count, trim_size, status, delivery_date, warehouse_location, ai_cost_optimization } = req.body;
    const result = await pool.query(
      `INSERT INTO print_production (book_title, format, print_run, unit_cost, total_cost, printer, paper_type, binding_type, page_count, trim_size, status, delivery_date, warehouse_location, ai_cost_optimization)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [book_title, format, print_run || 0, unit_cost || 0, total_cost || 0, printer, paper_type, binding_type, page_count || 0, trim_size, status || 'Planning', delivery_date, warehouse_location, ai_cost_optimization || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update print production record
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, format, print_run, unit_cost, total_cost, printer, paper_type, binding_type, page_count, trim_size, status, delivery_date, warehouse_location, ai_cost_optimization } = req.body;
    const result = await pool.query(
      `UPDATE print_production SET book_title=$1, format=$2, print_run=$3, unit_cost=$4, total_cost=$5, printer=$6, paper_type=$7, binding_type=$8, page_count=$9, trim_size=$10, status=$11, delivery_date=$12, warehouse_location=$13, ai_cost_optimization=$14, updated_at=NOW()
       WHERE id=$15 RETURNING *`,
      [book_title, format, print_run, unit_cost, total_cost, printer, paper_type, binding_type, page_count, trim_size, status, delivery_date, warehouse_location, ai_cost_optimization, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete print production record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('DELETE FROM print_production WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
