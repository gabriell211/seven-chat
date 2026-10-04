import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, users } from "@/db/schema";
import { getRequestSession } from "@/lib/auth";
export async function GET(req:Request){
  const session=await getRequestSession(req);
  if(!session)return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Sessão inválida."}},{status:401});
  const [user]=await db.select({
    id:users.id,email:users.email,username:users.username,birthDate:users.birthDate,
    displayName:profiles.displayName,bio:profiles.bio,avatarUrl:profiles.avatarUrl,
    isVip:profiles.isVip,region:profiles.region,languages:profiles.languages,interests:profiles.interests
  }).from(users).innerJoin(profiles,eq(users.id,profiles.userId)).where(eq(users.id,session.userId)).limit(1);
  if(!user)return NextResponse.json({error:{code:"NOT_FOUND",message:"Usuário não encontrado."}},{status:404});
  const now=new Date();let age=now.getUTCFullYear()-user.birthDate.getUTCFullYear();
  const b=new Date(Date.UTC(now.getUTCFullYear(),user.birthDate.getUTCMonth(),user.birthDate.getUTCDate()));if(now<b)age--;
  return NextResponse.json({data:{...user,age}});
}