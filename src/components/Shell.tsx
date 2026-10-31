'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, Search, X, ArrowUpRight } from 'lucide-react';
import { EnquiryBasketLink } from './ShowcaseEnquiry';
import { BUSINESS_FACEBOOK, BUSINESS_PHONE, BUSINESS_WHATSAPP } from '@/lib/enquiry';

export function Header(){
  const path=usePathname();
  const [menu,setMenu]=useState(false);
  useEffect(()=>setMenu(false),[path]);
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Sterlyn Supplies home">
        <img className="brand-mark" src="/images/sterlyn-monogram-clean.svg" alt=""/>
        <span className="brand-name">STERLYN<small>SUPPLIES</small></span>
      </Link>
      <nav aria-label="Main navigation" className={menu?'main-nav open':'main-nav'}>
        {[['/collections','Our collections'],['/inspiration','Inspiration'],['/about','Our story'],['/contact','Contact us']].map(([href,label])=>
          <Link key={href} href={href} className={path===href?'active':''}>{label}</Link>)}
        <Link href="/design-studio" className="mobile-studio">Design your space <ArrowUpRight size={16}/></Link>
        <Link href="/cart" className="mobile-studio">Your enquiry list <ArrowUpRight size={16}/></Link>
      </nav>
      <div className="nav-actions">
        <Link className="nav-studio" href="/design-studio">Design your space <ArrowUpRight size={15}/></Link>
        <Link href="/collections" className="icon-button" aria-label="Search catalogue"><Search size={19}/></Link>
        <EnquiryBasketLink className="icon-button bag-button"/>
        <button type="button" className="icon-button menu-toggle" aria-label={menu?'Close menu':'Open menu'} aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button>
      </div>
    </header>
  </>;
}

export function Footer(){
  const [consent,setConsent]=useState<string|null>('unset');
  useEffect(()=>setConsent(localStorage.getItem('sterlyn-consent')),[]);
  function choose(v:string){localStorage.setItem('sterlyn-consent',v);setConsent(v);}
  return <>
    <footer>
      <div className="footer-top">
        <div><h2>A space that’s<br/><em>entirely yours.</em></h2>
          <Link href="/contact" className="text-link">Contact us on WhatsApp <ArrowUpRight size={20}/></Link>
        </div>
        <div>
          <span className="eyebrow">LET'S TALK</span>
          <p>Explore our collections, save your ideas and request a quotation directly. No checkout or payments on this website.</p>
          <p><a className="text-link" href={'https://wa.me/'+BUSINESS_WHATSAPP} target="_blank" rel="noopener noreferrer">WhatsApp: {BUSINESS_PHONE} ↗</a></p>
          <p><a className="text-link" href={BUSINESS_FACEBOOK} target="_blank" rel="noopener noreferrer">Follow us on Facebook ↗</a></p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Sterlyn Supplies Limited</span>
        <div>{['faq','delivery','returns','privacy','terms'].map(p=><Link href={'/'+p} key={p}>{p}</Link>)}<button type="button" onClick={()=>setConsent(null)}>Privacy choices</button></div>
        <span>Product showcase · Enquiries only</span>
      </div>
      <p className="asset-note">Kitchen imagery and planner modules are illustrative. Final specifications and availability are confirmed directly with our team.</p>
    </footer>
    {consent===null&&<aside className="consent" aria-label="Privacy preferences">
      <p>Essential storage saves your enquiry selections in this browser. Allow anonymous usage analytics?</p>
      <button type="button" onClick={()=>choose('essential')}>Essential only</button>
      <button type="button" onClick={()=>choose('analytics')}>Allow analytics</button>
    </aside>}
  </>;
}
