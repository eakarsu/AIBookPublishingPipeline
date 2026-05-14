// Distribution / vendor integration endpoints — Apply pass 5 (NEEDS-CREDS).
//
// Original audit: integrations with IngramSpark, Amazon KDP, Smashwords.
// All endpoints return HTTP 503 + `{ missing: '<ENV>' }` when the relevant
// vendor credentials are not set in the environment. No npm install — outbound
// HTTP would use Node 18+ native fetch in a follow-up pass once creds are
// provisioned.
//
// Required env vars (per vendor):
//   IngramSpark: INGRAMSPARK_CLIENT_ID, INGRAMSPARK_CLIENT_SECRET
//   Amazon KDP:  KDP_API_KEY, KDP_API_SECRET, KDP_PUBLISHER_ID
//   Smashwords:  SMASHWORDS_API_KEY, SMASHWORDS_USERNAME
const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS distribution_jobs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      vendor VARCHAR(32) NOT NULL,
      action VARCHAR(64) NOT NULL,
      payload JSONB,
      status VARCHAR(32) DEFAULT 'queued',
      result JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
}

router.use(authenticateToken);

function require503(res, name) {
  return res.status(503).json({ error: `Integration not configured: ${name} is missing`, missing: name });
}

router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await ensureTable(pool);
    const r = await pool.query(
      'SELECT id, vendor, action, status, created_at FROM distribution_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
      [req.user?.id || null]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ingramspark/submit', async (req, res) => {
  if (!process.env.INGRAMSPARK_CLIENT_ID) return require503(res, 'INGRAMSPARK_CLIENT_ID');
  if (!process.env.INGRAMSPARK_CLIENT_SECRET) return require503(res, 'INGRAMSPARK_CLIENT_SECRET');
  try {
    const pool = req.app.locals.pool;
    await ensureTable(pool);
    const r = await pool.query(
      `INSERT INTO distribution_jobs (user_id, vendor, action, payload) VALUES ($1, 'ingramspark', 'submit', $2)
       RETURNING id, created_at`,
      [req.user?.id || null, req.body || {}]
    );
    res.status(202).json({ queued: true, id: r.rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/kdp/submit', async (req, res) => {
  if (!process.env.KDP_API_KEY) return require503(res, 'KDP_API_KEY');
  if (!process.env.KDP_API_SECRET) return require503(res, 'KDP_API_SECRET');
  try {
    const pool = req.app.locals.pool;
    await ensureTable(pool);
    const r = await pool.query(
      `INSERT INTO distribution_jobs (user_id, vendor, action, payload) VALUES ($1, 'kdp', 'submit', $2)
       RETURNING id, created_at`,
      [req.user?.id || null, req.body || {}]
    );
    res.status(202).json({ queued: true, id: r.rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/smashwords/submit', async (req, res) => {
  if (!process.env.SMASHWORDS_API_KEY) return require503(res, 'SMASHWORDS_API_KEY');
  if (!process.env.SMASHWORDS_USERNAME) return require503(res, 'SMASHWORDS_USERNAME');
  try {
    const pool = req.app.locals.pool;
    await ensureTable(pool);
    const r = await pool.query(
      `INSERT INTO distribution_jobs (user_id, vendor, action, payload) VALUES ($1, 'smashwords', 'submit', $2)
       RETURNING id, created_at`,
      [req.user?.id || null, req.body || {}]
    );
    res.status(202).json({ queued: true, id: r.rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
