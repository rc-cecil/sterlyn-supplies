'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {ArrowUpRight,MessageCircle,Phone,Mail,Facebook,Trash2} from 'lucide-react';
import {catalogueProducts} from '@/lib/catalogue-content';
import {inspirationStories} from '@/lib/inspiration';
import type {CartView} from '@/lib/types';

export const sterlynWhatsApp = '447576899618';
export const sterlynPhone = '+447576899618';
export const sterlynFacebook = 'https://www.facebook.com/61595476006250/?hpir=1';
const selectionKey = 'sterlyn-showcase-enquiry';
type Selection = {kind:'product'|'inspiration';slug:string;name:string;url:string;quantity:number;detail?:string};
function readSelection():Selection[] {
  try {
    const data:unknown=JSON.parse(localStorage.getItem(selectionKey)||'[]');
    if(!Array.isArray(data))return [];
    return data.filter((v):v is Selection=>Boolean(v&&typeof v==='object'&&(v.kind==='product'||v.kind==='inspiration')&&typeof v.slug==='string'&&typeof v.name==='string'&&typeof v.url==='string'&&Number.isInteger(v.quantity)&&v.quantity>0)).slice(0,25);
  }catch{return [];}
}
function mergeItems(items:Selection[], additions:Selection[]) {
  const merged=[...items];
  for(const next of additions){
    const existing=merged.findIndex(item=>item.kind===next.kind&&item.slug===next.slug&&item.detail===next.detail);
    if(existing<0)merged.push(next);
    else merged[existing]={...merged[existing],quantity:Math.min(20,merged[existing].quantity+next.quantity)};
  }
  return merged.slice(0,25);
}
function selectedFromLink(search:URLSearchParams):Selection[] {
  const productSlug=search.get('product');
  const inspirationSlug=search.get('inspiration');
  const quantity=Math.max(1,Math.min(20,Number(search.get('quantity'))||1));
  const finish=(search.get('finish')||'').slice(0,100);
  const result:Selection[]=[];
  if(productSlug){
    const product=catalogueProducts.find(p=>p.slug===productSlug);
    const safeSlug=/^[a-z0-9-]{1,100}$/.test(productSlug);
    if(product || safeSlug){
      const name=product?.name || (search.get('title')||productSlug).slice(0,140);
      result.push({kind:'product',slug:productSlug,name,url:'/products/'+productSlug,quantity,detail:finish||product?.finish});
    }
  }
  if(inspirationSlug){
    const story=inspirationStories.find(s=>s.slug===inspirationSlug);
    if(story)result.push({kind:'inspiration',slug:story.slug,name:story.title,url:'/inspiration/'+story.slug,quantity:1});
  }
  return result;
}
export function AddToEnquiryButton({slug,name,finish}:{slug:string;name:string;finish?:string}){
 const [added,setAdded]=useState(false);
 function add(){
   const item:Selection={kind:'product',slug,name,url:'/products/'+slug,quantity:1,detail:finish};
   localStorage.setItem(selectionKey,JSON.stringify(mergeItems(readSelection(),[item])));
   setAdded(true);
 }
 return <button type="button" className="text-link sterlyn-save-selection" onClick={add}>{added?'Added to your enquiry':'Add to enquiry list'} <ArrowUpRight size={16}/></button>;
}
export default function ContactPage({preview=false}:{preview?:boolean}){
  const [items,setItems]=useState<Selection[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [origin,setOrigin]=useState('https://sterlynsupplies.netlify.app');
  const [designSummary,setDesignSummary]=useState('');
  const [name,setName]=useState('');
  const [notes,setNotes]=useState('');
  const [loadingBag,setLoadingBag]=useState(false);
  useEffect(()=>{
    setOrigin(window.location.origin);
    const params=new URLSearchParams(window.location.search);
    if(params.get('design')==='1'){
      try{
        const saved=JSON.parse(localStorage.getItem('sterlyn-scene')||'null');
        if(saved&&typeof saved.width==='number'&&typeof saved.depth==='number'&&typeof saved.height==='number'){
          const modules=Array.isArray(saved.modules)?saved.modules:[];
          const kinds=modules.slice(0,30).map((m:{kind?:string})=>m.kind||'unit').join(', ');
          setDesignSummary('Room: '+saved.width+' x '+saved.depth+' x '+saved.height+' m; Floor: '+String(saved.floor||'not set')+'; Wall: '+String(saved.wall||'not set')+'; Worktop: '+String(saved.worktop||'not set')+'; Modules ('+modules.length+'): '+kinds);
        }
      }catch{}
    }
    const incoming=selectedFromLink(params);
    const saved=readSelection();
    const uniqueIncoming=incoming.filter(item=>!saved.some(previous=>previous.kind===item.kind&&previous.slug===item.slug&&previous.detail===item.detail));
    const next=mergeItems(saved,uniqueIncoming);
    setItems(next);
    localStorage.setItem(selectionKey,JSON.stringify(next));
    setLoaded(true);
    if(params.get('bag')==='1'&&!preview){
      setLoadingBag(true);
      fetch('/api/cart').then(async r=>{
        if(!r.ok)throw Error('No saved selection found');
        return await r.json() as CartView;
      }).then(cart=>{
        const fromBag:Selection[]=cart.items.map(item=>({
          kind:'product',slug:item.variant.product.slug,name:item.variant.product.name,
          url:'/products/'+item.variant.product.slug,quantity:item.quantity,detail:item.variant.name
        }));
        setItems(current=>{
          const withoutDuplicates=current.filter(item=>!fromBag.some(from=>from.kind===item.kind&&from.slug===item.slug&&from.detail===item.detail));
          const merged=mergeItems(withoutDuplicates,fromBag);
          localStorage.setItem(selectionKey,JSON.stringify(merged));
          return merged;
        });
      }).catch(()=>{}).finally(()=>setLoadingBag(false));
    }
  },[preview]);
  function updateItems(next:Selection[]){setItems(next);localStorage.setItem(selectionKey,JSON.stringify(next));}
  const summary=items.map((item,i)=>{
    const siteLink=origin+item.url;
    return `${i+1}. ${item.name} (${item.kind})${item.detail?', '+item.detail:''}${item.quantity>1?', quantity '+item.quantity:''}\n   ${siteLink}`;
  }).join('\n');
  const message=[
    'Hello Sterlyn Supplies,',
    name.trim()?'My name is '+name.trim().slice(0,100)+'.':'',
    items.length?'I would like a quotation or further information about:\n'+summary:'I would like to make an enquiry about your kitchen products and services.',
    designSummary?'Design Studio layout: '+designSummary:'',
    notes.trim()?'Additional details: '+notes.trim().slice(0,1500):'',
    'Please let me know the next steps. Thank you.'
  ].filter(Boolean).join('\n\n');
  const whatsappUrl='https://wa.me/'+sterlynWhatsApp+'?text='+encodeURIComponent(message);
  return <section className="page-wrap sterlyn-contact">
    <div className="page-heading"><span className="eyebrow">CONTACT STERLYN SUPPLIES</span><h1>Let’s bring your ideas to life.</h1>
      <p>Tell us what you have in mind. We’ll discuss your preferred designs, specifications, availability and pricing directly. No online purchases or payments.</p>
    </div>
    <div className="sterlyn-contact-grid">
      <div className="sterlyn-contact-main">
        <span className="eyebrow">YOUR ENQUIRY</span>
        <h2>What caught your eye?</h2>
        {designSummary&&<p className="sterlyn-contact-empty"><strong>Selected Design Studio layout</strong><br/>{designSummary}</p>}
        {loaded&&items.length>0?<div className="sterlyn-selection" aria-label="Selected quotation items">
          {items.map((item,i)=><article key={item.kind+item.slug+item.detail}>
            <div><span className="eyebrow">{item.kind==='product'?'COLLECTION':'INSPIRATION'}</span>
              <h3><Link href={item.url}>{item.name}</Link></h3>
              {item.detail&&<p>{item.detail}</p>}
              {item.quantity>1&&<p>Quantity: {item.quantity}</p>}
            </div>
            <button type="button" aria-label={'Remove '+item.name} onClick={()=>updateItems(items.filter((_,index)=>index!==i))}><Trash2 size={18}/></button>
          </article>)}
          <p className="asset-note">Your selected ideas are included automatically in the WhatsApp message. Review them before sending.</p>
        </div>:<p className="sterlyn-contact-empty">{loadingBag?'Loading your selection…':'No items selected yet. You can ask a general question, or browse collections and inspiration to include specific designs.'}</p>}
        <Link className="text-link" href="/collections">Explore more collections <ArrowUpRight size={17}/></Link>
        <div className="sterlyn-contact-form">
          <label className="field"><span>Your name (optional)</span><input value={name} onChange={e=>setName(e.target.value)} maxLength={100} placeholder="How should we address you?"/></label>
          <label className="field"><span>Tell us more about your project (optional)</span><textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1500} placeholder="Room dimensions, preferred finishes, quantities or questions…"/></label>
          <a className="button sterlyn-whatsapp-button" href={whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={19}/> Continue on WhatsApp <ArrowUpRight size={18}/></a>
          <p className="asset-note">WhatsApp will open with your enquiry prepared. You review and send the message yourself; nothing is sent automatically.</p>
        </div>
      </div>
      <aside className="sterlyn-contact-methods">
        <span className="eyebrow">SPEAK WITH OUR TEAM</span>
        <h2>We’re here to help.</h2>
        <a className="sterlyn-contact-method" href={'https://wa.me/'+sterlynWhatsApp} target="_blank" rel="noopener noreferrer"><MessageCircle size={23}/><span><strong>WhatsApp</strong><small>Preferred contact · +44 7576 899618</small></span><ArrowUpRight size={19}/></a>
        <a className="sterlyn-contact-method" href={'tel:'+sterlynPhone}><Phone size={23}/><span><strong>Call us</strong><small>{sterlynPhone}</small></span><ArrowUpRight size={19}/></a>
        <div className="sterlyn-contact-method pending"><Mail size={23}/><span><strong>Business email</strong><small>Coming soon, after domain email setup</small></span></div>
        <a className="sterlyn-contact-method" href={sterlynFacebook} target="_blank" rel="noopener noreferrer"><Facebook size={23}/><span><strong>Facebook</strong><small>Visit our official page</small></span><ArrowUpRight size={19}/></a>
        <p className="asset-note">{preview?'Client preview · ':' '}No in-app messaging, checkout, prices or online payment. All arrangements are handled directly with the business outside the website.</p>
      </aside>
    </div>
  </section>;
}
