import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { userSessions } from "@/db/schema";
import { getRequestSession, revokeAllDeviceSessions, revokeDeviceSession } from "@/lib/auth";
export async function GET(req:Request){
  const session=await getRequestSession(req);
  if(!session)return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Sessão inválida."}},{status:401});
  const data=await db.select({
    id:userSessions.id,deviceName:userSessions.deviceName,platform:userSessions.platform,
    lastSeenAt:userSessions.lastSeenAt,createdAt:userSessions.createdAt,expiresAt:userSessions.expiresAt
  }).from(userSessions).where(and(eq(userSessions.userId,session.userId),isNull(userSessions.revokedAt)))
    .orderBy(desc(userSessions.lastSeenAt)).limit(50);
  return NextResponse.json({data});
}
export async function DELETE(req:Request){
  const session=await getRequestSession(req);
  if(!session)return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Sessão inválida."}},{status:401});
  const body=await req.json().catch(()=>({})) as {sessionId?:string;all?:boolean};
  if(body.all){await revokeAllDeviceSessions(session.userId);return NextResponse.json({data:{revoked:"all"}});}
  if(!body.sessionId)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"sessionId obrigatório."}},{status:422});
  const revoked=await revokeDeviceSession(session.userId,body.sessionId);
  return NextResponse.json({data:{revoked}});
}