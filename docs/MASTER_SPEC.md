# MASTER CODEX BUILD PROMPT — STERLYN SUPPLIES LIMITED

You are my principal full-stack engineer, creative director, 3D technical artist, motion designer, database architect, application security engineer, and quality-assurance lead. **Implement the website in the current repository. Do not merely output a plan or create static mockups.** Build an original, exceptional, production-oriented, visually cinematic, fully responsive and functional 3D e-commerce experience for **Sterlyn Supplies Limited**, with a complete, access-controlled administrative platform at `/admin`.

## A. Authoritative project brief

- **Business/legal name:** Sterlyn Supplies Limited.
- **Public brand:** STERLYN SUPPLIES.
- **Tagline:** STYLE • QUALITY • INNOVATION.
- **Business:** Kitchen furniture and supplies; fitted kitchens, cabinets, islands/peninsulas, worktops, sinks/taps, storage hardware, related accessories and optionally appliances where actual stock is verified.
- **Reference ONLY:** https://www.wrenkitchens.com/kitchens/georgian-ermine-peninsula-kitchen-in-ash-grey-matt/12798. Study its product-discovery and product-specification UX, but **DO NOT clone its layout, visuals, descriptions, images, colors, pricing, branding, interaction patterns or trade dress**. Create a fully differentiated Sterlyn design.
- **Brand authority:** The supplied Sterlyn logo is canonical. Its deep forest green background, elegant champagne-gold monogram/wordmark, white “SUPPLIES,” and tagline must be preserved. **Do not use an AI-recreated or misspelled logo.** Use `public/images/sterlyn-official-logo.jpg`; an optional `sterlyn-official-monogram-crop.webp` is a crop of this same source and must be visually verified. If an accurate transparent SVG/vector is needed for true extrusion, prepare one from the canonical logo and visually review it against the original before using it; never guess or redraw the letterforms.
- **Asset bundle:** I have provided `sterlyn-supplies-starter-assets.zip`, with 19 brand/starter imagery assets plus source concept boards. Extract/copy `public/images/` into the actual Next.js `public/images/`. `references/` is moodboard/reference only. The original kitchen photography is **AI concept imagery**, not evidence of products Sterlyn carries. Do not falsely label these mockup images as real product SKUs, installations, guarantees, or stock. Replace them through the admin media library when verified actual inventory assets are supplied. If the archive is unavailable in your environment, request the attachment/path rather than silently recreating the company's logo.
- **Geographic default:** Ghana-facing storefront, currency GHS (GH₵), with configurable tax, delivery zones, regions and currency; never invent shipping rates, inventory, installation capabilities, contact information, testimonials, or prices. Unknown product prices should display “Request a quote” instead of fictional amounts.
- **Goal:** The experience should feel like a premium architecture studio × luxury furniture gallery × highly polished interactive digital showroom, not like a generic shopping template or a flashy gaming dashboard.

## B. Skills, MCP, and implementation discipline (important)

Before changing code, inspect the repository, package manager, existing components, environment, agents, available tools, installed Codex skills, and registered MCP servers. Discover and invoke, **where they genuinely exist and apply**, the following:

1. **taste skill** for art direction, originality, layout, visual hierarchy and intentional aesthetic critique;
2. **UI/UX Pro Max** for high-fidelity interaction patterns, usability, accessibility, conversion and responsive behavior;
3. **emilkowalski skill** for precise, purposeful interactions, spring physics, delightful easing and tactile motion;
4. **impeccable skill** for systematic visual refinement, pixel-level polish, spacing, hierarchy and responsive quality;
5. **React Bits MCP / reactbits.dev** for real reusable source components, including **Scroll Expand**, plus carefully selected components such as Split Text, Animated Content, Spotlight Card, Glare Hover, image/galleries, animated counters and sophisticated microinteractions, subject to actual availability and API names;
6. **Remotion** skill for programmatic motion graphics, branded intro/outro rendering, preview, video composition and exporting;
7. **FFmpeg** (the requested “ffpmeg” means FFmpeg) for transcoding, poster-frame extraction, optimal compression, aspect-ratio adaptation and seamless video loops;
8. **HyperFrames** skill/MCP when installed and genuinely useful for branded scene/storyboard/video templates;
9. any *relevant* installed 3D, design, frontend, performance, security, accessibility, database, testing or creative-production skills.

Never hallucinate a skill, MCP tool, command, integration, version or successful generation. If a named skill is missing, follow its design principles using normal code and note the omission in a short skills/integrations log. If React Bits MCP exists, inspect its schema and use it. Otherwise browse official docs/registry at https://reactbits.dev and install its actual components correctly, complying with their license and dependency requirements. **Use these skills to materially improve the result, not to pad a checklist.**

## C. Technology choice and architecture

Choose an integrated **Next.js App Router + React + TypeScript + Node.js + PostgreSQL** architecture. This is preferred over a Vite-only frontend for SSR/SEO, server-side workflows, integrated auth, e-commerce operations, dashboards and media endpoints.

Use appropriate stable, compatible versions verified against the repo:
- Next.js, React, TypeScript, strict linting/typechecking;
- Tailwind CSS with carefully built CSS variables/tokens, plus accessible shadcn/ui or Radix primitives selectively customized to Sterlyn’s visual language;
- **React Three Fiber + Three.js + Drei**, with optional postprocessing for real interactive WebGL scenes; use `next/dynamic` client-only boundaries for WebGL;
- GSAP ScrollTrigger (with proper cleanup), Motion/Framer Motion or equivalent for high-quality choreographed animation; prevent competing animation systems from driving the same property;
- **PostgreSQL + Prisma** or Drizzle (choose one consistently), with migrations, typed data access, transactions, indices and repeatable seed scripts;
- Auth.js or equivalent audited authentication; role-based permissions, secure sessions, CSRF/XSS/IDOR defenses, account recovery, MFA for administrators;
- TanStack Query where appropriate, React Hook Form + Zod validation, robust server-action/API input validation;
- Recharts or visx for genuine, interactive dashboard charts; table virtualization for large datasets;
- S3-compatible object storage (configurable), signed uploads, a server-side image/video processing pipeline and an optional Redis-backed worker queue for long-running jobs;
- Paystack or Flutterwave through a secure provider abstraction appropriate for Ghana, **only when the merchant account and API keys are available**. Also support quote-only products, manual order/invoice workflows if configured. No fake card charging;
- Vitest/unit tests, integration tests and Playwright E2E; logging, health checks, build verification and production runtime configuration.

Avoid unnecessary microservices. Use a clean modular monolith with background workers for expensive video processing. Do not expose secrets to the client or store media binary blobs in PostgreSQL.

## D. Art direction: signature luxury identity

Design an unmistakably original Sterlyn aesthetic. Suggested brand tokens (refine from the real logo): forest green `#0E3025`, deep emerald `#10271F`, champagne gold `#C9A068`, warm ivory `#F6F2E9`, pearl `#FFFDF7`, charcoal `#1F1F1F`, muted sage `#9BA99B`. Use gold sparingly, with no fake chrome gradients across the entire site.

Editorial type system: distinctive high-contrast serif for strategic headlines, crisp modern sans-serif for UI, restrained uppercase eyebrow labels with tracking, cinematic scale transitions, carefully controlled line lengths. Make custom section compositions with generous negative space, asymmetry, layered perspective, bespoke card geometry, architectural crop choices, elegant rules/dividers and premium whitespace.

Use original editorial microcopy suitable for an aspirational kitchen brand without making unverified claims. Possible motif: “Spaces worth coming home to” / “The art of a better kitchen” / “Crafted around the way you live.” All content should be admin-editable. **No Wren brand language or copied imagery.**

Implement dark, rich cinematic sections balanced by softly lit ivory editorial sections. Curated rather than indiscriminately animated. Real functionality must never be obscured by visual effects. No random particles everywhere, stock gradients, cookie-cutter stat cards, oversized neon glow, flashing effects, confetti, unreadable overlay text, or infinite animation that distracts from checkout.

## E. Flagship scroll-to-expand cinematic hero (MANDATORY)

Adapt my previously requested **React Bits Scroll Expand** hero interaction. Use the real `Scroll Expand` implementation or a fully faithful source-based adaptation from reactbits.dev; do not replace it with an ordinary carousel, video tag, fake CSS zoom, or generic fade-on-scroll.

**Hero sequence / interaction storyboard:**
1. **Opening viewport:** immersive deep green/near-black canvas, original brand identity, subtle architectural soundless ambiance, elegant headline in intentional negative space. The visual starts as a beautifully framed rounded-rectangle/portal containing a kitchen cinematic or animated Sterlyn monogram; navigation remains usable.
2. **User scroll begins:** the media frame physically **expands according to scrolling**, corners relax, depth/camera parallax increases, the surrounding editorial typography separates or translates elegantly, and the frame grows towards full-bleed width. This is scroll-controlled and reversible, not time-controlled only.
3. **Full expansion:** the frame becomes a near full-screen, highly cinematic 3D kitchen/brand reveal. Layer subtle animated architectural light, reflections and spatial transitions; reveal headline/CTA at carefully timed scroll thresholds. Headline never clashes with the focal object.
4. **Hero reveal:** an accurately reconstructed Sterlyn logo **rotates in 3D**, slows naturally and **comes to a definitive stop facing the viewer**. As rotation stops, champagne-gold edge/rim lights travel across the contours; a soft frontal key light ignites the exact monogram/wordmark, and the logo blooms subtly against the forest-green background. Keep the logo’s identity unchanged. A physically plausible reflective gold material is preferred, with tasteful postprocessing.
5. **Loop:** create a polished, approximately 8–12 second loop (not a jarring reverse): rotate through a complete revolution (0°→360°), decelerate, lock on the front-facing logo, perform a restrained illumination sweep, hold, return the light to baseline, seamlessly resume the next revolution. The 360° end orientation must match 0° for seamless continuity. If using a pre-rendered clip, ensure the actual last/first frames match. Keep a static/less-motion fallback.
6. **Scroll exit:** editorial “Explore Kitchens” and “Design Your Space” calls-to-action become interactive and take the user to actual destinations; scrolling out of the section smoothly transitions to the first collection chapter.

**Implementation approach:** Make the interactive version with R3F/Three.js (actual geometry/materials/lights, not a faked rotating JPEG), synchronized with ScrollTrigger/Scroll Expand. If high-fidelity logo extrusion requires accurate vector geometry, derive verified contours from the supplied brand image and approval-check them. Provide a first-class pre-rendered Remotion/FFmpeg video loop for devices where full WebGL is too expensive. Videos should be muted by default, `playsInline`, poster-first, and optimized for desktop/mobile. Preserve reasonable contrast and reduced-motion support. Avoid hydration issues, layout shift, scroll-jacking, and unusable mobile navigation.

**Video creative brief (for Flow/Veo and Remotion):** “A refined luxury architecture film in a deep forest-green environment. The exact official Sterlyn Supplies champagne-gold monogram floats above a dark green stone plinth. Camera makes a slow precise orbit as the emblem performs one smooth 360-degree rotation, gradually brakes and lands perfectly front-facing. Warm light travels across beveled metallic edges; controlled studio softboxes ignite the gold contours as the logo settles. Micro-reflections, subtle volumetric haze, premium optical realism, no people, no invented text, no visual deformation, no flicker, no chaotic cuts, no off-brand marks. Finish in a clean hero composition that matches the first frame for seamless looping. 16:9 master; create 9:16 and mobile-safe crops. 24/30 fps, premium compression, optional 4K master when budget allows.” Use the **uploaded canonical logo as image/asset guidance**; do not rely on generative models to correctly write the wordmark. Composite the real logo or 3D model during postproduction if necessary.

## F. Original website information architecture and rich interactions

Build every page with meaningful states, routing, SEO and live data:
- `/` cinematic landing page; scroll-expand hero, selected collections, editorial rooms, material storytelling, animated collection navigation, signature interactive featured-product display, credible trust/service content only when verified, brand story video, latest arrivals, quotes, newsletter (opt-in), footer.
- `/shop` searchable/filterable/sortable catalogue, logical category hierarchy, product variants, stock status and responsive view controls.
- `/collections` and `/collections/[slug]`; modern, classic, contemporary, fitted kitchens, cabinetry, islands, worktops, sinks/taps, storage and verified accessories. Collection images should navigate to real category views.
- `/products/[slug]`: responsive image and video gallery, real variant selection, high-definition zoom, 360° spin where media exists, material and color swatches, specs, dimensions, delivery availability, stock, price in GHS if verified, “Request a quote” if custom/unpriced, add-to-cart, compare, wishlist, related products, accessible accordions; visualizer link where compatible 3D assets exist.
- `/inspiration` cinematic lookbook with filterable style cards; `/inspiration/[slug]` long-form room story and purchasable related items.
- `/design-studio` interactive 3D kitchen visualizer (see section G).
- `/about`, `/contact`, `/faq`, `/delivery`, `/returns`, `/privacy`, `/terms` with admin-editable content and no made-up company facts.
- `/cart`, `/checkout`, `/order-confirmation/[id]`, `/account`, `/account/orders`, `/account/wishlist`, addresses/profile, auth/login/registration/password reset.
- Custom 404/empty/error/loading/skeleton states; proper product structured data (only verified fields), sitemap, OpenGraph and semantic metadata.

**Microinteractions:** magnetic-but-accessible primary CTAs, animated underlines, precise cursor/parallax on desktop, image reveal masks, scroll-triggered headline choreography, responsive mega menu with product previews, smooth quick-view drawers, comparison slider, nested swatches, sticky contextual purchase panel, instant cart drawer, beautifully animated checkout step transitions, add-to-cart feedback, saved wishlist heart state, interactive stock/availability and robust form validation. Select React Bits effects with restraint and re-style them to the brand.

**Usability:** Search and filters actually work; cart persists; variants update price, image and SKU correctly; account addresses save; checkout calls configured payment provider server-side; payment confirmation relies on verified webhooks; order history reflects actual orders; quote requests notify staff and become admin records. Do not fake functionality by only toasting “success.”

## G. Practical 3D kitchen designer (an actual interaction)

Implement a useful, believable **interactive 3D room planner**, not a screenshot of a kitchen or a dead “Coming Soon” modal. First version can be constrained yet functional:
- Set room width/depth/height, choose sample floor and wall finishes, camera orbit/pan/zoom, toggle overhead/walkthrough views.
- Place base units, wall units, kitchen islands and sink modules from real catalogue-linked or clearly labeled sample geometries, drag/rotate/snap to a grid, avoid basic collisions, undo/redo, toggle cabinet color and worktop material.
- Save a named project to PostgreSQL when authenticated; anonymous browser state may persist locally; reload exact scene state.
- Show chosen materials and provisional measurements, bill of materials where products are verified, and “Request this kitchen quote” that submits saved layout, selected components, measurements and an optional notes/photo attachment to admin.
- Use React Three Fiber with efficient low-poly/procedural geometry initially; support GLTF/GLB assets and progressive quality when authentic 3D SKU models become available. Clearly distinguish conceptual renderings from final installation specifications. Mobile must have simplified controls and graceful fallback.

## H. `/admin` — comprehensive, real operations dashboard

This is a serious operational console and must be secured by server-side role/permission checks. Use a complementary premium dark-green dashboard identity with high-density but refined information architecture. Admin UI should prioritize scanning and productivity over excessive animations.

Build these routed, functional modules (do not only show placeholder cards):

1. **Executive overview:** total/period net revenue, gross sales, order volume, average order value, refund totals, conversion funnel where tracked and consented, new/returning customers, pending payments, pending orders, low-stock SKUs, open quotes, delivery issues, trends and compare-to-prior-period, source currency and data freshness; click every KPI through to its underlying records.
2. **Orders:** searchable/filterable order table, timeline, line items, variant/SKU, totals, tax/shipping, payment and fulfillment state, customer details within permissions, cancel/refund workflows with confirmation and authorization, packing notes, print receipt/invoice, status history, delivery/tracking field, bulk actions, exports.
3. **Products/catalogue:** CRUD, categories, variants, pricing, sales/compare price when valid, SKU, inventory, media galleries, alt text, 3D assets, media status, specifications, related items, drafts/published/scheduled state, SEO, bulk CSV import/export with validation.
4. **Inventory:** stock moves, low-stock thresholds, reservations, adjustments with reason, suppliers when entered, restock alerts, transactional consistency, stock audit history.
5. **Customers:** customer profiles, orders, approved contact preferences, support history, address book, export/delete privacy operations where legally appropriate, no uncontrolled exposure.
6. **Quotes/design consultations:** incoming quote requests, kitchen planner snapshots, measurements, price estimates, staff assignment, notes, status funnel, follow-ups, quotation documents and conversion to orders.
7. **Fulfillment/regions/shipping:** editable Ghana regions/service areas, fulfillment stages, shipping rules/fees and installation options only when verified, tracking numbers, pickup vs delivery, notifications.
8. **Payments/refunds/tax:** reconcile payment attempts with orders, webhook status and idempotency keys, payout/import reporting where the payment provider supplies it, manually recorded settlements with provenance, configurable tax rules, invoice records, audit trails.
9. **Promotions & merchandising:** coupons, campaign windows, hero/section ordering, banners, featured items, homepage editorial modules, announcement bar, landing pages, controlled scheduling.
10. **CMS & media:** sections, copy, SEO, FAQs, lookbooks, approved testimonials, media library, asset replacement, alt text, poster images, video crops, 3D model uploads and preview, media usage links.
11. **Video & 3D studio:** generation prompts, job queue, Flow exports, Google/Gemini video provider, asset references, preview/approve/reject/publish/rollback, transcoding status, poster/frame extraction, storage cost estimates where possible, branded logo animation/version control.
12. **Reviews & support:** review moderation, support/contact inbox, customer queries, notes, resolution and escalation stages.
13. **Analytics & AI studio:** chart builder, natural language questions about *actual* data, cohort/funnel/category analysis, region summaries, time ranges, filters, data export, scheduled reports if available, anomaly explanations with grounded figures.
14. **Teams/RBAC:** owner, admin, catalogue manager, order/fulfillment staff, support, analyst, content creator; least-privilege roles, invites and permission matrix; protected high-risk changes.
15. **Audit logs & security:** complete filterable append-only server-written log of administrative authentication and meaningful reads/writes, actor ID, role, time, IP/user-agent as permitted, before/after field-level change summary with sensitive data redacted, entity ID, result, request correlation ID, export; ensure non-admin cannot modify or delete logs; optional tamper-evident hash chain and retention policy.
16. **Settings:** business contact, GHS/currencies, SEO, taxes, shipping, provider configurations without exposing secrets, email templates, notifications, feature toggles, maintenance mode, privacy policies, legal content.

**GPT-6 interactive visualization experience:** Implement native React interactive dashboards—not screenshots of ChatGPT. Add an optional **AI Insights** panel that uses the official OpenAI API server-side with an explicitly configurable permitted `OPENAI_MODEL` (use a GPT-6-family model only when it is available to the connected API account; do not conflate the ChatGPT UI subscription with API access). The model can request only **allowlisted, read-only analytics tools** returning aggregate, permission-filtered data. Return structured, validated visualization specs to React (bar/line/area/stacked/sankey-like flow if feasible, tables, cards, filters, comparisons, drilldowns, hover tooltips, period selectors, export CSV/PNG), rendered via Recharts/visx. Every visualization must show period, definition, units, timezone, and data freshness. Data computations come from SQL/business logic, **never invented by the LLM**. If API keys are missing, dashboard visualizations must still work fully; show AI assistant as “not configured,” not fake a response. No unrestricted SQL generation, destructive tool calls or data exfiltration.

## I. Google Flow / Veo / Remotion video pipeline

**Important:** Google Flow is the creative UI at https://labs.google/fx/tools/flow; do not assume that Flow itself exposes a public general-purpose API for automated project integration. Deliver two modes:

**Mode 1 — manual Flow import:** Allow authorized creative staff to upload approved MP4/WEBM exports from Google Flow, tag them by placement (hero, collection banner, brand film, product showcase), preview/crop/transcode them, assign posters, and publish with rollback.

**Mode 2 — API-backed generation:** Implement an interchangeable video generation provider adapter for officially supported **Google Gemini video generation / Veo** endpoints according to current official docs, API entitlements and available credentials; optionally support any officially supported Google video model at runtime via config. Support prompt and reference-image inputs, job creation/status polling, generation history, protected server-side credentials, webhook/polling error recovery, output download to object storage, technical metadata and generated-video approval. Never hardcode costs, promise 4K when unsupported or claim the video was rendered if no keys/access.

Use **Remotion** for deterministic typography/motion-graphic compositions and **FFmpeg** for practical codecs, poster extraction, seamless-loop checks, compression, responsive variants and adaptive media delivery. Develop four reusable creative templates: (1) rotating illuminated official logo, (2) kitchen collection cinematic, (3) before/after renovation reveal (only from appropriately sourced/user-provided imagery), (4) product detail/material macro. Avoid inventing real before-and-after project history. Queue expensive jobs. Admin can change active hero media without editing code. Add budget/approval safeguards before billable generation.

## J. PostgreSQL schema and actual business behavior

Design and migrate normalized relational tables, including as appropriate: users, sessions/accounts/credentials, roles, permissions, role assignments, customer profiles, addresses, categories, collections, products, product variants, prices, inventory, stock movements/reservations, media assets, 3D assets, carts and cart items, wishlists, orders, order items, payment attempts and webhook events, refunds, shipments/fulfillment events, quotes, quote items, design projects and 3D scene JSON, promo codes/usage, CMS pages/sections, lookbooks, reviews, support tickets, notifications, analytics events (only with appropriate privacy controls), AI insight queries, video jobs/prompts/output versions, staff invitations, app settings, and audit logs.

Requirements: relational constraints, useful indexes, consistent money stored in integer minor units, numeric GHS formatting, transactional stock reservation and order creation, idempotent payment/webhook processing, audit instrumentation, status transitions, server-side pagination and filtering, migration and test fixtures, safe demo mode clearly labeled. Include a minimum seed catalogue **clearly marked illustrative**; avoid invented real prices, company addresses, testimonials and staff names. Provide sample admin login via a secure interactive setup/seed flow with secrets from env, never publicly embedded default credentials.

## K. Design-system, responsive behavior, accessibility, performance

- Build a documented tokenized design system and reusable section modules, not a hard-coded one-page artboard.
- Handheld mobile is a separate art-directed layout, not a squeezed desktop version. Prioritize touch targets, bottom-sheet filters, compact accessible nav and checkout.
- Respect `prefers-reduced-motion`, keyboard accessibility, focus rings, semantic headings, alt text, contrast and screen-reader status updates. Offer motion/3D quality toggle.
- Load heavy WebGL/videos only when needed; dynamic import, device capability detection, DPR caps, texture reuse/disposal, GLB compression, responsive images, `next/image`, browser caching, CDN considerations and static/video fallback.
- SSR/stream product content and keep critical shopping flows usable even if WebGL, video, WebGPU or third-party generation APIs are unavailable. Avoid layout shift and hydration mismatch.
- Target Core Web Vitals reasonably for media-heavy pages; do not promise arbitrary Lighthouse scores without measurement. Profile FPS and memory leaks on real devices.
- Build a responsive admin grid with keyboard-friendly tables, effective chart states and export flows. No fabricated business analytics.

## L. Security, compliance and operational guardrails

Secure login/password reset, MFA for admins, server-only API keys, RBAC verified at service/controller/record access layers, XSS/CSRF protections, strict upload MIME/type/size scanning, image processing of untrusted uploads, safe signed URLs, rate limiting, login abuse controls, parameterized queries, validated API schemas, secure cookies, audit logging, redaction of secrets/PII, backups and migrations. Payment amount and product pricing must be revalidated server-side; never trust cart totals from the browser. Verify webhook signatures and dedupe events. Add privacy and consent for analytics/newsletter, editable legal pages and retention/export/delete procedures. Never expose sensitive customer data to AI or third parties by default.

## M. Execution plan — implement, verify, refine

**Do not stop after a wireframe, scaffold, pretty landing screenshot, or empty dashboard.** Break delivery into feasible runnable milestones, keeping the app buildable and documenting progress in `IMPLEMENTATION_STATUS.md`:

1. **Discovery:** audit repo/files/assets/skills/MCP, review reference for broad UX patterns only, extract brand tokens, choose versions and architecture; output one concise architecture/design brief and proceed to coding.
2. **Foundation:** initialize Next.js app, layouts, theme tokens, typography, routing, Prisma/PostgreSQL schema, auth/RBAC, Docker Compose/dev environment, seed, error handling and tests.
3. **Visual premium frontend:** implement hero with real scroll expansion and R3F logo, collection editorial, navigation, lookbook, responsive product browsing and product details. Use supplied image assets and verify against moodboards without rasterizing UI.
4. **Commerce:** wire catalog queries, search/filter, variants, wishlist, cart, quotes, order creation, payments/provider abstraction, verified webhooks, customer accounts, notifications, shipping settings and transactional records.
5. **3D studio:** implement the working kitchen visualizer with save/restore and quote submission.
6. **Admin:** all modules and real DB-backed charts/tables; payment/order/inventory/audit correctness; AI analytics adapter and interactive chart builder.
7. **Media:** source-preserving logo animation, Flow import, API adapter, Remotion compositions, FFmpeg jobs, media library and publishing approvals.
8. **Quality:** typecheck, lint, migrations, unit/integration/E2E, role and webhook tests, screenshots at desktop/tablet/mobile, accessibility pass, reduced-motion/WebGL-failure checks, security review, optimization, deployment preparation and README.

If a provider account/secret is needed, implement the robust interface, mark it **“requires credentials”**, and give precise setup instructions. Never mark external generation or payment as working without an actual successful test. Include `.env.example` with descriptive variables, never real secrets.

## N. Mandatory acceptance tests

Demonstrate ALL of the following before stating completion:

- The root hero genuinely scroll-expands and contracts, with keyboard/touch responsive navigation; the canonical logo rotates in actual 3D, settles front-facing, illuminates and loops without visible discontinuity (with a reduced-motion fallback).
- A real category filter changes results; a product variant changes the selected SKU; products load from PostgreSQL.
- Add-to-cart updates cart persistence, server totals, inventory validation and checkout; quote-only products lead to a persisted quote rather than a dead checkout.
- Customer account register/login/order history works with authorization; guest checkout behavior documented.
- An actual admin role can create/edit/publish an item and observe storefront changes; a non-admin is denied `/admin` routes AND endpoints.
- Admin can filter orders, change permitted fulfillment states, see audit events, manage inventory and quotes, and inspect chart tooltips and real aggregates.
- Generate an audit event on each high-impact admin write; never log unredacted payment secrets or full sensitive customer payloads.
- The AI Insights panel renders actual structured chart components with or without an OpenAI key; the AI request is server-side, read-only and validation bound.
- The video studio has functional file upload and approval; actual Google API generation is marked pending if credentials are absent; Flow exports can be imported.
- The 3D kitchen designer places/saves/reloads basic cabinets and submits a quote.
- All major pages work at desktop, tablet and mobile widths and with `prefers-reduced-motion`; no broken assets, obvious console warnings, dead buttons, unusable focus traps or unexpected horizontal overflow.
- `npm run build`, typecheck, lint and automated tests pass; Playwright verifies critical paths and screenshots; migrations reproduce cleanly on a fresh PostgreSQL database.

**Final response after implementation:** report which milestones were truly completed, URLs/routes, screenshots, changed files, exact run commands, required service keys/credentials, tests passed/failed, known limits and the next highest-value action. Never say “fully functional” or “generated with Flow” unless evidence confirms it. Continue improving visible quality after basic functionality works; the finished result should be visually distinctive, luxurious and enjoyable to use.
