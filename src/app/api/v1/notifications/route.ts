import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";

export async function GET(req:Request){
  try{
    const session=await requireRequestSession(req);
    const url=new URL(req.url);
    const unread=url.searchParams.get("unread")==="1";
    const data=await db.select().from(notifications)
      .where(unread?and(eq(notifications.userId,session.userId),isNull(notifications.readAt)):eq(notifications.userId,session.userId))
      .orderBy(desc(notifications.createdAt)).limit(100);
    return NextResponse.json({data});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}

export async function PATCH(req:Request){
  try{
    const session=await requireRequestSession(req);
    const body=await req.json().catch(()=>({})) as {id?:string;all?:boolean};
    if(body.all){
      await db.update(notifications).set({readAt:new Date()}).where(and(eq(notifications.userId,session.userId),isNull(notifications.readAt)));
      return NextResponse.json({data:{updated:"all"}});
    }
    if(!body.id)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"id obrigatório."}},{status:422});
    const rows=await db.update(notifications).set({readAt:new Date()})
      .where(and(eq(notifications.id,body.id),eq(notifications.userId,session.userId))).returning({id:notifications.id});
    if(!rows.length)return NextResponse.json({error:{code:"NOT_FOUND",message:"Notificação não encontrada."}},{status:404});
    return NextResponse.json({data:rows[0]});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}