import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function config(){
  const endpoint=process.env.S3_ENDPOINT,accessKeyId=process.env.S3_ACCESS_KEY_ID,secretAccessKey=process.env.S3_SECRET_ACCESS_KEY,bucket=process.env.S3_PRIVATE_BUCKET;
  if(!endpoint||!accessKeyId||!secretAccessKey||!bucket)throw new Error("STORAGE_NOT_CONFIGURED");
  return {endpoint,accessKeyId,secretAccessKey,bucket,region:process.env.S3_REGION??"auto"};
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
