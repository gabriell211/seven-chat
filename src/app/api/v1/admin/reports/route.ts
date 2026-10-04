import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reports, users } from "@/db/schema";
import { requireAdmin } from "@/services/admin";
export async function GET(req:Request){
  try{
    await requireAdmin(req);
    const status=new URL(req.url).searchParams.get("status")??"open";
    const data=await db.select({
      id:reports.id,targetType:reports.targetType,targetId:reports.targetId,reason:reports.reason,
      details:reports.details,status:reports.status,priority:reports.priority,createdAt:reports.createdAt,
      reporterUsername:users.username
    }).from(reports).innerJoin(users,eq(reports.reporterId,users.id))
      .where(eq(reports.status,status)).orderBy(desc(reports.priority),desc(reports.createdAt)).limit(100);
    return NextResponse.json({data});
  }catch(error){
    const code=error instanceof Error?error.message:"FORBIDDEN";
    return NextResponse.json({error:{code,message:"Acesso administrativo necessário."}},{status:code==="UNAUTHORIZED"?401:403});
  }
}