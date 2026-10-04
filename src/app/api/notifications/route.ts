import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/db/schema";
import { requireSession } from "@/lib/auth";
export async function GET(req:Request){
  try{
    const session=await requireSession();
    const unread=new URL(req.url).searchParams.get("unread")==="1";
    const where=unread?and(eq(notifications.userId,session.userId),isNull(notifications.readAt)):eq(notifications.userId,session.userId);
    const data=await db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(100);
    return NextResponse.json({data});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}