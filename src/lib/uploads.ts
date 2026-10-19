import {HttpError} from './security';
export const MAX_UPLOAD_BYTES=100*1024*1024;
export function uploadMime(bytes:Uint8Array){
 const starts=(prefix:number[])=>prefix.every((v,i)=>bytes[i]===v);
 const ascii=(from:number,to:number)=>String.fromCharCode(...bytes.slice(from,to));
 if(bytes.length>=12&&ascii(4,8)==='ftyp')return 'video/mp4';
 if(starts([0x1a,0x45,0xdf,0xa3]))return 'video/webm';
 if(starts([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))return 'image/png';
 if(starts([0xff,0xd8,0xff]))return 'image/jpeg';
 if(bytes.length>=12&&ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')return 'image/webp';
 throw new HttpError(400,'Unsupported file signature. Use MP4, WebM, PNG, JPEG or WebP.');
}
export async function boundedFormData(req:Request){
 const limit=MAX_UPLOAD_BYTES+1024*1024;
 if(Number(req.headers.get('content-length'))>limit)throw new HttpError(413,'Upload exceeds 100 MB.');
 if(!req.body)throw new HttpError(400,'Missing upload body');
 let received=0;const body=req.body.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){received+=chunk.byteLength;if(received>limit)throw new HttpError(413,'Upload exceeds 100 MB.');controller.enqueue(chunk);}}));
 return new Request(req.url,{method:'POST',headers:req.headers,body,duplex:'half'} as RequestInit&{duplex:'half'}).formData();
}
export async function boundedJson(req:Request,limit=64*1024):Promise<unknown>{
 if(Number(req.headers.get('content-length'))>limit)throw new HttpError(413,'Request body exceeds the allowed size.');
 if(!req.body)throw new HttpError(400,'Missing request body');let size=0;
 const body=req.body.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){size+=chunk.byteLength;if(size>limit)throw new HttpError(413,'Request body exceeds the allowed size.');controller.enqueue(chunk);}}));
 return new Request(req.url,{method:'POST',headers:req.headers,body,duplex:'half'} as RequestInit&{duplex:'half'}).json();
}
