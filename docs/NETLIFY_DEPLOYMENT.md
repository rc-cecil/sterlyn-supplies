# Netlify + Neon release

Target: `sterlynsupplies.netlify.app`, existing project `fe6af24e-a6ea-46a7-9815-0636bd485bb3`. The repository uses Netlify's managed Next.js adapter; publish `.next`, never the old static preview. The `netlify.toml` file defines the build and additional scheduled functions.

## Private database setup

1. In Neon **Connect**, copy the complete pooled PostgreSQL URL to `DATABASE_URL` in ignored `.env.production.local`. Keep `sslmode=require` (or `verify-full`).
2. Copy the direct connection to `DIRECT_URL`. If omitted, the checker derives the standard non-pooler hostname for the same endpoint. Never paste credentials in chat or commit the private file.
3. Run `pnpm db:production:check`. It connects, prints record counts without customer data, and checks migration history. It makes no schema changes. If a populated database has no Prisma migration history, reconcile it before applying anything; do not reset it.
4. After reviewing the existing migration history, run `pnpm db:production:migrate` to apply pending migrations using the direct endpoint. This command never resets or seeds the database.
5. Verify existing catalogue and business records. Seed only a genuinely empty catalogue after review; never replace real orders/customers or seed fabricated business activity.

## Runtime environment

Configure on Netlify with **Builds and Functions** scopes; changing values requires a new deploy:

| Key | Required value |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection, SSL enabled |
| `DIRECT_URL` | Neon direct connection for migration commands |
| `BETTER_AUTH_URL` | `https://sterlynsupplies.netlify.app` |
| `BETTER_AUTH_SECRET` | Existing strong production secret, 32+ characters |
| `TRACKING_ENCRYPTION_KEY` | Stable 64 hexadecimal characters; preserve an existing key |
| `PUBLIC_LAUNCH` | Enable indexing only after business/legal review |

Owner/staff password authentication and permissions remain enforced. Authenticator enrollment is optional, including for scheduled catalogue publishing. Do not deploy local testing bypasses. Create the owner privately using the existing owner setup workflow; do not publish invitation tokens or passwords.

## Work that continues in the cloud

`netlify/functions/notifications.mts` runs every minute on published deploys. It reuses notification leases, deduplication, retry rules, and honest SMTP outcomes. It claims at most one message per invocation with bounded SMTP timeouts. Without SMTP configuration, messages remain queued and are not claimed as sent. This small-business default processes at most 60 messages/hour; increase throughput through a dedicated worker if needed.

`netlify/functions/publications.mts` runs every minute for at most one due product/CMS publication. Existing transaction/authorization checks apply. Media publication remains with the isolated media worker. Scheduled functions are not public HTTP administration endpoints and do not run automatically for preview deploys.

The existing Docker worker can still be used for larger queues and media. Scheduled notification processing is independent of media failures.

## Communication and media boundaries

- Guest enquiries save to PostgreSQL before the WhatsApp continuation link opens. The customer must press Send in WhatsApp; no API credential is needed for this handoff. Incoming WhatsApp conversations are not synchronized into the site.
- Tracking links can be copied by authorized staff and shared manually while email setup is pending. Tracking pages remain account-free and restrict private fields.
- Configure SMTP host/port, credentials and `MAIL_FROM` later. Customer verification, password-reset, confirmation and status messages cannot reach inboxes until then. Guests can enquire and track without creating accounts; owner-issued staff credentials do not require an email invitation.
- Uploads need persistent S3-compatible storage plus a hosted antivirus/isolated processing service. Netlify/Neon alone do not provide the existing shared-spool container pipeline. Keep uploads fail-closed until those services are hosted; existing bundled catalogue imagery remains available. Never approve unscanned uploads to obtain a passing deployment.

## Release verification

Run TypeScript, ESLint, unit and isolated PostgreSQL tests, production build, browser customer/staff workflow and dependency audit. Never run destructive test fixtures against Neon production.

Before publishing, verify database migrations, owner login, catalogue, enquiry persistence/idempotency, staff assignment, order conversion, tracking privacy and scheduled functions. The public `/api/health` must report a database connection. The database-free demonstration has been removed; every deploy requires backend configuration. Remove any obsolete `STERLYN_CLIENT_PREVIEW` setting from the hosting dashboard when maintaining its environment.

Inspect the deployed function schedule and logs after publication. A queued email or a successful build is not evidence of inbox delivery or a verified end-to-end launch.

Official references: [Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), [scheduled functions](https://docs.netlify.com/build/functions/scheduled-functions/), [Prisma with Neon](https://neon.com/docs/guides/prisma).
