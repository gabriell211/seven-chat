import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { stories, storyViews } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    const [story]=await db.select({id:stories.id,authorId:stories.authorId}).from(stories)
      .where(and(eq(stories.id,id),gt(stories.expiresAt,new Date()))).limit(1);
    if(!story)return NextResponse.json({error:{code:"NOT_FOUND",message:"Story expirado ou inexistente."}},{status:404});
    if(story.authorId!==session.userId)await db.insert(storyViews).values({storyId:id,viewerId:session.userId}).onConflictDoNothing();
    return NextResponse.json({data:{viewed:true}});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}