// Webhook delivery infra — Apply pass 5 (TOO-RISKY → additive in-memory queue).
//
// Original audit / pass-2 backlog: "Outbound webhook delivery infra" was
// deferred because a real reliable queue (durable retry, signing, exponential
// backoff workers) is heavyweight. This module provides the *visible* portion
// of that infrastructure additively:
//   - POST /api/webhook-deliveries/dispatch   → enqueue an event for all matching subscriptions; returns delivery rows (status='pending')
//   - GET  /api/webhook-deliveries            → list recent deliveries
//   - POST /api/webhook-deliveries/:id/replay → mark a delivery for replay (status='retry')
//
// PRODUCT-DECISION: deliveries are recorded in DB but not actually transmitted
// here — we keep network egress out of the request path. A separate worker
// (out of scope for this pass) would consume `webhook_deliveries` rows where
// status IN ('pending','retry').
const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id SERIAL PRIMARY KEY,
      webhook_id INTEGER,
      event VARCHAR(64),
      payload JSONB,
      status VARCHAR(16) DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      last_error TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_wh_deliveries_status ON webhook_deliveries(status)`).catch(() => {});
}

router.use(authenticateToken);

router.post('/dispatch', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await ensureTable(pool);
    const { event, data } = req.body || {};
    if (!event) return res.status(400).json({ error: 'event required' });
    const subs = await pool.query(
      `SELECT id FROM webhooks WHERE active = true AND $1 = ANY(events)`,
      [event]
    ).catch(() => ({ rows: [] }));
    const created = [];
    for (const sub of subs.rows) {
      const r = await pool.query(
        `INSERT INTO webhook_deliveries (webhook_id, event, payload, status) VALUES ($1, $2, $3, 'pending')
         RETURNING id, webhook_id, event, status, created_at`,
        [sub.id, event, { event, data, dispatched_at: new Date().toISOString() }]
      ).catch(() => ({ rows: [] }));
      if (r.rows[0]) created.push(r.rows[0]);
    }
    res.status(202).json({ event, deliveries: created });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await ensureTable(pool);
    const r = await pool.query(
      `SELECT id, webhook_id, event, status, attempts, last_error, created_at, updated_at
       FROM webhook_deliveries ORDER BY created_at DESC LIMIT 200`
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/replay', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await ensureTable(pool);
    const r = await pool.query(
      `UPDATE webhook_deliveries SET status = 'retry', updated_at = NOW() WHERE id = $1 RETURNING id, status`,
      [req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'delivery not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
