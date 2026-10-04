import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveSessions, posts, profiles, rooms, users } from "@/db/schema";
import { getRequestSession } from "@/lib/auth";

export async function GET(req:Request){
  const session=await getRequestSession(req);
  const url=new URL(req.url),q=(url.searchParams.get("q")??"").trim().slice(0,80);
  if(q.length<2)return NextResponse.json({data:{users:[],posts:[],lives:[],rooms:[]}});
  const pattern="%"+q.replace(/[%_]/g,"")+"%";
  const [people,postRows,liveRows,roomRows]=await Promise.all([
    db.select({id:users.id,username:users.username,displayName:profiles.displayName,avatarUrl:profiles.avatarUrl,bio:profiles.bio,isVip:profiles.isVip})
      .from(users).innerJoin(profiles,eq(users.id,profiles.userId))
      .where(and(eq(users.status,"active"),or(ilike(users.username,pattern),ilike(profiles.displayName,pattern)))).limit(20),
    db.select({id:posts.id,body:posts.body,createdAt:posts.createdAt,authorId:users.id,username:users.username})
      .from(posts).innerJoin(users,eq(posts.authorId,users.id))
      .where(and(eq(posts.visibility,"public"),ilike(posts.body,pattern))).orderBy(desc(posts.createdAt)).limit(20),
    db.select({id:liveSessions.id,title:liveSessions.title,category:liveSessions.category,viewerCount:liveSessions.viewerCount})
      .from(liveSessions).where(and(eq(liveSessions.status,"live"),or(ilike(liveSessions.title,pattern),ilike(liveSessions.category,pattern)))).limit(20),
    db.select({id:rooms.id,title:rooms.title,description:rooms.description,vipOnly:rooms.vipOnly})
      .from(rooms).where(and(eq(rooms.status,"active"),eq(rooms.visibility,"public"),or(ilike(rooms.title,pattern),ilike(rooms.description,pattern)))).limit(20)
  ]);
  return NextResponse.json({data:{users:people.filter(v=>v.id!==session?.userId),posts:postRows,lives:liveRows,rooms:roomRows}});
}