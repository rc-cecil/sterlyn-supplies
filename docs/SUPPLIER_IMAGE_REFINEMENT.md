# Supplier photography refinement — 5 November 2026

## Scope and method
Replaced all **36** recently added PA Home PDF-page crops in `public/images/supplier/` with locally stored assets extracted directly from the user-provided supplier manual's embedded PDF image objects. No new product designs, model geometry, measurements, finish variants or AI-generated details were introduced.

- **12 room / interior images:** used original embedded photography (up to 2,200 pixels wide), avoiding flattened page graphics and the strong compression of previously cropped PDF pages.
- **24 individual fittings:** taps, kitchen sinks, ceramic basins and storage components; reconstructed original transparency where the PDF provided an alpha mask, then centered each original product on a consistent plain-white 4:3 presentation canvas (960 × 720 pixels). Subtle shadows use only the original alpha mask. The objects themselves are **not redrawn**.
- Image files are optimized WebP assets committed to GitHub and served locally with the existing Next.js Image component.
- The public product cards and product detail views preserve the existing design while using `contain` for isolated fittings, and room photographs continue to use `cover`.
- Product and inspiration selections preserve the model-matched source photograph.

## Provenance and verification
Original PDF reference pages: 9, 12, 14, 18, 20, 26, 28, 32, 36, 45, 48, 77, 90, 91, 92 and 93. Names and model-specific associations remain in `src/lib/supplier-catalogue.ts` and `src/lib/supplier-inspiration.ts`.

No product specification, available finish, stock claim, public price, or dimension was modified. Existing claims that images are supplier/illustrative references, not Sterlyn installation photographs, must remain.

## Limitations and next steps
**Some original tap and basin XObjects are only 100–330 pixels across**. The studio canvas increases presentation size and consistency but cannot create real missing optical detail. For zoom-quality photographs, obtain model-matched high-resolution originals from the supplier. Do not replace them with pictures of other models.

Some PDF photos are compressed and will remain softer than professional original photos. Commercial reuse of supplier imagery requires confirmation of appropriate rights from PA Home. Do not treat access to the PDF as automatic permission to advertise using its images.

Cloud database, payments, admin services, hosting credentials and live enquiries were deliberately not modified.
