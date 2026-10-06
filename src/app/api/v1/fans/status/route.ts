import { NextResponse } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireRequestSession } from "@/lib/auth";

const schema=z.uuid();

export async function GET(req:Request){
  try{
    const session=await requireRequestSession(req);
    const url=new URL(req.url);
    const creator=schema.safeParse(url.searchParams.get("creatorUserId"));
    if(!creator.success)return NextResponse.json({error:{code:"VALIDATION_ERROR",message:"Criador inválido."}},{status:422});

    const result=await pool.query<{
      id:string;tier:string;starts_at:Date;ends_at:Date;
    }>(
      `select id,status as tier,starts_at,ends_at
         from fan_statuses
        where fan_user_id=$1 and creator_user_id=$2
          and status='active' and ends_at>now()
        order by ends_at desc
        limit 1`,
      [session.userId,creator.data]
    );
    const row=result.rows[0];
    return NextResponse.json({data:row?{
      active:true,id:row.id,tier:"mega_fan",startsAt:row.starts_at,endsAt:row.ends_at
    }:{active:false}});
  }catch{
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}
