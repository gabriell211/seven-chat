import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { profiles, userConsents, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { isAllowedRegistrationEmail } from "@/lib/email-policy";
import { LEGAL_VERSION, PRIVACY_DOCUMENT, TERMS_DOCUMENT } from "@/lib/legal";
import { enforceRateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validation";
import { issueEmailVerification } from "@/services/auth-challenges";

const schema=registerSchema.and(z.object({termsAccepted:z.literal(true)}));

export async function POST(req:Request){
  const limited=await enforceRateLimit(req,"auth"); if(limited)return limited;
  const parsed=schema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Cadastro inválido ou termos não aceitos."}},{status:422});
  const v=parsed.data;
  if(!isAllowedRegistrationEmail(v.email))return NextResponse.json({error:{code:"DISPOSABLE_EMAIL",message:"Use um e-mail permanente."}},{status:422});
  const exists=await db.select({id:users.id}).from(users).where(or(eq(users.email,v.email),eq(users.username,v.username))).limit(1);
  if(exists.length)return NextResponse.json({error:{code:"ACCOUNT_EXISTS",message:"E-mail ou usuário já cadastrado."}},{status:409});
  try{
    const user=await db.transaction(async tx=>{
      const [created]=await tx.insert(users).values({
        email:v.email,username:v.username,passwordHash:hashPassword(v.password),birthDate:v.birthDate,status:"pending_verification"
      }).returning({id:users.id,email:users.email,username:users.username});
      await tx.insert(profiles).values({userId:created.id,displayName:v.displayName});
      await tx.insert(userConsents).values([
        {userId:created.id,document:TERMS_DOCUMENT,version:LEGAL_VERSION},
        {userId:created.id,document:PRIVACY_DOCUMENT,version:LEGAL_VERSION}
      ]);
      return created;
    });
    try{await issueEmailVerification(user);}catch(error){
      if(process.env.NODE_ENV!=="production")console.error("verification email failed",error);
    }
    return NextResponse.json({data:{userId:user.id,pendingVerification:true,email:user.email}},{status:201});
  }catch(error){
    if((error as {code?:string}).code==="23505")return NextResponse.json({error:{code:"ACCOUNT_EXISTS",message:"E-mail ou usuário já cadastrado."}},{status:409});
    return NextResponse.json({error:{code:"REGISTER_FAILED",message:"Não foi possível criar a conta."}},{status:500});
  }
}