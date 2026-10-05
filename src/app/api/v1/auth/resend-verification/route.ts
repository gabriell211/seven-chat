import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensureUsersUsernameColumn } from "@/lib/schema-compat";
import { issueEmailVerification } from "@/services/auth-challenges";

const schema=z.object({email:z.email().max(254).transform(v=>v.trim().toLowerCase())});

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
    const [user]=await db.select({
      id:users.id,
      email:users.email,
      username:users.username,
      emailVerifiedAt:users.emailVerifiedAt
    }).from(users).where(eq(users.email,parsed.data.email)).limit(1);

    if(user&&!user.emailVerifiedAt){
      try{
        await issueEmailVerification(user);
      }catch(error){
        if(process.env.NODE_ENV!=="production")console.error("verification email failed",error);
      }
    }
  }catch(error){
    console.error("verification resend failed",error);
  }

  return NextResponse.json({data:{accepted:true}});
}
