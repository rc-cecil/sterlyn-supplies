import {z} from 'zod';
import {sceneSchema} from './domain';

export const enquiryStatuses=['new','contacted','negotiating','awaiting_customer','agreed','converted','closed'] as const;
export const orderStages=['confirmed','processing','ready_for_delivery','dispatched','delivered','completed'] as const;
export const orderStatuses=[...orderStages,'delayed','on_hold','cancelled'] as const;
export const label=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
export const currencySchema=z.enum(['GHS','GBP','USD']);
export const amountSchema=z.number().int().positive().max(2147483647);
export const enquiryInput=z.object({
  requestKey:z.uuid(),name:z.string().trim().min(2).max(100),
  email:z.email().max(254).transform(s=>s.trim().toLowerCase()),
  phone:z.string().trim().max(30).optional(),notes:z.string().trim().max(4000).default(''),
  items:z.array(z.object({type:z.enum(['product','inspiration']),slug:z.string().min(1).max(150),quantity:z.number().int().min(1).max(99),finish:z.string().trim().max(120).optional()})).max(40),
  scene:sceneSchema.optional(),
});
export const itemSnapshot=z.object({type:z.enum(['product','inspiration','design','custom']).default('product'),slug:z.string().optional(),name:z.string().min(1),quantity:z.number().int().min(1).max(99),finish:z.string().optional(),image:z.string().optional(),variantId:z.string().optional(),sku:z.string().optional()});
export type ItemSnapshot=z.infer<typeof itemSnapshot>;
export function canonicalEnquiryStatus(status:string){return ({reviewing:'contacted',quoted:'awaiting_customer',accepted:'agreed'} as Record<string,string>)[status]||status;}
export function canonicalOrderStatus(status:string){return ({awaiting_confirmation:'confirmed',paid:'confirmed',shipped:'dispatched'} as Record<string,string>)[status]||status;}
export function nextOrderStatuses(status:string,resumeStatus?:string|null):string[]{
  const current=canonicalOrderStatus(status);
  if(current==='completed'||current==='cancelled')return [];
  if(current==='delivered')return ['completed'];
  if(current==='delayed'||current==='on_hold')return [resumeStatus||'confirmed',current==='delayed'?'on_hold':'delayed','cancelled'];
  const index=orderStages.indexOf(current as typeof orderStages[number]);
  return index>=0?[orderStages[index+1],'delayed','on_hold','cancelled']:['cancelled'];
}
export function receiptSummary(total:number,payments:{provider:string;status:string;amount:number;reversalOf?:string|null}[]){
  const received=payments.filter(p=>(p.status==='confirmed'&&p.provider==='manual')||(p.status==='paid'&&p.provider!=='manual')).reduce((sum,p)=>sum+(p.reversalOf?-p.amount:p.amount),0);
  return {received,balance:Math.max(0,total-received),overpayment:Math.max(0,received-total),status:received<=0?'unpaid':received<total?'partially_paid':'paid'};
}
export const statusDescription:Record<string,string>={confirmed:'Your order has been confirmed. Our team will keep you informed as it progresses.',processing:'Our team is preparing your order.',ready_for_delivery:'Your order is ready. Our team will arrange delivery with you.',dispatched:'Your order has been dispatched.',delivered:'Your order has been recorded as delivered.',completed:'Your order is complete. Thank you for choosing Sterlyn Supplies.',delayed:'Your order is delayed. Contact our team if you need further information.',on_hold:'Your order is on hold. Our team will discuss the next steps with you.',cancelled:'Your order has been cancelled. Please contact our team with any questions.'};
