import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { requestPasswordReset } from "@/services/auth-challenges";
export async function POST(req:Request){
  const form=await req.formData(),ident=String(form.get("identifier")??"").trim().toLowerCase().replace(/^@/,"");
  const [user]=await db.select({id:users.id,email:users.email,username:users.username}).from(users)
    .where(or(eq(users.email,ident),eq(users.username,ident))).limit(1);
  if(user){try{await requestPasswordReset(user);}catch{}}
  return NextResponse.redirect(new URL("/forgot-password?sent=1",req.url),303);
}