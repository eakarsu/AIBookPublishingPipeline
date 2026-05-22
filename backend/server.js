require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = (() => { try { return require('compression'); } catch (_) { return null; } })();
const { Pool } = require('pg');
const { ensureAIResultsTable } = require('./lib/aiHelpers');

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Security headers
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// CORS from env (comma-separated origins) — falls back to localhost dev
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
}));

if (compression) app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Make pool available to routes
app.locals.pool = pool;

// Ensure ai_results table exists at startup (non-fatal if DB is down)
ensureAIResultsTable(pool).catch(e => console.warn('ai_results init failed:', e.message));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/manuscripts', require('./routes/manuscripts'));
app.use('/api/covers', require('./routes/covers'));
app.use('/api/metadata', require('./routes/metadata'));
app.use('/api/distribution', require('./routes/distribution'));
app.use('/api/royalties', require('./routes/royalties'));
app.use('/api/authors', require('./routes/authors'));
app.use('/api/series', require('./routes/series'));
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/production', require('./routes/production'));
app.use('/api/translations', require('./routes/translations'));
app.use('/api/preorders', require('./routes/preorders'));
app.use('/api/competitors', require('./routes/competitors'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/events', require('./routes/events'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/webhooks', require('./routes/webhooks'));
// Apply pass 5 — additive route registrations (notifications, integrations,
// translation providers, reports, webhook deliveries, rights agent).
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/translation-providers', require('./routes/translation-providers'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/webhook-deliveries', require('./routes/webhook-deliveries'));
app.use('/api/rights-agent', require('./routes/rights-agent'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));


app.use('/api/rights-mgmt-agent', require('./routes/rightsManagementAgent')); // apply pass 6 — audit custom suggestion

app.use('/api/multilingual-launch', require('./routes/multilingualLaunch')); // apply pass 6 — audit custom suggestion

app.use('/api/pricing-elasticity', require('./routes/pricingElasticity')); // apply pass 6 — audit custom suggestion

app.use('/api/publishing-integrations', require('./routes/publishingIntegrations')); // apply pass 6 — audit custom suggestion
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});


// === Batch 01 Gaps & Frontend Mounts ===
app.use('/api/gap-no-ai-voiceover-audiobook-generation-pipeline', require('./routes/gap_no_ai_voiceover_audiobook_generation_pipeline'));
app.use('/api/gap-no-image-generation-for-marketing-assets-covers', require('./routes/gap_no_image_generation_for_marketing_assets_covers'));
app.use('/api/gap-no-ai-sales-channel-reconciliation', require('./routes/gap_no_ai_sales_channel_reconciliation'));
app.use('/api/gap-no-ai-fraud-piracy-scanning-across-retailers', require('./routes/gap_no_ai_fraud_piracy_scanning_across_retailers'));
app.use('/api/gap-notification-routes-exist-but-no-actual-sms-email-', require('./routes/gap_notification_routes_exist_but_no_actual_sms_email_'));
app.use('/api/gap-no-e-book-conversion-pipeline-epub-mobi-pdf', require('./routes/gap_no_e_book_conversion_pipeline_epub_mobi_pdf'));
app.use('/api/gap-no-print-run-cost-calculator', require('./routes/gap_no_print_run_cost_calculator'));
app.use('/api/gap-no-bookseller-retailer-crm-module', require('./routes/gap_no_bookseller_retailer_crm_module'));
app.use('/api/gap-no-direct-ingramspark-kdp-api-client-integrations-', require('./routes/gap_no_direct_ingramspark_kdp_api_client_integrations_'));

// === Custom Views — 4 supplementary publishing features ===
app.use('/api/custom-views', require('./routes/customViews'));
app.use('/api/rights-reversion', require('./routes/rightsReversionRisk'));
