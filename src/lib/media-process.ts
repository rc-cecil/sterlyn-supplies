import {randomUUID,createHash} from 'node:crypto';
import {mkdir,writeFile,rename,rm,open} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join} from 'node:path';
import {scanMedia} from './media-scan';
export async function isolatedProcess(bytes:Uint8Array,mime:string){
 if(!process.env.MEDIA_SPOOL)throw new Error('Isolated media processor is not configured');
 const scan=await scanMedia(bytes),dir=join(process.env.MEDIA_SPOOL,randomUUID());await mkdir(dir,{mode:0o700});
 const directory=await open(dir,constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW);
 async function boundedRead(name:string,limit:number){const file=await open('/proc/self/fd/'+directory.fd+'/'+name,constants.O_RDONLY|constants.O_NOFOLLOW);try{const info=await file.stat();if(!info.isFile()||info.size>limit)throw new Error('Invalid processor output');const chunks:Buffer[]=[];let size=0;while(true){const chunk=Buffer.alloc(Math.min(65536,limit-size+1)),{bytesRead}=await file.read(chunk);if(!bytesRead)break;size+=bytesRead;if(size>limit)throw new Error('Output limit exceeded');chunks.push(chunk.subarray(0,bytesRead));}return Buffer.concat(chunks);}finally{await file.close();}}
 try{
  await writeFile(join(dir,'input'),bytes);await writeFile(join(dir,'request.tmp'),JSON.stringify({mime}));await rename(join(dir,'request.tmp'),join(dir,'request.json'));
  let result:{ok:boolean;output:string;width:number;height:number;duration:number;responsive?:{file:string;width:number;height:number;mime:string}[]}|undefined;
  for(let i=0;i<250;i++){try{result=JSON.parse((await boundedRead('result.json',4096)).toString('utf8'));break;}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}await new Promise(r=>setTimeout(r,1000));}
  if(!result?.ok||!['output.mp4','output.png'].includes(result.output))throw new Error('Isolated processing failed or timed out');
  const output=await boundedRead(result.output,150*1024*1024),poster=await boundedRead('poster.png',15*1024*1024);
  const responsive=[];for(const variant of result.responsive||[]){if(!/^image-(640|1280)\.webp$/.test(variant.file)||!['image/webp'].includes(variant.mime)||![640,1280].includes(variant.width))throw Error('Invalid responsive output');const bytes=await boundedRead(variant.file,15*1024*1024);responsive.push({...variant,bytes,sha256:createHash('sha256').update(bytes).digest('hex')});}
  return {output,poster,responsive,mime:result.output.endsWith('.mp4')?'video/mp4':'image/png',metadata:{width:result.width,height:result.height,duration:result.duration,scanned:true,...scan,sha256:createHash('sha256').update(output).digest('hex')}};
 }finally{await directory.close();await rm(dir,{recursive:true,force:true});}
}
