import { z } from 'zod';
export const roles = ['owner','admin','catalogue','fulfillment','support','analyst','content'] as const;
export type Role = typeof roles[number];
const permissions: Record<string,string[]> = { owner:['*'], admin:['*'], catalogue:['products','inventory','media','schedules'], fulfillment:['orders','inventory','fulfillment'], support:['quotes','customers','support','reviews'], analyst:['analytics'], content:['cms','media','video','promotions','schedules'] };
export function allowed(role:string,resource:string) { return resource==='overview'?!!permissions[role]:permissions[role]?.some(p=>p==='*'||p===resource) ?? false; }
export const money = (v:number) => new Intl.NumberFormat('en-GH',{style:'currency',currency:'GHS'}).format(v/100);
export function totals(subtotal:number,discountPercent:number,taxBps:number,shipping:number) { const discount=Math.round(subtotal*discountPercent/100); const tax=Math.round((subtotal-discount)*taxBps/10000); return {subtotal,discount,tax,shipping,total:subtotal-discount+tax+shipping}; }
export const moduleSchema=z.object({id:z.string(),kind:z.enum(['base','wall','island','sink']),x:z.number().min(-10).max(10),z:z.number().min(-10).max(10),rotation:z.number().int().min(0).max(3),color:z.string().regex(/^#[0-9a-f]{6}$/i)});
export const sceneSchema=z.object({version:z.literal(1),width:z.number().min(2).max(12),depth:z.number().min(2).max(12),height:z.number().min(2).max(5),floor:z.enum(['oak','stone']),wall:z.enum(['ivory','sage']),worktop:z.enum(['marble','charcoal']),modules:z.array(moduleSchema).max(60)}).refine(s=>new Set(s.modules.map(m=>m.id)).size===s.modules.length,{message:'Module identifiers must be unique'});
export type Scene=z.infer<typeof sceneSchema>;
export type Cabinet=z.infer<typeof moduleSchema>;
export const defaultScene:Scene={version:1,width:5,depth:4,height:2.8,floor:'oak',wall:'ivory',worktop:'marble',modules:[{id:'base-1',kind:'base',x:-1.4,z:-1.55,rotation:0,color:'#153c30'},{id:'sink-1',kind:'sink',x:-.6,z:-1.55,rotation:0,color:'#153c30'},{id:'base-2',kind:'base',x:.2,z:-1.55,rotation:0,color:'#153c30'},{id:'island-1',kind:'island',x:0,z:.5,rotation:0,color:'#153c30'}]};
export function dimensions(m:Cabinet):[number,number] { const w=m.kind==='island'?1.6:.8,d=m.kind==='island'?.8:.6;return m.rotation%2?[d,w]:[w,d]; }
export function validPlacement(scene:Scene,m:Cabinet) {const [w,d]=dimensions(m);return Math.abs(m.x)+w/2<=scene.width/2&&Math.abs(m.z)+d/2<=scene.depth/2&&!scene.modules.some(o=>{if(o.id===m.id||(o.kind==='wall')!==(m.kind==='wall'))return false;const [ow,od]=dimensions(o);return Math.abs(m.x-o.x)<(w+ow)/2-.01&&Math.abs(m.z-o.z)<(d+od)/2-.01;});}
export function logoFrame(t:number) {const p=((t%10)+10)%10; const u=Math.min(p/6,1); const ease=u*u*u*(u*(u*6-15)+10); return {rotation:ease*Math.PI*2,light:p<6?0:Math.pow(Math.sin(Math.PI*(p-6)/4),2)};}
export const quoteSchema=z.object({name:z.string().min(2).max(100),email:z.email(),phone:z.string().max(30).optional(),notes:z.string().min(5).max(4000),scene:sceneSchema.optional()});
export const transitions:Record<string,string[]>={awaiting_confirmation:['processing','cancelled'],paid:['processing','cancelled'],processing:['shipped','cancelled'],shipped:['delivered'],delivered:[],pending_payment:['cancelled'],payment_review:['paid','cancelled']};
