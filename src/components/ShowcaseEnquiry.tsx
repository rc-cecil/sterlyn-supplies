'use client';

import Link from 'next/link';
import {api} from './ui';
import {sceneSchema,type Scene} from '@/lib/domain';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ClipboardList, Mail, MessageCircle, Phone, Trash2 } from 'lucide-react';
import {
  addEnquiryItem, BUSINESS_FACEBOOK, BUSINESS_PHONE, BUSINESS_WHATSAPP, GENERAL_WHATSAPP_URL, ENQUIRY_EVENT,
  enquiryItemUrl, enquiryKey, enquiryUrl, readDirectEnquiry, readEnquiryBag,
  whatsappEnquiryText, writeEnquiryBag, type EnquiryItem,
} from '@/lib/enquiry';

function useEnquiryBag(): EnquiryItem[] {
  const [items, setItems] = useState<EnquiryItem[]>([]);
  useEffect(() => {
    const refresh = () => setItems(readEnquiryBag());
    refresh();
    window.addEventListener(ENQUIRY_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(ENQUIRY_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return items;
}

export function EnquiryBasketLink({ className = 'icon-button' }: { className?: string }) {
  const items = useEnquiryBag();
  const count = items.reduce((total, item) => total + item.quantity, 0);
  return <Link href="/cart" className={className} aria-label={'Your enquiry list, ' + count + ' items'}>
    <ClipboardList size={20} aria-hidden="true" />
    {count > 0 && <sup>{count}</sup>}
  </Link>;
}

export function AddEnquiryButton({ item, className = 'button secondary' }: { item: EnquiryItem; className?: string }) {
  const [added, setAdded] = useState(false);
  const [error,setError]=useState('');
  return <span className="enquiry-add-control">
    <button type="button" className={className} onClick={() => {
      const saved=addEnquiryItem(item);setAdded(saved);setError(saved?'':'Your browser could not save this selection. Use Request a quote to enquire about it directly.');
    }}>{added ? 'Added to enquiry list' : 'Add to enquiry list'} <ArrowUpRight size={17} /></button>
    {added && <Link className="text-link" href="/cart">Review selections ↗</Link>}{error&&<p role="alert">{error}</p>}
  </span>;
}

export function EnquiryBagPage() {
  const items = useEnquiryBag();
  function change(item: EnquiryItem, quantity: number) {
    const next = items.map(current => enquiryKey(current) === enquiryKey(item) ?
      { ...current, quantity: Math.max(0, Math.min(99, quantity)) } : current)
      .filter(current => current.quantity > 0);
    writeEnquiryBag(next);
  }
  return <section className="page-wrap enquiry-page">
    <div className="page-heading"><span className="eyebrow">YOUR ENQUIRY LIST</span>
      <h1>Your selected ideas.</h1>
      <p>Collect products and inspiration here, then ask our team for details on WhatsApp. There are no online purchases or prices.</p>
    </div>
    {items.length ? <>
      <div className="enquiry-items">{items.map(item => <article className="enquiry-item" key={enquiryKey(item)}>
        <div><small>{item.type === 'product' ? 'PRODUCT' : 'INSPIRATION'}</small>
          <h3><Link href={enquiryItemUrl(item)}>{item.name}</Link></h3>
          {item.finish && <p>Finish: {item.finish}</p>}
          <Link className="text-link" href={enquiryUrl(item)}>Enquire about this item ↗</Link>
        </div>
        <div className="enquiry-item-actions">
          <label>Quantity <input aria-label={'Quantity for ' + item.name} type="number" min={1} max={99}
            value={item.quantity} onChange={event => change(item, Number(event.target.value) || 1)} /></label>
          <button type="button" onClick={() => change(item, 0)} aria-label={'Remove ' + item.name}><Trash2 size={17} /></button>
        </div>
      </article>)}</div>
      <div className="enquiry-next"><p>Your enquiry will include each selected item’s name, quantity and website link.</p>
        <Link className="button" href="/contact?basket=1">Request a quotation <ArrowUpRight size={17} /></Link></div>
    </> : <div className="empty"><h2>No selections yet.</h2><p>Browse the collections or inspiration journal and add ideas you like.</p>
      <Link className="button" href="/collections">Explore the collections <ArrowUpRight size={18} /></Link></div>}
  </section>;
}

export function ContactPage({preview=false}:{preview?:boolean}) {
  const bag = useEnquiryBag();
  const [direct, setDirect] = useState<EnquiryItem | null>(null);
  const [fromBag, setFromBag] = useState(false);
  const [removedMessage, setRemovedMessage] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [email,setEmail]=useState(''),[phone,setPhone]=useState('');
  const [scene,setScene]=useState<Scene|undefined>();
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [saved,setSaved]=useState<{reference:string;whatsappUrl:string}|null>(null);
  const touched=useRef({name:false,email:false});
  const submitting=useRef(false);
  const draft=useRef<{key:string;fingerprint:string}|null>(null);
  const loadContact=useCallback(()=>{
    if(!preview)api<{user:{name:string;email:string}|null}>('session').then(({user})=>{if(user){if(!touched.current.name)setName(user.name);if(!touched.current.email)setEmail(user.email);}}).catch(()=>{});
  },[preview]);
  useEffect(()=>{
    const context=new URLSearchParams(location.search);
    if(!context.has('slug')&&!context.has('basket')&&!context.has('design')){try{const confirmation=JSON.parse(sessionStorage.getItem('sterlyn-enquiry-success')||'null');if(confirmation?.reference&&confirmation?.whatsappUrl)setSaved(confirmation);}catch{}}
    try{const previous=JSON.parse(sessionStorage.getItem('sterlyn-enquiry-draft')||'null');if(previous?.key&&previous?.fingerprint)draft.current=previous;}catch{}
    loadContact();
    if(new URLSearchParams(location.search).get('design')==='1'){
      try{const parsed=sceneSchema.safeParse(JSON.parse(localStorage.getItem('sterlyn-enquiry-scene')||'null'));if(parsed.success)setScene(parsed.data);else setError('Your design could not be loaded. Return to the studio and select Enquire about this design again.');}catch{setError('Your design could not be loaded. Return to the studio and try again.');}
    }
  },[loadContact]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDirect(readDirectEnquiry(params));
    setFromBag(params.get('basket') === '1');
    setNotes((params.get('notes') || '').slice(0, 3000));
  }, []);
  const selected = useMemo(() => {
    if (!direct && !fromBag) return [] as EnquiryItem[];
    const result = fromBag || direct ? [...bag] : [];
    if (direct) {
      const index = result.findIndex(item => enquiryKey(item) === enquiryKey(direct));
      if (index >= 0) result[index] = { ...direct, quantity: Math.max(result[index].quantity, direct.quantity) };
      else result.push(direct);
    }
    return result;
  }, [bag, direct, fromBag]);
  function removeSelection(item: EnquiryItem) {
    const key = enquiryKey(item);
    const remaining = readEnquiryBag().filter(current => enquiryKey(current) !== key);
    writeEnquiryBag(remaining);
    if (direct && enquiryKey(direct) === key) {
      setDirect(null);
      setFromBag(remaining.length > 0);
      // Remove the direct selection from the URL so a reload cannot restore it.
      const url = new URL(window.location.href);
      ['type', 'slug', 'name', 'quantity', 'finish'].forEach(param => url.searchParams.delete(param));
      if (remaining.length) url.searchParams.set('basket', '1');
      else url.searchParams.delete('basket');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
    setRemovedMessage(item.name + ' removed from your enquiry.');
  }
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(submitting.current)return;
    if(preview){
      const safeNotes = [notes, email.trim() ? 'Contact email: '+email.trim() : '', phone.trim() ? 'Contact phone: '+phone.trim() : '', scene ? 'Room design: '+scene.width+'m × '+scene.depth+'m ('+scene.modules.length+' illustrative modules)' : ''].filter(Boolean).join('\n');
      window.location.assign('https://wa.me/'+BUSINESS_WHATSAPP+'?text='+encodeURIComponent(whatsappEnquiryText(selected,name,safeNotes)));
      return;
    }
    submitting.current=true;setBusy(true);setError('');
    const submitted=selected.map(item=>({...item}));
    const payload={name,email,phone,notes,scene,items:submitted.map(({type,slug,quantity,finish})=>({type,slug,quantity,finish}))};
    const fingerprint=JSON.stringify(payload);
    if(!draft.current||draft.current.fingerprint!==fingerprint)draft.current={key:crypto.randomUUID(),fingerprint};
    try{
      try{sessionStorage.setItem('sterlyn-enquiry-draft',JSON.stringify(draft.current));}catch{}
      const result=await api<{reference:string;whatsappUrl:string}>('enquiries',{...payload,requestKey:draft.current.key});
      writeEnquiryBag(readEnquiryBag().flatMap(item=>{const sent=submitted.find(other=>enquiryKey(other)===enquiryKey(item));return !sent?[item]:item.quantity>sent.quantity?[{...item,quantity:item.quantity-sent.quantity}]:[];}));
      try{sessionStorage.setItem('sterlyn-enquiry-success',JSON.stringify(result));sessionStorage.removeItem('sterlyn-enquiry-draft');}catch{}draft.current=null;
      setSaved(result);setDirect(null);setFromBag(false);setNotes('');setPhone('');setName('');setEmail('');
      window.history.replaceState(window.history.state,'','/contact');
      // Same-tab navigation works after an asynchronous save without relying on popups.
      window.location.assign(result.whatsappUrl);
    }catch(error){setError((error as Error).message);}finally{submitting.current=false;setBusy(false);}
  }
  function startNew(){setSaved(null);touched.current={name:false,email:false};loadContact();draft.current=null;try{sessionStorage.removeItem('sterlyn-enquiry-draft');sessionStorage.removeItem('sterlyn-enquiry-success');}catch{}}

  return <section className="page-wrap enquiry-page">
    <div className="page-heading"><span className="eyebrow">CONTACT STERLYN SUPPLIES</span>
      <h1>Let’s talk about your space.</h1>
      <p>Tell us what you have in mind. Our team can discuss design options, availability, specifications and quotations directly with you.</p>
    </div>
    <div className="enquiry-contact-grid">
      <div className="enquiry-contact-main">
        {saved?<section className="enquiry-success" role="status"><h2>Your enquiry is saved.</h2><p>Your reference: <strong>{saved.reference}</strong></p><p>Continue to WhatsApp to review and send your message. Opening the link does not send it automatically.</p><a className="button" href={saved.whatsappUrl}>Continue to WhatsApp <ArrowUpRight size={18}/></a><button type="button" className="text-link" onClick={startNew}>Start a new enquiry</button></section>:<>
        {preview&&<p className="enquiry-preview-notice" role="note">You can send your details and selected products directly through WhatsApp. Enquiries are not saved to an online customer account yet.</p>}
        <span className="eyebrow">YOUR ENQUIRY</span>
        {selected.length ? <>
          <h2>What you’re enquiring about</h2>
          <ol className="enquiry-selection">{selected.map(item => <li key={enquiryKey(item)}>
            <div className="enquiry-selection-info"><strong>{item.name}</strong><span>{item.type === 'product' ? 'Product' : 'Inspiration'}
              {item.finish ? ' · ' + item.finish : ''} · Quantity {item.quantity}</span>
            <Link href={enquiryItemUrl(item)} className="text-link">View selection ↗</Link></div>
            <button type="button" className="enquiry-selection-remove" onClick={() => removeSelection(item)}
              aria-label={'Remove ' + item.name + (item.finish ? ' · ' + item.finish : '')}
              title="Remove from enquiry"><Trash2 size={17} aria-hidden="true"/></button>
          </li>)}</ol>
          <Link className="text-link" href="/cart">Review or edit your enquiry list ↗</Link>
        </> : <><h2>How can we help?</h2><p>Send us a general enquiry, or explore our collection and select a product to request a tailored quotation.</p>
          {bag.length > 0 && <p><Link className="text-link" href="/contact?basket=1">Include your {bag.length} saved selection{bag.length === 1 ? '' : 's'} ↗</Link></p>}
        </>}
        <p className="enquiry-removal-message" role="status" aria-live="polite">{removedMessage}</p>
        {scene&&<div className="request-notes"><h3>Design Studio layout attached</h3><p>{scene.width} × {scene.depth} m · {scene.modules.length} sample modules</p><button type="button" className="text-link" onClick={()=>setScene(undefined)}>Remove design</button></div>}
        <form onSubmit={submit}>
        <div className="enquiry-fields">
          <label className="field"><span>Full name</span><input disabled={busy} required autoComplete="name" minLength={2} maxLength={100}
            value={name} onChange={event => {touched.current.name=true;setName(event.target.value);}} placeholder="How should we address you?" /></label>
          <label className="field"><span>Email address</span><input disabled={busy} required type="email" autoComplete="email" maxLength={254} value={email} onChange={event=>{touched.current.email=true;setEmail(event.target.value);}} /></label>
          <label className="field"><span>Phone number (optional)</span><input disabled={busy} type="tel" autoComplete="tel" maxLength={30} value={phone} onChange={event=>setPhone(event.target.value)}/></label>
          <label className="field"><span>Your message or project details (optional)</span>
            <textarea disabled={busy} maxLength={3000} rows={5} value={notes} onChange={event => setNotes(event.target.value)}
              placeholder="Room dimensions, preferred materials, location, or any questions…" /></label>
        </div>
        <button className="button enquiry-whatsapp" disabled={busy}>
          <MessageCircle size={19}/> {busy?'Preparing your enquiry…':preview?'Continue to WhatsApp':'Save enquiry & continue to WhatsApp'} <ArrowUpRight size={18}/>
        </button>
        {error&&<p role="alert">{error}</p>}
        <p className="asset-note">{preview?'Your enquiry details will open as a WhatsApp message for you to review and send. This website does not store the enquiry online yet. No payment is taken here.':'We save your enquiry first, then open WhatsApp with your reference and selections. Review and press Send in WhatsApp. No payment is taken on this website.'}</p>
        </form></>}

      </div>
      <aside className="enquiry-contact-methods">
        <h2>Reach us directly.</h2>
        <a href={GENERAL_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={21} /><span><strong>WhatsApp · Preferred</strong><small>Chat with our team</small></span><ArrowUpRight size={17} />
        </a>
        <a href="mailto:admin@sterlynsupplies.com"><Mail size={21} /><span><strong>Business email</strong><small>admin@sterlynsupplies.com</small></span><ArrowUpRight size={17} /></a>
        <a href={'tel:' + BUSINESS_PHONE}><Phone size={21} /><span><strong>Call us</strong><small>Speak with our team</small></span><ArrowUpRight size={17} /></a>
        <a href={BUSINESS_FACEBOOK} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">f</span><span><strong>Facebook</strong><small>Sterlyn Supplies</small></span><ArrowUpRight size={17} /></a>
      </aside>
    </div>
  </section>;
}
