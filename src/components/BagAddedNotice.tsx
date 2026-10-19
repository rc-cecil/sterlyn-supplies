'use client';
import Link from 'next/link';
import {Check,X,ArrowUpRight} from 'lucide-react';
export type BagAddition={name:string;finish:string;image:string;quantity:number};
export default function BagAddedNotice({item,onDismiss}:{item:BagAddition;onDismiss:()=>void}){
 return <aside className="bag-added-notice" aria-label="Bag confirmation"><button className="icon-button bag-notice-close" aria-label="Dismiss bag confirmation" onClick={onDismiss}><X size={18}/></button><div role="status" aria-live="polite" aria-atomic="true"><p className="bag-notice-title"><Check size={18}/> Added to your collection bag.</p><div className="bag-notice-item"><img src={item.image} alt=""/><div><strong>{item.name}</strong><p>{item.finish}</p><p>Quantity in bag: {item.quantity}</p></div></div></div><Link className="button" href="/cart">View bag <ArrowUpRight size={17}/></Link><button className="text-link" onClick={onDismiss}>Continue exploring</button></aside>;
}
