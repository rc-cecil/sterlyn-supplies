# Approved deployment cleanup — 15 November 2026

The owner approved the deletion proposal in this chat before removal. Changes are in the current checkout; no branch, push or deployment is part of this cleanup.

## Removed source and configuration

- `src/components/ClientPreview.tsx`, `src/components/PreviewHeader.tsx`, `CLIENT-PREVIEW.md`: database-free showroom demonstration. Removed its route, metadata, API-proxy, Contact/Design Studio fallback and scheduled-function branches, the example environment flag, unused preview styling, and obsolete preview-only test expectations. Backend configuration is now required for every deployment. Authentication and role checks remain enforced.
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

Passed before removing generated output and installed dependencies:

- `pnpm install --frozen-lockfile`: successful, including normal supply-chain policy verification of 826 lockfile entries. The initial offline attempt could not obtain metadata; the normal online install succeeded.
- Prisma client generation: successful.
- TypeScript `tsc --noEmit`: successful.
- ESLint: successful.
- Vitest: 11 files / 41 tests passed; 4 PostgreSQL integration files / 31 tests skipped because the isolated database suite was not enabled. No production database fixtures were run.
- Production Next.js build: successful, including framework TypeScript checks and route generation. The sandboxed build stalled and was stopped; the permitted build completed normally.
- `git diff --check`: successful.

Checks used the installed Prisma, TypeScript, ESLint, Vitest and Next.js entry points directly after the verified install; pnpm's script launcher attempted an unnecessary reinstall in this environment. No dependency policy or compiler checks were disabled. Browser and PostgreSQL integration checks were not rerun for this cleanup; their suites and GitHub workflow remain.

Generated output and installed dependencies were removed after verification. Netlify recreates them during its build. Published assets, Prisma migrations and the GitHub verification workflow have no changes.

No database migration, reset, production data modification, external email, WhatsApp message or deployment is included.
