import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, userSessions } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { consumeChallenge } from "@/services/auth-challenges";
const schema=z.object({token:z.string().min(20).max(200),password:z.string().min(10).max(128)});
export async function POST(req:Request){
  const parsed=schema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Dados inválidos."}},{status:422});
  const challenge=await consumeChallenge(parsed.data.token,"reset_password");
  if(!challenge)return NextResponse.json({error:{code:"TOKEN_INVALID_OR_EXPIRED",message:"Link inválido ou expirado."}},{status:410});
  await db.transaction(async tx=>{
    await tx.update(users).set({passwordHash:hashPassword(parsed.data.password),emailVerifiedAt:new Date(),status:"active",updatedAt:new Date()}).where(eq(users.id,challenge.userId));
    await tx.update(userSessions).set({revokedAt:new Date()}).where(eq(userSessions.userId,challenge.userId));
  });
  return NextResponse.json({data:{changed:true}});
}