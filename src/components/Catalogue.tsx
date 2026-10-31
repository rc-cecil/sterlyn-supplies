'use client';
import { AddEnquiryButton } from './ShowcaseEnquiry';
import { enquiryUrl } from '@/lib/enquiry';
import Link from 'next/link';
import {ProductActions} from './ProductActions';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter,useSearchParams } from 'next/navigation';
import { Heart,SlidersHorizontal,ArrowUpRight,Search,Plus,Minus } from 'lucide-react';
import type {ProductView} from '@/lib/types';
import {api,Modal} from './ui';
export function ProductCard({product:p,index=0}:{product:ProductView;index?:number}){const [saved,setSaved]=useState(false),[message,setMessage]=useState('');async function wish(){try{const r=await api<{saved:boolean}>('wishlist',{productId:p.id});setSaved(r.saved);setMessage(r.saved?'Saved to wishlist':'Removed from wishlist');}catch(e){setMessage((e as Error).message);}}return <article className="product-card"><Link href={'/products/'+p.slug} className="product-image"><Image unoptimized={p.image.startsWith('/api/media/')} src={p.image} alt={p.pictures?.find(picture=>picture.source===p.image)?.alt||p.name} fill sizes="(max-width: 700px) 100vw, 45vw"/><span className="image-tag">{p.illustrative?'Illustrative product':p.category.name}</span><span className="image-arrow"><ArrowUpRight size={23}/></span></Link><button className={'wishlist '+(saved?'saved':'')} onClick={wish} aria-label={'Save '+p.name}><Heart size={18} fill={saved?'currentColor':'none'}/></button><div className="product-caption"><div><small>{p.style} · {p.material}</small><h3><Link href={'/products/'+p.slug}>{p.name}</Link></h3></div><span className="product-price">Enquire for details</span></div><ProductActions product={p}/><span className="sr-only">Product {index+1}</span>{message&&<p className="form-message" role="status">{message}</p>}</article>;}
export function Catalogue({products,categories,total,activeCategory}:{products:ProductView[];categories:{slug:string;name:string}[];total:number;activeCategory?:string}){const router=useRouter(),params=useSearchParams();const [filters,setFilters]=useState(false);function filter(key:string,value:string){const p=new URLSearchParams(params);if(activeCategory&&!p.has('category'))p.set('category',activeCategory);if(value)p.set(key,value);else p.delete(key);p.delete('page');router.push('/collections?'+p.toString());}return <><div className="catalog-toolbar"><form className="search-box" action="/collections"><Search size={18}/>{activeCategory&&<input type="hidden" name="category" value={activeCategory}/>}<input aria-label="Search kitchens and details" name="q" placeholder="Search kitchens, cabinets, sinks…" defaultValue={params.get('q')||''}/><button type="submit">Search</button></form><button className="filter-trigger" onClick={()=>setFilters(!filters)} aria-expanded={filters}><SlidersHorizontal size={17}/> Refine collection</button><label className="sort">Sort by<select aria-label="Sort by" value={params.get('sort')||'featured'} onChange={e=>filter('sort',e.target.value)}><option value="featured">Curated selection</option><option value="name">Name A–Z</option><option value="newest">Latest additions</option></select></label></div><div className={'filters '+(filters?'expanded':'')}><label>Category<select aria-label="Category" value={params.get('category')||activeCategory||''} onChange={e=>filter('category',e.target.value)}><option value="">All categories</option>{categories.map(c=><option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label><label>Style<select aria-label="Style" value={params.get('style')||''} onChange={e=>filter('style',e.target.value)}><option value="">Every style</option>{['Modern','Classic','Contemporary'].map(s=><option key={s}>{s}</option>)}</select></label><label>Material<select aria-label="Material" value={params.get('material')||''} onChange={e=>filter('material',e.target.value)}><option value="">All materials</option>{['Wood','Stone','Metal','Hardware','Painted cabinetry','Ceramic','Composite'].map(s=><option key={s}>{s}</option>)}</select></label><button className="text-link" onClick={()=>router.push('/collections')}>Clear filters</button></div><div className="results-meta"><span>{total} products</span><span>Product previews · Quotation only</span></div><div className="product-grid">{products.map((p,i)=><ProductCard key={p.id} product={p} index={i}/>)}</div>{!products.length&&<div className="empty"><h2>No matching pieces.</h2><p>Try another style or clear your filters.</p></div>}{total>12&&<div className="pagination">{Array.from({length:Math.ceil(total/12)},(_,i)=><Link key={i} href={'/collections?'+new URLSearchParams({...Object.fromEntries(params),...(activeCategory?{category:activeCategory}:{}),page:String(i+1)})}>{i+1}</Link>)}</div>}</>;}
export function ProductDetail({product:p}:{product:ProductView}) {
  const [variant,setVariant]=useState(p.variants[0]);
  const [qty,setQty]=useState(1);
  const [zoom,setZoom]=useState(false);
  const [image,setImage]=useState(p.image);
  const item = {type:'product' as const,slug:p.slug,name:p.name,quantity:qty,finish:variant?.name,image:p.image};
  return <>
    <div className="product-detail">
      <div className="detail-gallery">
        <button className="gallery-main" type="button" onClick={()=>setZoom(true)} aria-label="Enlarge product image">
          <Image unoptimized={image.startsWith('/api/media/')} src={image} alt={p.name+' concept'} fill sizes="(max-width: 800px) 100vw, 60vw" priority/>
          <span>View image ↗</span>
        </button>
        <div className="gallery-thumbs">{p.gallery.map((src,i)=><button key={src} type="button" aria-pressed={src===image} onClick={()=>setImage(src)} aria-label={'View gallery image '+(i+1)}><img src={src} alt=""/></button>)}</div>
        <p className="asset-note">Illustrative concept. Materials, availability and final specifications are confirmed in a direct quotation.</p>
      </div>
      <div className="product-info">
        <Link className="eyebrow" href={'/collections/'+p.category.slug}>{p.category.name} / {p.style}</Link>
        <h1>{p.name}</h1><p className="lede">{p.description}</p>
        {variant&&<><label className="field"><span>Finish direction · {variant.name}</span><select aria-label="Choose finish" value={variant.id} onChange={e=>{const v=p.variants.find(x=>x.id===e.target.value);if(v){setVariant(v);setImage(v.image||p.image);}}}>{p.variants.map(v=><option value={v.id} key={v.id}>{v.name}</option>)}</select></label>
          <div className="swatches">{p.variants.map(v=><button key={v.id} type="button" style={{background:v.color}} className={v.id===variant.id?'selected':''} aria-label={v.name} aria-pressed={v.id===variant.id} onClick={()=>{setVariant(v);setImage(v.image||p.image);}}/>)}</div></>}
        <label className="field"><span>Quantity to enquire about</span>
          <input type="number" min={1} max={99} value={qty} onChange={e=>setQty(Math.max(1,Math.min(99,Number(e.target.value)||1)))}/></label>
        <Link className="button" href={enquiryUrl(item)}>Request a quote on WhatsApp <ArrowUpRight size={18}/></Link>
        <AddEnquiryButton item={item}/>
        <p className="asset-note">No prices or online payments. Requests open the Contact page with your selected product, quantity and finish already included.</p>
        <Link className="text-link" href="/design-studio">Explore a layout in 3D <ArrowUpRight size={17}/></Link>
        {[
          ['Materials & finish',p.material+' is a concept direction. Exact material grades and samples are confirmed during quotation.'],
          ['Dimensions & planning','Share your room dimensions with our team. Concept imagery is not an installation drawing.'],
          ['Delivery & availability','Availability and delivery arrangements are confirmed directly with our team.']
        ].map(([title,body])=><details key={title}><summary>{title}</summary><p>{body}</p></details>)}
      </div>
    </div>
    <Modal open={zoom} onOpenChange={setZoom} title={p.name}><img className="zoom-image" src={image} alt={p.name}/></Modal>
  </>;
}
