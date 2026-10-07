import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { liveSessions, profiles, users } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isRtcConfigured } from "@/lib/rtc";

const schema=z.object({title:z.string().trim().min(3).max(120),category:z.string().trim().max(50).optional()});
export async function GET(){
  const data=await db.select({
    id:liveSessions.id,title:liveSessions.title,category:liveSessions.category,status:liveSessions.status,
    viewerCount:liveSessions.viewerCount,peakViewers:liveSessions.peakViewers,startedAt:liveSessions.startedAt,
    hostId:users.id,hostUsername:users.username,hostDisplayName:profiles.displayName
  }).from(liveSessions).innerJoin(users,eq(liveSessions.hostId,users.id)).innerJoin(profiles,eq(users.id,profiles.userId))
    .where(eq(liveSessions.status,"live")).orderBy(desc(liveSessions.startedAt)).limit(50);
  return NextResponse.json({data,rtcConfigured:isRtcConfigured()});
}
export async function POST(req:Request){
  try{
    const session=await requireRequestSession(req);
    const limited=await enforceRateLimit(req,"write",session.userId);if(limited)return limited;
    if(!isRtcConfigured())return NextResponse.json({error:{code:"RTC_NOT_CONFIGURED",message:"Transmissões ao vivo estão indisponíveis até o servidor de vídeo ser configurado."}},{status:503});
    const parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Live inválida."}},{status:422});
    const id=randomUUID();
    await db.insert(liveSessions).values({
      id,hostId:session.userId,title:parsed.data.title,category:parsed.data.category,
      rtcRoomName:"live-"+id,status:"created"
    });
    return NextResponse.json({data:{id,status:"created"}},{status:201});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}