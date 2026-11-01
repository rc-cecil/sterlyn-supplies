# Sterlyn Supplies Limited

Next.js showroom and operations application. The supplied kitchen imagery is illustrative; all seeded catalogue entries are quote-only. No real prices, inventory, testimonials, or completed projects are implied.

Collections contain six product families with three illustrative product previews each. The Inspiration journal has separate room/material stories and imagery. Content boundaries, reference research and safe refresh instructions are in [catalogue content](docs/CATALOGUE_CONTENT.md); exact image prompts and provenance are in [the product image manifest](docs/product-image-manifest.json).

The persistent enquiry, external receipt, order-status email and guest tracking workflow is documented in [showroom operations](docs/SHOWROOM_OPERATIONS.md). Configure the shared tracking encryption key and run the notification worker for the complete experience.

## Local development

Use Node 24 and pnpm. Run `pnpm install`, copy `.env.example` to `.env`, set a unique authentication secret, and configure PostgreSQL. Then:

```sh
pnpm db:migrate
pnpm db:seed
pnpm dev
```

For an isolated local PostgreSQL process, `pnpm db:local` runs on port 55432 with data under ignored `.local/postgres`. Its development connection is `postgresql://sterlyn:local-development-only@localhost:55432/sterlyn`. Never use these local-only credentials in production.

The current workspace has a locally generated secret in ignored `.env`. No production credentials are included.

## Docker

For local demonstration, use the private demo configuration commands below. Apply the illustrative seed explicitly once using `docker compose --env-file .local/demo.env -f compose.yaml -f compose.demo.yaml exec web node --import tsx scripts/seed.ts`. Initialize the configured S3 bucket before media uploads. Docker web, worker, PostgreSQL, SMTP capture and source-built MinIO have run successfully. Database health, catalogue response, SMTP delivery, object write/read/delete and container-native backup restoration were verified. The restricted processor and antivirus services have also passed upload/scan/transcode/approval/publication/rollback and failure-recovery checks.

For deployment, use `compose.production.yaml` alone and follow [release operations](docs/RELEASE_OPERATIONS.md). It excludes demo mail and credentials, coordinates migrations, and uses the documented Next standalone server. Do not expose an unreviewed production instance.

## Owner access

Set `OWNER_EMAIL` and a unique `OWNER_PASSWORD` (16+ characters) in the process environment, then run `pnpm setup:owner`. The command refuses to create a second owner. Sign in at `/account` using your password. Role-based administration does not require authenticator enrollment. Never commit owner credentials.

## Routes

`/`, `/collections`, `/products/[slug]`, `/inspiration`, `/design-studio`, `/cart`, `/checkout`, `/account`, and `/admin`. Company, contact, FAQ, delivery, returns, privacy and terms pages are CMS-backed. Legal copy needs business review before public launch.

## Integrations

- Online payments and AI assistance are deliberately disabled, regardless of legacy credentials. The storefront accepts quotations only.
- Google video generation has been removed; local uploads and rendering remain available.
- SMTP: configure host, port, credentials and `MAIL_FROM`; run `pnpm worker`. Verification/reset messages persist in the notification queue until SMTP is configured.
- Object storage: configure the S3 variables and bucket. Imported media remains quarantined until ClamAV scanning and FFmpeg processing succeed. Fresh antivirus definitions are required.

## Verification

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Browser tests default to port 3002 and a separate `sterlyn_test` database. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` on machines without macOS Chrome. Run migrations and seed against that database before launching the test server. Never point acceptance tests at production.

## Media

`pnpm media:studio` opens the four Remotion templates. `pnpm media:render` renders the source-derived 3D monogram. HyperFrames source is under `media/hyperframes`. Before/after footage is intentionally absent until approved source images exist.

## Release status

Read `IMPLEMENTATION_STATUS.md`. This is an implementation in progress, not a claim that every master-spec acceptance gate is complete. The legacy `/shop` route redirects to `/collections`. Public indexing is disabled until `PUBLIC_LAUNCH=true`. Online checkout remains disabled. Review the branch, operational checks and business configuration before public launch.

## Local demo email and Docker

Run `pnpm demo:config` once to generate private, ignored demo infrastructure secrets (no owner credentials). Start the local stack with:

```sh
docker compose --env-file .local/demo.env -f compose.yaml -f compose.demo.yaml up --build -d
```

Demo showroom: `http://localhost:3100`. Docker captured email: `http://localhost:8026`. Mailpit captures SMTP locally; it does not deliver to business addresses. The demo has no default owner login. Supply owner credentials privately when you want owner access. Use your approved business SMTP and sender details later.

For the existing native development server, run `mailpit --listen 127.0.0.1:8025 --smtp 127.0.0.1:1025`, set `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `MAIL_FROM=Sterlyn Demo <showroom@sterlyn.test>` and `STAFF_EMAIL=team@sterlyn.test` in ignored `.env`, then run `pnpm worker`.

Restore verification uses only `sterlyn_test`, creates a separate temporary restore database, compares all public-table row counts and full-row fingerprints, and removes that temporary database afterward:

```sh
PG_TOOLS_PATH=/usr/local/opt/libpq/bin pnpm db:verify-restore
```

On this workspace, PostgreSQL 18 client tools were built from official source under ignored `.local/tools`; the verified command is:

```sh
PG_TOOLS_PATH="$PWD/.local/tools/postgresql-18.0/src/bin/pg_dump" DYLD_LIBRARY_PATH="$PWD/.local/tools/postgresql-18.0/src/interfaces/libpq" pnpm db:verify-restore
```

The portable demo inbox binary is `.local/tools/mailpit/mailpit`. `tsx scripts/verify-demo-mail.ts` checks registration, queued delivery, SMTP capture and verification using a temporary customer account that it removes afterward.
