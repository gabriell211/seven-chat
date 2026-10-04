import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { comments, notifications, posts, profiles, users } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
const schema=z.object({body:z.string().trim().min(1).max(2000),parentId:z.uuid().optional()});

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const data=await db.select({id:comments.id,body:comments.body,parentId:comments.parentId,createdAt:comments.createdAt,authorId:users.id,username:users.username,displayName:profiles.displayName,avatarUrl:profiles.avatarUrl})
    .from(comments).innerJoin(users,eq(comments.authorId,users.id)).innerJoin(profiles,eq(comments.authorId,profiles.userId))
    .where(eq(comments.postId,id)).orderBy(asc(comments.createdAt)).limit(200);
  return NextResponse.json({data});
}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req),{id}=await params;
    const limited=await enforceRateLimit(req,"write",session.userId);if(limited)return limited;
    const parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Comentário inválido."}},{status:422});
    const [post]=await db.select({authorId:posts.authorId,commentsEnabled:posts.commentsEnabled}).from(posts).where(eq(posts.id,id)).limit(1);
    if(!post)return NextResponse.json({error:{code:"NOT_FOUND",message:"Post não encontrado."}},{status:404});
    if(!post.commentsEnabled)return NextResponse.json({error:{code:"COMMENTS_DISABLED",message:"Comentários desativados."}},{status:403});
    if(parsed.data.parentId){
      const [parent]=await db.select({id:comments.id}).from(comments).where(eq(comments.id,parsed.data.parentId)).limit(1);
      if(!parent)return NextResponse.json({error:{code:"PARENT_NOT_FOUND",message:"Comentário pai não encontrado."}},{status:404});
    }
    const [comment]=await db.insert(comments).values({postId:id,authorId:session.userId,body:parsed.data.body,parentId:parsed.data.parentId}).returning({id:comments.id,createdAt:comments.createdAt});
    if(post.authorId!==session.userId)await db.insert(notifications).values({userId:post.authorId,actorId:session.userId,type:"comment",entityType:"post",entityId:id});
    return NextResponse.json({data:comment},{status:201});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}