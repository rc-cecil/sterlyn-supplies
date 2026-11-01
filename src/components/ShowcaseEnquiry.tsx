'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ClipboardList, Mail, MessageCircle, Phone, Trash2 } from 'lucide-react';
import {
  addEnquiryItem, BUSINESS_FACEBOOK, BUSINESS_PHONE, BUSINESS_WHATSAPP, ENQUIRY_EVENT,
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
  return <span className="enquiry-add-control">
    <button type="button" className={className} onClick={() => {
      addEnquiryItem(item);
      setAdded(true);
    }}>{added ? 'Added to enquiry list' : 'Add to enquiry list'} <ArrowUpRight size={17} /></button>
    {added && <Link className="text-link" href="/cart">Review selections ↗</Link>}
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
        <Link className="button" href="/contact?basket=1">Request a quotation on WhatsApp <ArrowUpRight size={17} /></Link></div>
    </> : <div className="empty"><h2>No selections yet.</h2><p>Browse the collections or inspiration journal and add ideas you like.</p>
      <Link className="button" href="/collections">Explore the collections <ArrowUpRight size={18} /></Link></div>}
  </section>;
}

export function ContactPage() {
  const bag = useEnquiryBag();
  const [direct, setDirect] = useState<EnquiryItem | null>(null);
  const [fromBag, setFromBag] = useState(false);
  const [removedMessage, setRemovedMessage] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
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
  const whatsappHref = 'https://wa.me/' + BUSINESS_WHATSAPP + '?text=' +
    encodeURIComponent(whatsappEnquiryText(selected, name, notes));

  return <section className="page-wrap enquiry-page">
    <div className="page-heading"><span className="eyebrow">CONTACT STERLYN SUPPLIES</span>
      <h1>Let’s talk about your space.</h1>
      <p>Tell us what you have in mind. Our team can discuss design options, availability, specifications and quotations directly with you.</p>
    </div>
    <div className="enquiry-contact-grid">
      <div className="enquiry-contact-main">
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
        <div className="enquiry-fields">
          <label className="field"><span>Your name (optional)</span><input autoComplete="name" maxLength={100}
            value={name} onChange={event => setName(event.target.value)} placeholder="How should we address you?" /></label>
          <label className="field"><span>Your message or project details (optional)</span>
            <textarea maxLength={3000} rows={5} value={notes} onChange={event => setNotes(event.target.value)}
              placeholder="Room dimensions, preferred materials, location, or any questions…" /></label>
        </div>
        <a className="button enquiry-whatsapp" href={whatsappHref} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={19} /> {selected.length ? 'Send selected items on WhatsApp' : 'Start a WhatsApp enquiry'} <ArrowUpRight size={18} />
        </a>
        <p className="asset-note">WhatsApp opens with your selected items and message already filled in. Review and press Send in WhatsApp to contact Sterlyn Supplies. No payment is taken on this website.</p>
      </div>
      <aside className="enquiry-contact-methods">
        <h2>Reach us directly.</h2>
        <a href={'https://wa.me/' + BUSINESS_WHATSAPP} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={21} /><span><strong>WhatsApp · Preferred</strong><small>{BUSINESS_PHONE}</small></span><ArrowUpRight size={17} />
        </a>
        <div className="enquiry-method-unavailable"><Mail size={21} /><span><strong>Business email</strong><small>Coming after domain setup</small></span></div>
        <a href={'tel:' + BUSINESS_PHONE}><Phone size={21} /><span><strong>Call us</strong><small>{BUSINESS_PHONE}</small></span><ArrowUpRight size={17} /></a>
        <a href={BUSINESS_FACEBOOK} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">f</span><span><strong>Facebook</strong><small>Sterlyn Supplies</small></span><ArrowUpRight size={17} /></a>
      </aside>
    </div>
  </section>;
}
