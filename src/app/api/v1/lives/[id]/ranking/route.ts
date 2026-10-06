import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRequestSession } from "@/lib/auth";

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    await requireRequestSession(req);
    const {id}=await params;
    const live=await pool.query("select 1 from live_sessions where id=$1 limit 1",[id]);
    if(!live.rowCount)return NextResponse.json({error:{code:"NOT_FOUND",message:"LIVE não encontrada."}},{status:404});

    const result=await pool.query<{
      user_id:string;username:string;display_name:string;
      gift_quantity:string;diamonds:string;transactions:string;
    }>(
      `select
         u.id as user_id,u.username,p.display_name,
         coalesce(sum(gt.quantity),0)::text as gift_quantity,
         coalesce(sum(g.price_diamonds*gt.quantity),0)::text as diamonds,
         count(gt.id)::text as transactions
       from gift_transactions gt
       join gifts g on g.id=gt.gift_id
       join users u on u.id=gt.sender_id
       join profiles p on p.user_id=u.id
       where gt.context_type='live' and gt.context_id=$1
       group by u.id,u.username,p.display_name
       order by sum(g.price_diamonds*gt.quantity) desc, sum(gt.quantity) desc
       limit 20`,
      [id]
    );

    return NextResponse.json({data:result.rows.map((row,index)=>({
      position:index+1,userId:row.user_id,username:row.username,displayName:row.display_name,
      giftQuantity:Number(row.gift_quantity),diamonds:Number(row.diamonds),transactions:Number(row.transactions)
    }))});
  }catch{
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}
