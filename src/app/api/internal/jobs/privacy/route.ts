import { NextResponse } from "next/server";
import { runNextAccountDeletion } from "@/services/account-deletion";
import { runNextDataExport } from "@/services/data-export";

function authorized(req:Request){const secret=process.env.CRON_SECRET;return Boolean(secret&&req.headers.get("authorization")===`Bearer ${secret}`);}
export async function POST(req:Request){
  if(!authorized(req))return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Acesso negado."}},{status:401});
  const [exportResult,deletionResult]=await Promise.all([runNextDataExport(),runNextAccountDeletion()]);
  return NextResponse.json({data:{export:exportResult,deletion:deletionResult}});
}