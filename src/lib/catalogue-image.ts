import {z} from 'zod';
/** Bundled catalogue assets only; uploads use the separately authorized media pipeline. */
export const catalogueImageSchema=z.string().regex(/^\/images\/(?:products\/)?[a-zA-Z0-9][a-zA-Z0-9_.-]*\.(?:webp|png|jpe?g|avif|svg)$/,'Use a bundled image in /images/ or /images/products/.');
