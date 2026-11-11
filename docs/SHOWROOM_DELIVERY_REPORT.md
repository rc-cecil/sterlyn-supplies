# Showroom operations delivery report

Latest: the owner/staff workflow was shortened on 3 November 2026 and email setup is on hold. See [the current staff guide](STAFF_GUIDE.md) and the final follow-up section below.

Original upgrade: 1 November 2026, draft PR #3. At the owner's request on 2 November, the completed feature branch was fast-forwarded into **local `main`** and the local feature branch deleted. No GitHub merge, push or production deployment was performed for this follow-up.

## Local admin simplification — 2 November 2026

Staff means a human owner, sales employee or delivery colleague. The portal now prioritizes Home, Enquiries, Orders, Customers and Catalogue. Occasional maintenance tools expand under Other tools instead of competing with daily work. Each enquiry/order explains the next step; optional assignment, notes, delivery details, tracking administration and history expand as needed.

Home includes database-backed daily enquiry/order trends, fulfilment bars, follow-ups, clearer empty states and an expandable usage guide. Primary actions have visible button surfaces, consistent hover/press transitions, keyboard focus and reduced-motion support. Existing authentication, permissions, customer pages and public-site animations are preserved.

Read [the staff guide](STAFF_GUIDE.md) and open [the local screenshot walkthrough](../out/staff-walkthrough/index.html). Screenshots use only synthetic contacts and agreements in the isolated test database; no WhatsApp message or external email is sent. They cover customer selection through staff agreement, deposit/balance, delivery completion, private tracking and generated HTML email.

Follow-up files: `src/components/Admin.tsx`, `src/components/admin/Overview.tsx`, `src/components/admin/BusinessOperations.tsx`, `src/components/admin/Products.tsx`, `src/lib/admin-overview.ts`, `src/app/globals.css`, the associated product/workflow tests, this report and `docs/STAFF_GUIDE.md`. There is no additional migration or new dependency. Local work remains uncommitted for review in VS Code.

Follow-up validation: production build, TypeScript, ESLint and 56 unit/database tests passed; the extended trend permission/count checks passed. The extended browser workflow (including deposit and balance) and staff-authentication checks passed. The responsive catalogue browser check also passed, including product publication/category reassignment and accessibility checks at desktop, tablet and phone sizes. All three targeted browser checks passed across the final focused runs. The gallery contains 19 numbered screenshots and is served locally at http://127.0.0.1:3005/. The initial browser run completed the business steps but exposed missing synthetic-payment cleanup in the test; that cleanup was corrected without changing business data or relaxing constraints. The old six-section navigation assertion was updated to the deliberately simplified five-task navigation. Faster navigation exposed an existing race where Add product could open before categories loaded; that action now waits for initial loading to finish.

The design detector reported no findings in the changed admin UI. No new suppressions were added.

## Original upgrade delivery — 1 November 2026

## Implemented features

- Contact persists canonical product/inspiration/design snapshots before WhatsApp handoff. Name/email are required, phone is optional, signed-in defaults preserve edits, repeated submissions reuse a persistent key, and failed submissions preserve details. Selection removal is retained. Successful submissions clear only submitted selections and show a reload-safe reference/continuation confirmation.
- Dedicated enquiry, order and customer workspaces; grouped filters; responsive desktop tables and flat labeled mobile rows; staff assignment, internal notes, activity histories and direct WhatsApp actions. Existing product/media/CMS tools remain. Inspiration wording uses existing CMS revisions and reviewed publication while preserving original images.
- Reviewed, transactional enquiry conversion creates one unpaid order and tracking credential, copies requested items/specifications/design/customer notes, generates an SSL reference and queues confirmation. GHS defaults with GBP/USD supported; no fabricated unit prices.
- Owner/admin record independently verified external deposits and receipts, with idempotent commands and audited reversals. Sales can prepare orders. Outstanding balances and historical settled payments remain distinguishable from pending/unverified payments. Fulfilment remains a staff decision.
- Valid order transitions, concurrency checks, previous/new status, responsible staff, internal/public notes, delivery dates/details, same-state suppression, and transactional notification creation.
- Branded HTML/plain-text email, deduplication, processing leases, bounded retries, SMTP-accepted/failed/unknown visibility and reviewed resend. Local Mailpit capture works without external email delivery.
- Account-free tracking with random 256-bit tokens, hashed lookup and encrypted reusable tokens; URL fragments, no-store/no-index/no-referrer, rate limits, revocation/regeneration, terminal-state expiry and generic recovery responses. Public DTOs exclude customer contacts, finances, payment details and staff notes.
- Account-independent customers, verified identity linking and staff-reviewed guest matches. Matching does not overwrite existing reviewed customer details. Existing owner-approved privacy operations cover the new customer/tracking fields.
- Operational counts/date periods, activity feeds, conversion metrics, delivery backlog and notification failures. Financial summaries use confirmed manual receipts with reversals and separate currencies. Legacy checkout, shopping-bag mutation, quote-acceptance chat, payment settlement and alternate contact capture paths are retired; historical commercial records remain.

## Database changes and reuse

The additive migration is `prisma/migrations/20261101090000_showroom_operations/migration.sql`. It adds Customer and EnquiryEvent, extends Quote/Order/OrderItem/Payment/OrderEvent/Notification, and introduces the order reference sequence. Existing SQ references, sequences and commercial records are preserved. Legacy orders retain existing identifiers; existing status values are mapped for display/filtering rather than destructively rewritten.

Reused: Better Auth password sessions and roles; PostgreSQL/Prisma; Quote and item/scene snapshots; Order's unique source-quote link and locking; Payment and historical invoices/refunds; append-only AuditLog; notification polling and worker; CMS revisions/publication; catalogue/media infrastructure. No online gateway or duplicate order-management engine was introduced.

A private backup of the existing local database was taken before applying the migration locally. PostgreSQL business databases were never reset. Private tracking configuration lives in ignored `.env`; it is not committed.

## Verification results

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| ESLint | Passed |
| Complete unit/PostgreSQL suite | 56 tests passed across 12 files |
| Fresh migration/schema drift | Passed; no drift |
| Populated legacy upgrade | Passed; quotes, orders, items, payments and invoices preserved |
| Runtime database permissions | Passed; audit mutation/truncation, migration mutation and schema creation denied |
| Production build | Passed, including a preview build with database/auth settings explicitly empty |
| Preview runtime | Homepage/Contact 200 with visible preview notice; live submissions 503 |
| Docker Compose configuration | Passed without interpolation or environment-file resolution |
| Production dependency audit | Zero known vulnerabilities after compatible Zod, Vitest and fast-uri patches |
| Browser regression | All 37 current cases have passing local evidence across regression/focused runs. The initial full run passed 32/33; its corrected journey passed. Follow-ups passed 8/8 and 7/7 Contact cases, then 11/12 backend/render cases; the software-renderer scroll failure was resolved in a 6/6 dedicated render/layout run. The former single capture batch is now four viewport cases, with live WebGL isolated in its own browser. |
| Responsive/accessibility | Admin enquiry/order/customer and tracking checked at 1440/820/390px; public catalogue/editor/planner, hero spacing, CSP, ownership and authentication regressions checked |
| Local mail pipeline | HTML/plain-text message SMTP-accepted and captured by Mailpit; no external delivery |
| Local application | Health/readiness 200, tracking page 200, unauthenticated admin API 401 |
| Private environment secret scan | No private environment secrets found in changed files |

Follow-up CI identified a long software-WebGL screenshot batch timeout and a browser-context setup failure. The capture batch is split into four viewport cases using the existing accessible fallback; live WebGL remains covered separately in its own browser at desktop/phone sizes, including frame fit and absence of pause controls. Workflow concurrency cancels redundant runs of the same branch. Preview-only configuration also exposed eager authentication initialization, now deferred until backend use with explicit production configuration safeguards. Remote checks are rerun through the draft PR.

The first browser checks exposed a product guidance contrast issue and an escaping hidden mobile table heading; both were fixed. Independent visual review then requested visible stacked mobile records; the focused verdict scored that fix resolved without desktop/tablet regression. Documentation verification preserved the incumbent identity and did not repair unrelated design-document drift.

The mechanical design detector found only the existing functional 2D planner grid. A narrow `codex-grid-background=*` exception scoped to `src/app/globals.css` preserves this measurement canvas. No layout-transition finding remains in the checked source; no security checks were suppressed. PostgreSQL tests emit an upstream pg concurrent-query deprecation warning; they pass and no safety check is disabled.

## Configuration, deployment and limitations

The project is running locally at http://127.0.0.1:3000 with PostgreSQL and a background worker. Mailpit captures development email at http://127.0.0.1:8025. Optional media storage/scanner/processor services are not configured in this native session; email processing continues independently and the worker reports deferred media cleanup honestly.

Before a reviewed production deployment: configure the HTTPS application origin, PostgreSQL runtime/migration connections, shared tracking-encryption key, verified business domain/sender and SMTP credentials. Back up the database, deploy additive migrations, refresh runtime grants, then run the web server and persistent worker from the same reviewed image. Confirm health/readiness and email failure visibility. Full instructions and recovery/key-management notes are in [showroom operations](SHOWROOM_OPERATIONS.md).

The database-free Netlify preview is explicitly visual/read-only and cannot persist enquiries or operate tracking/notifications. No production sender, payment confirmation, price or delivery date was invented. Actual email inbox delivery is not asserted from queueing or SMTP acceptance. Official WhatsApp Cloud API synchronization remains future work, with onboarding/coexistence/permissions/pricing research and integration boundaries documented; initial operation requires no Meta API access. CI status belongs to the draft PR and must be reviewed before merging. Nothing was merged into main or deployed to production.

## Modified files

The pre-existing Contact removal/responsive work is preserved in separate baseline commit `6d7988e`. Upgrade files follow:

- [`.env.example`](../.env.example)
- [`.github/workflows/verify.yml`](../.github/workflows/verify.yml)
- [`.impeccable/config.json`](../.impeccable/config.json)
- [`IMPLEMENTATION_STATUS.md`](../IMPLEMENTATION_STATUS.md)
- [`PRODUCT.md`](../PRODUCT.md)
- [`README.md`](../README.md)
- [`compose.production.yaml`](../compose.production.yaml)
- [`docs/OWNER_SETUP.md`](../docs/OWNER_SETUP.md)
- [`docs/RELEASE_OPERATIONS.md`](../docs/RELEASE_OPERATIONS.md)
- [`docs/SHOWROOM_DELIVERY_REPORT.md`](../docs/SHOWROOM_DELIVERY_REPORT.md)
- [`docs/SHOWROOM_OPERATIONS.md`](../docs/SHOWROOM_OPERATIONS.md)
- [`next-env.d.ts`](../next-env.d.ts)
- [`next.config.ts`](../next.config.ts)
- [`package.json`](../package.json)
- [`pnpm-lock.yaml`](../pnpm-lock.yaml)
- [`pnpm-workspace.yaml`](../pnpm-workspace.yaml)
- [`prisma/migrations/20261101090000_showroom_operations/migration.sql`](../prisma/migrations/20261101090000_showroom_operations/migration.sql)
- [`prisma/schema.prisma`](../prisma/schema.prisma)
- [`scripts/test-server.ts`](../scripts/test-server.ts)
- [`scripts/verify-showroom-upgrade.ts`](../scripts/verify-showroom-upgrade.ts)
- [`scripts/worker.ts`](../scripts/worker.ts)
- [`src/app/[[...slug]]/page.tsx`](../src/app/[[...slug]]/page.tsx)
- [`src/app/api/[...path]/route.ts`](../src/app/api/[...path]/route.ts)
- [`src/app/globals.css`](../src/app/globals.css)
- [`src/components/Admin.tsx`](../src/components/Admin.tsx)
- [`src/components/AdminLegacy.tsx`](../src/components/AdminLegacy.tsx)
- [`src/components/ClientPreview.tsx`](../src/components/ClientPreview.tsx)
- [`src/components/CommerceViews.tsx`](../src/components/CommerceViews.tsx)
- [`src/components/CustomerQuotes.tsx`](../src/components/CustomerQuotes.tsx)
- [`src/components/Designer.tsx`](../src/components/Designer.tsx)
- [`src/components/Inspiration.tsx`](../src/components/Inspiration.tsx)
- [`src/components/InvoiceDocument.tsx`](../src/components/InvoiceDocument.tsx)
- [`src/components/OrderTracking.tsx`](../src/components/OrderTracking.tsx)
- [`src/components/ShowcaseEnquiry.tsx`](../src/components/ShowcaseEnquiry.tsx)
- [`src/components/admin/BusinessOperations.tsx`](../src/components/admin/BusinessOperations.tsx)
- [`src/components/admin/BusinessSettings.tsx`](../src/components/admin/BusinessSettings.tsx)
- [`src/components/admin/Inspirations.tsx`](../src/components/admin/Inspirations.tsx)
- [`src/components/admin/Notifications.tsx`](../src/components/admin/Notifications.tsx)
- [`src/components/admin/Overview.tsx`](../src/components/admin/Overview.tsx)
- [`src/lib/admin-overview.ts`](../src/lib/admin-overview.ts)
- [`src/lib/admin.ts`](../src/lib/admin.ts)
- [`src/lib/auth.ts`](../src/lib/auth.ts)
- [`src/lib/commerce.ts`](../src/lib/commerce.ts)
- [`src/lib/domain.ts`](../src/lib/domain.ts)
- [`src/lib/enquiry.ts`](../src/lib/enquiry.ts)
- [`src/lib/http-error.ts`](../src/lib/http-error.ts)
- [`src/lib/inspiration-content.ts`](../src/lib/inspiration-content.ts)
- [`src/lib/inspiration.ts`](../src/lib/inspiration.ts)
- [`src/lib/notification-delivery.ts`](../src/lib/notification-delivery.ts)
- [`src/lib/operations.ts`](../src/lib/operations.ts)
- [`src/lib/order-email.ts`](../src/lib/order-email.ts)
- [`src/lib/order-tracking.ts`](../src/lib/order-tracking.ts)
- `src/lib/quote-response.ts` — deleted
- [`src/lib/release-operations.ts`](../src/lib/release-operations.ts)
- [`src/lib/security.ts`](../src/lib/security.ts)
- [`src/lib/showroom-domain.ts`](../src/lib/showroom-domain.ts)
- [`src/lib/showroom.ts`](../src/lib/showroom.ts)
- [`tests/auth-configuration.test.ts`](../tests/auth-configuration.test.ts)
- [`tests/e2e/bag-feedback.spec.ts`](../tests/e2e/bag-feedback.spec.ts)
- [`tests/e2e/contact-removal.spec.ts`](../tests/e2e/contact-removal.spec.ts)
- [`tests/e2e/continuation.spec.ts`](../tests/e2e/continuation.spec.ts)
- [`tests/e2e/logo-render.spec.ts`](../tests/e2e/logo-render.spec.ts)
- [`tests/e2e/owner.spec.ts`](../tests/e2e/owner.spec.ts)
- [`tests/e2e/product-management.spec.ts`](../tests/e2e/product-management.spec.ts)
- [`tests/e2e/quote-autofill.spec.ts`](../tests/e2e/quote-autofill.spec.ts)
- [`tests/e2e/release-visual.spec.ts`](../tests/e2e/release-visual.spec.ts)
- [`tests/e2e/showroom-operations.spec.ts`](../tests/e2e/showroom-operations.spec.ts)
- [`tests/e2e/storefront.spec.ts`](../tests/e2e/storefront.spec.ts)
- [`tests/notifications.integration.test.ts`](../tests/notifications.integration.test.ts)
- [`tests/operations.integration.test.ts`](../tests/operations.integration.test.ts)
- [`tests/product-management.integration.test.ts`](../tests/product-management.integration.test.ts)
- [`tests/showroom.integration.test.ts`](../tests/showroom.integration.test.ts)
- [`tests/showroom.test.ts`](../tests/showroom.test.ts)

## Workflow simplification — 3 November 2026

- Personal Gmail sender settings and the personal setup note were removed; outbound email configuration is paused. Existing queue records are preserved.
- The workspace adapts Efferd's free Dashboard 1 to real enquiries and assigned work. [Source/license notes](vendor/EFFERD.md).
- Agreement review, conversion, tracking creation and one confirmation email queue entry happen in one transaction. An explicit agreement checkbox replaces the separate Agreed-status save. Existing Agreed enquiries and conversion retries remain supported.
- Routine notes are optional. Actor, stage and time are recorded automatically; recent activity is visible. Financial receipt corrections still require a reason. Successful actions close edit forms and show a saved confirmation; normal order progress uses one-action buttons.
- Owner-issued work email/password accounts work without Google or email invitations. The owner can reset passwords and revoke sessions; no password is stored in audit summaries. Creating application access does not provision an email mailbox.
- Ordinary sales/support/fulfilment staff see and update their assigned records, with server-side checks. Owner/admin retain cross-team management. Customer history respects the same assignment boundaries; financial receipt permissions remain owner/admin only.
- Owners/assigned sales staff can copy an existing active tracking link without regenerating it or adding an email. Public tracking still hides internal records.
- Existing data, staff accounts, permissions, public-site design and Design Studio are preserved. No database migration or additional dependency is required. All work remains local on main.

Follow-up verification: 59 unit/PostgreSQL tests passed across 12 files, with the concurrent retry/conversion scenarios retained. TypeScript, ESLint and the production build passed. Owner authentication/session boundaries passed; catalogue publication, category reassignment and desktop/tablet/phone accessibility passed; the guest → one-step confirmation → owner-issued staff login → assigned fulfilment → customer tracking browser workflow passed. The last two focused browser cases passed together; the owner check passed in its preceding focused run.

The first visual pass exposed a footer contrast ratio of 4.47:1; it was corrected and the accessibility checks passed. A parallel build/test run hit the existing five-second transaction timeout under resource contention; the complete suite passed with files run sequentially, without increasing production transaction timeouts. The catalogue browser check now waits for and validates the save response before inspecting the confirmation. Routine detail notes are read from the existing audit history for staff display, without adding status events or customer emails.

The manual design detector returned no findings; no new suppressions were added. Current screenshots are in ignored `out/streamlined-workflow/`, with the gallery in `out/staff-walkthrough/index.html` and at http://127.0.0.1:3005/ while the local gallery server is running. No business database was reset, no real email or WhatsApp message was sent, and no GitHub push, branch creation or production deployment was performed.

## Interactive Efferd dashboard refinement — 3 November 2026

The workspace now adapts the free Efferd Dashboard 1 area-chart treatment using Recharts, replacing the previous static graph. It adds 7/30/90-day periods, keyboard and pointer tooltips, enquiry/order series toggles, animated selection tabs, metric updates, and work-list transitions. Reduced-motion preferences disable movement. All production statistics still come from the existing permission-scoped overview endpoint.

The large instruction/email cards were removed from the overview. A compact delivery summary, three actionable metrics and a searchable enquiry/order queue keep the screen focused. Assigned staff retain their task list before reports. Existing account, catalogue, order and tracking functionality is preserved. The public website is unchanged.

Changed for this refinement: `src/components/admin/Overview.tsx`, new `src/components/admin/ActivityChart.tsx`, scoped dashboard styles in `src/app/globals.css`, `package.json`/`pnpm-lock.yaml` (Recharts), `tests/e2e/dashboard-motion.spec.ts` and source notes in `docs/vendor/EFFERD.md`. No database migration or new business-data model.

The production build, TypeScript and ESLint passed. Both browser checks passed: interactive chart/date/filter/keyboard/reduced-motion behavior with desktop/tablet/phone WCAG AA and overflow checks; and the existing guest enquiry → agreement/order → owner-issued staff → assigned fulfilment → guest tracking workflow. The production dependency audit reports no known vulnerabilities. The manual design detector returned no findings; no suppressions were added. A real footer contrast issue was corrected. Screenshots contain synthetic records from the isolated test database, not invented production figures.

Current dashboard screenshots are in ignored `out/efferd-dashboard/`. The local screenshot gallery at http://127.0.0.1:3005/ has been refreshed. No external email or WhatsApp message was sent. Work remains local, with no branch creation, push or deployment.

Regression verification for this refinement: all 59 unit/PostgreSQL tests across 12 files passed with sequential files. PostgreSQL emitted an existing query-concurrency deprecation warning; there were no failing tests.

## Netlify/Neon preparation — 11 November 2026

Pulled `origin/main` with a fast-forward to `aa05000`. Removed the unused standalone `sites/sterlyn-supplies-client-preview` copy and 19 generated local log files; preserved the main application, public assets, existing databases/backups and walkthrough screenshots.

Added `netlify.toml`, two scheduled Netlify functions, a bounded queue-delivery option, small PostgreSQL pools, direct migration URL support, and the private production database inspection/migration commands. Scheduled catalogue publishing now honors optional authenticator enrollment while retaining role/suspension checks. See [deployment instructions](NETLIFY_DEPLOYMENT.md).

Verification: production build, TypeScript, ESLint and `git diff --check` passed. All 71 unit/PostgreSQL tests passed across 15 files, including scheduled-job preview safeguards, bounded queue processing and publication without mandatory MFA. The initial database-test attempt failed because the persisted local PostgreSQL instance was stopped; after starting it without resetting data, the suite passed. Production dependency audit found no known vulnerabilities.

Release is **not yet published**: the current Netlify production setting still enables read-only preview, confirmed by HTTP 503 from `/api/health`. Netlify returns its saved database credentials masked. The ignored `.env.production.local` file has been prepared for the pooled Neon URL, but no Neon connection or migration has been claimed without those credentials. Existing production secrets were not replaced. No GitHub push or production setting change has been made in this preparation step.

Email setup remains deferred by the business. SMTP delivery, customer verification/reset emails, and automatic order emails will not reach inboxes until configured. WhatsApp handoff and manual sharing of secure tracking links are the communication paths available without email. Arbitrary media uploads also require hosted object storage, antivirus and the isolated processor; the code retains those safeguards. A database-only deployment must not be described as supporting that pipeline.

Both production-build browser checks passed: interactive responsive dashboard and the guest enquiry → reviewed order → owner-issued staff login → assigned fulfilment → private customer tracking workflow (2 passed). These used the isolated local test database, not Neon or the live Netlify site.

## Published Netlify release — 11 November 2026

Release commit `24d1358` was pushed to `main` and published successfully as Netlify deploy `6af4e9dac6ba669fd25f6718` at **https://sterlynsupplies.netlify.app**. The earlier preparation-only status above is superseded by this release entry.

- Neon SSL connection verified: migration history already current, 22 published catalogue products, five categories. No migration, reset or catalogue overwrite was needed.
- Updated production-only database URLs, application URL and a new tracking-encryption key in Netlify. Preserved the existing authentication secret. Production preview mode is off; dev/branch/PR contexts remain read-only. Public indexing is still disabled (verified in robots.txt).
- Live `/api/health`: HTTP 200 with database connected. Home, collections, inspiration, Design Studio, Contact, staff login and owner setup returned HTTP 200. Browser navigation to `/admin` correctly led to `/staff`; anonymous admin API access returned 401.
- A uniquely marked disposable guest enquiry was saved through the deployed API into Neon with the canonical selected product and quantity. Retrying returned the same ID/reference, with exactly one database record. Its WhatsApp continuation contained the saved reference and correct business number. No WhatsApp message or real email was sent. The disposable test event/enquiry was removed afterward; append-only audit records and reference sequence progress were retained. No real commercial records were removed.
- Netlify deployed the Next.js server plus `notifications` and `publications`, each with a per-minute schedule. Direct HTTP calls to those scheduled functions returned 403. The notification scheduler recorded a fresh cloud heartbeat in Neon without SMTP configured.
- Local verification remains 71 unit/PostgreSQL tests, two browser workflows, TypeScript, ESLint, production build and dependency audit passing. Those complete staff/order/tracking workflows used the isolated test database, not fabricated production orders.

### Required owner handoff and integration limits

There was no owner account in Neon at release. Prepared a new 24-hour single-use invitation using the existing approved owner email. The link and login instructions are in private, ignored `.local/production-owner-setup.txt`, with mode 0600; no token, password or connection string was committed. The owner must open that link, choose a password of 16+ characters, then sign in at `/staff`. Actual owner password login remains awaiting that human step. MFA is optional.

SMTP is still deferred: customer verification/reset and order emails remain queued, not delivered. WhatsApp handoff and manual secure tracking-link sharing work independently. Object storage and the hosted antivirus/isolated processor are still required for arbitrary media uploads; existing bundled product imagery and catalogue editing remain usable. Consequently, this is a published database-backed core showroom/operations release, not a claim that email and the media-processing pipeline are configured.

## Owner setup interaction fix — 11 November 2026

The owner setup route was statically generated while the proxy required fresh nonce-bearing scripts. The published page had 14 script tags and no nonce matching its CSP, so React never initialized and the submit button stayed disabled. The owner layout now awaits Next.js `connection()` to render per request, preserving the strict CSP. Updated the success state to link directly to staff sign-in and clarified private-link instructions.

Verification: production build renders `/owner-setup` dynamically; focused ESLint and seven parsing/authentication unit tests passed. New production-build Playwright coverage passed invitation hydration, fragment removal, manual full-link paste, owner creation, single-use rejection and actual owner password login into Administration, all using isolated `sterlyn_test`. No production password or owner account was created by the test.

## Collection curation and comprehensive workflow verification — 11 November 2026

Archived `pa-tap-1215` and `pa-tap-1218` in Neon because their soft white-background supplier cut-outs were inconsistent with the styled collection photography. Removed them from the bundled catalogue/preview source so a fresh seed cannot republish them. There are now 20 published products; the Sinks & taps collection shows four cards. Product/variant records, historical enquiry snapshots and the original image files are retained. The scoped curation helper audits changes, is repeat-safe and skips pictures changed concurrently by staff. Reapply explicitly with `pnpm exec tsx scripts/retire-tap-previews.ts --production`; no migration or database reset is involved.

Verification results:

- 71 unit/PostgreSQL tests passed across 15 files, covering enquiry validation/retries, transactional conversion, reference uniqueness, receipts/permissions, order transitions/audit, notification deduplication/retries, tracking privacy/expiry/revocation/recovery, and catalogue integrity.
- The complete browser run exercised 39 cases: 38 passed; one legacy test expected `/account` instead of the current staff entry `/staff`. Its expectation was corrected and the full anonymous-route/API/CSRF case passed in a focused rerun. All 39 scenarios are verified, with no remaining failed application checks.
- Browser coverage includes catalogue categories and imagery, item removal, account autofill, guest save/retry, staff login/session revocation/assignment, product editing, owner setup, customer data isolation, guest tracking, complete fulfilment, mobile/tablet/desktop accessibility, reduced motion, continuous 3D logo, WebGL fallback and Design Studio persistence.
- The first catalogue run revealed three old isolated database fixtures still assigned to the retired Storage category. Reassigned only those test fixtures to current Cabinetry before rerunning. Production category assignments were untouched.
- Real SMTP was exercised only against an isolated local Mailpit inbox on ports 1027/8027. Seven order emails were accepted and captured, including the main order's six confirmation-through-completion messages. Verified references, HTML/plain text, secure tracking links and WhatsApp contact. No external email or WhatsApp message was sent. Added an opt-in `VERIFY_MAILPIT=true` browser check with strict loopback/test-database guards.
- Production build, TypeScript, ESLint and diff checks passed. Live `/collections/sinks` returned four cards with neither retired tap link. Live invalid-token lookup returned 404 and no contact, financial or other private order fields. Production owner account and tracking configuration are present.

The email preview is in ignored `out/streamlined-workflow/09-completed-order-email.html`; workflow and responsive screenshots remain under `out/streamlined-workflow/` and `out/catalogue-review/`. These are synthetic isolated fixtures and their tracking records are cleaned up after verification. Raw check logs are under ignored `out/curation-verification/`.

Remaining service configuration: actual customer email delivery (including verification/reset/recovery emails) is paused until a sender/SMTP service is configured. Media uploads still require hosted object storage, antivirus and isolated processing; those checks remain fail-closed. WhatsApp communication is a saved-enquiry handoff that the customer reviews and sends; inbound WhatsApp synchronization is not implemented. These limitations are not counted as verified production delivery.
