import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { accountSecurity, users } from "@/db/schema";
import { createDeviceSession, verifyPassword } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verifyTotp } from "@/lib/totp";

const schema=z.object({
  identifier:z.string().min(3).max(254),
  password:z.string().min(1).max(128),
  deviceName:z.string().min(1).max(120).default("Seven Chat Mobile"),
  platform:z.enum(["android","ios","web"]).default("android"),
  totpCode:z.string().regex(/^\d{6}$/).optional()
});

export async function POST(req:Request){
  const limited=await enforceRateLimit(req,"auth"); if(limited)return limited;
  const parsed=schema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Dados inválidos."}},{status:422});
  const ident=parsed.data.identifier.trim().toLowerCase().replace(/^@/,"");
  const [user]=await db.select().from(users).where(or(eq(users.email,ident),eq(users.username,ident))).limit(1);
  if(!user?.passwordHash||!verifyPassword(parsed.data.password,user.passwordHash)){
    return NextResponse.json({error:{code:"INVALID_CREDENTIALS",message:"E-mail, usuário ou senha inválidos."}},{status:401});
  }
  const [security]=await db.select().from(accountSecurity).where(eq(accountSecurity.userId,user.id)).limit(1);
  if(security?.totpEnabledAt){
    if(!parsed.data.totpCode)return NextResponse.json({error:{code:"TOTP_REQUIRED",message:"Informe o código do autenticador."}},{status:401});
    if(!security.totpSecret||!verifyTotp(security.totpSecret,parsed.data.totpCode))return NextResponse.json({error:{code:"INVALID_TOTP",message:"Código do autenticador inválido."}},{status:401});
  }
  if(user.status==="deactivated")await db.update(users).set({status:"active",updatedAt:new Date()}).where(eq(users.id,user.id));
  if(user.status==="pending_verification")return NextResponse.json({error:{code:"EMAIL_NOT_VERIFIED",message:"Verifique seu e-mail antes de entrar."}},{status:403});
  if(user.status!=="active"&&user.status!=="deactivated")return NextResponse.json({error:{code:"ACCOUNT_UNAVAILABLE",message:"Conta indisponível."}},{status:403});
  const session=await createDeviceSession({
    userId:user.id,username:user.username,deviceName:parsed.data.deviceName,
    platform:parsed.data.platform,userAgent:req.headers.get("user-agent")
  });
  return NextResponse.json({data:{user:{id:user.id,username:user.username},...session}});
}