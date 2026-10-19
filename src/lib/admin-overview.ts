import {db} from './db';
import {staff,audit} from './security';
import {allowed} from './domain';
export async function overview(){const actor=await staff('overview');const can=(resource:string)=>allowed(actor.role,resource);const [products,quotes,orders,customers,recentQuotes,recentOrders]=await Promise.all([
 can('products')?db.product.count({where:{status:'published'}}):null,
 can('quotes')?db.quote.count({where:{status:{notIn:['closed','accepted']}}}):null,
 can('orders')?db.order.count({where:{status:{in:['awaiting_confirmation','processing','shipped']}}}):null,
 can('customers')?db.user.count({where:{role:'customer'}}):null,
 can('quotes')?db.quote.findMany({select:{id:true,name:true,status:true,createdAt:true},take:5,orderBy:{createdAt:'desc'}}):[],
 can('orders')?db.order.findMany({select:{id:true,name:true,status:true,createdAt:true},take:5,orderBy:{createdAt:'desc'}}):[]]);await audit(actor,'read','overview','summary');return {products,quotes,orders,customers,recentQuotes,recentOrders,freshAt:new Date().toISOString()};}
