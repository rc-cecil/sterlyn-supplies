import FocusBehavior from '@/components/FocusBehavior';
import type {Metadata} from 'next';
import {storefrontDescription,storefrontOrigin,storefrontTitle} from '@/lib/storefront-seo';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import './globals.css';
export const metadata:Metadata={metadataBase:new URL(storefrontOrigin),title:{default:storefrontTitle,template:'%s | Sterlyn Supplies'},description:storefrontDescription,robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en-GH"><body><FocusBehavior/>{children}</body></html>;}
