import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { profiles, roomMembers, rooms, users } from "@/db/schema";
import { hashPassword, requireRequestSession } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { hasVipAtLeast } from "@/services/entitlements";

const schema=z.object({
  title:z.string().trim().min(3).max(100),
  description:z.string().trim().max(500).default(""),
  visibility:z.enum(["public","password","invite"]).default("public"),
  password:z.string().min(6).max(128).optional(),
  vipOnly:z.boolean().default(false)
}).superRefine((v,ctx)=>{
  if(v.visibility==="password"&&!v.password)ctx.addIssue({code:"custom",path:["password"],message:"Senha obrigatória."});
});

export async function GET(){
  const data=await db.select({
    id:rooms.id,title:rooms.title,description:rooms.description,visibility:rooms.visibility,
    vipOnly:rooms.vipOnly,stageLimit:rooms.stageLimit,createdAt:rooms.createdAt,
    hostId:users.id,hostUsername:users.username,hostDisplayName:profiles.displayName
  }).from(rooms)
    .innerJoin(users,eq(rooms.hostId,users.id))
    .innerJoin(profiles,eq(users.id,profiles.userId))
    .where(eq(rooms.status,"active")).orderBy(desc(rooms.createdAt)).limit(50);
  return NextResponse.json({data});
}
export async function POST(req:Request){
  try{
    const session=await requireRequestSession(req);
    const limited=await enforceRateLimit(req,"write",session.userId);if(limited)return limited;
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Sala inválida."}},{status:422});
    if(parsed.data.vipOnly&&!(await hasVipAtLeast(session.userId,"vip"))){
      return NextResponse.json({error:{code:"VIP_REQUIRED",message:"Sala exclusiva VIP exige plano ativo."}},{status:403});
    }
    const id=randomUUID(),rtcRoomName="room-"+id;
    await db.transaction(async tx=>{
      await tx.insert(rooms).values({
        id,hostId:session.userId,title:parsed.data.title,description:parsed.data.description,
        visibility:parsed.data.visibility,passwordHash:parsed.data.password?hashPassword(parsed.data.password):null,
        vipOnly:parsed.data.vipOnly,rtcRoomName,status:"active"
      });
      await tx.insert(roomMembers).values({roomId:id,userId:session.userId,role:"host"});
    });
    return NextResponse.json({data:{id,status:"active"}},{status:201});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}