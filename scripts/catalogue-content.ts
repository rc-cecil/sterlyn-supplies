import {randomUUID} from 'node:crypto';
import {db} from '../src/lib/db';
import {catalogueCategories,catalogueProducts,productImage} from '../src/lib/catalogue-content';
const legacyNames:Record<string,string>={'the-emerald-room':'The Emerald Room','the-walnut-room':'The Walnut Room','the-ivory-room':'The Ivory Room','marble-at-dusk':'Marble at Dusk','walnut-cabinetry':'Walnut Cabinetry','ivory-worktop-study':'Ivory Worktop Study','sink-and-tap-study':'Sink & Tap Study','storage-study':'Storage Study'};
const legacyDetails:Record<string,{image:string;description:string}>={"the-emerald-room": {"image": "/images/kitchen-emerald-v2.webp", "description": "A quiet study in forest tones, warm brass and beautifully balanced proportions."}, "the-walnut-room": {"image": "/images/kitchen-walnut-v2.webp", "description": "Natural warmth meets clean lines. An open, considered space for everyday rituals."}, "the-ivory-room": {"image": "/images/kitchen-ivory-v2.webp", "description": "Soft light, framed doors and a warm ivory palette bring a timeless room into focus."}, "marble-at-dusk": {"image": "/images/kitchen-marble-dusk-v2.webp", "description": "A sculptural island anchors an atmosphere of dark stone and gentle light."}, "walnut-cabinetry": {"image": "/images/kitchen-walnut-v2.webp", "description": "Explore warm wood finishes and carefully proportioned cabinet arrangements."}, "ivory-worktop-study": {"image": "/images/kitchen-ivory-v2.webp", "description": "A material direction for light-filled spaces, ready to develop around your measurements."}, "sink-and-tap-study": {"image": "/images/kitchen-sink-v2.webp", "description": "A concept pairing to discuss as part of your kitchen specification."}, "storage-study": {"image": "/images/kitchen-storage-v2.webp", "description": "Explore a practical arrangement for the things you use every day."}};
/** Additive seed refresh. Never edits verified or operator-customised catalogue content. */
export async function syncCatalogueContent(){
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(71910402)`;
  const counts={created:0,refreshed:0,preserved:0};
  for(const [slug,name,asset] of catalogueCategories){
   const existing=await tx.category.findUnique({where:{slug}});
   await tx.category.upsert({where:{slug},create:{slug,name,image:productImage(asset)},update:existing?.name===name&&existing.image.match(/^\/images\/kitchen-[\w-]+\.webp$/)?{image:productImage(asset)}:{}});
  }
  for(const entry of catalogueProducts){
   const category=await tx.category.findUniqueOrThrow({where:{slug:entry.category}});
   const existing=await tx.product.findUnique({where:{slug:entry.slug},include:{variants:true}});
   const image='sourcePhoto' in entry && typeof entry.sourcePhoto==='string' ? entry.sourcePhoto : productImage(entry.asset);
   const data={name:entry.name,description:entry.description,categoryId:category.id,style:entry.style,material:entry.material,image,gallery:[image],illustrative:true,featured:entry.category==='kitchens'};
   if(!existing){
    await tx.product.create({data:{...data,slug:entry.slug,status:'published',variants:{create:[{sku:'CONCEPT-'+entry.slug.toUpperCase()+'-A',name:entry.finish,color:entry.color},{sku:'CONCEPT-'+entry.slug.toUpperCase()+'-B',name:entry.category==='kitchens'?'Warm ivory':'Alternative finish — discuss',color:'#d7cebd'}]}}});counts.created++;
   }else if(existing.name===legacyNames[entry.slug]&&existing.description===legacyDetails[entry.slug]?.description&&existing.image===legacyDetails[entry.slug]?.image&&existing.style===entry.style&&existing.material===entry.material&&existing.categoryId===category.id&&existing.illustrative&&existing.variants.length>0&&existing.variants.every(v=>v.sku.startsWith('CONCEPT-')&&!v.verified&&v.price===null&&v.stock===0)){
    await tx.product.update({where:{id:existing.id},data});
    for(const variant of existing.variants){await tx.variant.update({where:{id:variant.id},data:variant.sku.endsWith('-A')?{name:entry.finish,color:entry.color}:{name:entry.category==='kitchens'?'Warm ivory':'Alternative finish — discuss',color:'#d7cebd'}});}
    await tx.auditLog.create({data:{actorId:'system:catalogue-content',role:'system',action:'catalogue.illustrative-refresh',entity:'product',entityId:existing.id,correlationId:randomUUID(),summary:{before:{name:existing.name,image:existing.image},after:{name:data.name,image:data.image},reason:'Separate illustrative product previews from editorial room studies; IDs and commercial records retained.'}}});counts.refreshed++;
   }else counts.preserved++;
  }
  return counts;
 },{timeout:30000});
}
