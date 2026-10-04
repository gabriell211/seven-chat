import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { liveSessions } from "@/db/schema";
import { requireSession } from "@/lib/auth";
const createSchema=z.object({title:z.string().trim().min(3).max(120),category:z.string().trim().max(50).optional()});
export async function GET(){
  const data=await db.select().from(liveSessions).where(eq(liveSessions.status,"live")).orderBy(desc(liveSessions.startedAt)).limit(50);
  return NextResponse.json({data});
}
export async function POST(req:Request){
  try{
    const session=await requireSession(); const parsed=createSchema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Live inválida."}},{status:422});
    const id=randomUUID(),rtcRoomName="live-"+id;
    await db.insert(liveSessions).values({id,hostId:session.userId,title:parsed.data.title,category:parsed.data.category,rtcRoomName,status:"created"});
    return NextResponse.json({data:{id,rtcRoomName,status:"created"}},{status:201});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}