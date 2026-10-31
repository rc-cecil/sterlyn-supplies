'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { EnquiryBasketLink } from './ShowcaseEnquiry';

const links = [
  ['/collections', 'Our collections'],
  ['/inspiration', 'Inspiration'],
  ['/about', 'Our story'],
  ['/contact', 'Contact us'],
] as const;

export default function PreviewHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Sterlyn Supplies home" onClick={() => setOpen(false)}>
        <img className="brand-mark" src="/images/sterlyn-monogram-clean.svg" alt="Sterlyn Supplies" />
      </Link>
      <nav aria-label="Preview navigation" className={open ? 'main-nav open' : 'main-nav'}>
        {links.map(([href, name]) => <Link href={href} key={href} className={pathname === href ? 'active' : ''} onClick={() => setOpen(false)}>{name}</Link>)}
        <Link href="/design-studio" className="mobile-studio" onClick={() => setOpen(false)}>Design your space <ArrowUpRight size={16} /></Link>
      </nav>
      <div className="nav-actions">
        <Link href="/design-studio" className="nav-studio">Design your space <ArrowUpRight size={16} /></Link>
        <EnquiryBasketLink />
        <button type="button" className="icon-button menu-toggle" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open}>{open ? <X /> : <Menu />}</button>
      </div>
    </header>
  </>;
}
