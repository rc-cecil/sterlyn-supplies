# Collections and inspiration — content boundary

Collections are a database-backed, quote-first product catalogue. Inspiration is an independent editorial journal with six original room/material stories. The journal never queries featured products or presents add-to-bag controls. The home collection section uses product previews; its material-story links lead to the journal.

Six product families each contain three different product directions and three different original images:

| Family | Product directions |
| --- | --- |
| Fitted kitchens | Forest Shaker, Walnut Handleless, Ivory Framed |
| Cabinetry | Walnut Drawer Base, Sage Glazed Wall, Ivory Tall Larder |
| Islands & peninsulas | Stone Waterfall, Oak Breakfast, Ivory Storage Peninsula |
| Worktops | Veined Stone, Charcoal Stone, Oak Block |
| Sinks & taps | Steel Undermount, Ceramic Apron, Black Inset |
| Storage | Pull-out Pantry, Corner Pull-out Shelves, Oak Drawer Organiser |

All eighteen are explicitly **illustrative product previews**, not claims of verified Sterlyn stock, materials, prices, dimensions or supplier relationships. The finish names describe the pictures. Alternative finishes require discussion and are not illustrated as verified available options. No online payment is enabled.

## Reference research and image provenance

The following official Wren pages informed generic product types and the separation of products from planning ideas. No Wren photographs, trademarks, descriptions, proprietary product names or technical specifications were imported:

- https://www.wrenkitchens.com/kitchens/handleless
- https://www.wrenkitchens.com/kitchens/shaker-style-kitchens
- https://www.wrenkitchens.com/kitchens/worktops
- https://www.wrenkitchens.com/kitchens/accessories-and-appliances/sinks/belfast-sinks%2Bovermount-sinks%2Bundermount-sinks
- https://www.wrenkitchens.com/kitchens/accessories-and-appliances/taps/hot-water-taps%2Bspeciality-taps%2Bstandard-taps
- https://www.wrenkitchens.com/kitchen-design-ideas/storage-ideas

Original product photography-style concept assets were generated with the built-in image-generation tool. `docs/product-image-manifest.json` records the exact prompts, source dimensions, compressed sizes and SHA-256 fingerprints. WebP assets are saved in `public/images/products/`. PNG originals and generation-path manifest are retained locally in ignored `out/catalogue-assets/`. No source was upscaled. Original supplied room images remain in the journal and retain illustrative labels. The official logo is unchanged.

## Safe content refresh

`pnpm exec tsx scripts/refresh-catalogue.ts` adds the new illustrative entries and refreshes only recognisable legacy seed products with unverified, unpriced, zero-stock `CONCEPT-` variants. Existing IDs, slugs, cart references, order/quote snapshots and custom or verified catalogue records are preserved. Refreshes append audit records. A transaction and advisory lock serialize repeated or concurrent refreshes. Running it again preserves the already-refreshed entries. Fresh `db:seed` uses the same canonical catalogue content.

Existing room-oriented product slugs remain compatibility URLs, while display names describe the products. Editorial story URLs are independent. Operators should replace illustrative previews with authorised supplier photographs and confirmed product specifications when real supply details are approved.

## Review evidence

Focused browser journeys and screenshots are retained in `out/catalogue-review/`. The existing release matrix continues to govern all unrelated launch gates.

The first broader browser run exposed low-contrast breadcrumb/illustrative-caption text; both now use the existing muted colour token. Its hero scroll check also encountered software-WebGL contention and the cart assertion ran before asynchronous bag loading completed. The focused scroll test uses the existing pause/quality controls (logo geometry/loop validation remains separate); cart checks now explicitly await loading completion. Initial failure logs are retained, and final verification is recorded in implementation status.

Read-only acceptance: `pnpm exec tsx scripts/verify-catalogue-content.ts` checks the persisted category counts, all eighteen unique image paths, journal separation, quote-only variant data and continued existence of refreshed product IDs. The former local Docker demo was removed during deployment cleanup.
