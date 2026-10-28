import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import Hero from '@/components/Hero';
import { InspirationArticle, InspirationIndex } from '@/components/Inspiration';
import { inspirationStories } from '@/lib/inspiration';
import PreviewHeader from './PreviewHeader';

/** An intentionally read-only showroom. The live catalogue remains database-backed. */
const concepts = [
  { slug: 'the-emerald-room', name: 'The Emerald Room', type: 'Colour & atmosphere', image: '/images/kitchen-emerald-v2.webp', alt: 'Illustrative green kitchen concept' },
  { slug: 'the-walnut-room', name: 'The Walnut Room', type: 'Wood & texture', image: '/images/kitchen-walnut-v2.webp', alt: 'Illustrative walnut kitchen concept' },
  { slug: 'the-ivory-room', name: 'The Ivory Room', type: 'Light & palette', image: '/images/kitchen-ivory-v2.webp', alt: 'Illustrative ivory kitchen concept' },
  { slug: 'marble-at-dusk', name: 'Marble at Dusk', type: 'Stone & form', image: '/images/kitchen-marble-dusk-v2.webp', alt: 'Illustrative marble kitchen concept' },
  { slug: 'water-and-warmth', name: 'Water & Warmth', type: 'Everyday details', image: '/images/kitchen-sink-v2.webp', alt: 'Illustrative kitchen sink concept' },
  { slug: 'a-place-for-everything', name: 'A Place for Everything', type: 'Storage & cabinetry', image: '/images/kitchen-storage-v2.webp', alt: 'Illustrative kitchen storage concept' },
] as const;

function ConceptCards({ limit }: { limit?: number }) {
  const items = limit ? concepts.slice(0, limit) : concepts;
  return <div className="editorial-grid" style={limit ? undefined : { gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', alignItems: 'start' }}>
    {items.map((item) => <article className="product-card" key={item.slug} style={limit ? undefined : { gridColumn: 'auto', margin: 0, width: '100%' }}>
      <Link href={'/inspiration/' + item.slug} className="product-image">
        <Image src={item.image} alt={item.alt} fill sizes="(max-width: 700px) 90vw, 40vw" />
        <span className="image-tag">ILLUSTRATIVE CONCEPT</span>
        <span className="image-arrow"><ArrowUpRight size={18} /></span>
      </Link>
      <div className="product-caption"><div><small>{item.type.toUpperCase()}</small><h3>{item.name}</h3></div><span className="product-price">Explore the idea ↗</span></div>
    </article>)}
  </div>;
}

function HomePreview() {
  return <>
    <Hero media={null} />
    <section className="intro-section"><div className="intro-label"><span className="small-rule" /> A MORE CONSIDERED HOME</div><div><h2>Not just a kitchen.<br/><em>Your favourite place to be.</em></h2><p>Quiet mornings. Conversations that linger. Beautiful spaces shaped around the way you live.</p></div></section>
    <section className="collections-section">
      <div className="section-heading"><h2>Kitchen collections.<br/><em>Considered details.</em></h2><div><p>Explore some of the concepts behind the Sterlyn design direction.</p><Link className="text-link" href="/collections">Discover the collections <ArrowUpRight size={18} /></Link></div></div>
      <ConceptCards limit={3} />
    </section>
    <section className="studio-promo">
      <div className="studio-promo-image"><Image src="/images/kitchen-walnut-v2.webp" alt="Illustrative walnut kitchen" fill sizes="(max-width: 700px) 100vw, 60vw" /></div>
      <div className="studio-promo-copy"><span className="eyebrow">FROM POSSIBILITY TO PERSPECTIVE</span><h2>Imagine it.<br/>Arrange it.<br/><em>Make it yours.</em></h2><p>Discover the planned interactive design studio. This preview is for exploring the visual direction; saving designs and submitting quotations are not yet available.</p><Link href="/design-studio" className="button">Explore the design studio <ArrowUpRight size={18} /></Link></div>
    </section>
    <section className="materials-section"><div className="material-copy"><h2>The beauty<br/>is in the <em>details.</em></h2><p>Wood, stone and a thoughtfully chosen palette.</p><Link href="/inspiration" className="text-link">Read the material stories <ArrowUpRight size={17} /></Link></div><Link className="material-tile stone" href="/inspiration/marble-at-dusk"><span>01 / Stone</span><strong>A quieter statement.</strong><ArrowUpRight /></Link><Link className="material-tile wood" href="/inspiration/the-walnut-room"><span>02 / Wood</span><strong>Warmth, naturally.</strong><ArrowUpRight /></Link></section>
  </>;
}

function PreviewIntro({tag, title, description}: {tag: string; title: string; description: string}) {
  return <div className="page-heading"><span className="eyebrow">{tag}</span><h1>{title}</h1><p>{description}</p></div>;
}

export default function ClientPreview({ route, slug }: { route: string; slug: string[] }) {
  let content: ReactNode;
  if (route === 'home' || route === 'shop') content = <HomePreview />;
  else if (route === 'collections' || route === 'products') content = <section className="collections-section"><PreviewIntro tag="THE CONCEPT COLLECTION" title="Considered pieces. Complete kitchens." description="Explore illustrative kitchen concepts and material directions. The live product catalogue, pricing, and availability will be available after launch." /><ConceptCards /></section>;
  else if (route === 'inspiration') {
    const story = slug[1] ? inspirationStories.find((entry) => entry.slug === slug[1]) : undefined;
    content = story ? <InspirationArticle story={story} /> : <InspirationIndex />;
  }
  else if (route === 'about') content = <section className="page-wrap"><PreviewIntro tag="OUR STORY" title="Considered spaces. Everyday living." description="Sterlyn Supplies Limited is a kitchen furniture and supplies brand. Explore our concept collection, shape your ideas and imagine the possibilities for your space." /><div className="studio-promo" style={{marginTop: 50}}><div className="studio-promo-image"><Image src="/images/kitchen-emerald-v2.webp" fill alt="Illustrative emerald kitchen concept" sizes="(max-width: 700px) 100vw, 60vw" /></div><div className="studio-promo-copy"><h2>Style. Quality.<br/><em>Innovation.</em></h2><p>The imagery is illustrative. Materials, availability and final specifications are confirmed during quotation.</p><Link className="text-link" href="/inspiration">Explore our perspectives <ArrowUpRight size={18} /></Link></div></div></section>;
  else if (route === 'design-studio') content = <section className="page-wrap"><PreviewIntro tag="DESIGN STUDIO · PREVIEW" title="Imagine your space." description="Sterlyn’s interactive room-planning experience is being prepared for launch. The design studio is not interactive in this view-only preview." /><div className="studio-promo" style={{marginTop: 40}}><div className="studio-promo-image"><Image src="/images/kitchen-ivory-v2.webp" alt="Illustrative ivory kitchen concept" fill sizes="(max-width: 700px) 100vw, 60vw" /></div><div className="studio-promo-copy"><h2>A room that feels<br/><em>like yours.</em></h2><p>Explore colour, layout and materials through our concepts while the live planner is being connected.</p><Link href="/collections" className="button">Explore concepts <ArrowUpRight size={18} /></Link></div></div></section>;
  else if (route === 'contact') content = <section className="page-wrap narrow"><PreviewIntro tag="CONTACT · PREVIEW" title="Let’s talk about your space." description="The live enquiry form is not enabled in this view-only preview. Contact and quotation functionality will be available when the store launches." /><p style={{marginTop: 30}}>For now, explore the concept collection and discuss your preferred designs with the Sterlyn team directly.</p><Link href="/collections" className="button" style={{marginTop: 25}}>Browse concepts <ArrowUpRight size={18} /></Link></section>;
  else content = <section className="page-wrap narrow"><PreviewIntro tag="CLIENT PREVIEW" title="Coming in the full storefront." description="This feature is not available in the view-only client preview. The live application and administrative features remain unchanged." /><Link href="/" className="button" style={{marginTop: 30}}>Return to the showroom <ArrowUpRight size={18} /></Link></section>;
  return <>
    <PreviewHeader />
    <aside aria-label="Preview notice" style={{padding: '12px 6%', background: '#eadfc9', color: '#163327', display: 'flex', flexWrap: 'wrap', gap: '8px 18px', justifyContent: 'center', textAlign: 'center', fontSize: 12}}>
      <strong>STERLYN · CLIENT PREVIEW</strong><span>View-only concept showroom. Products, accounts, checkout, enquiries and admin tools are not active.</span>
    </aside>
    <main id="main">{content}</main>
    <footer><div className="footer-top"><div><h2>A space that’s<br/><em>entirely yours.</em></h2><Link href="/contact" className="text-link">Learn about enquiries <ArrowUpRight size={20} /></Link></div><div><span className="eyebrow">CLIENT PREVIEW</span><p>Explore the visual direction. Live catalogue, saved projects and business operations are not connected in this preview.</p><Link href="/inspiration" className="text-link" style={{marginTop: 20}}>View our stories <ArrowUpRight size={18} /></Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Sterlyn Supplies Limited</span><span>Illustrative concepts · Not a live store</span><span>Ghana · GHS</span></div><p className="asset-note">Illustrative imagery, not verified stock, completed installations or a final product specification.</p></footer>
  </>;
}
