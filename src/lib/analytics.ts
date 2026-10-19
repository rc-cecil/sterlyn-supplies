import {db} from './db';
export async function analytics(days=30){
 const end=new Date();end.setUTCHours(24,0,0,0);
 const since=new Date(end.getTime()-days*86400000),previous=new Date(since.getTime()-days*86400000);
 const [orders,quotes,customers,refunds,lowStock,activity,products,priorOrders,priorQuotes]=await Promise.all([
  db.order.findMany({where:{createdAt:{gte:since,lt:end}},select:{createdAt:true,payments:{where:{status:'paid'},select:{amount:true}}}}),
  db.quote.findMany({where:{createdAt:{gte:since,lt:end}},select:{status:true,createdAt:true}}),
  db.user.findMany({where:{role:'customer',createdAt:{gte:since,lt:end}},select:{createdAt:true}}),
  db.refund.aggregate({where:{status:'processed',createdAt:{gte:since,lt:end}},_sum:{amount:true}}),
  db.variant.count({where:{verified:true,stock:{lte:3}}}),
  db.auditLog.findMany({where:{createdAt:{gte:since,lt:end},action:{not:'read'}},select:{createdAt:true}}),
  db.product.count({where:{status:'published'}}),
  db.order.count({where:{createdAt:{gte:previous,lt:since}}}),
  db.quote.count({where:{createdAt:{gte:previous,lt:since}}})
 ]);
 const dayKey=(d:Date)=>d.toISOString().slice(0,10);
 const series=Array.from({length:days},(_,i)=>{
  const date=dayKey(new Date(since.getTime()+i*86400000));const day=orders.filter(o=>dayKey(o.createdAt)===date);
  return {date,revenue:day.reduce((s,o)=>s+o.payments.reduce((n,p)=>n+p.amount,0),0)/100,orders:day.length,quotes:quotes.filter(q=>dayKey(q.createdAt)===date).length,customers:customers.filter(c=>dayKey(c.createdAt)===date).length,activity:activity.filter(a=>dayKey(a.createdAt)===date).length};
 });
 const statuses=new Map<string,number>();for(const q of quotes)statuses.set(q.status,(statuses.get(q.status)||0)+1);
 return {days,since:since.toISOString(),freshAt:new Date().toISOString(),timezone:'Africa/Accra',currency:'GHS',revenue:orders.reduce((s,o)=>s+o.payments.reduce((n,p)=>n+p.amount,0),0),orders:orders.length,paidOrders:orders.filter(o=>o.payments.length).length,customers:customers.length,products,activity:activity.length,previous:{orders:priorOrders,quotes:priorQuotes},refunds:refunds._sum.amount||0,lowStock,quotes:[...statuses].map(([status,count])=>({status,count})),series};
}
