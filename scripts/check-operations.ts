import 'dotenv/config';
import {db} from '../src/lib/db';
import {scannerReadiness} from '../src/lib/media-scan';
import {HeadBucketCommand} from '@aws-sdk/client-s3';
import {storage} from '../src/lib/storage';
const maxAge=Number(process.env.MAX_JOB_AGE_MINUTES||15)*60000;
try{
 const [queued,failed,unknownMail,heartbeat,backup]=await Promise.all([db.videoJob.count({where:{kind:'process',status:{in:['queued','running']},createdAt:{lt:new Date(Date.now()-maxAge)}}}),db.videoJob.count({where:{kind:'process',status:'failed'}}),db.notification.count({where:{status:{in:['failed','delivery_unknown']}}}),db.setting.findUnique({where:{key:'workerHeartbeat'}}),db.setting.findUnique({where:{key:'lastSuccessfulBackup'}})]);
 const value=heartbeat?.value as {at?:string;processorReady?:boolean}|undefined;let scanner=false,objects=false;
 try{await scannerReadiness();scanner=true;}catch{}
 try{await storage().send(new HeadBucketCommand({Bucket:process.env.S3_BUCKET}));objects=true;}catch{}
 const backupAt=(backup?.value as {at?:string}|undefined)?.at,backupLimit=Number(process.env.BACKUP_MAX_AGE_HOURS);
 const backupFresh=Number.isFinite(backupLimit)&&backupLimit>0?!!backupAt&&Date.now()-Date.parse(backupAt)<backupLimit*3600000:null;
 const worker=!!value?.at&&Date.now()-Date.parse(value.at)<60000&&value.processorReady===true;
 console.log(JSON.stringify({checkedAt:new Date().toISOString(),worker,scanner,objects,backupFresh,overdueMediaJobs:queued,failedMediaJobs:failed,notificationsRequiringReview:unknownMail}));
 process.exitCode=worker&&scanner&&objects&&queued===0&&failed===0&&unknownMail===0&&backupFresh!==false?0:1;
}catch{console.log(JSON.stringify({status:'unavailable'}));process.exitCode=1;}finally{await db.$disconnect();}
