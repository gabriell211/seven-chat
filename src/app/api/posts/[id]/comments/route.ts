import { NextResponse } from "next/server";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { comments, notifications, posts, profiles, users } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { publishRealtimeBestEffort } from "@/lib/realtime";
const schema=z.object({body:z.string().trim().min(1).max(2000),parentId:z.uuid().optional()});
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const data=await db.select({id:comments.id,body:comments.body,parentId:comments.parentId,createdAt:comments.createdAt,username:users.username,displayName:profiles.displayName})
    .from(comments).innerJoin(users,eq(comments.authorId,users.id)).innerJoin(profiles,eq(comments.authorId,profiles.userId))
    .where(eq(comments.postId,id)).orderBy(asc(comments.createdAt)).limit(200);
  return NextResponse.json({data});
}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireSession(),{id}=await params,parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Comentário inválido."}},{status:422});
    const [post]=await db.select({authorId:posts.authorId,commentsEnabled:posts.commentsEnabled}).from(posts).where(eq(posts.id,id)).limit(1);
    if(!post||!post.commentsEnabled)return NextResponse.json({error:{code:"COMMENTS_DISABLED",message:"Comentários indisponíveis."}},{status:403});
    const [comment]=await db.insert(comments).values({postId:id,authorId:session.userId,body:parsed.data.body,parentId:parsed.data.parentId}).returning({id:comments.id});
    if(post.authorId!==session.userId){
      await db.insert(notifications).values({userId:post.authorId,actorId:session.userId,type:"comment",entityType:"post",entityId:id});
      await publishRealtimeBestEffort({channel:"user:"+post.authorId,event:"notification.created",data:{type:"comment",actorId:session.userId,postId:id,commentId:comment.id}});
    }
    return NextResponse.json({data:comment},{status:201});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}