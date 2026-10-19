import {z} from 'zod';
export const homeContentSchema=z.object({titleLine1:z.string().min(3).max(40).default('The art of a'),titleLine2:z.string().min(3).max(40).default('better kitchen.'),revealLine1:z.string().min(3).max(40).default('Made for the way'),revealLine2:z.string().min(3).max(40).default('you live.')});
export type HomeContent=z.infer<typeof homeContentSchema>;
