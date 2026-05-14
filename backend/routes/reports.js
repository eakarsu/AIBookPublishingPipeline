// Reporting / export endpoints — Apply pass 5 (TOO-RISKY → additive).
//
// Original audit: "Missing reporting/export". Full schema-authoring report
// system was deferred. This module ships the additive, non-breaking path:
//   - GET /api/reports/_/types          → list available report types
//   - GET /api/reports/manuscripts.csv  → tab/CSV export of manuscripts table
//   - GET /api/reports/royalties.csv    → CSV export of royalty rows
//   - GET /api/reports/sales-summary    → JSON aggregate (total titles, royalty totals, manuscript status counts)
//
// Schema-tolerant: every query is wrapped with .catch(()=>({rows:[]})) so a
// missing column doesn't break the endpoint.
const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

function rowsToCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map(r => cols.map(c => escape(r[c])).join(','))].join('\n');
}

router.get('/_/types', (req, res) => {
  res.json({
    types: [
      { id: 'manuscripts.csv', desc: 'All manuscripts (CSV)' },
      { id: 'royalties.csv',   desc: 'Royalty rows (CSV)' },
      { id: 'sales-summary',   desc: 'Sales / royalty aggregate (JSON)' },
    ],
  });
});

router.get('/manuscripts.csv', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const r = await pool.query(`SELECT * FROM manuscripts ORDER BY id DESC LIMIT 5000`).catch(() => ({ rows: [] }));
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="manuscripts.csv"');
    res.send(rowsToCSV(r.rows));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/royalties.csv', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const r = await pool.query(`SELECT * FROM royalties ORDER BY id DESC LIMIT 5000`).catch(() => ({ rows: [] }));
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="royalties.csv"');
    res.send(rowsToCSV(r.rows));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/sales-summary', async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const ms = await pool.query(`SELECT status, COUNT(*)::int AS n FROM manuscripts GROUP BY status`).catch(() => ({ rows: [] }));
    const ro = await pool.query(`SELECT COALESCE(SUM(amount),0)::numeric AS total_amount, COUNT(*)::int AS n FROM royalties`).catch(() => ({ rows: [{ total_amount: 0, n: 0 }] }));
    const titles = await pool.query(`SELECT COUNT(*)::int AS n FROM manuscripts`).catch(() => ({ rows: [{ n: 0 }] }));
    res.json({
      titles: titles.rows[0]?.n || 0,
      manuscript_status_counts: ms.rows,
      royalty_total: Number(ro.rows[0]?.total_amount || 0),
      royalty_rows: ro.rows[0]?.n || 0,
      generated_at: new Date().toISOString(),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
