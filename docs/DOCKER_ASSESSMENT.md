# Historical assessment

The local `compose.yaml` and `compose.demo.yaml` files described below were removed during deployment cleanup. This is historical evidence, not current setup instructions. Production services remain in `compose.production.yaml`.

# Docker assessment — 18 October 2026

Read-only assessment completed before implementation changes. No Docker architecture, website design, containers, volumes or data were removed or reset.

## Inventory

- `Dockerfile`: Node 24 web/worker image, full dependencies, FFmpeg, ClamAV and Chromium; production Next build; runtime user `node`.
- `Dockerfile.storage`: builds pinned official MinIO source using Go, then copies binary into Debian runtime.
- `compose.yaml`: db (PostgreSQL 17), storage (MinIO), mail (Mailpit), web (Next), worker (Node/TypeScript).
- `compose.demo.yaml`: demo secrets/environment, loopback web port 3100, email UI 8026 and SMTP 1026, read-only migration bind mount.
- Running containers: `sterlyn-db-1`, `sterlyn-storage-1`, `sterlyn-mail-1`, `sterlyn-web-1`, `sterlyn-worker-1`.
- Named volumes: `sterlyn_postgres` mounted at `/var/lib/postgresql/data`; `sterlyn_objects` mounted at `/data`.
- Compose bridge network: `sterlyn_default`. PostgreSQL is internal only. Demo web/mail/storage host ports bind to loopback.

## Persistence

Database and object files live in named volumes, independently of container writable layers. Restarting/recreating containers with this Compose project retains the same volumes. This assessment inspected mounts; it did not interrupt services to repeat a recreation test. Volume removal, Docker disk loss or changing the Compose project name are outside this guarantee. Existing backup/restore verification is documented separately. Mailpit has no persistent volume: captured demo mail can be lost on recreation.

## Development and testing

Docker runs the entire demo, not only PostgreSQL. It is optional for native development: `pnpm dev`, `pnpm worker`, persistent embedded PostgreSQL (`.local/postgres`, port 55432), and native Mailpit are supported. Native and Docker databases are separate; changes do not synchronize automatically.

Typecheck/lint/unit tests need Node dependencies, not Docker. Database integration and browser tests need an isolated PostgreSQL database; native PostgreSQL works. CI uses a PostgreSQL container service and runs Node/browser tools on the CI host. The Docker web runs production mode with no source hot reload; it is suited to deployment checks rather than everyday editing.

## Suitability and overhead

The demo is appropriate for local deployment verification. It is not a finished production deployment configuration. Production needs TLS/reverse proxy, restart policies, readiness checks for web/worker/storage, migration coordination before worker startup, automated backups/monitoring, approved secrets/senders and current antivirus definitions. Mailpit is a local capture service. Base Compose exposes web on all host interfaces; the demo override restricts it. The migration bind mount belongs to local verification, not an immutable production artifact.

Web/worker images each report 4.41 GB (shared layers mean those figures should not simply be added). Full development dependencies, Chromium, FFmpeg and antivirus tools in both roles increase build/export size. Separate identical web/worker builds and source-compiling MinIO increase first-build time. Corepack is not version-pinned in the image. Docker Desktop adds a Linux VM; simultaneously running native and container stacks duplicates services. Snapshot memory observation: web ~165 MiB, worker ~162 MiB, storage ~86 MiB, PostgreSQL ~59 MiB, mail ~13 MiB, excluding VM overhead; these are observations, not capacity guarantees.

## Recommendation

Keep the existing architecture. Use native Node hot reload and the established native test database for daily work. Retain the Docker demo on port 3100 for milestone/deployment verification. Do not switch an existing environment's database URL casually. Later, explicitly scoped deployment work can slim/share runtime images, pin tooling, coordinate migrations and add production health/restart/TLS/backup configuration. No such architectural changes were made in this assessment. Paystack and OpenAI remain disabled.

## Later implementation update — 18 October 2026
The assessment above is retained as the original read-only snapshot. Approved subsequent work added the restricted network-disabled processor and persistent-definition antivirus services, a standalone production Compose/TLS configuration, migration coordination, readiness/heartbeat checks and encrypted backup/restore tooling. Corepack now pins pnpm 11.25.0; identical web/worker artifacts can be shared. The Docker web now packages public/static assets and runs Next’s standalone server. The full development/media toolchain still makes the shared image larger than a future optimized runtime image; image slimming is an optimization, not a reason to replace this architecture. See IMPLEMENTATION_STATUS.md for current acceptance evidence and external production gates.
