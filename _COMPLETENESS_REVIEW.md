# Completeness Review: AIBookPublishingPipeline

- **Review date:** 2026-07-18
- **Assessment basis:** Static source and configuration inspection only. Dependencies were not installed, and no build, database migration, external integration, or runtime workflow was executed.

## Classification

**Broken-inert-unsafe**

## Verdict

This repository cannot currently deliver its advertised book publishing workflow application: the launcher requires a `frontend` application, but the repository contains only the backend side. The remaining backend and generated feature surface do not compensate for the missing runnable application boundary.

## Why it is not complete

- The launcher changes into `frontend` and installs/starts it, while that directory and its package manifest are absent.
- Startup also installs dependencies, mutates/loads local data, and terminates port owners, so it is unsafe as a verification command.
- No recognizable application test files were found in the inspected tree.
- No CI workflow was found to continuously verify builds, tests, migrations, or security checks.
- No environment example/template was found, so required configuration and secret boundaries are undocumented.

## Needed features

- 1. Implement a workflow to move manuscripts through versioned editing, rights, design, proofing, metadata, distribution, and royalty stages.
- 2. Connect document storage, editorial tools, ISBN/metadata, print/ebook rendering, distribution, and accounting; replace seed/demo records with durable, synchronized data and explicit failure handling.
- 3. Validate manuscript version integrity, EPUB/PDF outputs, metadata, and royalty calculations.
- 4. Enforce rights provenance, reviewer approvals, access controls, and durable audit history.
- 5. Add contract, integration, authorization, migration, and end-to-end tests in CI, plus a documented non-destructive deployment/run path.

## Risks or launch blockers

- The advertised application does not start from the checked-in tree because a required UI package is missing.
- Credential/secret fallback or demo-password patterns occur in 2 files and must be removed or made development-only.
- The root launcher can terminate unrelated processes occupying configured ports.
- The root launcher seeds, creates, migrates, or otherwise mutates database state during startup.
- The root launcher installs dependencies at run time, reducing reproducibility and expanding supply-chain risk.
- Ungrounded or malformed model output can become a domain action unless schemas, evidence, evaluations, and approval gates are added.

## Evidence inspected

- `backend/package.json` — declared scripts, runtime dependencies, and application boundaries.
- `backend/server.js` — service composition, middleware, and registered routes.
- `backend/routes/ai.js` — implemented API surface and domain/AI request handling.
- `backend/routes/analytics.js` — implemented API surface and domain/AI request handling.
- `backend/routes/auth.js` — implemented API surface and domain/AI request handling.
- `start.sh` — launcher behavior, dependency/database setup, and process handling.

## Recommended next action

Restore or remove the missing UI contract first, then replace the launcher with non-destructive setup/start commands and add a smoke test before considering feature development.

## Implementation progress — 2026-07-18

1. **Partially implemented:** `web/public/app.js` now provides authenticated manuscript creation plus manuscript, production, task, and royalty pipeline views. Full versioned editorial approvals, rights, proofing, metadata, distribution, and royalty state machines remain incomplete.
2. **Partially implemented / externally blocked:** The UI uses existing backend records with explicit error handling. Document storage, editorial tools, ISBN services, EPUB/PDF rendering, print/distribution channels, and accounting integrations require vendor APIs, credentials, and commercial agreements.
3. **Blocked by external tooling and reference outputs:** Manuscript version integrity, EPUB/PDF conformance, retail metadata, and royalty calculations were not certified because renderers, distribution schemas, contracts, and reference cases are unavailable.
4. **Partially implemented:** Startup database initialization is opt-in, the client embeds no credentials, and authenticated APIs remain the boundary. Rights provenance policy, reviewer role matrices, tenant isolation, and immutable publishing audit history require further backend work and organizational decisions.
5. **Partially implemented:** `web/test/api.test.js` tests raw/paginated contracts and authenticated manuscript writes; the launcher is non-destructive and syntax-valid. CI, database integration, authorization, migration, rendering, and distribution end-to-end tests remain.
