import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { enforceRateLimit } from "@/lib/rate-limit";
import { issueEmailVerification } from "@/services/auth-challenges";
const schema=z.object({email:z.email().max(254).transform(v=>v.trim().toLowerCase())});
export async function POST(req:Request){
  const limited=await enforceRateLimit(req,"auth"); if(limited)return limited;
  const parsed=schema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({data:{accepted:true}});
  const [user]=await db.select({id:users.id,email:users.email,username:users.username,emailVerifiedAt:users.emailVerifiedAt})
    .from(users).where(eq(users.email,parsed.data.email)).limit(1);
  if(user&&!user.emailVerifiedAt){try{await issueEmailVerification(user);}catch(error){if(process.env.NODE_ENV!=="production")console.error("verification email failed",error);}}
  return NextResponse.json({data:{accepted:true}});
}