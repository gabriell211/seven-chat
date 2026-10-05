import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { requestPasswordReset } from "@/services/auth-challenges";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensureUsersUsernameColumn } from "@/lib/schema-compat";

const schema=z.object({identifier:z.string().min(3).max(254)});

export async function POST(req:Request){
  const rate=await checkRateLimit(req,"auth");
  if(!rate.ok&&rate.status===429){
    return NextResponse.json(
      {error:{code:"RATE_LIMITED",message:"Muitas tentativas. Tente novamente em instantes."}},
      {status:429,headers:{"retry-after":String(rate.retryAfter??60)}}
    );
  }

  const parsed=schema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({data:{accepted:true}});

  try{
    await ensureUsersUsernameColumn();
    const ident=parsed.data.identifier.trim().toLowerCase().replace(/^@/,"");
    const [user]=await db.select({id:users.id,email:users.email,username:users.username}).from(users)
      .where(or(eq(users.email,ident),eq(users.username,ident))).limit(1);

    if(user){
      try{
        await requestPasswordReset(user);
      }catch(error){
        if(process.env.NODE_ENV!=="production")console.error("password reset email failed",error);
      }
    }
  }catch(error){
    console.error("password reset request failed",error);
  }

  return NextResponse.json({data:{accepted:true}});
}
