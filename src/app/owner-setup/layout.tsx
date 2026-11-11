import type { Metadata } from 'next';
import { connection } from 'next/server';
export const metadata: Metadata = { title:'Secure owner setup | Sterlyn Supplies', robots:{index:false,follow:false},referrer:'no-referrer' };
export default async function OwnerSetupLayout({children}:{children:React.ReactNode}){
  // The proxy creates a new CSP nonce per request. Static HTML cannot carry it.
  await connection();
  return children;
}
