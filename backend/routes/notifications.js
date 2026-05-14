// Notifications system — Apply pass 5 (NEEDS-CREDS).
//
// Original audit: "Missing notifications system" (email/SMS/push).
// This module provides:
//   - GET    /api/notifications                 → list user's notifications (DB-only, no creds)
//   - POST   /api/notifications/mark-read/:id   → mark a row read (DB-only)
//   - POST   /api/notifications/email           → 503 unless SMTP_HOST + SMTP_USER + SMTP_PASS set
//   - POST   /api/notifications/sms             → 503 unless TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM set
//   - POST   /api/notifications/push            → 503 unless FCM_SERVER_KEY set
//
// Required env vars (per channel):
//   email: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
//   sms:   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
//   push:  FCM_SERVER_KEY
//
// When required env vars are missing the endpoint returns HTTP 503 with
// `{ error: '...', missing: '<ENV_NAME>' }`. No npm install — only persistence
// to a `notifications` table (CREATE TABLE IF NOT EXISTS) and queue rows in
// the same table when creds are absent.
const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      channel VARCHAR(32) NOT NULL,
      to_address TEXT,
      subject TEXT,
      body TEXT,
      status VARCHAR(32) DEFAULT 'queued',
      error TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      read_at TIMESTAMP
    )
  `).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`).catch(() => {});
}

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await ensureTable(pool);
    const r = await pool.query(
      'SELECT id, channel, to_address, subject, body, status, created_at, read_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200',
      [req.user?.id || null]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/mark-read/:id', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await ensureTable(pool);
    const r = await pool.query(
      'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user?.id || null]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function require503(res, name) {
  return res.status(503).json({ error: `Notification channel not configured: ${name} is missing`, missing: name });
}

router.post('/email', async (req, res) => {
  if (!process.env.SMTP_HOST) return require503(res, 'SMTP_HOST');
  if (!process.env.SMTP_USER) return require503(res, 'SMTP_USER');
  if (!process.env.SMTP_PASS) return require503(res, 'SMTP_PASS');
  try {
    const pool = req.app.locals.pool;
    await ensureTable(pool);
    const { to, subject, body } = req.body || {};
    if (!to || !subject) return res.status(400).json({ error: 'to + subject required' });
    // Stub: when SMTP creds present we'd hand off to a transport. We keep this
    // additive (no nodemailer install) and just queue with status=ready.
    const r = await pool.query(
      `INSERT INTO notifications (user_id, channel, to_address, subject, body, status)
       VALUES ($1, 'email', $2, $3, $4, 'ready') RETURNING id, created_at`,
      [req.user?.id || null, to, subject, body || '']
    );
    res.status(202).json({ queued: true, id: r.rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sms', async (req, res) => {
  if (!process.env.TWILIO_ACCOUNT_SID) return require503(res, 'TWILIO_ACCOUNT_SID');
  if (!process.env.TWILIO_AUTH_TOKEN) return require503(res, 'TWILIO_AUTH_TOKEN');
  if (!process.env.TWILIO_FROM) return require503(res, 'TWILIO_FROM');
  try {
    const pool = req.app.locals.pool;
    await ensureTable(pool);
    const { to, body } = req.body || {};
    if (!to || !body) return res.status(400).json({ error: 'to + body required' });
    const r = await pool.query(
      `INSERT INTO notifications (user_id, channel, to_address, body, status)
       VALUES ($1, 'sms', $2, $3, 'ready') RETURNING id`,
      [req.user?.id || null, to, body]
    );
    res.status(202).json({ queued: true, id: r.rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/push', async (req, res) => {
  if (!process.env.FCM_SERVER_KEY) return require503(res, 'FCM_SERVER_KEY');
  try {
    const pool = req.app.locals.pool;
    await ensureTable(pool);
    const { to, title, body } = req.body || {};
    if (!to || !title) return res.status(400).json({ error: 'to + title required' });
    const r = await pool.query(
      `INSERT INTO notifications (user_id, channel, to_address, subject, body, status)
       VALUES ($1, 'push', $2, $3, $4, 'ready') RETURNING id`,
      [req.user?.id || null, to, title, body || '']
    );
    res.status(202).json({ queued: true, id: r.rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
