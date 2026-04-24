const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

// Get all inventory records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM inventory ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single inventory record
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM inventory WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create inventory record
router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, format, warehouse_location, quantity_on_hand, quantity_reserved, reorder_level, reorder_quantity, unit_cost, supplier, last_restock_date, status } = req.body;
    const result = await pool.query(
      `INSERT INTO inventory (book_title, format, warehouse_location, quantity_on_hand, quantity_reserved, reorder_level, reorder_quantity, unit_cost, supplier, last_restock_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [book_title, format || 'Paperback', warehouse_location, quantity_on_hand || 0, quantity_reserved || 0, reorder_level || 100, reorder_quantity || 500, unit_cost || 0, supplier, last_restock_date, status || 'In Stock']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update inventory record
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, format, warehouse_location, quantity_on_hand, quantity_reserved, reorder_level, reorder_quantity, unit_cost, supplier, last_restock_date, status } = req.body;
    const result = await pool.query(
      `UPDATE inventory SET book_title=$1, format=$2, warehouse_location=$3, quantity_on_hand=$4, quantity_reserved=$5, reorder_level=$6, reorder_quantity=$7, unit_cost=$8, supplier=$9, last_restock_date=$10, status=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [book_title, format, warehouse_location, quantity_on_hand, quantity_reserved, reorder_level, reorder_quantity, unit_cost, supplier, last_restock_date, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete inventory record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('DELETE FROM inventory WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
