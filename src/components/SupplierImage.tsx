'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';

/** Keep original supplier images intact: fitted-product photos use contain, room studies use cover. */
export default function SupplierImage({source, fallback, alt, sizes, priority = false}:{
  source?: string; fallback: string; alt: string; sizes:string; priority?:boolean;
}) {
  const [src,setSrc]=useState(source || fallback);
  useEffect(()=>{setSrc(source || fallback);},[source,fallback]);
  const contain = !!source && /\/(tap-|sink-|basin-|storage-)/.test(source);
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} quality={contain?90:85} style={{objectFit:contain?"contain":"cover",objectPosition:"center",background:contain?"#ffffff":undefined}}
    onError={()=>{if(src!==fallback)setSrc(fallback);}}/>;
}
