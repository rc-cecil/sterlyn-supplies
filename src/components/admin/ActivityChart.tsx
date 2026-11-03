'use client';
// Adapted from Efferd Dashboard 1's SalesChart: responsive areas, period controls and interactive tooltip.
// https://efferd.com/r/new-york/dashboard-1.json · https://efferd.com/license
import {useId,useState} from 'react';
import {Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis,type TooltipContentProps} from 'recharts';
import {motion,useReducedMotion} from 'motion/react';
import {ChartNoAxesCombined,LoaderCircle} from 'lucide-react';
export type ActivityPoint={day:string;enquiries:number;orders:number};
const date=(value:string,full=false)=>new Date(value+'T12:00:00Z').toLocaleDateString('en-GH',{day:'numeric',month:full?'long':'short',...(full?{year:'numeric' as const}:{}),timeZone:'UTC'});
function ActivityTooltip({active,payload,label}:TooltipContentProps){
 if(!active||!payload.length||!label)return null;
 return <div className="activity-tooltip" data-testid="activity-tooltip"><strong>{date(String(label),true)}</strong>{payload.filter(item=>!item.hide).map(item=><div key={String(item.dataKey)}><span><i style={{background:item.color}}/>{item.name}</span><b>{Number(item.value).toLocaleString('en-GH')}</b></div>)}</div>;
}
export default function ActivityChart({rows,days,onPeriod,showEnquiries,showOrders,busy}:{rows:ActivityPoint[];days:string;onPeriod:(days:string)=>void;showEnquiries:boolean;showOrders:boolean;busy:boolean}){
 const uid=useId().replaceAll(':',''),reduced=useReducedMotion();
 const [visible,setVisible]=useState({enquiries:true,orders:true});
 const enquiries=showEnquiries&&visible.enquiries,orders=showOrders&&visible.orders;
 const total=(key:'enquiries'|'orders')=>rows.reduce((sum,row)=>sum+row[key],0);
 const hasActivity=rows.some(row=>(showEnquiries&&row.enquiries>0)||(showOrders&&row.orders>0));
 return <section className="activity-card workspace-report" aria-busy={busy} aria-label="Showroom activity chart"><div className="activity-heading"><div><span className="activity-title-icon"><ChartNoAxesCombined size={17}/></span><h2>Showroom activity</h2><p>{rows.length?date(rows[0].day)+' – '+date(rows.at(-1)!.day):'Requests and confirmed orders'}</p></div><div className="activity-periods" role="group" aria-label="Reporting period">{['7','30','90'].map(period=><button key={period} type="button" aria-pressed={days===period} onClick={()=>onPeriod(period)}>{days===period&&<motion.span layoutId={'period-'+uid} className="activity-period-marker" transition={{type:'spring',bounce:0,duration:reduced?0:.28}}/>}<span>{period} days</span></button>)}</div></div>
 <div className="activity-series" role="group" aria-label="Visible chart series">{([{key:'enquiries',title:'Enquiries',show:showEnquiries,active:enquiries,other:orders},{key:'orders',title:'Orders',show:showOrders,active:orders,other:enquiries}] as const).filter(item=>item.show).map(item=><button key={item.key} className={'activity-series-chip '+item.key} aria-pressed={item.active} disabled={item.active&&!item.other} onClick={()=>setVisible(value=>({...value,[item.key]:!value[item.key]}))}><i/><span>{item.title}</span><b>{total(item.key).toLocaleString('en-GH')}</b></button>)}<span className="activity-update">{busy?<><LoaderCircle size={13} className="spin"/> Updating</>:<>Daily totals</>}</span></div>
 <div className="activity-plot" data-testid="activity-plot"><ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{width:700,height:270}}><AreaChart data={rows} margin={{top:16,right:10,bottom:0,left:-24}} accessibilityLayer aria-label="Daily enquiries and orders. Use left and right arrow keys to inspect each day.">
 <defs><linearGradient id={'enquiries-'+uid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#47724c" stopOpacity={.3}/><stop offset="100%" stopColor="#47724c" stopOpacity={.015}/></linearGradient><linearGradient id={'orders-'+uid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#aa8149" stopOpacity={.23}/><stop offset="100%" stopColor="#aa8149" stopOpacity={.01}/></linearGradient></defs>
 <CartesianGrid vertical={false} stroke="#e7ece4" strokeDasharray="3 5"/><XAxis dataKey="day" axisLine={false} tickLine={false} minTickGap={36} tickMargin={12} tickFormatter={value=>date(String(value))} tick={{fill:'#5b6d55',fontSize:11}}/><YAxis axisLine={false} tickLine={false} allowDecimals={false} tickCount={4} domain={[0,'auto']} tick={{fill:'#5b6d55',fontSize:10}}/>
 <Tooltip content={props=><ActivityTooltip {...props}/>} cursor={{stroke:'#76906c',strokeWidth:1,strokeDasharray:'4 4'}} isAnimationActive={!reduced} animationDuration={120}/>
 {showEnquiries&&<Area type="monotone" dataKey="enquiries" name="Enquiries" hide={!enquiries} stroke="#365e3e" strokeWidth={2.3} fill={'url(#enquiries-'+uid+')'} activeDot={{r:5,stroke:'#fff',strokeWidth:3,fill:'#365e3e'}} dot={false} isAnimationActive={!reduced} animationDuration={480} animationEasing="ease-out"/>}
 {showOrders&&<Area type="monotone" dataKey="orders" name="Orders" hide={!orders} stroke="#96713b" strokeWidth={2} fill={'url(#orders-'+uid+')'} activeDot={{r:5,stroke:'#fff',strokeWidth:3,fill:'#96713b'}} dot={false} isAnimationActive={!reduced} animationDuration={480} animationEasing="ease-out"/>}
 </AreaChart></ResponsiveContainer></div>
 <div className="activity-chart-footer"><span>{hasActivity?'Hover, tap or use the arrow keys to inspect a day.':'Your first activity will appear here automatically.'}</span><span>Live records <i/></span></div>
 </section>;
}
