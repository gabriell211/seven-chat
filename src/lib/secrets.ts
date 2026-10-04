import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export function ensureStoreTokenEncryptionConfigured():void{ key(); }

function key():Buffer{
  const raw=process.env.STORE_TOKEN_KEY_BASE64;
  if(!raw)throw new Error("STORE_TOKEN_KEY_MISSING");
  const value=Buffer.from(raw,"base64");
  if(value.length!==32)throw new Error("STORE_TOKEN_KEY_INVALID");
  return value;
}
export function encryptStoreToken(value:string):string{
  const iv=randomBytes(12);
  const cipher=createCipheriv("aes-256-gcm",key(),iv);
  const ciphertext=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  const tag=cipher.getAuthTag();
  return [iv.toString("base64url"),tag.toString("base64url"),ciphertext.toString("base64url")].join(".");
}
export function decryptStoreToken(value:string):string{
  const [ivRaw,tagRaw,ciphertextRaw]=value.split(".");
  if(!ivRaw||!tagRaw||!ciphertextRaw)throw new Error("STORE_TOKEN_INVALID");
  const decipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(ivRaw,"base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw,"base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextRaw,"base64url")),decipher.final()]).toString("utf8");
}