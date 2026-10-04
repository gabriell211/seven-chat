import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { roomMembers, rooms } from "@/db/schema";
import { requireRequestSession, verifyPassword } from "@/lib/auth";
import { areUsersBlocked } from "@/services/social-guard";
import { hasVipAtLeast } from "@/services/entitlements";
import { publishRealtimeBestEffort } from "@/lib/realtime";

const schema=z.object({password:z.string().max(128).optional()});
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    const parsed=schema.safeParse(await req.json().catch(()=>({})));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Entrada inválida."}},{status:422});
    const [room]=await db.select().from(rooms).where(and(eq(rooms.id,id),eq(rooms.status,"active"))).limit(1);
    if(!room)return NextResponse.json({error:{code:"NOT_FOUND",message:"Sala indisponível."}},{status:404});
    if(await areUsersBlocked(session.userId,room.hostId))return NextResponse.json({error:{code:"BLOCKED",message:"Sala indisponível."}},{status:403});
    if(room.vipOnly&&!(await hasVipAtLeast(session.userId,"vip")))return NextResponse.json({error:{code:"VIP_REQUIRED",message:"Esta sala é exclusiva VIP."}},{status:403});

    const [membership]=await db.select({role:roomMembers.role}).from(roomMembers)
      .where(and(eq(roomMembers.roomId,id),eq(roomMembers.userId,session.userId))).limit(1);
    if(room.visibility==="invite"&&!membership)return NextResponse.json({error:{code:"INVITE_REQUIRED",message:"Esta sala exige convite."}},{status:403});
    if((room.visibility==="password"||room.visibility==="private")&&room.passwordHash&&!membership){
      if(!parsed.data.password||!verifyPassword(parsed.data.password,room.passwordHash)){
        return NextResponse.json({error:{code:"ROOM_PASSWORD_INVALID",message:"Senha da sala inválida."}},{status:403});
      }
    }
    if(!membership)await db.insert(roomMembers).values({roomId:id,userId:session.userId,role:"listener"}).onConflictDoNothing();
    await publishRealtimeBestEffort({channel:"room:"+id,event:"room.joined",data:{userId:session.userId}});
    return NextResponse.json({data:{joined:true,role:membership?.role??"listener"}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}