import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';

export function HomeStory(){
 return <section id="our-story" className="home-story" aria-labelledby="home-story-heading">
  <div className="home-story-image"><Image src="/images/sterlyn-facebook-kitchen.webp" alt="Grey cabinetry and a veined stone island from Sterlyn’s Facebook gallery" fill sizes="(max-width: 800px) 100vw, 48vw"/><span>From Sterlyn’s Facebook gallery · Design inspiration</span></div>
  <div className="home-story-copy"><h2 id="home-story-heading">Our story.<br/><em>Your space, considered.</em></h2>
   <p>Sterlyn Supplies Limited brings together kitchen design, furniture supply and professional fitting. We work with homeowners, property developers and contractors across Accra and the surrounding areas in Ghana.</p>
   <p>Our showroom is a place to explore possibilities: a kitchen layout, a cabinet finish, a worktop or the furniture that brings a room together. Start with the pieces and ideas you love, then talk with our team about your space and requirements.</p>
   <p className="home-story-principle">Style. Quality. Innovation. The three words behind the Sterlyn name.</p>
  </div>
 </section>;
}
const services=[
 {name:'Kitchen design',description:'Explore fitted kitchens, cabinetry, islands and storage ideas. Use our Design Studio to try a layout, then share your room measurements and preferences with the team.',href:'/design-studio',action:'Explore the Design Studio'},
 {name:'Furniture & kitchen supplies',description:'Discover furniture and kitchen details, from cabinetry and worktops to sinks and taps. Tell us the materials, finishes and quantities you have in mind so we can discuss suitable options.',href:'/collections',action:'Browse the collections'},
 {name:'Professional fitting',description:'Discuss the fitting requirements of your project alongside your selections. The scope of the work, measurements, delivery arrangements and fitting details are confirmed directly with our team.',href:'/contact',action:'Discuss fitting requirements'},
];
export function HomeServices(){
 return <section className="home-services" aria-labelledby="home-services-heading"><div className="home-services-heading"><h2 id="home-services-heading">What we do.<br/><em>From design to fitting.</em></h2><p>Whether you are furnishing your own home, planning a development or working on a client’s project, start with a conversation about what the space needs.</p></div>
  <div className="home-service-list">{services.map(service=><article key={service.name}><h3>{service.name}</h3><div><p>{service.description}</p><Link className="button secondary" href={service.href}>{service.action} <ArrowUpRight size={16}/></Link></div></article>)}</div>
 </section>;
}
const steps=[
 ['Explore & collect','Browse the showroom and save the products or inspirations you like. If you have a layout in mind, try it in the Design Studio.'],
 ['Tell us about your project','Share your selections, room measurements, preferred finishes and any practical requirements through Contact. We save your enquiry before you continue in WhatsApp.'],
 ['Agree the details','Our team discusses specifications, availability, pricing and delivery with you directly. Once an order is confirmed, we provide a private link for following its progress.'],
];
export function HomeProjectGuide(){
 return <section className="home-project-guide" aria-labelledby="home-project-heading"><div className="home-project-heading"><h2 id="home-project-heading">Your project.<br/><em>A clear next step.</em></h2><p>Serving Accra and its surrounding areas, with a quotation tailored to your requirements. No online checkout: the agreement and payment arrangements are discussed directly with our team.</p></div>
  <ol>{steps.map(([title,description])=><li key={title}><h3>{title}</h3><p>{description}</p></li>)}</ol>
  <div className="home-project-footer"><div><h3>Have a project in mind?</h3><p>A room to furnish, a kitchen to plan, or a few details to get right. Tell us where you would like to begin.</p></div><Link className="button" href="/contact">Tell us about your project <ArrowUpRight size={18}/></Link></div>
 </section>;
}

const facebookPhotos=[
 {src:'/images/sterlyn-facebook-stone.webp',width:765,height:765,title:'A closer look at stone.',alt:'Veined stone waterfall worktop with an inset sink, shared on Sterlyn’s Facebook page',url:'https://www.facebook.com/photo.php?fbid=122108146665515866'},
 {src:'/images/sterlyn-facebook-brass.webp',width:600,height:401,title:'Warm metal. Considered details.',alt:'Brass tap, stone worktop and dark cabinetry, shared on Sterlyn’s Facebook page',url:'https://www.facebook.com/photo.php?fbid=122107019697515866'},
];
export function HomeFacebookGallery(){
 return <section className="home-facebook-gallery" aria-labelledby="home-facebook-heading"><div className="home-facebook-heading"><h2 id="home-facebook-heading">The details,<br/><em>up close.</em></h2><div><p>A selection of kitchen images shared on our Facebook page. Explore the finishes and details that inspire your next conversation with Sterlyn.</p><a className="button secondary" href="https://www.facebook.com/people/Sterlyn-Supplies/61595476006250/?sk=photos" target="_blank" rel="noopener noreferrer">Visit our Facebook gallery <ArrowUpRight size={17}/></a></div></div>
 <div className="home-facebook-photos">{facebookPhotos.map(photo=><figure key={photo.src}><a href={photo.url} target="_blank" rel="noopener noreferrer" aria-label={'View '+photo.title+' on Facebook'}><Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} sizes="(max-width: 800px) 86vw, 43vw"/></a><figcaption><h3>{photo.title}</h3><span>Shared by Sterlyn Supplies on Facebook</span></figcaption></figure>)}</div><p className="home-facebook-note">Images are shared as design inspiration; specifications, availability and fitting requirements are confirmed with our team.</p></section>;
}
