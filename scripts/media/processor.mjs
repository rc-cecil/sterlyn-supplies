import {readdir,readFile,writeFile,rename,stat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),root=process.env.MEDIA_SPOOL||'/spool';
setInterval(()=>writeFile(root+'/processor-heartbeat',new Date().toISOString()).catch(()=>{}),1000);
async function run(id){
 const dir=root+'/'+id;
 try{
  await rename(dir+'/request.json',dir+'/running.json');
  const request=JSON.parse(await readFile(dir+'/running.json','utf8'));
  if(!['image/png','image/jpeg','image/webp','video/mp4','video/webm'].includes(request.mime))throw Error('Unsupported media type');
  if((await stat(dir+'/input')).size>100*1024*1024)throw Error('Input exceeds limit');
  const {stdout}=await exec('ffprobe',['-v','error','-print_format','json','-show_format','-show_streams',dir+'/input'],{timeout:20000,maxBuffer:1024*1024});
  const metadata=JSON.parse(stdout),stream=metadata.streams.find(s=>s.codec_type==='video');
  if(!stream||stream.width<1||stream.height<1||stream.width>4096||stream.height>4096)throw Error('Invalid media dimensions');
  const video=request.mime.startsWith('video/'),duration=Number(metadata.format.duration||0);
  if(video&&(!Number.isFinite(duration)||duration<=0||duration>120))throw Error('Invalid video duration');
  const output=video?'output.mp4':'output.png';
  const args=video?['-an','-vf',"scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",'-c:v','libx264','-threads','2','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart']:['-frames:v','1','-vf',"scale=w='min(3200,iw)':h='min(3200,ih)':force_original_aspect_ratio=decrease",'-threads','1'];
  await exec('ffmpeg',['-nostdin','-y','-protocol_whitelist','file,pipe','-i',dir+'/input',...args,dir+'/'+output],{timeout:180000,maxBuffer:1024*1024});
  await exec('ffmpeg',['-nostdin','-y','-protocol_whitelist','file,pipe','-i',dir+'/'+output,'-frames:v','1','-vf','scale=960:960:force_original_aspect_ratio=decrease','-threads','1',dir+'/poster.png'],{timeout:30000,maxBuffer:1024*1024});
  if((await stat(dir+'/'+output)).size>150*1024*1024)throw Error('Processed output exceeds limit');
  const decoded=await exec('ffprobe',['-v','error','-print_format','json','-show_streams',dir+'/'+output],{timeout:20000,maxBuffer:1024*1024});
  const actual=JSON.parse(decoded.stdout).streams.find(s=>s.codec_type==='video');
  const responsive=[];
  if(!video){for(const width of [640,1280]){if(actual.width<=width)continue;const file='image-'+width+'.webp';await exec('ffmpeg',['-nostdin','-y','-protocol_whitelist','file,pipe','-i',dir+'/'+output,'-frames:v','1','-vf','scale='+width+':-1','-c:v','libwebp','-quality','85','-threads','1',dir+'/'+file],{timeout:30000,maxBuffer:1024*1024});responsive.push({file,width,height:Math.round(actual.height*width/actual.width),mime:'image/webp'});}}
  await writeFile(dir+'/result.tmp',JSON.stringify({ok:true,output,width:actual.width,height:actual.height,duration,responsive}));
 }catch{await writeFile(dir+'/result.tmp',JSON.stringify({ok:false,error:'Media validation or processing failed'}));}
 await rename(dir+'/result.tmp',dir+'/result.json');
}
while(true){for(const id of await readdir(root)){if(!/^[0-9a-f-]{36}$/.test(id))continue;try{await stat(root+'/'+id+'/request.json');await run(id);}catch{}}await new Promise(r=>setTimeout(r,500));}
