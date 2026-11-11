# Sterlyn Supplies — read-only client preview

The Netlify production environment can use `STERLYN_CLIENT_PREVIEW=true` to show a read-only concept showroom while no hosted PostgreSQL database is connected.

- Homepage, concept collections, inspiration stories, brand information, and a design-studio introduction use bundled content and assets.
- No claims of live prices, availability, order fulfilment, or existing customer's products are made.
- Login, admin, saving, checkout, and form submission are deliberately not usable in preview mode. Calls to `/api/*` return HTTP 503 while preview mode is enabled.
- The main application's original PostgreSQL, Prisma, admin, ordering, and media logic is preserved and used normally when preview mode is disabled.

## Before enabling the real website

1. Prepare hosted PostgreSQL and apply the repository's existing migrations.
2. Carefully migrate and verify real data from local PostgreSQL; do not assume GitHub pushes migrate database records.
3. Configure required secrets, email delivery, media storage, backups and access controls.
4. Remove or set `STERLYN_CLIENT_PREVIEW=false` in Netlify, then redeploy.
5. Test guest enquiry capture, staff sign-in, order confirmation, private tracking and administrative permissions. Online checkout remains disabled.

The obsolete standalone static preview under `sites/` has been removed. The optional preview mode lives in the main Next.js application. Use [Netlify deployment](docs/NETLIFY_DEPLOYMENT.md) for the live showroom release.

This preview does not save enquiries or run administration. Do not share administrative credentials or confidential customer data with preview viewers.

## Secure deployment setting

Netlify requires a securely generated `BETTER_AUTH_SECRET` in production even while login is disabled in the preview. Keep this value secret and outside source control. This is independent of the later database migration.
