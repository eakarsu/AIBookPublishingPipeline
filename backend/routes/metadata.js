const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM metadata_entries ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const result = await pool.query('SELECT * FROM metadata_entries WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, subtitle, description, keywords, categories, bisac_codes, isbn, language, publisher, seo_score, ai_optimized_description, ai_suggested_keywords, status } = req.body;
    const result = await pool.query(
      `INSERT INTO metadata_entries (book_title, subtitle, description, keywords, categories, bisac_codes, isbn, language, publisher, seo_score, ai_optimized_description, ai_suggested_keywords, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [book_title, subtitle, description, keywords, categories, bisac_codes, isbn, language || 'English', publisher, seo_score || 0, ai_optimized_description || '', ai_suggested_keywords || '', status || 'Draft']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const { book_title, subtitle, description, keywords, categories, bisac_codes, isbn, language, publisher, seo_score, ai_optimized_description, ai_suggested_keywords, status } = req.body;
    const result = await pool.query(
      `UPDATE metadata_entries SET book_title=$1, subtitle=$2, description=$3, keywords=$4, categories=$5, bisac_codes=$6, isbn=$7, language=$8, publisher=$9, seo_score=$10, ai_optimized_description=$11, ai_suggested_keywords=$12, status=$13, updated_at=NOW()
       WHERE id=$14 RETURNING *`,
      [book_title, subtitle, description, keywords, categories, bisac_codes, isbn, language, publisher, seo_score, ai_optimized_description, ai_suggested_keywords, status, req.params.id]
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
    const result = await pool.query('DELETE FROM metadata_entries WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
