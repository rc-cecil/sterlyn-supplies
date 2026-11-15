# Approved deployment cleanup — 15 November 2026

The owner approved the deletion proposal in this chat before removal. Changes are in the current checkout; no branch, push or deployment is part of this cleanup.

## Removed source and configuration

- `src/components/ClientPreview.tsx`, `src/components/PreviewHeader.tsx`, `CLIENT-PREVIEW.md`: database-free showroom demonstration. Removed its route, metadata, API-proxy and scheduled-function branches, the example environment flag, and obsolete preview-only test expectations. Backend configuration is now required for every deployment. Authentication and role checks remain enforced.
- `compose.yaml`, `compose.demo.yaml`, `scripts/demo-config.ts`, `scripts/local-db.ts`, private `.local/demo.env`: local/demo infrastructure and embedded database launcher. Removed `demo:config` and `db:local` package commands, the `embedded-postgres` dependency and its build permissions. Local PostgreSQL data, backups and keys are preserved.
- `scripts/serve-walkthrough.mjs`: server for the old local screenshot gallery. Removed the `walkthrough:serve` package command and replaced the dead staff-guide link with workflow guidance.
- `references/`: design boards and original concept-image working references. Published images and image provenance records remain.
- `media/`: Remotion and HyperFrames logo/video authoring sources. Removed the `media:studio`/`media:render` commands and `remotion`, `@remotion/cli`, `@remotion/three` dependencies. Published videos and the runtime 3D logo remain. Restore authoring sources from Git history to render them again.

Updated the package lockfile and current setup documentation. Historical audits remain marked or understood as historical evidence. Legacy Docker test scripts are retained with the automated checks; their former disposable stack must be provisioned separately before use. Never point those scripts at production.

## Removed generated local output

- `.next/`: generated Next.js build/cache, including the old standalone preview. The local preview server is stopped before deletion. Cloud builds recreate deployment output.
- `node_modules/`: locally installed dependencies. Cloud builds use `pnpm install --frozen-lockfile`.
- `out/`: screenshot evidence, old walkthrough and other generated verification output.
- `playwright-report/`, `test-results/`: previous browser-test reports.
- `.pnpm-store/`, `tsconfig.tsbuildinfo`: local package/TypeScript caches.
- `.local/preview-build-f0etiix6/`, `.local/preview-build-rjupnn6_/`: temporary build copies.
- `.local/tools/`: local PostgreSQL/Mailpit development utilities. Restore verification still exists; supply separately installed PostgreSQL client tools when needed.

These ignored local files were never needed in Git or uploaded as source for the Netlify deployment. Removing them frees local disk space; it does not restore hosting credits.

## Preserved

Application source, all published assets, authentication, database schema and migrations, Netlify configuration/functions, worker, media processor, production Docker configuration, operational scripts, automated tests and GitHub checks, dependency security overrides, documentation, attribution, Git history, private environment files other than the retired demo file, local PostgreSQL records, backups and keys.

Docker build exclusions now also cover private `.env.*` files while permitting the non-secret `.env.example` template.

## Verification

Pending final verification. Generated output and dependencies will be removed after checks, leaving no local build or installed dependencies in the final checkout.

No database migration, reset, production data modification, external email, WhatsApp message or deployment is included.
