import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db, pool } from "@/lib/db";
import { conversationMembers, conversations } from "@/db/schema";
import { requireRequestSession } from "@/lib/auth";
import { areUsersBlocked } from "@/services/social-guard";
import { hasVipAtLeast } from "@/services/entitlements";

const schema=z.object({
  type:z.enum(["direct","group"]),
  memberIds:z.array(z.uuid()).min(1).max(99),
  title:z.string().trim().min(2).max(80).optional(),
  isPrivate:z.boolean().default(false)
});

export async function GET(req:Request){
  try{
    const session=await requireRequestSession(req);
    const data=await db.select({id:conversations.id,type:conversations.type,title:conversations.title,isPrivate:conversations.isPrivate,createdAt:conversations.createdAt,role:conversationMembers.role})
      .from(conversationMembers).innerJoin(conversations,eq(conversationMembers.conversationId,conversations.id))
      .where(eq(conversationMembers.userId,session.userId)).orderBy(desc(conversations.createdAt)).limit(100);
    return NextResponse.json({data});
  }catch{return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});}
}

export async function POST(req:Request){
  try{
    const session=await requireRequestSession(req),parsed=schema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Conversa inválida."}},{status:422});
    const others=[...new Set(parsed.data.memberIds.filter(v=>v!==session.userId))];
    if(parsed.data.type==="direct"&&others.length!==1)return NextResponse.json({error:{code:"DIRECT_MEMBER_COUNT",message:"Conversa direta exige exatamente outra pessoa."}},{status:422});
    if(parsed.data.isPrivate&&parsed.data.type==="group"&&!(await hasVipAtLeast(session.userId,"vip+")))return NextResponse.json({error:{code:"VIP_REQUIRED",message:"Grupo privado exige VIP+."}},{status:403});
    for(const id of others)if(await areUsersBlocked(session.userId,id))return NextResponse.json({error:{code:"BLOCKED",message:"Contato indisponível."}},{status:403});

    if(parsed.data.type==="direct"){
      const a=[session.userId,others[0]].sort();
      const client=await pool.connect();
      try{
        await client.query("begin isolation level serializable");
        await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",["direct:"+a.join(":")]);
        const existing=await client.query<{id:string}>(`
          select c.id from conversations c
          where c.type='direct'
            and exists(select 1 from conversation_members cm where cm.conversation_id=c.id and cm.user_id=$1)
            and exists(select 1 from conversation_members cm where cm.conversation_id=c.id and cm.user_id=$2)
            and (select count(*) from conversation_members cm where cm.conversation_id=c.id)=2
          limit 1`,[a[0],a[1]]);
        if(existing.rowCount){await client.query("commit");return NextResponse.json({data:{id:existing.rows[0].id,type:"direct",existing:true}});}
        const id=randomUUID();
        await client.query("insert into conversations(id,type,owner_id,is_private) values($1,'direct',$2,false)",[id,session.userId]);
        await client.query("insert into conversation_members(conversation_id,user_id,role) values($1,$2,'owner'),($1,$3,'member')",[id,session.userId,others[0]]);
        await client.query("commit");
        return NextResponse.json({data:{id,type:"direct",existing:false}},{status:201});
      }catch(error){await client.query("rollback");throw error;}finally{client.release();}
    }

    const id=randomUUID();
    await db.transaction(async tx=>{
      await tx.insert(conversations).values({id,type:"group",title:parsed.data.title??"Grupo",ownerId:session.userId,isPrivate:parsed.data.isPrivate});
      await tx.insert(conversationMembers).values([
        {conversationId:id,userId:session.userId,role:"owner"},
        ...others.map(userId=>({conversationId:id,userId,role:"member"}))
      ]);
    });
    return NextResponse.json({data:{id,type:"group"}},{status:201});
  }catch{return NextResponse.json({error:{code:"CREATE_CONVERSATION_FAILED",message:"Não foi possível criar a conversa."}},{status:500});}
}