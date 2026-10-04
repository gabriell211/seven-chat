import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { createDeviceSession, verifyPassword } from "@/lib/auth";

const schema=z.object({
  identifier:z.string().min(3).max(254),
  password:z.string().min(1).max(128),
  deviceName:z.string().min(1).max(120).default("Seven Chat Mobile"),
  platform:z.enum(["android","ios","web"]).default("android")
});

export async function POST(req:Request){
  const parsed=schema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Dados inválidos."}},{status:422});
  const ident=parsed.data.identifier.trim().toLowerCase().replace(/^@/,"");
  const [user]=await db.select().from(users).where(or(eq(users.email,ident),eq(users.username,ident))).limit(1);
  if(!user?.passwordHash||!verifyPassword(parsed.data.password,user.passwordHash)){
    return NextResponse.json({error:{code:"INVALID_CREDENTIALS",message:"E-mail, usuário ou senha inválidos."}},{status:401});
  }
  if(user.status==="pending_verification")return NextResponse.json({error:{code:"EMAIL_NOT_VERIFIED",message:"Verifique seu e-mail antes de entrar."}},{status:403});
  if(user.status!=="active")return NextResponse.json({error:{code:"ACCOUNT_UNAVAILABLE",message:"Conta indisponível."}},{status:403});
  const session=await createDeviceSession({
    userId:user.id,username:user.username,deviceName:parsed.data.deviceName,
    platform:parsed.data.platform,userAgent:req.headers.get("user-agent")
  });
  return NextResponse.json({data:{user:{id:user.id,username:user.username},...session}});
}