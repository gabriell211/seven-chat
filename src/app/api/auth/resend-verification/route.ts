import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { issueEmailVerification } from "@/services/auth-challenges";
export async function POST(req:Request){
  const form=await req.formData(),email=String(form.get("email")??"").trim().toLowerCase();
  const [user]=await db.select({id:users.id,email:users.email,username:users.username}).from(users)
    .where(and(eq(users.email,email),eq(users.status,"pending_verification"))).limit(1);
  if(user){try{await issueEmailVerification(user);}catch{}}
  return NextResponse.redirect(new URL("/verify-email?pending=1&email="+encodeURIComponent(email),req.url),303);
}