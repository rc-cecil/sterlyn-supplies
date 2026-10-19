# Visual repair audit — 18 October 2026

The existing composition, section order, typography, palette, container ratios and motion remain the baseline.

## Source audit

The supplied full-room concepts are 832–834 × 465; collection previews are about 300 × 203; accessory details are only 133–172 × 147. These cannot support large high-DPI placements. Raw hero `<img>` delivery also lacked responsive candidates; most catalogue placements already use Next Image. No CSS blur was identified as the primary issue. The current DPR/placement audit is retained at out/release-evidence/asset-performance-audit.json. Historical source observations below remain provenance evidence.

Four original room concepts were generated using the built-in image tool, with no API integration in the application. Native output is 1672 × 941 (walnut 1672 × 940), not the requested 2400–3200px hero target. Outputs are preserved in references/generated and encoded as quality-92 WebP without upscaling. The original supplied assets are retained. Large-screen 2× sharpness remains a release limitation.

Prompts: original architectural kitchen photography; marble dusk uses walnut/charcoal cabinetry and an ivory stone island; emerald uses forest shaker cabinetry and brass; ivory uses classic framed doors and limestone; walnut uses modern grain-aligned cabinetry and charcoal stone. All prompts require realistic joints, crisp materials, no text/logos/UI/watermarks, and no imitation of third-party photography. These images remain illustrative concepts.

Sink and storage concept details now use original 1448 × 1086 generated sources, retained alongside quality-92 WebP delivery assets. They remain labelled concept imagery. No embedded-play-button image is used as product photography.

## Logo

The prior Potrace contour followed JPEG noise, including many tiny zigzags on nominally straight edges. A new source-aligned SVG replaces those with smooth cubic curves and straight segments. Original official logo is unchanged. Extrusion and material settings are shared by live R3F and Remotion: reduced bevel, denser curve sampling, centered depth, restrained metalness and roughness, consistent emissive timing for all pieces. R3F permits DPR 2.

Verified: versioned fallback re-rendered at 1280 × 720, 300 frames, 10 seconds; front, quarter, side and back frames inspected. First/last frame mean absolute channel difference is 0.19738/255. The later canonical verification update supersedes this older geometry checkpoint; high-DPI screenshots and placement measurements are now retained. Geometry acceptance is based on the overlay and rendered-frame review, not compilation.

## Reference review

[Wren product reference](https://www.wrenkitchens.com/kitchens/georgian-ermine-peninsula-kitchen-in-ash-grey-matt/12798) informed product discovery, finish selection, gallery and accessory presentation only. No Wren media, copy, code or layout was reused. Sterlyn details continue to distinguish concept directions from verified specifications.

## Canonical contour verification update
The earlier hand-smoothed geometry achieved only 0.80164 normalized bounding-box silhouette IoU against the official monogram crop. Replaced it with a reproducible gold-mask Potrace trace derived from that crop; the official image remains unchanged. New diagnostic IoU: 0.977005; bounding-box aspect relative error: 0.002141. The comparison normalizes bounds and thresholds JPEG/WebP source pixels, so it is a diagnostic rather than proof of mathematical identity. Overlay retained at out/release-evidence/logo-silhouette-overlay.png.

Rendered corrected fallback public/video/sterlyn-logo-v3.mp4 (300 frames, 1280×720, 10 seconds). First/last mean absolute channel difference: 0.166783/255. Front-facing baseline and illumination frames visually reviewed; live and Remotion use the same corrected SVG and timing. Earlier v2 footage remains retained as history; the hero now uses v3. High-DPI source-image limitations remain as documented.

## Responsive delivery and lab review
The React Bits hero retains its original element, refs and animation but now receives Next getImageProps responsive candidates for the approved default concept. Latest measured set: 45 image placements, two source-resolution shortfalls, maximum observed CLS 0.084455 and LCP 2248 ms. These are local browser observations, not physical-device or production-network guarantees. Large tablet/desktop DPR 2 hero placements still exceed the native 1672px source. No upscaling claim or third-party imagery is substituted.

## 18 October — product catalogue and independent journal

Eighteen new original generated product previews are stored separately in `public/images/products/`; all originals are 1536×1024 and were compressed without enlargement to 2,894,520 bytes total. Exact prompts, dimensions, bytes and hashes are in `docs/product-image-manifest.json`. Six existing room/detail images are reserved for the independent Inspiration journal, with no image-path overlap with catalogue products. The official logo and hero assets are unchanged; earlier native-resolution limits for large high-DPI editorial/hero placements remain applicable.

The final focused browser run passed all 15 page/viewport combinations: collections, storage category, sink product, journal index and stone journal article at 1440px desktop DPR 1, 820px tablet DPR 2 and 390px mobile DPR 2. Each passed main-content WCAG A/AA checks, overflow and console-error checks; all observed main images loaded. Fifteen full-page screenshots plus source/display measurements are in `out/catalogue-review/`. The desktop journal was visually inspected against the product catalogue; it uses editorial room stories and a lead story, while product pages use category navigation and product controls. Breadcrumb and illustrative-caption contrast were corrected using the existing muted colour token.

Structured result: `out/catalogue-review/test-results.json` reports three expected, zero unexpected, zero flaky tests; `browser-report.json` contains 15 page/viewport records. These are local lab checks, not physical-device or production-network certification.
