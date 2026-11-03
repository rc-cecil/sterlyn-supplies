'use client';
import Link from 'next/link';
import {useState} from 'react';
import {House,Inbox,PackageCheck,Users,Images,Settings2,ArrowUpRight,UserRound,ChevronDown,HelpCircle} from 'lucide-react';
import {allowed} from '@/lib/domain';
import Legacy from './AdminLegacy';
import Overview from './admin/Overview';
import Products from './admin/Products';
import BusinessOperations from './admin/BusinessOperations';
import BusinessSettings from './admin/BusinessSettings';
import Inspirations from './admin/Inspirations';
import Notifications from './admin/Notifications';
import Staff from './admin/Staff';
const groups=[
 {id:'overview',label:'Workspace',icon:House,items:[['overview','My work','overview'],['analytics','Reports','analytics']]},
 {id:'enquiries',label:'Enquiries',icon:Inbox,items:[['enquiries','Enquiries','quotes'],['quotes','Enquiries','quotes']]},
 {id:'orders',label:'Orders',icon:PackageCheck,items:[['orders','Orders','orders'],['fulfillment','Delivery progress','orders'],['invoices','Invoices','finance']]},
 {id:'customers',label:'Customers',icon:Users,items:[['customers','Customers','customers'],['support','Enquiries','support'],['privacy','Customer data requests','customers']]},
 {id:'products',label:'Catalogue',icon:Images,items:[['products','Products','products'],['categories','Categories','products'],['inspirations','Inspirations','cms'],['media','Product pictures','media'],['inventory','Stock history','inventory']]},
 {id:'settings',label:'Other tools',icon:Settings2,items:[['business','Business contact & settings','business'],['notifications','Email updates','notifications'],['teams','Staff access','teams'],['cms','Website content','cms'],['audit','Staff activity history','audit'],['schedules','Scheduled website updates','schedules'],['video','Media processing','video'],['reviews','Customer reviews','reviews'],['settings','Technical configuration','settings']]},
];
export default function Admin({section='overview',role}:{section?:string;role:string}){
 const [advanced,setAdvanced]=useState(false);
 const visible=(r:string,p:string)=>(r!=='privacy'||role==='owner')&&(r!=='settings'||role==='owner')&&allowed(role,p);
 const group=groups.find(g=>g.items.some(([id])=>id===(section==='product-import'?'products':section)))||groups[5];
 const tools=groups[5].items.filter(([r,,p])=>visible(r,p));
 return <div className="admin-shell"><aside className="admin-sidebar">
  <Link href="/admin" className="admin-brand">STERLYN<span>BUSINESS DESK</span></Link>
  <nav aria-label="Administration">{groups.filter(g=>g.id!=='settings'&&g.items.some(([r,,p])=>visible(r,p))).map(g=>{const first=g.items.find(([r,,p])=>visible(r,p))!;const Icon=g.icon;return <Link key={g.id} className={g.id===group.id?'active':''} aria-current={g.id===group.id?'page':undefined} href={g.id==='overview'?'/admin':'/admin/'+first[0]}><Icon size={19}/>{g.id==='products'&&role==='fulfillment'?'Stock':g.label}</Link>;})}</nav>
  {!!tools.length&&<details className="admin-other-tools" open={group.id==='settings'||undefined}><summary><Settings2 size={18}/> Other tools <ChevronDown size={15}/></summary><nav aria-label="Other staff tools">{tools.map(([id,title])=><Link href={'/admin/'+id} key={id} aria-current={section===id?'page':undefined}>{title}</Link>)}</nav></details>}
  <div className="admin-sidebar-help"><HelpCircle size={20}/><p>{allowed(role,'quotes')?'Start with enquiries.':allowed(role,'orders')?'Open your assigned orders.':'Open your role’s tools.'}<span>{allowed(role,'quotes')?'Confirm the agreement once. Tracking is created with the order.':allowed(role,'orders')?'Complete the work, then use the next-action button.':'Your permissions match the job provided by the owner.'}</span></p></div>
  <Link href="/" className="back-store">Open website <ArrowUpRight size={16}/></Link>
 </aside><main className="admin-main"><header className="admin-header"><span>Sterlyn <span className="admin-header-divider">/</span> {group.label}</span><Link className="admin-account-button" href="/account"><UserRound size={16}/> My account</Link></header>
 {group.id==='products'&&<nav className="admin-subnav" aria-label="Catalogue tools">{group.items.filter(([r,,p])=>visible(r,p)).map(([id,title])=><Link key={id} href={'/admin/'+id} aria-current={id===section?'page':undefined}>{title}</Link>)}</nav>}
 {section==='overview'||section==='analytics'?<Overview/>:section==='products'||section==='categories'?<Products categoriesOnly={section==='categories'} role={role}/>:section==='teams'?<Staff role={role}/>:section==='notifications'?<Notifications/>:section==='inspirations'?<Inspirations/>:section==='business'?<div className="admin-content operations"><h1>Business settings</h1><BusinessSettings role={role}/></div>:['enquiries','quotes','orders','fulfillment','customers'].includes(section)?<BusinessOperations key={section} section={section==='quotes'?'enquiries':section==='fulfillment'?'orders':section as 'enquiries'|'orders'|'customers'}/>:section==='settings'?<div className="admin-content operations"><div className="admin-title"><div><h1>Other tools</h1><p>Occasional tasks. Your daily work stays in Enquiries and Orders.</p></div></div>{allowed(role,'business')&&<BusinessSettings role={role}/>}<div className="admin-tool-list">{tools.filter(([id])=>id!=='settings'&&id!=='business').map(([id,title])=><Link className="record-row" href={'/admin/'+id} key={id}><strong>{title}</strong><ArrowUpRight size={18}/></Link>)}</div>{role==='owner'&&<details className="ops-disclosure" onToggle={e=>setAdvanced(e.currentTarget.open)}><summary>Technical configuration</summary><p>Only change these settings when maintaining the website.</p>{advanced&&<Legacy section="settings" role={role}/>}</details>}</div>:<Legacy section={section==='product-import'?'products':section} role={role}/>}</main></div>;
}
