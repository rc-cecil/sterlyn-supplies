import {createHmac,timingSafeEqual} from 'node:crypto';
import {HttpError} from './http-error';
// Deliberately unavailable even if legacy provider credentials are configured.
export async function checkout(_input:unknown):Promise<{url:string}>{void _input;throw new HttpError(409,'Online payments are unavailable. Please submit an enquiry and discuss payment directly with our team.');}
export function validSignature(raw:string,signature:string,secret:string){const expected=createHmac('sha512',secret).update(raw).digest('hex');return /^[0-9a-f]{128}$/i.test(signature)&&timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(signature,'hex'));}
export async function webhook(_req:Request):Promise<never>{void _req;throw new HttpError(410,'Payment settlement is disabled.');}
