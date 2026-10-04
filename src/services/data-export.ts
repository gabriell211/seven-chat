import { pool } from "@/lib/db";
import { putPrivateObject } from "@/lib/storage";

export async function runNextDataExport():Promise<{processed:boolean;requestId?:string}>{
  const client=await pool.connect();
  let request:{id:string;user_id:string}|undefined;
  try{
    await client.query("begin");
    const claimed=await client.query<{id:string;user_id:string}>(
      `update data_export_requests set status='processing'
       where id=(select id from data_export_requests where status='queued' order by requested_at asc for update skip locked limit 1)
       returning id,user_id`
    );
    request=claimed.rows[0];
    await client.query("commit");
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
  if(!request)return {processed:false};

  try{
    const userId=request.user_id;
    const [
      account,profile,follows,posts,comments,reels,stories,messages,gifts,payments,ledger,consents,sessions
    ]=await Promise.all([
      pool.query("select id,email,username,birth_date,status,email_verified_at,created_at,updated_at from users where id=$1",[userId]),
      pool.query("select display_name,bio,avatar_url,banner_url,gender,region,languages,interests,is_private,is_vip,updated_at from profiles where user_id=$1",[userId]),
      pool.query("select follower_id,following_id,created_at from follows where follower_id=$1 or following_id=$1 order by created_at",[userId]),
      pool.query("select id,body,media,visibility,comments_enabled,created_at,updated_at from posts where author_id=$1 order by created_at",[userId]),
      pool.query("select id,post_id,parent_id,body,created_at from comments where author_id=$1 order by created_at",[userId]),
      pool.query("select id,caption,media_asset_id,thumbnail_asset_id,duration_ms,visibility,view_count,created_at from reels where author_id=$1 order by created_at",[userId]),
      pool.query("select id,type,text_content,media_asset_id,expires_at,created_at from stories where author_id=$1 order by created_at",[userId]),
      pool.query("select id,conversation_id,type,body,media_asset_id,view_once,opened_at,created_at,edited_at,deleted_at from messages where sender_id=$1 order by created_at",[userId]),
      pool.query("select id,sender_id,receiver_id,gift_id,quantity,created_at from gift_transactions where sender_id=$1 or receiver_id=$1 order by created_at",[userId]),
      pool.query("select id,provider,product_type,sku,external_transaction_id,status,currency,amount_minor,created_at,paid_at,refunded_at from payments where user_id=$1 order by created_at",[userId]),
      pool.query(`select la.account_key,lt.type,lt.reference_type,lt.reference_id,lt.status,lt.created_at,lt.posted_at,le.direction,le.amount
        from ledger_accounts la join ledger_entries le on le.account_id=la.id join ledger_transactions lt on lt.id=le.transaction_id
        where la.owner_id=$1 order by le.created_at`,[userId]),
      pool.query("select document,version,accepted_at from user_consents where user_id=$1 order by accepted_at",[userId]),
      pool.query("select id,device_name,platform,last_seen_at,expires_at,created_at,revoked_at from user_sessions where user_id=$1 order by created_at",[userId])
    ]);
    const payload={
      generatedAt:new Date().toISOString(),
      account:account.rows[0]??null,
      profile:profile.rows[0]??null,
      follows:follows.rows,posts:posts.rows,comments:comments.rows,reels:reels.rows,stories:stories.rows,
      messagesSent:messages.rows,gifts:gifts.rows,payments:payments.rows,ledger:ledger.rows,consents:consents.rows,sessions:sessions.rows
    };
    const objectKey=`exports/${userId}/${request.id}.json`;
    await putPrivateObject({key:objectKey,body:JSON.stringify(payload,null,2),contentType:"application/json"});
    const expiresAt=new Date(Date.now()+7*24*60*60*1000);
    await pool.query("update data_export_requests set status='ready',object_key=$2,expires_at=$3,completed_at=now(),last_error=null where id=$1",[request.id,objectKey,expiresAt]);
    return {processed:true,requestId:request.id};
  }catch(error){
    await pool.query("update data_export_requests set status='failed',last_error=$2 where id=$1",[request.id,error instanceof Error?error.message.slice(0,1500):"export failed"]);
    throw error;
  }
}