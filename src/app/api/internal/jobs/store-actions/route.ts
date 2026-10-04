import { NextResponse } from "next/server";
import { runNextStoreActionJob } from "@/services/store-actions";

function authorized(req:Request){
  const secret=process.env.CRON_SECRET;
  return Boolean(secret&&req.headers.get("authorization")===`Bearer ${secret}`);
}
export async function POST(req:Request){
  if(!authorized(req))return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Acesso negado."}},{status:401});
  try{return NextResponse.json({data:await runNextStoreActionJob()});}
  catch(error){
    return NextResponse.json({error:{code:"STORE_JOB_FAILED",message:error instanceof Error?error.message:"Falha no job."}},{status:500});
  }
}