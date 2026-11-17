import {storefrontDescription,storefrontMetadata} from '@/lib/storefront-seo';
import {HomeStory,HomeServices,HomeProjectGuide} from '@/components/HomeCompany';
import Link from 'next/link';
import Image from 'next/image';
import {homeContentSchema} from '@/lib/home-content';
import {publishedMedia} from '@/lib/publishing';
import {notFound,redirect,permanentRedirect} from 'next/navigation';
import type {Metadata} from 'next';
import {ArrowUpRight} from 'lucide-react';
import {publishedInspirations} from '@/lib/inspiration-content';
import {InspirationIndex,InspirationArticle} from '@/components/Inspiration';
import {db} from '@/lib/db';
import {user} from '@/lib/security';
import {allowed} from '@/lib/domain';
import {Header,Footer} from '@/components/Shell';
import Hero from '@/components/Hero';
import {ProductCard,Catalogue,ProductDetail} from '@/components/Catalogue';
import {AccountPage,PasswordReset,Confirmation} from '@/components/CommerceViews';
import {ContactPage,EnquiryBagPage} from '@/components/ShowcaseEnquiry';
import Designer from '@/components/Designer';
import InvoiceDocument from '@/components/InvoiceDocument';
import Admin from '@/components/Admin';
import StaffSignIn from '@/components/StaffSignIn';
import OrderTracking from '@/components/OrderTracking';
import {ActionForm,Field} from '@/components/ui';
import type {ProductView} from '@/lib/types';
export const dynamic='force-dynamic';
type Props={params:Promise<{slug?:string[]}>;searchParams:Promise<Record<string,string|undefined>>};
function publicProduct<T extends {variants:{price:number|null;verified:boolean}[]}>(product:T):T{return {...product,variants:product.variants.map(variant=>({...variant,price:null,verified:false}))};}
const include={category:true,variants:true,pictures:{orderBy:{position:'asc' as const}}} as const;
export async function generateMetadata({params,searchParams}:Props):Promise<Metadata>{
 const {slug=[]}=await params;
 const [route,key]=slug;
 if(!route)return storefrontMetadata({path:'/',description:storefrontDescription});
 if(route==='collections'&&slug.length<=2){
  const legacy={storage:'/collections/cabinetry',taps:'/collections/sinks',bathrooms:'/collections'} as Record<string,string>;
  if(key&&Object.hasOwn(legacy,key))redirect(legacy[key]);
  const search=await searchParams;
  const categoryKey=key||search.category;
  const category=categoryKey?await db.category.findUnique({where:{slug:categoryKey},select:{name:true,image:true}}):null;
  if(categoryKey&&!category)notFound();
  const page=Number(search.page);
  const filters=Boolean(search.q||search.style||search.material||search.sort||search.category);
  const path='/collections'+(categoryKey?'/'+encodeURIComponent(categoryKey):'')+(!filters&&Number.isInteger(page)&&page>1?'?page='+page:'');
  return storefrontMetadata({path,title:category?.name||'Kitchen collections',description:category?`Explore ${category.name.toLowerCase()} from Sterlyn Supplies in Accra. Browse designs and finishes and request a personalised quotation.`:'Browse fitted kitchens, cabinetry, worktops, islands, sinks and taps from Sterlyn Supplies. Request a personalised quotation in Accra.',image:category?.image,index:!filters});
 }
 if(route==='products'&&key&&slug.length===2){
  const product=await db.product.findFirst({where:{slug:key,status:'published'},select:{name:true,description:true,image:true,seoTitle:true,seoDescription:true}});
  if(!product)notFound();
  return storefrontMetadata({path:'/products/'+encodeURIComponent(key),title:product.seoTitle||product.name,description:product.seoDescription||product.description||storefrontDescription,image:product.image});
 }
 if(route==='inspiration'&&slug.length<=2){
  if(!key)return storefrontMetadata({path:'/inspiration',title:'Kitchen design inspiration',description:'Explore kitchen layouts, finishes and materials in the Sterlyn Supplies design journal.'});
  const story=(await publishedInspirations()).find(item=>item.slug===key);
  if(!story)notFound();
  return storefrontMetadata({path:'/inspiration/'+encodeURIComponent(key),title:story.title,description:story.intro,image:story.sourcePhoto||story.image});
 }
 if(route==='contact'&&slug.length===1)return storefrontMetadata({path:'/contact',title:'Contact Sterlyn Supplies',description:'Discuss kitchen design, furniture or fitting in Accra and request a personalised quotation from Sterlyn Supplies.',index:Object.keys(await searchParams).length===0});
 if(route==='design-studio'&&slug.length===1)return storefrontMetadata({path:'/design-studio',title:'Kitchen Design Studio',description:'Try a kitchen layout in 3D and share your design with Sterlyn Supplies in Accra.',index:Object.keys(await searchParams).length===0});
 return {title:route==='track'?'Track your Sterlyn order':route.replaceAll('-',' ').replace(/^./,c=>c.toUpperCase()),robots:{index:false,follow:false},referrer:'no-referrer'};
}
function PageIntro({title,description,tag}:{title:string;description:string;tag?:string}){return <div className="page-heading">{tag&&<span className="eyebrow">{tag}</span>}<h1>{title}</h1><p>{description}</p></div>;}
async function Home(){const products=await db.product.findMany({where:{status:'published',featured:true},include,take:3});const heroMedia=await publishedMedia('hero');const home=homeContentSchema.safeParse((await db.setting.findUnique({where:{key:'homepage'}}))?.value||{});return <><Hero media={heroMedia} content={home.success?home.data:undefined}/><section className="intro-section"><div className="intro-label"><span className="small-rule"/> A MORE CONSIDERED HOME</div><div><h2>Not just a kitchen.<br/><em>Your favourite place to be.</em></h2><p>Quiet mornings. Conversations that linger. Beautiful spaces shaped around the way you live.</p></div></section><HomeStory/><section className="collections-section"><div className="section-heading"><h2>Kitchen collections.<br/><em>Considered details.</em></h2><div><p>Fitted kitchens, cabinetry<br/>and considered finishing pieces.</p><Link className="text-link" href="/collections">Discover the collections <ArrowUpRight size={18}/></Link></div></div><div className="editorial-grid">{products.map((p,i)=><ProductCard key={p.id} product={publicProduct(p)} index={i}/>)}</div></section><HomeServices/><section className="studio-promo"><div className="studio-promo-image"><Image src="/images/kitchen-walnut-v2.webp" alt="Illustrative walnut kitchen concept" fill sizes="(max-width: 700px) 100vw, 60vw"/><div className="room-measure"><span>YOUR IDEAS, IN PERSPECTIVE</span><span>3D DESIGN STUDIO ↗</span></div></div><div className="studio-promo-copy"><span className="eyebrow">FROM POSSIBILITY TO PERSPECTIVE</span><h2>Imagine it.<br/>Arrange it.<br/><em>Make it yours.</em></h2><p>Find the flow of your room. Explore finishes, place your pieces, and see your ideas take shape in three dimensions.</p><Link href="/design-studio" className="button">Step into the design studio <ArrowUpRight size={18}/></Link><small>Interactive planning with illustrative sample modules.</small></div></section><HomeProjectGuide/></>;}
export default async function Page({params,searchParams}:Props){const {slug=[]}=await params;if(slug[0]==='about')permanentRedirect('/#our-story');const search=await searchParams;const route=slug[0]||'home';if(route==='profile')redirect('/account/profile');if(route==='shop'){const query=new URLSearchParams(Object.entries(search).filter((entry):entry is [string,string]=>entry[1]!==undefined));redirect('/collections'+(slug[1]?'/'+encodeURIComponent(slug[1]):'')+(query.size?'?'+query.toString():''));}if(route==='staff'){const current=await user();if(current&&current.role!=='customer')redirect('/admin');return <StaffSignIn/>;}if(route==='admin'){const u=await user();if(!u)redirect('/staff');if(u.role==='customer')return <><Header/><main id="main" className="page-wrap narrow"><span className="eyebrow">ADMINISTRATION</span><h1>Staff access required.</h1><p>This account has customer access. Sign in with your staff account to open Administration.</p><Link className="text-link" href="/account">Return to your account ↗</Link></main><Footer/></>;const section=slug[1]||'overview';if(section==='privacy'&&u.role!=='owner')notFound();const resource=({inspirations:'cms',enquiries:'quotes',business:'business',settings:'overview','product-import':'products',invoices:'finance',privacy:'customers',categories:'products',overview:'overview',payments:'orders',notifications:'notifications'} as Record<string,string>)[section]||section;if(!allowed(u.role,resource))notFound();return <Admin section={section} role={u.role}/>;}let content:React.ReactNode;
if(route==='home')content=await Home();
else if(route==='collections'){const categories=await db.category.findMany({include:{_count:{select:{products:{where:{status:'published'}}}}},orderBy:{name:'asc'}});const category=slug[1]||search.category;const where={status:'published',...(category?{category:{slug:category}}:{}),...(search.style?{style:search.style}:{}),...(search.material?{material:search.material}:{}),...(search.q?{OR:[{name:{contains:search.q,mode:'insensitive' as const}},{description:{contains:search.q,mode:'insensitive' as const}}]}:{})};const [products,total]=await Promise.all([db.product.findMany({where,include,take:12,skip:(Math.max(1,Number(search.page)||1)-1)*12,orderBy:search.sort==='name'?[{name:'asc'},{id:'asc'}]:search.sort==='newest'?[{createdAt:'desc'},{id:'asc'}]:[{featured:'desc'},{name:'asc'},{id:'asc'}]}),db.product.count({where})]);content=<section className="page-wrap"><PageIntro tag={route==='collections'?'THE COLLECTIONS':'KITCHENS & CONSIDERED DETAILS'} title={category?categories.find(c=>c.slug===category)?.name||'The collection':'Considered pieces. Complete kitchens.'} description="Browse fitted kitchens, cabinetry and the pieces that complete a room. Product previews are illustrative; specifications and availability are confirmed by quotation."/>{route==='collections'&&!category&&<div className="category-tabs">{categories.map(c=><Link href={'/collections/'+c.slug} key={c.id}><span className="category-picture"><Image unoptimized={c.image.startsWith('/api/media/')} src={c.image} alt="" fill sizes="(max-width: 760px) 130px, 200px"/></span><span>{c.name}<small>{c._count.products} products</small></span><ArrowUpRight size={16}/></Link>)}</div>}<Catalogue products={products.map(publicProduct)} total={total} categories={categories} activeCategory={category}/></section>;}
else if(route==='products'&&slug[1]){const product=await db.product.findFirst({where:{slug:slug[1],status:'published'},include});if(!product)notFound();content=<section className="page-wrap"><nav className="breadcrumbs"><Link href="/">Home</Link><span>/</span><Link href="/collections">Collection</Link><span>/</span><span>{product.name}</span></nav><ProductDetail product={publicProduct(product) as ProductView}/></section>;}
else if(route==='design-studio')content=<Designer/>;
else if(route==='cart'||route==='checkout')content=<EnquiryBagPage/>;
else if(route==='contact')content=<ContactPage/>;
else if(route==='track')content=<OrderTracking/>;
else if(route==='invoices'&&slug[1])content=<InvoiceDocument id={slug[1]}/>;
else if(route==='account')content=slug[1]==='reset-password'?<PasswordReset/>:<AccountPage section={slug[1]}/>;
else if(route==='order-confirmation'&&slug[1])content=<Confirmation id={slug[1]}/>;
else if(route==='inspiration'){const stories=await publishedInspirations();const story=slug[1]?stories.find(s=>s.slug===slug[1]):null;if(slug[1]&&(!story||slug.length>2))notFound();content=story?<InspirationArticle story={story}/>:<InspirationIndex stories={stories}/>;}
else {const page=await db.cmsPage.findFirst({where:{slug:route,status:'published'}});if(!page)notFound();content=<section className="page-wrap"><PageIntro tag="STERLYN SUPPLIES" title={page.title} description="Style. Quality. Innovation."/><div className="content-columns"><div className="prose">{page.body.split('\n\n').map((p,i)=><p key={i}>{p}</p>)}</div>{route==='contact'&&<ActionForm endpoint="contact" label="Send your enquiry"><Field label="Your name" name="name"/><Field label="Email address" name="email" type="email"/><Field label="Subject" name="subject"/><label className="field"><span>Tell us about your project</span><textarea name="message" required minLength={10}/></label></ActionForm>}</div></section>;}
return <><Header/><main id="main">{content}</main><Footer/></>;}
