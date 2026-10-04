import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { authChallenges, users } from "@/db/schema";
import { sendTransactionalEmail } from "@/lib/email";

function hash(token:string){return createHash("sha256").update(token).digest("hex");}
function token(){return randomBytes(32).toString("base64url");}
function appUrl(){return process.env.NEXT_PUBLIC_APP_URL??"http://localhost:3000";}

export async function issueEmailVerification(user:{id:string;email:string;username:string}){
  const raw=token();
  await db.transaction(async tx=>{
    await tx.delete(authChallenges).where(and(eq(authChallenges.userId,user.id),eq(authChallenges.purpose,"verify_email"),isNull(authChallenges.consumedAt)));
    await tx.insert(authChallenges).values({userId:user.id,purpose:"verify_email",tokenHash:hash(raw),expiresAt:new Date(Date.now()+24*60*60*1000)});
  });
  await sendTransactionalEmail({
    to:user.email,subject:"Verifique seu e-mail no Seven Chat",
    text:`Olá @${user.username}. Confirme seu e-mail no Seven Chat: ${appUrl()}/verify-email?token=${encodeURIComponent(raw)}\n\nEste link expira em 24 horas.`
  });
}

export async function requestPasswordReset(user:{id:string;email:string;username:string}){
  const raw=token();
  await db.transaction(async tx=>{
    await tx.delete(authChallenges).where(and(eq(authChallenges.userId,user.id),eq(authChallenges.purpose,"reset_password"),isNull(authChallenges.consumedAt)));
    await tx.insert(authChallenges).values({userId:user.id,purpose:"reset_password",tokenHash:hash(raw),expiresAt:new Date(Date.now()+60*60*1000)});
  });
  await sendTransactionalEmail({
    to:user.email,subject:"Recuperação de senha do Seven Chat",
    text:`Olá @${user.username}. Para criar uma nova senha, acesse: ${appUrl()}/reset-password?token=${encodeURIComponent(raw)}\n\nEste link expira em 1 hora. Se você não pediu isso, ignore este e-mail.`
  });
}

export async function consumeChallenge(raw:string,purpose:"verify_email"|"reset_password"){
  return db.transaction(async tx=>{
    const tokenHash=hash(raw);
    const [row]=await tx.select({id:authChallenges.id,userId:authChallenges.userId,email:users.email,username:users.username})
      .from(authChallenges).innerJoin(users,eq(authChallenges.userId,users.id))
      .where(and(eq(authChallenges.tokenHash,tokenHash),eq(authChallenges.purpose,purpose),isNull(authChallenges.consumedAt),gt(authChallenges.expiresAt,new Date())))
      .limit(1);
    if(!row)return null;
    const consumed=await tx.update(authChallenges).set({consumedAt:new Date()})
      .where(and(eq(authChallenges.id,row.id),isNull(authChallenges.consumedAt))).returning({id:authChallenges.id});
    return consumed.length?row:null;
  });
}