# Release operations and launch gates

Public indexing, online payments and AI execution stay disabled. Local Mailpit captures mail; it does not prove external delivery. No demo owner exists. Consult `IMPLEMENTATION_STATUS.md` for current evidence, not historical pending entries.

## Private operator configuration

Use a private environment file outside Git, mode 0600, supplied by the operator. Do not paste secrets into chat, command arguments, screenshots or tickets. `.env.example` documents the application variable names; its local endpoints and example values are not production configuration.

Supply:

- `DATABASE_URL` for the private database service; `BETTER_AUTH_URL` with the approved HTTPS domain; a unique random `BETTER_AUTH_SECRET`.
- `S3_ENDPOINT` for the private S3 API, `S3_PUBLIC_ENDPOINT` for a browser-reachable HTTPS S3 API, region, existing bucket, and least-privilege application access/secret keys. Configure browser CORS for the approved site origin, PUT and the signed Content-Type header. Signed URLs bind Content-Type and Content-Length; use the declared Blob size. Keep the bucket private. MinIO administrator credentials must differ from application credentials.
- Actual SMTP host, port, user/password, approved `MAIL_FROM` and `STAFF_EMAIL`. The worker requires SMTP TLS in production; only explicitly configured local capture hosts can use the demo-only SMTP_ALLOW_INSECURE_LOCAL exception. Verify TLS, SPF, DKIM, DMARC and actual recipient delivery before external communications. Never use Mailpit, `.test` senders, or demo configuration in production.
- `MEDIA_SPOOL=/spool`, `CLAMAV_HOST=antivirus`, `TRUST_PROXY=true` only behind the supplied sole TLS proxy. The production Compose configuration forces media readiness checks and `PUBLIC_LAUNCH=false`.

Provide Compose interpolation variables privately: `STERLYN_PRODUCTION_ENV` (the private file path), `STERLYN_APP_IMAGE`, `STERLYN_PROCESSOR_IMAGE`, `STERLYN_STORAGE_IMAGE`, `STERLYN_ANTIVIRUS_IMAGE` (immutable tested image digests), `STERLYN_DOMAIN`, `POSTGRES_PASSWORD`, `MIGRATION_DATABASE_URL` (migration owner only), `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`. Application DATABASE_URL must match the selected database credentials. Pin and review infrastructure image updates before deployment too.

## Deployment

Use `compose.production.yaml` alone; do not layer demo Compose files. Only the TLS proxy publishes ports 80/443. PostgreSQL, storage administration, application and scanner ports remain private. If using signed browser uploads, place a separately configured HTTPS endpoint in front of the storage API; do not expose its administration console. Multipart application uploads work without direct browser access to storage.

Validate the configuration with `docker compose -f compose.production.yaml config --quiet`. Build and test immutable artifacts in CI, publish them to an authorized registry, then run `docker compose -f compose.production.yaml run --rm migrate`, configure the restricted runtime role/grants below, and start `docker compose -f compose.production.yaml up -d`. A single one-shot migration service must complete before web and worker start. Do not run competing migration jobs. Use a separate restricted login for runtime DATABASE_URL; never give web/worker the migration-owner password. Create that role and set its password privately with the database operator, then run `docker compose -f compose.production.yaml exec -T db psql -U sterlyn -d sterlyn -v runtime_role=sterlyn_app < ops/runtime-role.sql` after migrations. The SQL restricts runtime privileges and prevents audit mutation/truncation. Do not use the migration owner as runtime_role, grant it owner-role memberships, or place MIGRATION_DATABASE_URL in the application private env file. The migration service alone receives that separate connection through Compose interpolation. Reapply grants after future additive migrations; verify pg-boss schema ownership during upgrades. Production role validation is a required staging gate. Verify health and logs before switching traffic. Do not seed illustrative catalogue content over existing business data.

Processor isolation: non-root, no network, read-only root, dropped capabilities, bounded tmpfs/spool, CPU/memory/PID limits and per-command deadlines. It receives files, never database/storage credentials. Antivirus definitions persist separately; missing/stale definitions block new processing. Worker orchestration retains application secrets; the processor does not. Do not combine these services.

## Owner and business approval

Follow `docs/OWNER_SETUP.md`: privately supply OWNER_EMAIL and OWNER_PASSWORD for the protected CLI, check `pnpm setup:owner --status`, bootstrap once and verify password-based role access. Authenticator enrollment is not required. Remove bootstrap credentials from the runtime after setup. Never generate default owner credentials or alter historical authenticator records.

In owner settings, approve actual business identity/contact and legal CMS content. Invoice issuance requires `invoiceIssuer` with `approved:true`, legalName, address, contact and taxTreatment; server records the approving owner. Quote amounts/tax/delivery require confirmed commercial information. Invoices never mark orders paid.

Privacy execution requires an explicitly approved `privacyRetention` policy with `approved:true`, version and nonCommercialErasure:true. Commercial records default to a hold. Only completed/cancelled orders explicitly listed in approvedCommercialOrderIds after legal review are eligible for personal-data redaction. Financial values, invoice numbering and audit evidence remain. This is a per-request review, not an invented retention period.

## Health, monitoring and recovery

- `/api/live`: process liveness. `/api/health`: database compatibility check. `/api/ready`: database/object-storage and, in production, fresh scanner plus worker/processor heartbeat. Dependencies must be ready before traffic.
- Run `node --import tsx scripts/check-operations.ts` from the worker environment. It outputs aggregate booleans and counts only, and exits nonzero on stale workers, old queues, failed jobs, storage/scanner failure or mail requiring review. Set BACKUP_MAX_AGE_HOURS to the approved backup freshness limit; completed encrypted backups record a timestamp, and the probe exits nonzero when it is missing or stale. Unconfigured freshness reports null, not a successful backup. Connect its exit status to the operator's monitoring service; remote alert delivery is not configured in this workspace.
- Review queue age, failed media jobs, quarantined uploads, notification retries/uncertain delivery and backup freshness. Do not blindly resend uncertain SMTP deliveries. Failed processing requires an authorized retry; expired leases are made recoverable without publishing partial outputs. Dispatch keys include the queued row version, so a new authorized retry is not blocked behind an abandoned queue task. Responsive image outputs and posters are stored with dimensions, MIME types and hashes; publication does not expose quarantine originals.
- Keep structured audit and correlation IDs; do not log request bodies, secrets, signed URLs or customer mail content. Restrict access to retained logs and backups. Audit storage is append-only for the application role.

## Encrypted backups and restore

Database and objects form one recovery set. Pause web writes and the worker during capture; the script requires `BACKUP_CONFIRM_QUIESCED=true`. Configure `DATABASE_URL`, S3 variables, `BACKUP_DIR`, `PG_TOOLS_PATH` (directory containing pg_dump and pg_restore), and `BACKUP_KEY_FILE` pointing to a mode-0600 file containing a base64 32-byte key. Create the key privately using an approved secret manager. Run `node --import tsx scripts/backup.ts`.

The script encrypts the PostgreSQL custom dump, objects and integrity manifest with AES-256-GCM and separate nonces. Only a set with COMPLETE is usable. Partial sets remain visibly incomplete; never treat them as successful. Transfer completed encrypted sets to approved off-host storage. Keep keys separately with restricted recovery access; define approved backup retention, schedules, freshness alerts, recovery-time and recovery-point objectives. Do not delete older backups until retention is approved.

Verify using `TEST_DATABASE_URL` pointing only to sterlyn_test, `BACKUP_VERIFY_DIR`, the private key and database tools, then `node --import tsx scripts/verify-encrypted-restore.ts`. It creates a uniquely named disposable database and bucket, verifies all table fingerprints/object hashes, and removes only those temporary targets. Existing application databases/volumes are not reset. On this Mac the tool directory also requires DYLD_LIBRARY_PATH for the locally built libpq. Local encrypted restore passed for 44 tables and 3 objects; off-host recovery and production credentials remain operator gates.

For deployment rollback, stop writes, retain the failed artifact/logs, and use the prior verified application digest only if compatible with the migrated schema. Never automatically reverse migrations. Restore into a new database/bucket from the complete encrypted set, verify, then switch private connection configuration. Rehearse this with production-equivalent infrastructure before launch.

## Acceptance commands

Use Node 24 and the lockfile. Native iteration remains supported; Docker is required for isolated decoder/scanner acceptance, not every edit.

```sh
pnpm typecheck
pnpm lint
pnpm test
RUN_DATABASE_TESTS=true pnpm exec vitest run tests/operations.integration.test.ts
pnpm exec tsx scripts/verify-migrations.ts
pnpm build
pnpm exec tsx scripts/test-server.ts
# In a separate terminal; uses isolated sterlyn_test and port 3002:
pnpm test:e2e
```

Docker demo acceptance uses the existing private `.local/demo.env` with compose.yaml + compose.demo.yaml. `DEMO_MEDIA_VERIFY=true node --import tsx scripts/verify-docker-media.ts` inside the worker creates disposable synthetic fixtures and refuses to bootstrap over an existing owner. It must never target production. Mailpit inbox is localhost:8026; showroom is localhost:3100. Actual worker-stop verification is `DEMO_MEDIA_VERIFY=true node scripts/verify-worker-interruption.mjs` from the host with Docker access. It refuses active work, pauses the processor, kills only the demo worker during a disposable fixture, accelerates that fixture lease expiry, restarts services, retries and verifies completion. Never run this interruption fixture on production or during other staff media work.

## Launch decision

Do not claim production readiness until the current acceptance matrix is supported by evidence. Remaining external inputs: private owner enrollment, approved identity/contact/legal/retention and commercial tax information, production hosting/domain/TLS, database/storage/SMTP credentials, sender/recipient approval, backup custody/retention and alert destinations. Verify external email and production restore/monitoring after configuration. Public indexing requires a separate explicit launch decision; payment and AI enablement are outside this launch.
