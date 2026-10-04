import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversationMembers, conversations, users } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { areUsersBlocked } from "@/services/social-guard";
import { hasVipAtLeast } from "@/services/entitlements";
const schema=z.object({
  type:z.enum(["direct","group"]),
  memberIds:z.array(z.uuid()).min(1).max(99),
  title:z.string().trim().min(2).max(80).optional(),
  isPrivate:z.boolean().default(false)
});
export async function POST(req:Request){
  try{
    const session=await requireSession(),parsed=schema.safeParse(await req.json());
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Conversa inválida."}},{status:422});
    const memberIds=[...new Set(parsed.data.memberIds.filter(id=>id!==session.userId))];
    if(parsed.data.type==="direct"&&memberIds.length!==1)return NextResponse.json({error:{code:"DIRECT_MEMBER_COUNT",message:"Conversa direta exige exatamente outra pessoa."}},{status:422});
    if(parsed.data.type==="group"&&memberIds.length<1)return NextResponse.json({error:{code:"GROUP_MEMBER_COUNT",message:"Grupo precisa de participantes."}},{status:422});
    if(parsed.data.isPrivate&&parsed.data.type==="group"&&!(await hasVipAtLeast(session.userId,"vip+"))){
      return NextResponse.json({error:{code:"VIP_REQUIRED",message:"Grupos privados exigem VIP+."}},{status:403});
    }
    const existingUsers=await db.select({id:users.id}).from(users).where(inArray(users.id,memberIds));
    if(existingUsers.length!==memberIds.length)return NextResponse.json({error:{code:"USER_NOT_FOUND",message:"Um ou mais usuários não existem."}},{status:404});
    for(const id of memberIds)if(await areUsersBlocked(session.userId,id))return NextResponse.json({error:{code:"BLOCKED",message:"Não é possível iniciar contato com um usuário bloqueado."}},{status:403});
    const [conversation]=await db.transaction(async tx=>{
      const [c]=await tx.insert(conversations).values({type:parsed.data.type,title:parsed.data.title,ownerId:session.userId,isPrivate:parsed.data.isPrivate}).returning({id:conversations.id,type:conversations.type});
      await tx.insert(conversationMembers).values([
        {conversationId:c.id,userId:session.userId,role:"owner"},
        ...memberIds.map(userId=>({conversationId:c.id,userId,role:"member"}))
      ]);
      return [c];
    });
    return NextResponse.json({data:conversation},{status:201});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}