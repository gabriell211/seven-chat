import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function resolvedConfig(){
  const endpoint=process.env.S3_ENDPOINT??process.env.AWS_ENDPOINT_URL_S3;
  const accessKeyId=process.env.S3_ACCESS_KEY_ID??process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey=process.env.S3_SECRET_ACCESS_KEY??process.env.AWS_SECRET_ACCESS_KEY;
  const bucket=process.env.S3_PRIVATE_BUCKET??process.env.NEON_STORAGE_BUCKET;
  const region=process.env.S3_REGION??process.env.AWS_REGION??"us-east-2";
  return {endpoint,accessKeyId,secretAccessKey,bucket,region};
}

export function isStorageConfigured(){
  const c=resolvedConfig();
  return Boolean(c.endpoint&&c.accessKeyId&&c.secretAccessKey&&c.bucket);
}

function config(){
  const c=resolvedConfig();
  if(!c.endpoint||!c.accessKeyId||!c.secretAccessKey||!c.bucket)throw new Error("STORAGE_NOT_CONFIGURED");
  return {endpoint:c.endpoint,accessKeyId:c.accessKeyId,secretAccessKey:c.secretAccessKey,bucket:c.bucket,region:c.region};
}

function client(){
  const c=config();
  return {bucket:c.bucket,s3:new S3Client({endpoint:c.endpoint,region:c.region,forcePathStyle:true,credentials:{accessKeyId:c.accessKeyId,secretAccessKey:c.secretAccessKey}})};
}

export async function createUploadUrl(input:{key:string;contentType:string;sizeBytes:number}){
  const {bucket,s3}=client();
  const command=new PutObjectCommand({Bucket:bucket,Key:input.key,ContentType:input.contentType,ContentLength:input.sizeBytes});
  return getSignedUrl(s3,command,{expiresIn:300});
}
export async function createDownloadUrl(key:string,expiresIn=60){
  const {bucket,s3}=client();
  return getSignedUrl(s3,new GetObjectCommand({Bucket:bucket,Key:key}),{expiresIn});
}
export async function headPrivateObject(key:string){
  const {bucket,s3}=client();
  return s3.send(new HeadObjectCommand({Bucket:bucket,Key:key}));
}
export async function putPrivateObject(input:{key:string;body:string|Uint8Array;contentType:string}){
  const {bucket,s3}=client();
  await s3.send(new PutObjectCommand({Bucket:bucket,Key:input.key,Body:input.body,ContentType:input.contentType}));
}
export async function deletePrivateObject(key:string){
  const {bucket,s3}=client();
  await s3.send(new DeleteObjectCommand({Bucket:bucket,Key:key}));
}
