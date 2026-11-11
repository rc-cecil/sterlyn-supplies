import {randomUUID} from 'node:crypto';
import {db} from './db';

// Retain products, variants and historical snapshots; remove only the dated cut-out previews.
const retiredPictures = [
  {slug:'pa-tap-1215',image:'/images/supplier/tap-gunmetal-1215.webp'},
  {slug:'pa-tap-1218',image:'/images/supplier/tap-chrome-1218.webp'},
];
export async function retireTapPreviews(){
  return db.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71910403)`;
    const products=await tx.product.findMany({where:{status:'published',OR:retiredPictures}});
    const archived:string[]=[];
    for(const product of products){
      const changed=await tx.product.updateMany({where:{id:product.id,status:'published',image:product.image,updatedAt:product.updatedAt},data:{status:'archived'}});
      if(!changed.count)continue;
      archived.push(product.slug);
      await tx.auditLog.create({data:{actorId:'system:catalogue-curation',role:'system',action:'archive-product-preview',entity:'products',entityId:product.id,correlationId:randomUUID(),summary:{before:{status:product.status,image:product.image},after:{status:'archived'},reason:'Owner requested removal of inconsistent standalone tap photographs from the public collection. Product records and commercial history retained.'}}});
    }
    return {archived};
  },{timeout:30000});
}
