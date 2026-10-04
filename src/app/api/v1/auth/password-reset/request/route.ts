import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { requestPasswordReset } from "@/services/auth-challenges";
import { enforceRateLimit } from "@/lib/rate-limit";
const schema=z.object({identifier:z.string().min(3).max(254)});
export async function POST(req:Request){
  const limited=await enforceRateLimit(req,"auth"); if(limited)return limited;
  const parsed=schema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({data:{accepted:true}});
  const ident=parsed.data.identifier.trim().toLowerCase().replace(/^@/,"");
  const [user]=await db.select({id:users.id,email:users.email,username:users.username}).from(users)
    .where(or(eq(users.email,ident),eq(users.username,ident))).limit(1);
  if(user){
    try{await requestPasswordReset(user);}catch(error){
      if(process.env.NODE_ENV!=="production")console.error("password reset email failed",error);
    }
  }
  return NextResponse.json({data:{accepted:true}});
}