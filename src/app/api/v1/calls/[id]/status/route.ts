import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { calls, conversationMembers } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";

const schema=z.object({status:z.enum(["accepted","connected","reconnecting","ended","missed","rejected","failed"])});
const allowed:Record<string,readonly string[]>={
  ringing:["accepted","rejected","missed","failed","ended"],
  accepted:["connected","ended","failed"],
  connected:["reconnecting","ended","failed"],
  reconnecting:["connected","ended","failed"]
};
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params,parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Estado inválido."}},{status:422});
    const [call]=await db.select({conversationId:calls.conversationId,callerId:calls.callerId,status:calls.status}).from(calls).where(eq(calls.id,id)).limit(1);
    if(!call?.conversationId)return NextResponse.json({error:{code:"NOT_FOUND",message:"Chamada não encontrada."}},{status:404});
    const [member]=await db.select({role:conversationMembers.role}).from(conversationMembers)
      .where(and(eq(conversationMembers.conversationId,call.conversationId),eq(conversationMembers.userId,session.userId))).limit(1);
    if(!member)return NextResponse.json({error:{code:"FORBIDDEN",message:"Sem acesso à chamada."}},{status:403});
    if(!allowed[call.status]?.includes(parsed.data.status))return NextResponse.json({error:{code:"INVALID_CALL_TRANSITION",message:"Transição de chamada inválida."}},{status:409});
    if(["accepted","rejected"].includes(parsed.data.status)&&session.userId===call.callerId)return NextResponse.json({error:{code:"CALLER_CANNOT_RESPOND",message:"O chamador não pode aceitar ou recusar a própria chamada."}},{status:403});
    const now=new Date();
    const [updated]=await db.update(calls).set({
      status:parsed.data.status,
      startedAt:["accepted","connected"].includes(parsed.data.status)?now:undefined,
      endedAt:["ended","missed","rejected","failed"].includes(parsed.data.status)?now:undefined
    }).where(and(eq(calls.id,id),eq(calls.status,call.status))).returning({id:calls.id,status:calls.status,startedAt:calls.startedAt,endedAt:calls.endedAt});
    if(!updated)return NextResponse.json({error:{code:"CALL_STATE_CHANGED",message:"Estado mudou; atualize e tente novamente."}},{status:409});
    return NextResponse.json({data:updated});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}