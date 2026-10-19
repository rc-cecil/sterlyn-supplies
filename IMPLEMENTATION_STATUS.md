# Sterlyn implementation status — 18 October 2026

**Quote-first demo is runnable; public launch is not approved.** Payments, Google generation, OpenAI execution and indexing remain disabled. No real owner credentials or business claims were invented. Existing design, official logo, concept labels and databases/volumes are preserved.

This matrix supersedes older pending statements. Historical checkpoints and earlier failures are retained in `docs/IMPLEMENTATION_HISTORY.md`.

## Current acceptance matrix

| Gate | Current state and evidence |
| --- | --- |
| Persistence and infrastructure | Verified native development plus Docker demo. Original web/worker/PostgreSQL/MinIO/Mailpit retained; isolated processor and antivirus added. Named database/object/definition volumes preserved. No database reset. Native iteration remains preferred for speed. |
| Quote-first customer journeys | Catalogue/search/filter, quick view/comparison, cart, quote submission, addresses, wishlist/history, planner persistence and ownership checks implemented. Concurrent cart updates tested. Payments and AI stay disabled even with credential-like configuration. |
| Identity and administration | Protected concurrent owner bootstrap, actual Better Auth MFA, pre-enrollment session revocation, recovery-code replacement/hiding and replay denial, staff invitations, suspension/session revocation, role denial and append-only audits tested. Synthetic owners removed; real private owner enrollment is still required. |
| Password recovery | Expiry, single use and old-session invalidation passed browser tests. Docker registration, verification and reset messages also passed through actual Mailpit SMTP capture. No external email delivery is claimed. |
| Invoices, fulfillment and privacy | Draft/issue/void, transactional numbering, immutable snapshots and printable scoped invoices implemented. Approved seller/tax details gate issuance. Fulfillment creates transactional customer notifications and customer-visible status/tracking updates. Customer order responses exclude internal notes, actor IDs and access fields. Owner-reviewed erasure requires approved retention policy and explicit closed-order eligibility; commercial amounts/audit evidence retained. Real business/legal approval remains absent. |
| Publishing and correctness | Product/CMS/media schedules, cancellation and execution-time publisher revalidation implemented. Optimistic catalogue/CMS save conflicts, inventory concurrency, immediate idempotent cancellation releases, quote conversion, publication rollback and audit immutability tested with PostgreSQL. |
| Media | Real Docker multipart and signed uploads, idempotent finalization, fresh antivirus scan, image processing, MP4 transcode/poster metadata, approval/publication/rollback, malformed/EICAR rejection, failed retry, unavailable scanner and expired-lease recovery passed. New approval, rollback and media scheduling revalidate scanner readiness; unavailable scanning blocks publication. Actual worker kill/restart recovery, responsive image outputs and idempotent publication replay also passed. Spool processor has no network/secrets, non-root user, read-only root, bounded resources/deadlines and non-symlink bounded output reads. |
| Migrations | Eight additive migrations reproduced in a new uniquely named database; Prisma reports no schema drift. Existing databases upgraded without reset. |
| Backup/restore | Original plain Docker restore retained. New encrypted database/object backup and isolated restore passed: 44 public tables and 3 objects matched fingerprints/hashes. Temporary restore targets removed. Off-host scheduling, key custody, retention and production-equivalent restore remain operator gates. |
| CSP and request security | Production script nonce CSP verified in browsers; no production script unsafe-inline/eval. Motion-compatible inline styles intentionally retained. Bounded JSON/uploads, same-origin writes, shared limits, private-media authorization and redacted request/audit correlation implemented. No penetration-test certification is implied. |
| Logo and imagery | Canonical-derived trace diagnostic IoU 0.977005; aspect error 0.002141. Corrected shared R3F/Remotion geometry and v3 fallback rendered: 1280×720, 300 frames/10 seconds, first/last mean channel delta 0.166783/255. Official original unchanged. Native 1672px hero cannot meet large desktop DPR 2 sharpness; responsive delivery does not restore missing source detail. |
| Visual/browser acceptance | Complete release browser suite: 15 passed (6.1 minutes). Subsequent focused recovery-code form and customer invoice/field-redaction checks passed. All 23 admin modules captured after data loading at desktop/tablet/mobile. Twelve additional product, journal, checkout, company/legal and reset routes passed a final Docker browser sweep (36 viewport captures). Latest lab set: 45 image placements, two native-resolution shortfalls, maximum observed CLS 0.084455 and LCP 2248 ms. Evidence: `out/release-evidence/`. Physical-device and production-network results are not claimed. |
| Code checks | Latest unit/PostgreSQL run: 35 passed; typecheck and lint passed. Native database-independent and final standalone Docker builds passed. Patched-runner regression passed. Evidence and exact commands are retained in out/release-evidence and the operations guide. |
| Dependency security | Nodemailer 10.1.6 and Vitest 4.1.11 updates verified. Production dependency audit: zero advisories. Full development audit: one upstream braces lint-tool advisory with no published patch; see docs/DEPENDENCY_SECURITY.md. This finding is retained for release review, not suppressed. |
| Deployment | Standalone production Compose and actual Caddy validation passed. Single migration job with separate migration-owner connection, restricted runtime-role SQL, private services, TLS proxy, restart/readiness checks and isolated processor configured. Temporary-role tests denied audit update/delete/truncation, migration writes and public-schema creation. Earlier release readiness and worker/scanner/storage probes passed; the latest Docker Desktop recovery has scanner startup/readiness pending (see the current catalogue checkpoint). Production services/TLS are not deployed. The documented Next standalone Docker entry point serves the running demo, with earlier readiness HTTP 200 after media recovery. |
| CI and monitoring | CI authored with fresh migrations, checks, browser tests and artifacts. Earlier aggregate operational checks passed; the latest scanner/worker readiness probe is pending after Docker Desktop recovery. Backup freshness is explicitly null until an approved BACKUP_MAX_AGE_HOURS policy is configured; it is not reported as verified. Hosted CI, remote alerts and backup freshness scheduling have not run here. |

## Changed implementation areas

- `src/lib/media-upload.ts`, `media-scan.ts`, `media-process.ts`, `storage.ts`; `scripts/media/processor.mjs`, worker, Dockerfiles and Compose services.
- `src/lib/release-operations.ts`, `scheduling.ts`, `commerce.ts`, `admin.ts`, `customer.ts`, `auth.ts`, `request-context.ts`; API field allowlists, invoice/admin/account interfaces and bounded JSON ingestion.
- Prisma migrations for leases/upload intents, invoices/privacy/schedules and schema alignment.
- Canonical logo tracing/verification, shared geometry, v3 fallback and responsive hero image delivery; existing composition retained.
- Backup/restore/operations scripts, CI, TLS proxy and `docs/RELEASE_OPERATIONS.md`.
- Unit, PostgreSQL integration, browser ownership/recovery/concurrency/visual tests and Docker media/mail fixtures.

## Current verification commands

Use Node 24 and the lockfile. Test database must be `sterlyn_test`.

```sh
pnpm typecheck
pnpm lint
RUN_DATABASE_TESTS=true pnpm test
pnpm exec tsx scripts/verify-migrations.ts
pnpm exec tsx scripts/verify-runtime-role.ts
pnpm build
pnpm exec tsx scripts/test-server.ts
pnpm test:e2e
pnpm audit --prod
```

Docker fixture commands run inside the worker, using the existing private demo environment and compose.yaml + compose.demo.yaml:

```sh
DEMO_MEDIA_VERIFY=true node --import tsx scripts/verify-docker-media.ts
DEMO_RECOVERY_VERIFY=true node --import tsx scripts/verify-docker-recovery.ts
node --import tsx scripts/check-operations.ts
```

Actual worker-stop acceptance also passed via `DEMO_MEDIA_VERIFY=true node scripts/verify-worker-interruption.mjs` on the host, with the fixture lease expiry accelerated after the kill.

These create/remove only disposable fixtures; the media test refuses to bootstrap over an existing owner. Do not run demo fixture scripts in production. Encrypted backup/restore commands and private configuration are documented in `docs/RELEASE_OPERATIONS.md`.

## External launch inputs and explicit limitations

1. Privately configured owner email/password, actual MFA enrollment and recovery-code custody. Never send these in chat.
2. Approved business identity/contact, legal/privacy/retention content, sender/recipient details, and commercial/tax information for invoice issuance.
3. Production host/domain/TLS and database/storage/SMTP service credentials; verified external delivery, private storage permissions/CORS and production readiness.
4. Approved off-host backup location, retention/key custody, monitoring alert destinations, recovery objectives and production-equivalent restore/rollback rehearsal.
5. Higher-resolution authorized hero imagery for large DPR 2 displays; physical-device and production-network performance review. Current source limitation is retained honestly.
6. Hosted CI, production runtime-role/grant verification, review of the unpatched development lint dependency, and final launch review. Public indexing requires a separate explicit launch decision. Payment/AI credentials are neither requested nor needed for this quote-first launch.

Demo: http://localhost:3100 · captured mail: http://localhost:8026. Demo credentials and Mailpit are excluded from standalone production configuration. No real owner remains configured. Local verification is complete for the gates above; production launch remains gated by the listed external inputs and limitations.

## 18 October — collections and inspiration separation

- Implemented an independent six-story Inspiration journal. Product catalogue titles now describe products; room/palette/material story titles and their existing imagery live in the journal. Home material-story links lead there.
- Expanded the illustrative quote-first catalogue to 18 products: three each in fitted kitchens, cabinetry, islands/peninsulas, worktops, sinks/taps and storage. Eighteen distinct original generated assets are optimised to WebP (2,894,520 total bytes). Prompts, dimensions, hashes and provenance: `docs/product-image-manifest.json`; content boundary/reference research: `docs/CATALOGUE_CONTENT.md`.
- Native refresh created 10 records and refreshed eight recognisable legacy seed records without deleting IDs or commercial records. A repeat returned `created:0, refreshed:0, preserved:18`. Transactional refresh now also checks original names, descriptions, images, category/material/style and unverified variants before changing legacy products.
- Shared bundled-image validation supports the new product directory in admin editing, category editing and CSV, while rejecting remote URLs and traversal. The initial PostgreSQL regression identified this compatibility gap; the correction passed the full suite: six files, 35 tests. Full lint and native production build passed. The latest build includes the breadcrumb/caption contrast correction; existing visual direction and official logo remain unchanged.
- Initial browser runs exposed the contrast issue, privacy-banner test preconditions and asynchronous cart-loading waits; those were corrected. A software-WebGL hero scroll run timed out. Initial logs remain in `out/catalogue-browser-initial.log` and `out/catalogue-browser-second.log`; focused verification is ongoing, with screenshots in `out/catalogue-review/`.
- Final focused acceptance passed: three tests (5.2 minutes), zero unexpected/flaky results, all 15 page/viewport combinations and screenshots, zero unloaded main images, no overflow or page errors, and main-content WCAG A/AA checks. The cart/finish/reload/quotation journey persisted in the isolated PostgreSQL database. Evidence: `out/catalogue-review/test-results.json`, `browser-report.json` and PNG captures.
- Docker web/worker builds and deployment completed. Refresh created 10 records and refreshed eight legacy records; the persisted verifier confirmed 18 distinct product images, six journal stories, three products per category, quote-only variants and eight preserved refreshed IDs. The verifier passed again after Docker Desktop restart, demonstrating retained catalogue/audit data. Live Docker hero controls/mobile layout passed; a navigation timing assertion was corrected to await the route transition, and its targeted replay passed (8.2 seconds).
- Operational limitation encountered after the resource-heavy Docker image export: antivirus stopped responding despite a stale healthy status; Docker could not restart the container. Docker Desktop was restarted without resetting/deleting volumes, and the same seven services were brought back. Antivirus definition loading and worker/scanner readiness remained pending on the subsequent aggregate probe (storage passed; no overdue/failed media jobs or notifications requiring review). Do not treat Docker operational readiness as resolved until `/api/ready` returns 200 and `scripts/check-operations.ts` passes. The verified standalone production build is running as a native preview on port 3000 with external SMTP disabled; Collections and Inspiration both returned HTTP 200 over direct loopback. A development compiler had stalled, so it was stopped in favour of this built preview. Existing launch/credential/legal gates remain unchanged. No payments, AI execution or indexing enabled.

Final operational checkpoint: direct-loopback native Collections and Inspiration returned HTTP 200. The final Docker `/api/ready` request returned HTTP 503 (`Required services are not ready`). Recreating only antivirus was attempted with its existing definition volume, but Docker reported `tried to kill container, but did not receive an exit event`; no volume or database was removed. This remains a Docker daemon/container recovery issue, not a passed readiness gate. Native review remains available at `http://localhost:3000/collections` and `/inspiration`. The user's confirmation that Docker Engine is running does not establish scanner readiness. Final catalogue application/data checks remain passed as recorded above.

### 18 October 2026 — explicit local admin testing request

The account holder requested testing without authenticator enrollment. Added a server-only `LOCAL_ADMIN_SKIP_MFA` option guarded by explicit launch-disabled configuration, loopback server binding, localhost HTTP auth URL, and loopback `/sterlyn` database. It applies only to unenrolled authenticated staff; already enrolled factors are not disabled. Shared page/API checks preserve current roles, suspension, password sessions, and audit writes. Dashboard shows a testing notice. No MFA database flags or secrets were altered. Production/Docker configuration does not set this option; scheduled publishing still requires verified MFA. Disable by restarting the native preview without the option. See `docs/OWNER_SETUP.md`.

Verification: local testing guard test passed (including missing flag, public launch, wildcard bind, remote auth/database, malformed database URL and wrong database rejection); scoped ESLint passed; Next production build passed compilation and TypeScript (`out/local-admin-build.log`). Restarted native preview on 127.0.0.1:3000 with the explicit option. Existing owner browser session successfully opened `/admin`, displayed local-testing notice and loaded actual empty database aggregates/quotation pipeline through authenticated APIs. This supersedes earlier statements that no local owner exists: a local owner is now configured by the operator. Production owner/MFA and other launch gates remain separate.

### Admin simplification — implementation in progress
Six-section navigation, dedicated product/category editor with photo picker, database overview, optional stock flag and relational picture metadata implemented. Additive migration applied to native dev and isolated test DB. PostgreSQL regression: 39 tests passed. Native and Docker builds passed. Recharts removed; AI insights endpoint removed. Docker scanner restarted successfully with existing definitions; current new UI upload journey still needs full verification. Browser acceptance and updated Docker deployment are in progress; do not interpret this entry as full acceptance. User requested retaining local testing MFA exemption and a later reminder; a thread reminder was created to prompt restoration and verified owner enrollment when production launch becomes actionable.

Latest continuation: Docker web/worker updated; `/api/ready` returned ready after scanner recovery. Product browser acceptance completed creation, publication, category movement and storefront visibility, then failed accessibility on muted text contrast. Contrast fixes are applied in source; rebuild and complete browser rerun remain pending. Native port 3000 retains the user-requested testing MFA exemption. The launch-security reminder was created successfully. No production security configuration changed.

### 18 October — Sites client preview logo refinement

The separate, read-only Sites client preview was updated and published as version 5 at `https://sterlyn-supplies-client-preview.vastcedar11.chatgpt.site/`; its custom viewer access is unchanged. The hero now has no 3D quality-off control or black plinth/video fallback. Its live WebGL monogram uses a smoothed contour derived from the official crop, with beveled extrusion and a transparent canvas placed over the cabinetry. The original logo asset is unchanged. The replacement vector scored 0.9557 normalized silhouette IoU against the official monogram crop; local browser checks at 1440, 768 and 390 CSS-pixel widths showed no horizontal overflow and the logo remained within the kitchen scene. The hosted page loaded the WebGL class and new vector, had one motion control, and reported no console errors. Static vector fallback remains for reduced motion or unavailable WebGL. This Sites preview remains illustrative and read-only; it is not the full Next/PostgreSQL application or a production launch.
