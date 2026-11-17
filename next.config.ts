import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'standalone', poweredByHeader: false,
  images: { remotePatterns: [], formats: ['image/avif','image/webp'], qualities: [75,85,90] },
  async headers() { return [...['admin','account','profile','staff','owner-setup','track','invoices','cart','checkout','order-confirmation','api'].map(route=>({source:`/${route}/:path*`,headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'}]})), {source:'/api/tracking/:path*',headers:[{key:'Cache-Control',value:'no-store'},{key:'Referrer-Policy',value:'no-referrer'}]},{ source: '/(.*)', headers: [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'no-referrer' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ]}]; }
}; export default config;
