// Rights management agent — Apply pass 5 (NEEDS-PRODUCT-DECISION).
//
// PRODUCT-DECISION: the audit asks for a "rights management agent". An agent
// implies (a) long-running multi-step planning and (b) tool-use over real
// vendor APIs (foreign rights, audio-only deals, translation rights, film
// option clearance). We pick a *reasonable default* topology:
//   - Single AI call per request, no agent loop (deterministic latency, no runaway tokens).
//   - Inputs: a contract id (preferred) or free-text rights description.
//   - Outputs: rights inventory, conflict flags, expiration timeline, suggested next actions.
//   - Persistence: writes findings into a `rights_assessments` table (CREATE IF NOT EXISTS).
//   - Multi-step agent + outbound-vendor automation deferred until creds + sign-off.
//
// 503 contract: returns 503 if OPENROUTER_API_KEY is missing.
const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');
const { callOpenRouter, parseAIJson } = require('../lib/aiHelpers');

async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rights_assessments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      contract_id INTEGER,
      input JSONB,
      output JSONB,
      raw_text TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
}

router.use(authenticateToken);

router.post('/assess', async (req, res) => {
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(503).json({ error: 'AI not configured: OPENROUTER_API_KEY is missing', missing: 'OPENROUTER_API_KEY' });
  }
  try {
    const pool = req.app.locals.pool;
    await ensureTable(pool);
    const { contract_id, description, territories = [], formats = [] } = req.body || {};

    let contract = null;
    if (contract_id) {
      const r = await pool.query('SELECT * FROM contracts WHERE id = $1', [contract_id]).catch(() => ({ rows: [] }));
      contract = r.rows[0] || null;
    }

    const systemPrompt = 'You are an experienced book-publishing rights manager. Identify granted rights, conflict flags, expiration dates, and recommended actions. Be concise. Return STRICT JSON.';
    const userPrompt = `Rights assessment.

CONTRACT (if any): ${contract ? JSON.stringify(contract).slice(0, 4000) : '(none)'}
FREE-TEXT DESCRIPTION: ${description || '(none)'}
TERRITORIES OF INTEREST: ${territories.join(', ') || '(any)'}
FORMATS OF INTEREST: ${formats.join(', ') || 'print, ebook, audio, film'}

Return STRICT JSON:
{
  "granted_rights": [{ "format": "...", "territory": "...", "term": "..." }],
  "conflict_flags": ["..."],
  "expiration_timeline": [{ "right": "...", "expires_on": "YYYY-MM-DD or null", "auto_renew": true }],
  "recommended_actions": ["..."],
  "disclaimer": "Advisory only — confirm with rights counsel before any action."
}`;

    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw);

    await pool.query(
      `INSERT INTO rights_assessments (user_id, contract_id, input, output, raw_text)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user?.id || null, contract_id || null, { description, territories, formats }, parsed, raw]
    ).catch(() => {});

    res.json({ contract_id: contract_id || null, assessment: parsed || raw, generated_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    await ensureTable(pool);
    const r = await pool.query(
      `SELECT id, contract_id, output, created_at FROM rights_assessments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.user?.id || null]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
