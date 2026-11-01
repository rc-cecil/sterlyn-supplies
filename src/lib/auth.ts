import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { db } from './db';
import {HttpError} from './http-error';
async function mail(to: string, subject: string, body: string) { await db.notification.create({ data: { recipient: to, subject, body } }); }
function createAuth(){
  if(process.env.NODE_ENV==='production'&&(!process.env.BETTER_AUTH_URL||!process.env.BETTER_AUTH_SECRET||process.env.BETTER_AUTH_SECRET.length<32))throw new HttpError(503,'Authentication requires a configured application URL and a strong authentication secret.');
  return betterAuth({
  appName: 'Sterlyn Supplies', baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000', secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: process.env.NODE_ENV === 'production' ? [new URL(process.env.BETTER_AUTH_URL!).origin] : ['http://localhost:3000','http://127.0.0.1:3000'],
  database: prismaAdapter(db, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true, minPasswordLength: 12, requireEmailVerification: true, revokeSessionsOnPasswordReset: true, sendResetPassword: async ({user,url}) => mail(user.email,'Reset your Sterlyn password',url) },
  emailVerification: { sendOnSignUp: true, autoSignInAfterVerification: true, sendVerificationEmail: async ({user,url}) => mail(user.email,'Verify your Sterlyn email',url) },
  user: { additionalFields: { role: {type:'string', defaultValue:'customer', input:false} } },
  session: { expiresIn: 60*60*24*7, updateAge: 60*60*24 },
  rateLimit: {enabled:true, window:60, max:30},
});
}
let instance:ReturnType<typeof createAuth>|undefined;
// Database-free previews import shared routes but never initialize live authentication.
export function getAuth(){return instance??=createAuth();}
