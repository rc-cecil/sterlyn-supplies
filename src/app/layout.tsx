import type {Metadata} from 'next';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import './globals.css';
export const metadata:Metadata={metadataBase:new URL(process.env.BETTER_AUTH_URL||'http://localhost:3000'),title:{default:'Sterlyn Supplies — The art of a better kitchen',template:'%s | Sterlyn Supplies'},description:'Explore considered kitchen concepts, plan your space in 3D, and request a tailored quotation from Sterlyn Supplies Limited.',openGraph:{images:['/images/kitchen-emerald.webp']},robots:{index:process.env.PUBLIC_LAUNCH==='true',follow:true}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en-GH"><body>{children}</body></html>;}
