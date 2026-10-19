import {S3Client,PutObjectCommand,GetObjectCommand,CreateBucketCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {HttpError} from './security';
export function storage(){if(!process.env.S3_ENDPOINT||!process.env.S3_BUCKET||!process.env.S3_ACCESS_KEY||!process.env.S3_SECRET_KEY)throw new HttpError(503,'Object storage requires configuration.');return new S3Client({endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION||'us-east-1',forcePathStyle:true,credentials:{accessKeyId:process.env.S3_ACCESS_KEY,secretAccessKey:process.env.S3_SECRET_KEY}});}
export async function putObject(key:string,bytes:Uint8Array,mime:string){await storage().send(new PutObjectCommand({Bucket:process.env.S3_BUCKET,Key:key,Body:bytes,ContentType:mime}));}
export async function signedUpload(key:string,mime:string,size:number){storage();const client=new S3Client({endpoint:process.env.S3_PUBLIC_ENDPOINT||process.env.S3_ENDPOINT,region:process.env.S3_REGION||'us-east-1',forcePathStyle:true,requestChecksumCalculation:'WHEN_REQUIRED',credentials:{accessKeyId:process.env.S3_ACCESS_KEY!,secretAccessKey:process.env.S3_SECRET_KEY!}});return getSignedUrl(client,new PutObjectCommand({Bucket:process.env.S3_BUCKET,Key:key,ContentType:mime,ContentLength:size}),{expiresIn:300,signableHeaders:new Set(['content-type','content-length'])});}

export async function object(key:string){return storage().send(new GetObjectCommand({Bucket:process.env.S3_BUCKET,Key:key}));}
export async function setupBucket(){try{await storage().send(new CreateBucketCommand({Bucket:process.env.S3_BUCKET}));}catch(e){if(!String(e).includes('BucketAlready'))throw e;}}
