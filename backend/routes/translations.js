const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

// Get all translations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM translations ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single translation
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM translations WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create translation
router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, original_language, target_language, translator_name, translation_status, word_count, cost, start_date, deadline, quality_score, publisher_local, market_potential, ai_market_analysis } = req.body;
    const result = await pool.query(
      `INSERT INTO translations (book_title, original_language, target_language, translator_name, translation_status, word_count, cost, start_date, deadline, quality_score, publisher_local, market_potential, ai_market_analysis)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [book_title, original_language, target_language, translator_name, translation_status || 'Pending', word_count || 0, cost || 0, start_date, deadline, quality_score || 0, publisher_local, market_potential, ai_market_analysis || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update translation
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, original_language, target_language, translator_name, translation_status, word_count, cost, start_date, deadline, quality_score, publisher_local, market_potential, ai_market_analysis } = req.body;
    const result = await pool.query(
      `UPDATE translations SET book_title=$1, original_language=$2, target_language=$3, translator_name=$4, translation_status=$5, word_count=$6, cost=$7, start_date=$8, deadline=$9, quality_score=$10, publisher_local=$11, market_potential=$12, ai_market_analysis=$13, updated_at=NOW()
       WHERE id=$14 RETURNING *`,
      [book_title, original_language, target_language, translator_name, translation_status, word_count, cost, start_date, deadline, quality_score, publisher_local, market_potential, ai_market_analysis, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete translation
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('DELETE FROM translations WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
