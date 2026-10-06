import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRequestSession } from "@/lib/auth";

type SummaryRow={
  id:string;
  host_id:string;
  title:string;
  category:string|null;
  started_at:Date|null;
  ended_at:Date|null;
  peak_viewers:number;
  viewer_count:number;
  comments:string;
  gift_transactions:string;
  gift_quantity:string;
  diamonds:string;
  new_followers:string;
};

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const session=await requireRequestSession(req);
    const {id}=await params;

    const result=await pool.query<SummaryRow>(
      `select
        l.id,
        l.host_id,
        l.title,
        l.category,
        l.started_at,
        l.ended_at,
        l.peak_viewers,
        l.viewer_count,
        (select count(*)::text
           from live_comments c
          where c.live_id=l.id and c.deleted_at is null) as comments,
        (select count(*)::text
           from gift_transactions gt
          where gt.context_type='live' and gt.context_id=l.id) as gift_transactions,
        (select coalesce(sum(gt.quantity),0)::text
           from gift_transactions gt
          where gt.context_type='live' and gt.context_id=l.id) as gift_quantity,
        (select coalesce(sum(g.price_diamonds*gt.quantity),0)::text
           from gift_transactions gt
           join gifts g on g.id=gt.gift_id
          where gt.context_type='live' and gt.context_id=l.id) as diamonds,
        (select count(*)::text
           from follows f
          where f.following_id=l.host_id
            and l.started_at is not null
            and f.created_at>=l.started_at
            and (l.ended_at is null or f.created_at<=l.ended_at)) as new_followers
       from live_sessions l
       where l.id=$1
       limit 1`,
      [id]
    );

    const live=result.rows[0];
    if(!live)return NextResponse.json({error:{code:"NOT_FOUND",message:"LIVE não encontrada."}},{status:404});
    if(live.host_id!==session.userId)return NextResponse.json({error:{code:"HOST_ONLY",message:"Somente o host pode ver este resumo."}},{status:403});

    const durationSeconds=live.started_at
      ?Math.max(0,Math.round(((live.ended_at??new Date()).getTime()-live.started_at.getTime())/1000))
      :0;

    return NextResponse.json({
      data:{
        id:live.id,
        title:live.title,
        category:live.category,
        startedAt:live.started_at,
        endedAt:live.ended_at,
        durationSeconds,
        peakViewers:live.peak_viewers,
        viewerCount:live.viewer_count,
        comments:Number(live.comments),
        giftTransactions:Number(live.gift_transactions),
        giftQuantity:Number(live.gift_quantity),
        diamonds:Number(live.diamonds),
        newFollowers:Number(live.new_followers)
      }
    });
  }catch{
    return NextResponse.json({error:{code:"UNAUTHORIZED",message:"Faça login."}},{status:401});
  }
}
