import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import Hero from '@/components/Hero';
import { InspirationArticle, InspirationIndex } from '@/components/Inspiration';
import { inspirationStories } from '@/lib/inspiration';
import PreviewHeader from './PreviewHeader';
import SupplierImage from './SupplierImage';
import Designer from '@/components/Designer';
import { catalogueCategories, catalogueProducts, productImage } from '@/lib/catalogue-content';
import { AddEnquiryButton, ContactPage, EnquiryBagPage } from './ShowcaseEnquiry';
import { enquiryUrl, BUSINESS_FACEBOOK } from '@/lib/enquiry';

/** Database-free showroom until a live database is explicitly connected. */
type CatalogueItem = (typeof catalogueProducts)[number];

function PreviewProductCards({items,featured=false}:{items:readonly CatalogueItem[];featured?:boolean}){
  return <div className={featured?'editorial-grid':'product-grid'}>{items.map(item=><article className="product-card" key={item.slug}>
    <Link href={'/products/'+item.slug} className="product-image">
      <SupplierImage source={"sourcePhoto" in item ? item.sourcePhoto : undefined} fallback={productImage(item.asset)} alt={"Showroom reference for "+item.name} sizes="(max-width: 700px) 100vw, 45vw"/>
      <span className="image-tag">{"referenceCode" in item ? "SUPPLIER REFERENCE" : "PRODUCT CONCEPT"}</span><span className="image-arrow"><ArrowUpRight size={20}/></span>
    </Link>
    <div className="product-caption"><div><small>{item.style} · {item.material}</small><h3><Link href={'/products/'+item.slug}>{item.name}</Link></h3>{'referenceCode' in item&&<p className="asset-note">Model: {item.referenceCode} · {item.dimensions}</p>}</div><span className="product-price">Enquire for details</span></div>
  </article>)}</div>;
}

function CollectionsPreview({categorySlug}:{categorySlug?:string}){
  const category=catalogueCategories.find(([slug])=>slug===categorySlug);
  const products=categorySlug?catalogueProducts.filter(item=>item.category===categorySlug):catalogueProducts;
  return <section className="page-wrap">
    <PreviewIntro tag="THE COLLECTIONS" title={category?category[1]:'Considered pieces. Complete kitchens.'} description="Browse separate supplier catalogue references by category. Inspiration remains an independent design journal. No online payments or published prices. Contact us for a tailored quotation."/>
    {!categorySlug&&<nav aria-label="Collection categories" className="category-tabs">{catalogueCategories.map(([slug,name,asset])=><Link href={'/collections/'+slug} key={slug}>
      <span className="category-picture"><Image src={productImage(asset)} alt={name} fill sizes="(max-width: 760px) 130px, 200px"/></span><span>{name}<small>{catalogueProducts.filter(item=>item.category===slug).length} showroom references</small></span><ArrowUpRight size={16}/>
    </Link>)}</nav>}
    {categorySlug&&<p style={{marginBottom:26}}><Link className="text-link" href="/collections">← All collections</Link></p>}
    <div className="results-meta"><span>{products.length} supplier catalogue references</span><span>Availability and specifications on enquiry</span></div>
    <PreviewProductCards items={products}/>
    {products.length===0&&<p>That category is not currently listed. <Link href="/collections">Browse all collections</Link>.</p>}
  </section>;
}

function ProductPreview({slug}:{slug:string}){
  const product=catalogueProducts.find(item=>item.slug===slug);
  if(!product)return <section className="page-wrap narrow"><PreviewIntro tag="COLLECTIONS" title="This product is not currently listed." description="Explore our other product images and categories."/><Link className="text-link" href="/collections">Browse collections ↗</Link></section>;
  const category=catalogueCategories.find(([id])=>id===product.category);
  return <section className="page-wrap"><nav className="breadcrumbs">
    <Link href="/">Home</Link><span>/</span><Link href="/collections">Collections</Link><span>/</span><Link href={'/collections/'+product.category}>{category?.[1]}</Link><span>/</span><span>{product.name}</span>
    </nav><div className="product-detail"><div className="detail-gallery">
      <div className="gallery-main" style={{position:'relative',display:'block',aspectRatio:'3 / 2',overflow:'hidden'}}><SupplierImage source={"sourcePhoto" in product ? product.sourcePhoto : undefined} fallback={productImage(product.asset)} alt={"Product reference: "+product.name} sizes="(max-width: 800px) 100vw, 60vw"/></div>
      <p className="asset-note">Supplier and concept images illustrate design directions; final availability and finishes must be confirmed.</p>
    </div><div className="product-info">
      <Link className="eyebrow" href={'/collections/'+product.category}>{category?.[1]} / {product.style}</Link>
      <h1>{product.name}</h1><p className="lede">{product.description}</p>
      <p><strong>Material direction:</strong> {product.material}</p><p><strong>Illustrated finish:</strong> {product.finish}</p>
      {'referenceCode' in product&&<><p><strong>Supplier model:</strong> {product.referenceCode}</p><p><strong>{product.dimensionKind==='packaging'?'Package measurements':product.dimensionKind==='custom'?'Dimensions':'Product dimensions'}:</strong> {product.dimensions}</p><p className="asset-note">PA Home Product Manual · PDF page {product.sourcePdfPage}. Availability, exact finish and installed dimensions are confirmed during quotation.</p></>}
      <p>Explore sample layouts in the Design Studio. Product availability and specifications are confirmed directly with our team.</p>
      <Link href={enquiryUrl({type:'product',slug:product.slug,name:product.name,quantity:1})} className="button">Request a quote on WhatsApp <ArrowUpRight size={18}/></Link>
      <AddEnquiryButton item={{type:'product',slug:product.slug,name:product.name,quantity:1,image:productImage(product.asset)}} />
      <Link href="/design-studio" className="text-link">Explore the Design Studio <ArrowUpRight size={18}/></Link>
      <p style={{marginTop:28}}><Link className="text-link" href={'/collections/'+product.category}>← Back to {category?.[1]}</Link></p>
    </div></div></section>;
}

function HomePreview() {
  return <>
    <Hero media={null} />
    <section className="intro-section"><div className="intro-label"><span className="small-rule" /> A MORE CONSIDERED HOME</div><div><h2>Not just a kitchen.<br/><em>Your favourite place to be.</em></h2><p>Quiet mornings. Conversations that linger. Beautiful spaces shaped around the way you live.</p></div></section>
    <section className="collections-section">
      <div className="section-heading"><h2>Kitchen collections.<br/><em>Considered details.</em></h2><div><p>Browse the separate fitted kitchen product images, distinct from our Inspiration journal.</p><Link className="text-link" href="/collections">Discover the collections <ArrowUpRight size={18} /></Link></div></div>
      <PreviewProductCards items={catalogueProducts.filter(item=>item.category==='kitchens')} featured/>
    </section>
    <section className="studio-promo">
      <div className="studio-promo-image"><Image src="/images/kitchen-walnut-v2.webp" alt="Illustrative walnut kitchen" fill sizes="(max-width: 700px) 100vw, 60vw" /></div>
      <div className="studio-promo-copy"><span className="eyebrow">FROM POSSIBILITY TO PERSPECTIVE</span><h2>Imagine it.<br/>Arrange it.<br/><em>Make it yours.</em></h2><p>Try the interactive 2D and 3D Design Studio with sample modules. Layouts stay in your browser; share your product selections with us on WhatsApp.</p><Link href="/design-studio" className="button">Explore the design studio <ArrowUpRight size={18} /></Link></div>
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
  else if (route === 'collections') content = <CollectionsPreview categorySlug={slug[1]}/>;
  else if (route === 'products') content = slug[1]?<ProductPreview slug={slug[1]}/>:<CollectionsPreview/>;
  else if (route === 'inspiration') {
    const story = slug[1] ? inspirationStories.find((entry) => entry.slug === slug[1]) : undefined;
    content = story ? <InspirationArticle story={story} /> : <InspirationIndex />;
  }
  else if (route === 'about') content = <section className="page-wrap"><PreviewIntro tag="OUR STORY" title="Considered spaces. Everyday living." description="Sterlyn Supplies Limited is a kitchen furniture and supplies brand. Explore our concept collection, shape your ideas and imagine the possibilities for your space." /><div className="studio-promo" style={{marginTop: 50}}><div className="studio-promo-image"><Image src="/images/kitchen-emerald-v2.webp" fill alt="Illustrative emerald kitchen concept" sizes="(max-width: 700px) 100vw, 60vw" /></div><div className="studio-promo-copy"><h2>Style. Quality.<br/><em>Innovation.</em></h2><p>The imagery is illustrative. Materials, availability and final specifications are confirmed during quotation.</p><Link className="text-link" href="/inspiration">Explore our perspectives <ArrowUpRight size={18} /></Link></div></div></section>;
  else if (route === 'design-studio') content = <Designer preview/>;
  else if (route === 'contact') content = <ContactPage preview />;
  else if (route === 'cart' || route === 'checkout') content = <EnquiryBagPage />;
  else content = <section className="page-wrap narrow"><PreviewIntro tag="PRODUCT SHOWROOM" title="This page is not available yet." description="This feature is not currently available. Explore our collections or contact us directly for assistance." /><Link href="/" className="button" style={{marginTop: 30}}>Return to the showroom <ArrowUpRight size={18} /></Link></section>;
  return <>
    <PreviewHeader />
    <main id="main">{content}</main>
    <footer><div className="footer-top"><div><h2>A space that’s<br/><em>entirely yours.</em></h2><Link href="/contact" className="text-link">Contact us on WhatsApp <ArrowUpRight size={20} /></Link></div><div><span className="eyebrow">PRODUCT SHOWROOM</span><p>Explore our product images and 2D/3D planner. Send selected products and inspirations to the Sterlyn team through WhatsApp; checkout and payments are unavailable.</p><Link href="/inspiration" className="text-link" style={{marginTop: 20}}>View our stories <ArrowUpRight size={18} /></Link><p><a className="text-link" href={BUSINESS_FACEBOOK} target="_blank" rel="noopener noreferrer">Visit our Facebook page ↗</a></p></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Sterlyn Supplies Limited</span><span>Product showcase · Enquiries only</span><span>WhatsApp: +44 7576 899618</span></div><p className="asset-note">Illustrative imagery, not verified stock, completed installations or a final product specification.</p></footer>
  </>;
}
