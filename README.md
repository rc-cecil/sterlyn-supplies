# Sterlyn Supplies Limited

Next.js showroom and business operations application. Customers select products or inspirations, save an enquiry, and continue through WhatsApp. Staff manage enquiries, confirmed orders, external receipts and secure customer tracking. Online checkout and payment gateways are disabled.

Official branding, catalogue imagery, Design Studio and the existing logo animation are retained. Illustrative catalogue imagery does not imply real stock, prices, testimonials or completed projects.

## Deployment

Use Node 24 and pnpm. Follow [Netlify + Neon deployment](docs/NETLIFY_DEPLOYMENT.md) for the database-backed website. Netlify installs dependencies from `pnpm-lock.yaml` and runs `pnpm build`; the publish directory is `.next`.

Every deploy requires PostgreSQL and the appropriate authentication and tracking configuration. There is no database-free demonstration mode. Keep credentials outside Git and configure hosting environment variables privately.

Operational commands, after installing dependencies:

```sh
pnpm db:production:check
# Review existing migration history before applying pending migrations:
pnpm db:production:migrate
pnpm build
```

Do not reset or seed an existing business database. Preserve the existing authentication secret and tracking encryption key.

## Background services

- Netlify scheduled functions process the existing notification queue and due catalogue publications. Queued messages are not evidence of delivery.
- External email requires an approved SMTP service and sender configuration. Until configured, staff can share tracking links manually.
- New uploads require persistent S3-compatible storage, antivirus scanning and the isolated media processor. Bundled website imagery does not depend on those upload services.
- `scripts/worker.ts`, the production Dockerfiles, `compose.production.yaml` and `ops/` remain for these services. See [release operations](docs/RELEASE_OPERATIONS.md). Use the production Compose file explicitly with `-f compose.production.yaml`.

## Owner and staff access

Follow [owner setup](docs/OWNER_SETUP.md). The protected owner provisioning command refuses to create a second owner. Supply credentials privately; never commit them. The owner provides staff work emails and passwords. Authenticator-app enrollment remains optional, and role permissions remain enforced.

See the [staff guide](docs/STAFF_GUIDE.md) and [showroom operations](docs/SHOWROOM_OPERATIONS.md) for enquiries, assignments, order progress, receipts and tracking.

## Automated quality checks

GitHub retains the unit, isolated PostgreSQL, migration, security, build and browser checks. These checks do not run against Neon production. Test launchers and test fixtures remain for CI; local demo infrastructure and old generated reports have been removed.

```sh
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Database integration and browser journeys require a separately configured disposable test database. Refer to `.github/workflows/verify.yml`; never point them at production.

## Assets and maintenance

Published assets remain under `public/`. The existing logo video and runtime 3D animation are retained. Reference boards and Remotion/HyperFrames authoring sources were removed; restoring them from Git history is required to reuse those authoring tools.

Image provenance and catalogue guidance remain in [catalogue content](docs/CATALOGUE_CONTENT.md) and the [product image manifest](docs/product-image-manifest.json). Historical product assets may still be referenced by saved enquiries or orders and must not be deleted solely because a product is archived.

Production database checks, migration tools, backups, restore verification, email diagnostics and owner provisioning are retained. Private local databases, backups and keys were not included in the cleanup.

See [deployment cleanup](docs/DEPLOYMENT_CLEANUP.md) for the removal record. Historical implementation and audit reports are preserved as evidence rather than current setup instructions.
