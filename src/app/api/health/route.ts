import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
export async function GET(){
  try{
    await pool.query("select 1");
    return NextResponse.json({ok:true,service:"seven-chat",database:true,now:new Date().toISOString()});
  }catch{
    return NextResponse.json({ok:false,service:"seven-chat",database:false,now:new Date().toISOString()},{status:503});
  }
}