# Sterlyn showroom operations

## Implemented workflow

Catalogue / inspirations / Design Studio → Contact → persistent Quote enquiry → customer reviews and sends WhatsApp message → staff records agreement → reviewed conversion → confirmed unpaid order → queued confirmation email → private account-free tracking → status emails.

A saved enquiry is not a sent WhatsApp message. A queued email is not delivered mail; `smtp_accepted` means only that the SMTP server accepted it. External receipts require independent owner/admin confirmation. Sales and fulfilment staff may advance delivery under an agreed deposit or credit arrangement; the decision is audited.

## Reused systems and database upgrade

`Quote` remains the enquiry source of truth. Its JSON items contain validated immutable product/inspiration/design snapshots, with a separate immutable scene snapshot where provided. The existing `Order`, `OrderItem`, `Payment`, `OrderEvent`, `Notification`, CMS revisions, audit log, Better Auth and worker remain in use. New `Customer` and `EnquiryEvent` tables fill missing responsibilities rather than duplicating those systems.

The additive `20261101090000_showroom_operations` migration adds guest-customer links, request deduplication, versioned updates, flexible items, order references, external receipts/reversals, tracking credentials and email job fields. Existing references are preserved, quote sequences are not restarted, and old orders retain a null friendly reference until separately reviewed. Historical payments, invoices and audit records are retained. New order totals are negotiated all-in amounts; null item prices do not assert a unit price or tax breakdown.

New enquiries use minimum-six-digit SQ references and orders use SSL references. These identify records; they are never access credentials. Legacy workflow values remain stored and are mapped for display. Legacy pending-payment orders need staff review rather than automatic confirmation. Existing reservation cancellation still releases stock once.

## Configuration and local development

Use PNPM with the repository's lockfile. Configure PostgreSQL in `.env`, then:

```sh
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm db:migrate
pnpm dev
pnpm worker
```

Never run `prisma migrate reset` on a business database. Take and verify a database backup before a reviewed deployment migration. Use a migration-owner connection to deploy and rerun `ops/runtime-role.sql` grants after introducing tables/sequences; web/worker use the restricted runtime role.

Required shared server/worker configuration:

- `DATABASE_URL`: PostgreSQL runtime connection.
- `BETTER_AUTH_URL`: public application origin; HTTPS in production.
- `BETTER_AUTH_SECRET`: existing authentication secret.
- `TRACKING_ENCRYPTION_KEY`: 32 cryptographically random bytes encoded as 64 hexadecimal characters. Generate privately with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Keep this key backed up and identical on web/worker instances. Changing it requires a reviewed tracking-link reissue process.
- `SMTP_HOST`, `SMTP_PORT`, optional `SMTP_USER` / `SMTP_PASSWORD`, and `MAIL_FROM`: provider-approved production sender. No production address is invented by this application.
- `TRUST_PROXY=true` only behind a trusted proxy that replaces forwarded address headers. Otherwise rate limits intentionally share a local source bucket.

Development mail should use Mailpit, normally SMTP port 1025 and inbox port 8025. Use a development-only sender and never real SMTP credentials for automated tests. Missing SMTP configuration leaves jobs queued and is visible in Business Settings. Provider failure details shown in administration are sanitized.

Tracking links contain a 256-bit random token in the URL fragment. Validation uses a SHA-256 hash; the reusable token is encrypted at rest with AES-256-GCM. Keep links private. Admins can revoke or regenerate them. Completion/cancellation expires a link after 90 days. Recovery sends only to the order's existing address, uses generic responses and hourly job deduplication, and does not reactivate revoked or expired links.

## Staff operation and permissions

Password-based Better Auth remains mandatory for administration; authenticator enrollment is not required. The sales role can manage enquiries, customers and orders and read negotiated financial details. Only owner/admin can confirm or reverse external receipts. Fulfilment users receive order DTOs without financial amounts or receipts. Catalogue/content permissions remain scoped. Owner invitation, suspension, session revocation, audit and retention controls remain available.

Guests are not merged just because they typed an existing email. Staff review provisional contacts and confirm identity matches; verified signed-in identities can link automatically. Customer history is consolidated without requiring a login account. Retention execution remains subject to the existing owner-approved policy; there is no automatic deletion of commercial data.

## Deployment distinction

The existing Docker deployment supports the full PostgreSQL-backed Next.js application and a persistent worker. Keep the application and worker on the same reviewed image and key/configuration. Check `/api/health`, `/api/ready`, Business Settings and email delivery failures after deployment. Email jobs are processed before optional media work; media service readiness remains a separately configurable requirement.

The database-free Netlify client preview is a visual preview. Contact explicitly disables persistent submission there; it does not fabricate enquiry references, order activity or email success. Optional direct WhatsApp contact remains available. A database-backed deployment and worker are required for business operations. This feature branch must be reviewed and tested before any merge or production deployment.

## Verification

Run typecheck, lint, unit tests, isolated PostgreSQL tests, production build, Playwright and dependency audit:

```sh
pnpm typecheck
pnpm lint
pnpm test
DATABASE_URL=postgresql://.../sterlyn_test RUN_DATABASE_TESTS=true pnpm test
pnpm exec tsx scripts/verify-migrations.ts
pnpm exec tsx scripts/verify-showroom-upgrade.ts
pnpm exec tsx scripts/verify-runtime-role.ts
pnpm build
pnpm exec tsx scripts/test-server.ts
pnpm test:e2e
pnpm audit --prod
```

Integration/browser scripts reject non-test database names. Migration verification creates disposable databases and checks both fresh-schema drift and preservation of populated legacy quotes/orders/items/payments/invoices. Existing databases are not reset. Browser evidence is written to ignored `out/` and `test-results/` directories.

## Optional official WhatsApp synchronization

Initial enquiry capture and order tracking require no Cloud API access. WhatsApp handoff uses the business number +447576899618 and requires the customer to press Send.

Before a future Cloud API implementation, verify the actual number type, number ownership, Business App coexistence eligibility, Meta Business Portfolio/WABA setup, required app/system-user permissions and any business verification requirements. Do not migrate or unregister the current number on an assumption that it will coexist with the app. Some Meta onboarding documentation was rate-limited during research; account-specific eligibility remains unverified.

Use official HTTPS webhooks with challenge verification and raw-body signature validation. Deduplicate provider event IDs before recording conversation-linked activity. Treat a reference found in a message as a matching suggestion, not proof of identity, order ownership or payment. Keep this transport integration isolated from core enquiry/conversion services; do not add another order or customer store. No scraping or WhatsApp Web automation is included.

Official references:

- [WhatsApp messaging policy](https://whatsappbusiness.com/policy/?faq=5): templates and customer-service messaging permissions.
- [WhatsApp platform pricing](https://whatsappbusiness.com/products/platform-pricing/): delivered-message rates vary by recipient market and message category; service responses have a 24-hour customer-service window. Check current rates and any provider fees before budgeting.
- [Meta Cloud API collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api): platform permissions and webhook configuration.
- [Meta Business App onboarding](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users): verify current coexistence requirements before connecting this number.

No live incoming/outgoing Cloud API synchronization, verified WhatsApp delivery receipts, or automatic payment interpretation is enabled in this release.
