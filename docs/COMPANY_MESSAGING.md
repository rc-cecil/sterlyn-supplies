# Homepage company information — 15 November 2026

The owner clarified that the homepage needed more company information below the hero. The previous hero changes have been undone: the default “The art of a better kitchen.” headline, original supporting copy/action and original hero layout are restored. Existing imagery, scrolling expansion, monogram animation, catalogue and Design Studio are retained.

## Sources reviewed

- [Sterlyn’s Facebook page](https://www.facebook.com/people/Sterlyn-Supplies/61595476006250/): public Intro, About/contact section and visible recent posts. The public introduction describes kitchen design, furniture supply and professional fitting for homeowners, property developers and contractors around Accra. About lists East Legon Hills, Accra. A visible worktop post reinforces the kitchen-materials focus. Expanding posts and deeper feed access prompted Facebook login, so the complete post history could not be reviewed. No Facebook login, message or account change was made.
- [Existing Our Story page](https://sterlynsupplies.netlify.app/about): visited in the browser. Describes Sterlyn as a kitchen furniture/supplies brand, its Style / Quality / Innovation identity, the concept showroom, Design Studio and quotation process. Images are illustrative; specifications and availability require confirmation.
- Existing catalogue and enquiry/order flow provide the source for product categories, selection saving, quotation handoff and private order tracking.

## Homepage additions

Shared `HomeCompany` components appear in the database-backed homepage and database-free preview:

1. Our Story: company identity, services, customers and Accra coverage, using a selected kitchen image from Facebook The separate story page and its More about Sterlyn button were subsequently removed at the owner’s request.
2. What We Do: fuller explanations of kitchen design, furniture/kitchen supplies and fitting, each with an appropriate existing destination.
3. Project guide: explore/save, submit requirements, discuss the agreement, then receive tracking after order confirmation. Replaces the existing shorter journey section in the full homepage and adds the same guide to the preview.

The original introductory text is restored. Search metadata describes the company’s services. No new public prices, invented founding history, team size, completed-installation claims, warranties, client reviews or availability guarantees are added. Fitting scope, measurements, delivery, specifications and commercial terms remain subject to discussion. The source statements are the company’s own descriptions, not independent certification.

Local source changes only: no production database changes or deployment in this follow-up. The local visual preview does not perform database operations.

## Verification

Local production build, TypeScript and targeted ESLint passed. The mechanical design detector returned no findings and no suppressions were added. The existing hero-spacing browser check passed at 1920, 1440, 1024, 390 and 375 pixels with the original hero copy. The new homepage-content browser check passed on desktop and phone, including company information, section links, horizontal overflow and WCAG A/AA checks for all added sections. Two browser scenarios passed in the final run. Screenshots are stored under ignored `out/homepage-company/`. The updated visual preview is served locally on port 3003.

## Facebook images and removal of the separate story page

Three public images were inspected on Facebook and exported using the browser’s observed-asset export. They are encoded locally as WebP without altering the depicted content:

| Local asset | Source photo | Original size | Use |
|---|---|---|---|
| `public/images/sterlyn-facebook-kitchen.webp` | https://www.facebook.com/photo.php?fbid=122104530585515866 | 1920 × 1357 | Homepage story image |
| `public/images/sterlyn-facebook-stone.webp` | https://www.facebook.com/photo.php?fbid=122108146665515866 | 765 × 765 | Homepage Facebook gallery |
| `public/images/sterlyn-facebook-brass.webp` | https://www.facebook.com/photo.php?fbid=122107019697515866 | 600 × 401 | Homepage Facebook gallery |

The gallery replaces the older materials-photo section instead of adding another repetitive image section. Source-photo links and Facebook attribution are visible. Captions describe design inspiration, not completed Sterlyn installations. Original branding and hero imagery remain unchanged. Assets are served locally, so website rendering does not depend on Facebook’s expiring CDN URLs, cookies or an embedded feed.

Facebook’s public page displayed “Not yet rated (0 reviews)” on 15 November 2026. No testimonials, ratings or placeholder reviews have been added.

The More about Sterlyn button is removed. Navigation links now point to `/#our-story`, the separate preview About page is removed, `/about` permanently redirects to the homepage section, and About is excluded from the sitemap. Historical CMS records are preserved; no database content was deleted.

Verification of the photo/removal follow-up: local production build, TypeScript and targeted ESLint passed. Both browser scenarios passed: the original hero spacing across five widths and homepage content/gallery/accessibility on desktop and phone, including `/about` redirect and mobile story navigation closing correctly. Facebook photographs were visually inspected before use. The design detector returned no findings; no suppressions were added. Updated screenshots are in `out/homepage-company/`. This follow-up remains local and has not been deployed.
