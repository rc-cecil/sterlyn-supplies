import {db} from './db';
import {staff} from './security';
import {allowed} from './domain';
export async function overview(query=new URLSearchParams()){
 const actor=await staff('overview'),can=(resource:string)=>allowed(actor.role,resource);
 const allWork=['owner','admin','analyst'].includes(actor.role),scope=allWork?{}:{assignedTo:actor.id};
 const days=Math.max(1,Math.min(365,Number(query.get('days'))||30)),since=new Date(Date.now()-days*86400000),createdAt={gte:since};
 const [quotes,orders,products,customers,notifications,recentQuotes,recentOrders,receipts,enquiryTrend,orderTrend,myEnquiries,myOrders]=await Promise.all([
  (can('quotes')||can('analytics'))?db.quote.groupBy({by:['status'],where:{createdAt,...scope},_count:true}):[],
  (can('orders')||can('analytics'))?db.order.groupBy({by:['status'],where:{createdAt,...scope},_count:true}):[],
  can('products')?db.product.count({where:{status:'published'}}):null,
  (can('customers')||can('analytics'))?db.customer.count():null,
  can('notifications')||can('support')||can('analytics')?db.notification.groupBy({by:['status'],where:{createdAt},_count:true}):[],
  can('quotes')?db.quote.findMany({where:{...scope,status:{notIn:['converted','closed']},order:{is:null}},select:{id:true,reference:true,name:true,status:true,createdAt:true},take:6,orderBy:{createdAt:'desc'}}):[],
  can('orders')?db.order.findMany({where:{...scope,status:{notIn:['completed','cancelled']}},select:{id:true,reference:true,name:true,status:true,createdAt:true},take:6,orderBy:{createdAt:'desc'}}):[],
  ['owner','admin'].includes(actor.role)?db.payment.groupBy({by:['currency','reversalOf'],where:{provider:'manual',status:'confirmed',createdAt},_sum:{amount:true}}):[],
  (can('quotes')||can('analytics'))?db.$queryRaw<{day:string;count:bigint}[]>`SELECT to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, count(*) AS count FROM "Quote" WHERE "createdAt" >= ${since} AND (${allWork} OR "assignedTo" = ${actor.id}) GROUP BY day ORDER BY day`:[],
  (can('orders')||can('analytics'))?db.$queryRaw<{day:string;count:bigint}[]>`SELECT to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, count(*) AS count FROM "Order" WHERE "createdAt" >= ${since} AND (${allWork} OR "assignedTo" = ${actor.id}) GROUP BY day ORDER BY day`:[],
  can('quotes')?db.quote.findMany({where:{assignedTo:actor.id,status:{notIn:['converted','closed']}},select:{id:true,reference:true,name:true,status:true,updatedAt:true},orderBy:{updatedAt:'desc'},take:20}):[],
  can('orders')?db.order.findMany({where:{assignedTo:actor.id,status:{notIn:['completed','cancelled']}},select:{id:true,reference:true,name:true,status:true,expectedDelivery:true,updatedAt:true},orderBy:{updatedAt:'desc'},take:20}):[],
 ]);
 const count=(rows:{status:string;_count:number}[],...statuses:string[])=>rows.filter(row=>statuses.includes(row.status)).reduce((sum,row)=>sum+row._count,0);
 const totalEnquiries=quotes.reduce((sum,row)=>sum+row._count,0),converted=count(quotes,'converted');
 const trend=Array.from({length:days+1},(_,index)=>{const day=new Date(Date.now()-(days-index)*86400000).toISOString().slice(0,10);return {day,enquiries:Number(enquiryTrend.find(row=>row.day===day)?.count||0),orders:Number(orderTrend.find(row=>row.day===day)?.count||0)};});
 return {actor:{id:actor.id,name:actor.name,role:actor.role},myWork:{enquiries:myEnquiries,orders:myOrders},manager:['owner','admin'].includes(actor.role),emailEnabled:!!process.env.SMTP_HOST,trend,days,products,customers,totalEnquiries,newEnquiries:count(quotes,'new'),negotiations:count(quotes,'contacted','reviewing','negotiating'),pendingQuotations:count(quotes,'new','contacted','reviewing','negotiating','awaiting_customer','quoted'),awaitingCustomer:count(quotes,'awaiting_customer','quoted'),conversionRate:totalEnquiries?converted/totalEnquiries:null,confirmedOrders:count(orders,'confirmed','awaiting_confirmation','paid'),processing:count(orders,'processing'),pendingDeliveries:count(orders,'ready_for_delivery','dispatched','shipped'),completed:count(orders,'completed'),delivered:count(orders,'delivered','completed'),delayed:count(orders,'delayed'),notificationFailures:count(notifications,'failed','delivery_unknown'),recentQuotes,recentOrders,receipts:receipts.reduce((rows,payment)=>{const currency=payment.currency||'GHS';const row=rows.find(row=>row.currency===currency);const amount=(payment._sum.amount||0)*(payment.reversalOf?-1:1);if(row)row.received+=amount;else rows.push({currency,received:amount});return rows;},[] as {currency:string;received:number}[]),freshAt:new Date().toISOString(),permissions:{aggregateOnly:actor.role==='analyst',quotes:can('quotes'),orders:can('orders'),notifications:can('notifications')||can('support')}};
}
