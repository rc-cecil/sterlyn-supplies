'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';

/** The supplier media pack can be committed later without breaking the static showroom. */
export default function SupplierImage({source, fallback, alt, sizes, priority = false}:{
  source?: string; fallback: string; alt: string; sizes:string; priority?:boolean;
}) {
  const [src,setSrc]=useState(source || fallback);
  useEffect(()=>{setSrc(source || fallback);},[source,fallback]);
  const contain = !!source && /\/(tap-|sink-|basin-|storage-)/.test(source);
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} style={{objectFit:contain?"contain":"cover"}}
    onError={()=>{if(src!==fallback)setSrc(fallback);}}/>;
}
