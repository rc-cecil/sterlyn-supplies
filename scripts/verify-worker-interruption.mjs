import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
if(process.env.DEMO_MEDIA_VERIFY!=='true')throw Error('Explicit demo verification flag required');
const exec=promisify(execFile),compose=['compose','--env-file','.local/demo.env','-f','compose.yaml','-f','compose.demo.yaml'];
const docker=(args)=>exec('docker',args,{timeout:120000,maxBuffer:1024*1024});
let child;
try{
 await docker(['pause','sterlyn-processor-1']);
 child=spawn('docker',[...compose,'exec','-T','-e','DEMO_MEDIA_VERIFY=true','-e','DEMO_INTERRUPT_VERIFY=true','web','node','--import','tsx','scripts/verify-docker-media.ts'],{stdio:['ignore','pipe','pipe']});
 let output='',errors='',phaseResolve,phaseReject;
 const phase=new Promise((resolve,reject)=>{phaseResolve=resolve;phaseReject=reject;});
 child.stdout.on('data',chunk=>{output+=chunk;for(const line of output.split('\n')){try{const item=JSON.parse(line);if(item.phase==='worker-interruption-ready')phaseResolve(item.jobId);}catch{}}});
 child.stderr.on('data',chunk=>{errors+=chunk;});
 const completed=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>{if(code===0)resolve();else{const error=Error('Media acceptance child failed');phaseReject(error);reject(error);}});});
 completed.catch(()=>{});
 const timeout=setTimeout(()=>phaseReject(Error('Interruption setup deadline exceeded')),60000);
 let jobId;try{jobId=await phase;}finally{clearTimeout(timeout);}
 if(typeof jobId!=='string'||!/^[a-z0-9-]{10,64}$/.test(jobId))throw Error('Invalid fixture identifier');
 await docker(['kill','sterlyn-worker-1']);
 await docker([...compose,'exec','-T','-e','INTERRUPTED_JOB_ID='+jobId,'web','node','--import','tsx','--input-type=module','-e','import {db} from "./src/lib/db.ts";const r=await db.videoJob.updateMany({where:{id:process.env.INTERRUPTED_JOB_ID,status:"running"},data:{leaseUntil:new Date(Date.now()-60000)}});await db.$disconnect();if(r.count!==1)process.exit(1);']);
 await docker(['unpause','sterlyn-processor-1']);
 await docker(['start','sterlyn-worker-1']);
 await completed;
 for(const line of output.split('\n')){try{const result=JSON.parse(line);if(!result.phase)console.log(JSON.stringify(result));}catch{}}
 if(errors)console.warn('Child emitted diagnostics; no secrets or request payloads are reproduced.');
}finally{
 await docker(['unpause','sterlyn-processor-1']).catch(()=>{});
 await docker(['start','sterlyn-worker-1']).catch(()=>{});
 if(child&&child.exitCode===null)child.kill('SIGTERM');
}
