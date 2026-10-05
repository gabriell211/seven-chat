import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { ensureUsersUsernameColumn } from "@/lib/schema-compat";
import { consumeChallenge } from "@/services/auth-challenges";

const schema=z.object({token:z.string().min(20).max(200)});

export async function POST(req:Request){
  const parsed=schema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Token inválido."}},{status:422});

  try{
    await ensureUsersUsernameColumn();
    const challenge=await consumeChallenge(parsed.data.token,"verify_email");
    if(!challenge)return NextResponse.json({error:{code:"TOKEN_INVALID_OR_EXPIRED",message:"Link inválido ou expirado."}},{status:410});

    await db.update(users)
      .set({emailVerifiedAt:new Date(),status:"active",updatedAt:new Date()})
      .where(eq(users.id,challenge.userId));

    return NextResponse.json({data:{verified:true}});
  }catch(error){
    console.error("email verification failed",error);
    return NextResponse.json(
      {error:{code:"VERIFY_FAILED",message:"Não foi possível verificar o e-mail agora. Tente novamente."}},
      {status:500}
    );
  }
}
