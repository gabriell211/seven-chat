import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { moderationActions, reports } from "@/db/schema";
import { requireAdmin } from "@/services/admin";
import { executeModeration, ModerationError } from "@/services/moderation";

const schema=z.object({
  status:z.enum(["open","reviewing","resolved","dismissed"]),
  action:z.enum(["none","warn","restrict","suspend","ban","remove_content"]),
  reason:z.string().min(3).max(1000)
});

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const admin=await requireAdmin(req,["moderator","admin","super_admin"]);
    const parsed=schema.safeParse(await req.json()),{id}=await params;
    if(!parsed.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Ação inválida."}},{status:422});

    if(parsed.data.action==="none"){
      await db.update(reports).set({status:parsed.data.status}).where(eqReport(id));
      return NextResponse.json({data:{updated:true,action:"none"}});
    }

    const result=await executeModeration({
      actorId:admin.userId,actorRole:admin.role,reportId:id,action:parsed.data.action,reason:parsed.data.reason
    });
    await db.insert(moderationActions).values({
      actorId:admin.userId,targetUserId:result.targetUserId,reportId:id,
      action:parsed.data.action,reason:parsed.data.reason,
      metadata:{requestedStatus:parsed.data.status}
    });
    return NextResponse.json({data:{updated:true,...result}});
  }catch(error){
    if(error instanceof ModerationError){
      const status=error.code==="REPORT_NOT_FOUND"?404:error.code==="MODERATION_HIERARCHY"||error.code==="MODERATION_ROLE_FORBIDDEN"?403:422;
      return NextResponse.json({error:{code:error.code,message:error.message}},{status});
    }
    const code=error instanceof Error?error.message:"FORBIDDEN";
    return NextResponse.json({error:{code,message:"Acesso administrativo necessário."}},{status:code==="UNAUTHORIZED"?401:403});
  }
}

function eqReport(id:string){
  return {getSQL:()=>({sqlChunks:["id = ",id]})} as never;
}
