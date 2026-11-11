'use client';
import {useRef,useState,type FormEvent} from 'react';
import {MessageCircle,Save,X} from 'lucide-react';
import {api} from '../ui';
export type ManualEnquiryResult={enquiry:{id:string;reference:string};message:string};
export default function ManualEnquiry({onCreated,onCancel}:{onCreated:(result:ManualEnquiryResult)=>void;onCancel:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const requestKey=useRef<string|null>(null),submitting=useRef(false);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(submitting.current)return;
  const values=Object.fromEntries(new FormData(event.currentTarget));
  requestKey.current??=crypto.randomUUID();submitting.current=true;setBusy(true);setError('');
  try{const result=await api<ManualEnquiryResult>('admin/manual-enquiry',{...values,quantity:Number(values.quantity),phone:String(values.phone).replace(/[\s()-]/g,''),requestKey:requestKey.current});onCreated(result);}
  catch(error){setError((error as Error).message);}finally{submitting.current=false;setBusy(false);}
 }
 return <section className="ops-section ops-conversion" aria-labelledby="manual-enquiry-title"><h2 id="manual-enquiry-title"><MessageCircle size={22}/> Add a WhatsApp enquiry</h2><p>For customers who contact you directly. Record their request once, then confirm an order when you agree.</p><form className="ops-form" onSubmit={submit}>
 <div className="ops-form-grid"><label className="field"><span>Customer name</span><input name="name" required minLength={2} maxLength={100} autoComplete="name"/></label><label className="field"><span>WhatsApp number</span><input name="phone" type="tel" required maxLength={30} placeholder="+233…" autoComplete="tel"/><small>Include the country code.</small></label><label className="field"><span>Email (optional)</span><input name="email" type="email" maxLength={254} autoComplete="email"/></label></div>
 <div className="ops-form-grid"><label className="field"><span>What does the customer need?</span><input name="description" required minLength={3} maxLength={180} placeholder="e.g. Walnut kitchen with brass handles"/></label><label className="field"><span>Quantity</span><input name="quantity" type="number" required defaultValue={1} min={1} max={99}/></label><label className="field"><span>How did they contact you?</span><select name="source" defaultValue="Direct WhatsApp"><option>Direct WhatsApp</option><option>Website WhatsApp</option><option>Phone</option><option>Other</option></select></label></div>
 <details className="ops-disclosure"><summary>Extra requirements (optional)</summary><label className="field"><span>Finishes, measurements or other requirements</span><textarea name="notes" rows={3} maxLength={4000}/></label></details><p className="ops-caption">No email? You can still create an order and share its private tracking link in WhatsApp.</p>
 {error&&<p className="ops-error" role="alert">{error}</p>}<div className="ops-actions"><button className="button" disabled={busy}><Save size={17}/>{busy?'Saving…':'Save enquiry'}</button><button className="button secondary" type="button" disabled={busy} onClick={onCancel}><X size={16}/> Cancel</button></div></form></section>;
}
