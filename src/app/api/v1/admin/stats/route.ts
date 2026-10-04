import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveSessions, reports, users } from "@/db/schema";
import { requireAdmin } from "@/services/admin";
export async function GET(req:Request){
  try{
    await requireAdmin(req);
    const [[userCount],[openReports],[activeLives]]=await Promise.all([
      db.select({value:count()}).from(users).where(eq(users.status,"active")),
      db.select({value:count()}).from(reports).where(eq(reports.status,"open")),
      db.select({value:count()}).from(liveSessions).where(eq(liveSessions.status,"live"))
    ]);
    return NextResponse.json({data:{activeUsers:userCount.value,openReports:openReports.value,activeLives:activeLives.value}});
  }catch(error){
    const code=error instanceof Error?error.message:"FORBIDDEN";
    return NextResponse.json({error:{code,message:code==="UNAUTHORIZED"?"Faça login.":"Acesso administrativo necessário."}},{status:code==="UNAUTHORIZED"?401:403});
  }
}