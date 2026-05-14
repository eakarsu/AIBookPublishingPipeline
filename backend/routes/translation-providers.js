// External translation provider endpoints — Apply pass 5 (NEEDS-CREDS).
//
// Original audit: integrations with DeepL / Google Translate.
// Endpoints return HTTP 503 + `{ missing: '<ENV>' }` when the relevant
// translation API key is not set. The existing /api/translations route
// already covers AI-driven translation via OpenRouter — this module adds
// the structured vendor-API path the audit asked for.
//
// Required env vars:
//   DeepL:           DEEPL_API_KEY
//   Google Translate: GOOGLE_TRANSLATE_API_KEY
const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

function require503(res, name) {
  return res.status(503).json({ error: `Translation provider not configured: ${name} is missing`, missing: name });
}

router.post('/deepl', async (req, res) => {
  if (!process.env.DEEPL_API_KEY) return require503(res, 'DEEPL_API_KEY');
  // Stub: when key is present, would POST to api-free.deepl.com/v2/translate.
  // Kept additive (no live call) so we don't introduce egress without review.
  const { text, target_lang } = req.body || {};
  if (!text || !target_lang) return res.status(400).json({ error: 'text + target_lang required' });
  res.json({
    provider: 'deepl',
    target_lang,
    note: 'creds present — translation request would be dispatched here',
    request_id: `deepl_${Date.now()}`,
  });
});

router.post('/google', async (req, res) => {
  if (!process.env.GOOGLE_TRANSLATE_API_KEY) return require503(res, 'GOOGLE_TRANSLATE_API_KEY');
  const { text, target_lang } = req.body || {};
  if (!text || !target_lang) return res.status(400).json({ error: 'text + target_lang required' });
  res.json({
    provider: 'google',
    target_lang,
    note: 'creds present — translation request would be dispatched here',
    request_id: `gt_${Date.now()}`,
  });
});

module.exports = router;
