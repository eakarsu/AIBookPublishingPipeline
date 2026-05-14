# Audit Apply Note — AIBookPublishingPipeline

Source: `_AUDIT/reports/batch_01.md` § 7.

## Original audit recommendations
- Missing notifications system
- Missing reporting/export
- Missing integration API (no webhooks)
- Strategic: rights management agent, multilingual launch optimization, real-time competitive pricing
- Integrations: IngramSpark, Amazon KDP, Smashwords, translation APIs

## Implemented in this pass (MECHANICAL)

| # | Item | File | Endpoints |
|---|------|------|-----------|
| 1 | Webhook subscription stub | `backend/routes/webhooks.js` (new) + `backend/server.js` | `GET/POST/DELETE /api/webhooks`, `POST /api/webhooks/:id/test`, `GET /api/webhooks/_/events` |

Allowed events: manuscript.submitted/approved/rejected, cover.created, metadata.updated, distribution.scheduled/live, royalty.statement_generated, review.received, preorder.opened. Lazy table creation; uses `req.app.locals.pool` to match existing route style. `node --check` passes.

## Backlog (not implemented)

| Item | Tag | Why deferred |
|------|-----|---------------|
| Email/SMS/push notifications | NEEDS-CREDS | SMTP / Twilio / FCM credentials |
| Reporting/export | TOO-RISKY | Schema authoring + UI |
| Outbound webhook delivery | TOO-RISKY | Background job infra |
| IngramSpark / Amazon KDP / Smashwords | NEEDS-CREDS | Vendor API keys |
| Translation APIs (DeepL, Google) | NEEDS-CREDS | Vendor API keys |
| Rights management agent | NEEDS-PRODUCT-DECISION | Agent topology |

## Apply pass 3 (frontend)

FE already wired. Domain pages (Manuscripts, CoverDesigns, Metadata, Distribution, Royalties, Authors, Series, Marketing, Reviews, Production, Translations, Preorders, Competitors, Analytics, Contracts) each call their respective `/ai/*` endpoint via `api.post()`. `pages/AITools.js` lists the 8 advanced tools (genre-trends, reader-demographic, plagiarism-check, multilang-evaluate, rights-advisor, pricing-optimizer, blurb-generator, review-aggregator). No changes needed.

## Apply pass 4 (mechanical backlog)

**SKIPPED.** Every row in the Backlog table is tagged NEEDS-CREDS (SMTP/Twilio/FCM, IngramSpark, Amazon KDP, Smashwords, DeepL/Google translate), TOO-RISKY (reporting/export schema authoring, outbound webhook delivery infra), or NEEDS-PRODUCT-DECISION (rights management agent topology). The 8 advanced AI tools and 16 domain `/ai/*` endpoints already cover every audit-suggested mechanical AI counterpart. No new backend endpoints or FE pages added.
