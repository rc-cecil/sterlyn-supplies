import {NextRequest,NextResponse} from 'next/server';
export function proxy(request:NextRequest){
 if(request.nextUrl.pathname.startsWith('/api/')){
  return NextResponse.next();
 }
 const nonce=Buffer.from(crypto.randomUUID()).toString('base64');
 const development=process.env.NODE_ENV==='development';
 const policy=["default-src 'self'",`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development?" 'unsafe-eval'":''}`,"style-src 'self' 'unsafe-inline'","img-src 'self' data: blob:","font-src 'self'","connect-src 'self'","media-src 'self' blob:","worker-src 'self' blob:","object-src 'none'","frame-ancestors 'none'","base-uri 'self'","form-action 'self'"].join('; ');
 const headers=new Headers(request.headers);headers.set('x-nonce',nonce);headers.set('Content-Security-Policy',policy);
 const response=NextResponse.next({request:{headers}});response.headers.set('Content-Security-Policy',policy);return response;
}
export const config={matcher:['/api/:path*','/((?!api|_next/static|_next/image|favicon.ico|images/|video/).*)']};
