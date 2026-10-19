import {createConnection} from 'node:net';
function command(payload:Buffer){return new Promise<string>((resolve,reject)=>{
 const socket=createConnection({host:process.env.CLAMAV_HOST||'antivirus',port:3310});let result='';
 socket.setTimeout(120000,()=>socket.destroy(new Error('Scanner timeout')));
 socket.on('error',reject);socket.on('connect',()=>socket.write(payload));
 socket.on('data',chunk=>{result+=chunk.toString();if(result.length>4096)socket.destroy(new Error('Invalid scanner response'));});socket.on('end',()=>resolve(result.replaceAll('\0','')));
});}
export async function scannerReadiness(){
 const version=await command(Buffer.from('zVERSION\0'));
 const date=Date.parse(version.split('/').slice(2).join('/'));
 if(!Number.isFinite(date)||Date.now()-date>72*3600000||date>Date.now()+3600000)throw new Error('Antivirus definitions unavailable or stale');
 return {engine:version,scannedAt:new Date().toISOString()};
}
export async function scanMedia(bytes:Uint8Array){
 const evidence=await scannerReadiness();
 const chunks:Buffer[]=[Buffer.from('zINSTREAM\0')];
 for(let offset=0;offset<bytes.length;offset+=65536){const chunk=Buffer.from(bytes.subarray(offset,offset+65536)),length=Buffer.alloc(4);length.writeUInt32BE(chunk.length);chunks.push(length,chunk);}
 chunks.push(Buffer.alloc(4));const result=await command(Buffer.concat(chunks));
 if(/ FOUND\s*$/.test(result))throw new Error('Antivirus detected infected input');
 if(!/^stream: OK\s*$/.test(result))throw new Error('Antivirus rejected media or failed');
 return evidence;
}
