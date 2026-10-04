import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { roomMembers, rooms } from "@/db/schema";
import { requireSession } from "@/lib/auth";
const createSchema=z.object({title:z.string().trim().min(3).max(100),description:z.string().trim().max(500).default(""),visibility:z.enum(["public","private","invite"]).default("public"),vipOnly:z.boolean().default(false)});
export async function GET(){
  const data=await db.select({id:rooms.id,title:rooms.title,description:rooms.description,vipOnly:rooms.vipOnly,createdAt:rooms.createdAt}).from(rooms).where(eq(rooms.status,"active")).orderBy(desc(rooms.createdAt)).limit(50);
  return NextResponse.json({data});
}
export async function POST(req:Request){
  try{
    const session=await requireSession(); const parsed=createSchema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Sala inválida."}},{status:422});
    const id=randomUUID(),rtcRoomName="room-"+id;
    await db.transaction(async tx=>{
      await tx.insert(rooms).values({id,hostId:session.userId,rtcRoomName,...parsed.data});
      await tx.insert(roomMembers).values({roomId:id,userId:session.userId,role:"host"});
    });
    return NextResponse.json({data:{id,rtcRoomName}},{status:201});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}