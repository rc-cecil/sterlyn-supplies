# Implementation status — 18 October 2026

Public launch remains disabled. The existing visual composition and architecture are preserved. This is a runnable application with incomplete release gates, not a production launch certification.

## Implemented
- Next.js/React/TypeScript, PostgreSQL/Prisma and five additive migrations; illustrative quotation-only catalogue.
- Google SDK, generation endpoint, execution workers and controls removed. Historical jobs retained but excluded from dispatch. Payment initialization, settlement webhooks and OpenAI execution disabled server-side regardless of credentials.
- Original concept imagery replaces six inadequate source images, with retained provenance. Original official logo unchanged. Shared clean extruded monogram geometry and deterministic ten-second live/Remotion animation; versioned rendered fallback.
- Catalogue filters, variants, quick view, comparison, persistent cart, quotation submission, customer profile/addresses/wishlist/history and scoped data export. Privacy deletion requests are recorded for review; automatic erasure is not implemented.
- Kitchen planner with collision validation, unique module IDs, undo/redo local persistence, account save/load and optimistic version conflicts; scene snapshots on quotations.
- Transactionally serialized owner bootstrap, private environment credentials, verified MFA gate, expiring single-use staff invitations, suspension/reactivation and session revocation; owner access protected.
- Catalogue CSV draft import preview/commit and filtered export, variant creation, inventory adjustment safeguards and unpaid idempotent quote-to-order conversion with immutable snapshots.
- CMS revision history, preview/publication and media publication rollback; published home content/media bindings. Aggregate analytics use actual records.
- Bounded upload ingestion and signature checks, quarantined local processing, scanning/approval requirements, failed local-job retry and bounded notification delivery retries.
- CI workflow and isolated test server; restore-verification script refuses non-test databases.

## Verification evidence
- Strict TypeScript and ESLint checks pass at the latest verification checkpoint.
- 16 unit tests pass (domain, CSV, upload signatures and disabled-provider boundaries).
- Production build passes, including dynamic catalogue/API routes.
- Full combined Playwright suite: 8 tests passed (1.2 minutes), covering hero expansion, desktop/mobile overflow, catalogue/cart/quotation, quick view/comparison, planner persistence, anonymous admin denial, disabled integrations, catalogue accessibility and real Better Auth owner MFA. Screenshots are in `test-results`.
- Real PostgreSQL integration suite: 5 tests passed, covering concurrent owner bootstrap, staff invitation/suspension, concurrent idempotent quote conversion, CMS publish/rollback history, and database rejection of audit updates/deletions. Combined unit and integration run: 21 tests passed.
- Remotion/FFmpeg output: `public/video/sterlyn-logo-v2.mp4`, 1280×720, 300 frames, 10 seconds, 733221 bytes. Front/side/back frames inspected; first/last mean absolute channel difference 0.19738/255. Frames retained in `out/visual-verification`.
- All five migrations applied to local development and isolated test databases. Clean-database release reproduction still pending.

## External services and release blockers
- No real owner exists in the development database; private owner credentials are not configured. Synthetic test owners are removed after testing.
- SMTP, S3-compatible storage and antivirus processing are not end-to-end verified. Notifications remain queued without SMTP. No external delivery or processing success is claimed.
- Payment and AI execution are postponed; no credentials are requested. Local media templates remain available.
- Docker is unverified: local socket was inaccessible.
- Backup restoration is unverified: required `pg_dump`/`pg_restore` binaries are unavailable locally. The verification script stops before creating a restore database when tools are absent.
- CI is authored but has not run on GitHub.

## Incomplete acceptance gates
- Full registration/email verification/password recovery and recovery-code journeys with captured mail.
- Complete category/variant editing, gallery ordering, publication scheduling, invoices and fulfillment/communication workflows.
- Concurrent cart merging/inventory stress tests, record-ownership matrix, broader publication and authorization integration coverage.
- Privacy erasure execution, notification retry administration, production CSP tightening and fully isolated media execution.
- Actual object-storage upload/scan/transcode/approval/rollback journeys and failure recovery.
- Route-complete desktop/tablet/mobile screenshots, high-DPI asset delivery measurements, canonical logo silhouette overlay, performance/layout-shift profiling and final accessibility review.
- Approved business/legal content, deployment secrets, backups, operational monitoring and launch review.

No mocked result counts as a real payment, email delivery, storage operation or generation.

## Continuation — collections, admin and demo infrastructure

- Removed the duplicate “Shop the details” navigation/page. `/collections` is the single catalogue; `/shop` redirects there while preserving filters. Search, materials, bags and account links now use collections. Category-specific filters survive refinement.
- Added permission-checked category creation/editing, existing variant editing, and confirmed notification retries with audit records. Already-sent messages cannot be retried through this workflow.
- Local Mailpit 1.31.6 runs at `http://localhost:8025`, SMTP at `127.0.0.1:1025`. Ignored development configuration uses demo `.test` addresses. Real registration → queued notification → worker SMTP delivery → captured link → verified account passed. Disposable verification account removed. No business email credentials required or external delivery claimed.
- Actual PostgreSQL 18 dump/restore passed: 39 public tables matched both row counts and full-row fingerprints. Temporary restore database removed. Backup retained under ignored `.local/backups`. Official client tools built under `.local/tools` because shared Homebrew directories are not writable.
- Added private demo infrastructure configuration generator and Compose override with local-only mail and showroom port 3100. Compose configuration validates. Docker Desktop starts under the current user but remains at `starting`, without a Linux VM; container build/runtime verification is still blocked pending Desktop setup/startup.
- Latest unit/PostgreSQL run: 23 tests passed. Production build, TypeScript and ESLint passed. Browser verification: 8 storefront/redirect tests passed; owner/MFA test passed on isolated rerun (10.9 seconds), including categories and notification screens. Initial combined run had one ECONNRESET at the owner-protection request; the unchanged check passed on rerun. Screenshots retained in `out/visual-verification/collections-update`.

These results supersede earlier statements that demo SMTP or local restore tools were unavailable. Production email/storage/antivirus and full Docker runtime are still unverified. No owner account or default owner credentials were created.

## Docker verification continuation
- Docker Desktop engine 29.2.0 verified running after user sign-in.
- PostgreSQL 17 and Mailpit containers healthy; Docker SMTP accepted a local verification message. Docker inbox uses localhost:8026 (SMTP 1026), leaving native ports available.
- Application production build and TypeScript passed inside Linux Docker. Web service starts at localhost:3100; database health returns connected. Illustrative catalogue seeded. Worker runs.
- Clean deployment exposed operations migration sorting before foundation. Renamed it to 202610180004_operations and aligned completed local history without changing existing data. All five migrations successfully applied to the new Docker database.
- Runtime commands use Node directly to avoid package-manager dependency mutation under the restricted runtime user. Linux embedded-database install scripts explicitly disabled because Docker uses its separate database service.
- Pinned MinIO binary image is inaccessible from Docker Hub and Quay. Added Dockerfile.storage to compile the same official source release. Storage compilation is still pending, so complete Docker acceptance is not yet claimed.

### Docker acceptance results
- All five demo services are running: web, worker, PostgreSQL, Mailpit and source-built MinIO.
- Web database health and collections page return HTTP 200 at http://localhost:3100.
- MinIO live health returns HTTP 200; authenticated bucket creation and object write/read/delete passed from the web container. Verification object removed.
- Container-native pg_dump/pg_restore completed into a separate temporary database containing 39 public tables; temporary database removed.
- Docker SMTP test accepted a message; inbox is http://localhost:8026. Native inbox remains on 8025.
- These results supersede the earlier Docker startup/storage compilation blockers. Complete media scanning/rendering approval acceptance remains outstanding; core Docker runtime and storage operations are verified.

## Docker assessment and continued implementation
- Read-only Docker inventory, persistence, development/test requirements, production gaps and measured overhead documented in `docs/DOCKER_ASSESSMENT.md`. Existing services, volumes, network and architecture retained; no data reset or recreation performed.
- Continued catalogue administration with ordered gallery path editing in the existing product form. Server accepts up to 20 unique validated local image paths; changes use the existing permission checks and before/after audit trail. No public design changes. Source change requires a future Docker image rebuild to appear in the existing production-mode demo.
- TypeScript passes. Existing lint/unit verification performed separately; no external payment or AI integration enabled.

## Launch-completion implementation in progress
- Added scanner and network-disabled, non-root media processor services; processor has read-only root filesystem, dropped capabilities, resource limits and bounded spool. No existing data volume was reset.
- Docker verification passed with disposable synthetic owner/MFA and media fixtures: upload → current-definition antivirus scan → isolated processing → approval → publication → rollback; malformed media and EICAR signature rejected. Temporary owner/assets removed; audit evidence retained. Command: `DEMO_MEDIA_VERIFY=true node --import tsx scripts/verify-docker-media.ts` inside demo worker. A scanner protocol half-close bug found by verification was corrected.
- Added owner-bound expiring upload intents, idempotent finalization and server-only immutable input snapshots; media job attempts/leases/heartbeat, expired-job recovery, orphan cleanup and bounded non-symlink output reads. Latest hardened output-reader changes still need the final image rerun.
- Added invoice draft/issue/void services, approved-issuer gate, sequential numbering, immutable commercial snapshots and scoped printable views. Added owner-reviewed privacy requests and policy-gated non-commercial erasure; commercial-record requests remain retention-gated. Customer access and full UI journeys still under verification.
- Added idempotent scheduled publication for products, CMS revisions and approved media, cancellation and execution-time permission revalidation. Added transactional fulfillment notifications and status-conflict checks.
- Cart mutations now share transactional ownership/merge locks. Production script CSP uses per-request nonces; development-only evaluation retained, existing motion-compatible inline styles documented. CSP browser acceptance pending.
- Latest completed combined unit/PostgreSQL checkpoint: 25 tests passed, including invoice approval/idempotency and privacy policy/execution. Additional concurrent inventory/cart and recovery-code/password-reset tests are being run.
- All migrations reproduced in a new disposable PostgreSQL database with no Prisma schema drift after fixing the Notification timestamp default. No existing database was reset. Verification: `node --import tsx scripts/verify-migrations.ts`.
- Added separate production Compose/TLS proxy configuration and precise operator guide `docs/RELEASE_OPERATIONS.md`. Production services/accounts/TLS, encrypted off-host backup automation and production monitoring delivery remain unverified.
- A local release build caught accidental stylesheet corruption during editing. Restored the existing stylesheet from the verified Docker image and retained only bounded invoice print styles; rebuild and visual verification pending.
- This work is not a production-readiness declaration. Recovery/browser/performance/imagery/logo acceptance and final clean Docker image verification remain outstanding. No real owner, provider credentials, approved business/legal or retention policy have been invented.
