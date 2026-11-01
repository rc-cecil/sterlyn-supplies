import {inspirationWorkspace,saveInspiration} from '@/lib/inspiration-content';
import {createEnquiry,updateEnquiry,updateOrder,recordReceipt,trackingCommand,lookupTracking,recoverTracking,showroomRead,customerCommand,businessSettings} from '@/lib/showroom';
import {withRequestContext,requestCorrelationId,logFailure} from '@/lib/request-context';
import {HeadBucketCommand} from '@aws-sdk/client-s3';
import {scannerReadiness} from '@/lib/media-scan';
import {NextRequest,NextResponse} from 'next/server';
import {z,ZodError} from 'zod';
import {auth} from '@/lib/auth';
import {db} from '@/lib/db';
import {user,requireUser,staff,HttpError,sameOrigin,limit} from '@/lib/security';
import {checkout,webhook} from '@/lib/commerce';
import {updateProfile,changeAddress,exportAccount,requestErasure} from '@/lib/customer';
import {publishRevision,mediaHistory,rollbackMedia,retryLocalJob} from '@/lib/publishing';
import {beginUpload,finishUpload} from '@/lib/media-upload';
import {boundedJson,boundedFormData,uploadMime,MAX_UPLOAD_BYTES} from '@/lib/uploads';
import {importCatalogue,exportCatalogue,editVariant} from '@/lib/catalogue-admin';
import {inviteStaff,acceptInvitation,staffAccess,convertQuote} from '@/lib/operations';
import {schedulePublication,cancelSchedule} from '@/lib/scheduling';
import {invoiceCommand,invoiceView,privacyCommand} from '@/lib/release-operations';
import {adminRead,adminWrite} from '@/lib/admin';
import {sceneSchema,validPlacement} from '@/lib/domain';
import {manageProduct,manageCategory,productWorkspace,imageLibrary} from '@/lib/product-management';
import {overview} from '@/lib/admin-overview';
import {putObject,object,storage} from '@/lib/storage';
export const runtime='nodejs';
async function handler(req:NextRequest,{params}:{params:Promise<{path:string[]}>}){try{const {path}=await params;const route=path.join('/');if(path[0]==='auth'){if(req.method!=='GET'){sameOrigin(req);await limit(req,'auth',20);}return auth.handler(req);}if(route==='live')return NextResponse.json({status:'ok'});if(route==='ready'){try{await db.$queryRaw`SELECT 1`;if(process.env.READINESS_REQUIRE_MEDIA==='true'){await storage().send(new HeadBucketCommand({Bucket:process.env.S3_BUCKET}));await scannerReadiness();const heartbeat=(await db.setting.findUnique({where:{key:'workerHeartbeat'}}))?.value as {at?:string;processorReady?:boolean}|undefined;if(!heartbeat?.at||!heartbeat.processorReady||Date.now()-Date.parse(heartbeat.at)>60000)throw new HttpError(503,'Background processing is not ready.');}return NextResponse.json({status:'ready'});}catch{throw new HttpError(503,'Required services are not ready.');}}if(route==='health'){await db.$queryRaw`SELECT 1`;return NextResponse.json({status:'ok',database:'connected'});}if(route==='payments/webhook')return NextResponse.json(await webhook(req));if(req.method!=='GET'){sameOrigin(req);await limit(req,path[0],40);}let result:unknown;
if(req.method==='GET'){
if(route==='cart')throw new HttpError(410,'Use the showroom enquiry list and submit through Contact.');
else if(route==='compare'){const ids=z.array(z.string().min(1).max(100)).max(4).parse((req.nextUrl.searchParams.get('ids')||'').split(',').filter(Boolean));result={products:await db.product.findMany({where:{id:{in:ids},status:'published'},include:{category:true,variants:{omit:{price:true}}}})};}
else if(path[0]==='invoices'&&path[1])result=await invoiceView(path[1]);
else if(route==='session')result={user:await user()};
else if(route==='account/export'){await limit(req,'account-export',5);return new Response(JSON.stringify(await exportAccount(),null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename=sterlyn-account.json','Cache-Control':'no-store'}});}
else if(route==='account'){const u=await requireUser();if(u.emailVerified)await db.quote.updateMany({where:{userId:null,email:{equals:u.email,mode:'insensitive'}},data:{userId:u.id}});result={user:u,quotes:await db.quote.findMany({where:{userId:u.id},select:{id:true,reference:true,status:true,estimate:true,createdAt:true,notes:true,items:true,customerSummary:true,validUntil:true,updatedAt:true},orderBy:{createdAt:'desc'}}),addresses:await db.address.findMany({where:{userId:u.id}}),orders:await db.order.findMany({where:{userId:u.id},select:{id:true,status:true,currency:true,total:true,createdAt:true,items:{select:{id:true,name:true,sku:true,quantity:true,price:true}},invoices:{where:{status:{in:['issued','void']}},select:{id:true,number:true,status:true}}},orderBy:{createdAt:'desc'}}),projects:await db.designProject.findMany({where:{userId:u.id}}),wishlist:await db.wishlist.findMany({where:{userId:u.id},include:{product:{include:{category:true,variants:{omit:{price:true}}}}}})};}
else if(path[0]==='projects'){const u=await requireUser();result=await db.designProject.findMany({where:{userId:u.id,...(path[1]?{id:path[1]}:{})}});}
else if(path[0]==='orders'&&path[1]){const u=await requireUser();const order=await db.order.findFirst({where:{id:path[1],userId:u.id},select:{id:true,reference:true,status:true,createdAt:true,items:{select:{id:true,name:true,quantity:true}},events:{select:{id:true,status:true,createdAt:true},orderBy:{createdAt:'asc'}}}});if(!order)throw new HttpError(404,'Order not found');result=order;}
else if(route==='admin/media-history')result=await mediaHistory();
else if(route==='admin/products/export'){return new Response(await exportCatalogue(req.nextUrl.searchParams),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename=sterlyn-products.csv','Cache-Control':'no-store'}});}
else if(route==='admin/overview')result=await overview(req.nextUrl.searchParams);
else if(path[0]==='admin'&&['enquiries','quotes','orders','fulfillment','customers','business'].includes(path[1]))result=await showroomRead(path[1]==='quotes'?'enquiries':path[1]==='fulfillment'?'orders':path[1],req.nextUrl.searchParams);
else if(route==='admin/inspirations')result=await inspirationWorkspace();
else if(route==='admin/product-workspace')result=await productWorkspace(req.nextUrl.searchParams);
else if(route==='admin/image-library')result=await imageLibrary();
else if(path[0]==='admin'){result=await adminRead(path[1]||'overview',req.nextUrl.searchParams);}
else if(path[0]==='media'&&path[1]){const asset=await db.mediaAsset.findUniqueOrThrow({where:{id:path[1]}});if(asset.status!=='approved')await staff('media');if(!asset.outputKey||!(asset.metadata as {scanned?:boolean})?.scanned)throw new HttpError(409,'This picture is still being checked.');const width=Number(req.nextUrl.searchParams.get('width'));const responsive=(asset.metadata as {responsive?:{key:string;width:number;mime:string}[]}).responsive?.find(v=>v.width===width);const data=await object(responsive?.key||asset.outputKey||asset.key);return new Response(data.Body!.transformToWebStream(),{headers:{'Content-Type':responsive?.mime||(asset.outputKey?(asset.mime.startsWith('video/')?'video/mp4':((asset.metadata as {outputMime?:string}).outputMime||'image/webp')):asset.mime),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
else throw new HttpError(404,'Endpoint not found');
}else{
if(route==='media/upload'){await staff('media');const form=await boundedFormData(req);const file=form.get('file');if(!(file instanceof File)||file.size>MAX_UPLOAD_BYTES||file.size===0)throw new HttpError(400,'Choose a video or image under 100 MB.');const bytes=new Uint8Array(await file.arrayBuffer());const mime=uploadMime(bytes);const intent=await beginUpload({mime,size:file.size,name:file.name.slice(0,200),alt:String(form.get('alt')||file.name).slice(0,300)});await putObject(intent.key,bytes,mime);return NextResponse.json(await finishUpload({id:intent.id}));}

if(route==='admin/products/import')await staff('products');const body=await boundedJson(req,route==='admin/products/import'?8*1024*1024:64*1024);
if(route==='enquiries')result=await createEnquiry(body);
else if(route==='tracking/lookup'){await limit(req,'tracking-lookup',20);result=await lookupTracking(body);}
else if(route==='tracking/recover'){await limit(req,'tracking-recovery',3);result=await recoverTracking(body);}
else if(route==='cart')throw new HttpError(410,'Use the showroom enquiry list and submit through Contact.');
else if(route==='quotes'||route==='quotes/respond')throw new HttpError(410,'Please submit your enquiry through Contact and continue with our team on WhatsApp.');
else if(route==='admin/enquiries'||route==='admin/quotes')result=await updateEnquiry(body);
else if(route==='admin/orders'||route==='admin/fulfillment')result=await updateOrder(body);
else if(route==='admin/receipts')result=await recordReceipt(body);
else if(route==='admin/tracking')result=await trackingCommand(body);
else if(route==='admin/customers')result=await customerCommand(body);
else if(route==='admin/business')result=await businessSettings(body);
else if(route==='checkout')result=await checkout(body);
else if(route==='admin/schedule')result=await schedulePublication(body);
else if(route==='admin/schedule-cancel')result=await cancelSchedule(body);
else if(route==='admin/invoice-command')result=await invoiceCommand(body);
else if(route==='admin/privacy-command')result=await privacyCommand(body);
else if(route==='admin/cms-publish')result=await publishRevision(body);
else if(route==='admin/media-rollback')result=await rollbackMedia(body);
else if(route==='admin/media-retry')result=await retryLocalJob(body);
else if(route==='admin/products/import')result=await importCatalogue(body);
else if(route==='admin/variants')result=await editVariant(body);
else if(route==='admin/invite')result=await inviteStaff(body);
else if(route==='admin/staff-access')result=await staffAccess(body);
else if(route==='admin/convert-quote')result=await convertQuote(body);
else if(route==='invitations/accept')result=await acceptInvitation(body);
else if(route==='wishlist'){const u=await requireUser(),v=z.object({productId:z.string()}).parse(body);const existing=await db.wishlist.findUnique({where:{userId_productId:{userId:u.id,productId:v.productId}}});if(existing)await db.wishlist.delete({where:{id:existing.id}});else await db.wishlist.create({data:{userId:u.id,productId:v.productId}});result={saved:!existing};}
else if(route==='projects'){const u=await requireUser(),v=z.object({id:z.string().optional(),version:z.number().int().positive().optional(),name:z.string().min(2).max(100),scene:sceneSchema}).parse(body);if(v.scene.modules.some(m=>!validPlacement(v.scene,m)))throw new HttpError(400,'Design contains overlapping units or units outside the room.');if(v.id){const own=await db.designProject.findFirst({where:{id:v.id,userId:u.id}});if(!own)throw new HttpError(404,'Project not found');if(v.version===undefined)throw new HttpError(409,'Reload this project before saving.');const changed=await db.designProject.updateMany({where:{id:v.id,userId:u.id,version:v.version},data:{name:v.name,scene:v.scene,version:{increment:1}}});if(!changed.count)throw new HttpError(409,'This project changed in another session. Reload it before saving. Your browser copy is preserved.');result=await db.designProject.findUniqueOrThrow({where:{id:v.id}});}else result=await db.designProject.create({data:{userId:u.id,name:v.name,scene:v.scene}});}
else if(route==='account/profile')result=await updateProfile(body);
else if(route==='account/erasure')result=await requestErasure();
else if(route==='addresses/change')result=await changeAddress(body);
else if(route==='addresses'){const u=await requireUser(),v=z.object({name:z.string().min(2),line1:z.string().min(3),city:z.string().min(2),region:z.string().min(2),phone:z.string().min(7)}).parse(body);result=await db.address.create({data:{...v,userId:u.id}});}
else if(route==='contact')throw new HttpError(410,'Use the Contact page to save an enquiry and continue on WhatsApp.');
else if(route==='newsletter'){const v=z.object({email:z.email(),consent:z.literal('on')}).parse(body);await db.newsletter.upsert({where:{email:v.email},create:{email:v.email},update:{}});result={message:'Your subscription preference has been saved.'};}
else if(route==='analytics'){const v=z.object({consent:z.literal(true),event:z.enum(['page_view','product_view','quote_start']),path:z.string().max(200)}).parse(body);await db.analyticsEvent.create({data:{event:v.event,path:v.path.split('?')[0]}});result={recorded:true};}
else if(route==='admin/inspirations')result=await saveInspiration(body);
else if(route==='admin/manage-product')result=await manageProduct(body);
else if(route==='admin/manage-category')result=await manageCategory(body);
else if(route==='media/presign')result=await beginUpload(body);
else if(route==='media/finalize')result=await finishUpload(body);
else if(path[0]==='admin')result=await adminWrite(path[1],body);
else throw new HttpError(404,'Endpoint not found');}
return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
}catch(e){if(e instanceof ZodError)return NextResponse.json({error:e.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')},{status:400});if(e instanceof HttpError)return NextResponse.json({error:e.message},{status:e.status});logFailure('request_failed',e);return NextResponse.json({error:'The request could not be completed. Please try again or contact the team.'},{status:500});}}
async function contextualHandler(...args:Parameters<typeof handler>){return withRequestContext(async()=>{const response=await handler(...args);response.headers.set('X-Correlation-ID',requestCorrelationId());return response;});}
export {contextualHandler as GET,contextualHandler as POST};
