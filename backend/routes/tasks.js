const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

// Get all tasks
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM publishing_tasks ORDER BY due_date ASC, priority DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single task
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM publishing_tasks WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create task
router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { task_title, book_title, assigned_to, category, priority, description, due_date, estimated_hours, actual_hours, dependencies, status } = req.body;
    const result = await pool.query(
      `INSERT INTO publishing_tasks (task_title, book_title, assigned_to, category, priority, description, due_date, estimated_hours, actual_hours, dependencies, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [task_title, book_title, assigned_to, category || 'Editorial', priority || 'Medium', description, due_date, estimated_hours || 0, actual_hours || 0, dependencies, status || 'To Do']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update task
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { task_title, book_title, assigned_to, category, priority, description, due_date, estimated_hours, actual_hours, dependencies, status } = req.body;
    const result = await pool.query(
      `UPDATE publishing_tasks SET task_title=$1, book_title=$2, assigned_to=$3, category=$4, priority=$5, description=$6, due_date=$7, estimated_hours=$8, actual_hours=$9, dependencies=$10, status=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [task_title, book_title, assigned_to, category, priority, description, due_date, estimated_hours, actual_hours, dependencies, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('DELETE FROM publishing_tasks WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
