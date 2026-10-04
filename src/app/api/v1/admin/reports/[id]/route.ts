import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { moderationActions, reports } from "@/db/schema";
import { requireAdmin } from "@/services/admin";
const schema=z.object({status:z.enum(["open","reviewing","resolved","dismissed"]),action:z.enum(["none","warn","restrict","suspend","ban","remove_content"]),reason:z.string().min(3).max(1000)});
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const admin=await requireAdmin(req,["moderator","admin","super_admin"]);
    const parsed=schema.safeParse(await req.json()),{id}=await params;
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Ação inválida."}},{status:422});
    const [report]=await db.select({id:reports.id,targetType:reports.targetType,targetId:reports.targetId}).from(reports).where(eq(reports.id,id)).limit(1);
    if(!report)return NextResponse.json({error:{code:"NOT_FOUND",message:"Denúncia não encontrada."}},{status:404});
    await db.transaction(async tx=>{
      await tx.update(reports).set({status:parsed.data.status}).where(eq(reports.id,id));
      await tx.insert(moderationActions).values({
        actorId:admin.userId,reportId:id,
        targetUserId:report.targetType==="user"?report.targetId:null,
        action:parsed.data.action,reason:parsed.data.reason,
        metadata:{targetType:report.targetType,targetId:report.targetId}
      });
    });
    return NextResponse.json({data:{updated:true}});
  }catch(error){
    const code=error instanceof Error?error.message:"FORBIDDEN";
    return NextResponse.json({error:{code,message:"Acesso administrativo necessário."}},{status:code==="UNAUTHORIZED"?401:403});
  }
}