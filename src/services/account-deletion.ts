import { randomUUID } from "node:crypto";
import { pool } from "@/lib/db";
import { deletePrivateObject } from "@/lib/storage";

export async function runNextAccountDeletion():Promise<{processed:boolean;requestId?:string}>{
  const client=await pool.connect();
  let request:{id:string;user_id:string}|undefined;
  try{
    await client.query("begin isolation level serializable");
    const claimed=await client.query<{id:string;user_id:string}>(
      `update account_deletion_requests set status='processing'
       where id=(select id from account_deletion_requests where status='scheduled' and scheduled_for<=now() order by scheduled_for asc for update skip locked limit 1)
       returning id,user_id`
    );
    request=claimed.rows[0];
    if(!request){await client.query("commit");return {processed:false};}

    const userId=request.user_id;
    const media=await client.query<{object_key:string}>("select object_key from media_assets where owner_id=$1 and status<>'deleted'",[userId]);
    const exports=await client.query<{object_key:string}>("select object_key from data_export_requests where user_id=$1 and object_key is not null",[userId]);

    await client.query("delete from oauth_accounts where user_id=$1",[userId]);
    await client.query("delete from user_sessions where user_id=$1",[userId]);
    await client.query("delete from auth_challenges where user_id=$1",[userId]);
    await client.query("delete from follows where follower_id=$1 or following_id=$1",[userId]);
    await client.query("delete from blocks where blocker_id=$1 or blocked_id=$1",[userId]);
    await client.query("delete from post_reactions where user_id=$1",[userId]);
    await client.query("delete from saved_posts where user_id=$1",[userId]);
    await client.query("delete from story_views where viewer_id=$1",[userId]);
    await client.query("delete from stories where author_id=$1",[userId]);
    await client.query("delete from reels where author_id=$1",[userId]);
    await client.query("delete from comments where author_id=$1",[userId]);
    await client.query("delete from posts where author_id=$1",[userId]);
    await client.query("delete from notifications where user_id=$1 or actor_id=$1",[userId]);
    await client.query("delete from room_members where user_id=$1",[userId]);
    await client.query("delete from live_guests where user_id=$1",[userId]);
    await client.query("update messages set body=null,media_url=null,media_asset_id=null,deleted_at=coalesce(deleted_at,now()) where sender_id=$1",[userId]);
    await client.query("update media_assets set status='deleted',updated_at=now() where owner_id=$1",[userId]);
    await client.query("delete from data_export_requests where user_id=$1 and id<>$2",[userId,request.id]);
    await client.query("delete from purchase_intents where purchaser_user_id=$1 and status='created'",[userId]);

    const suffix=randomUUID().replaceAll("-","");
    await client.query(`update profiles set display_name='Usuário removido',bio='',avatar_url=null,banner_url=null,gender=null,region=null,languages='{}',interests='{}',is_private=true,updated_at=now() where user_id=$1`,[userId]);
    await client.query(
      "update users set email=$2,username=$3,password_hash=null,status='deleted',email_verified_at=null,updated_at=now() where id=$1",
      [userId,`deleted+${suffix}@deleted.invalid`,`deleted_${suffix.slice(0,20)}`]
    );
    await client.query("update account_deletion_requests set status='completed',completed_at=now() where id=$1",[request.id]);
    await client.query("insert into audit_logs(id,actor_id,action,target_type,target_id,metadata) values($1,null,'account.deleted','user',$2,$3)",[randomUUID(),userId,JSON.stringify({requestId:request.id})]);
    await client.query("commit");

    for(const row of [...media.rows,...exports.rows]){
      try{await deletePrivateObject(row.object_key);}catch{}
    }
    return {processed:true,requestId:request.id};
  }catch(error){
    await client.query("rollback");
    if(request)await pool.query("update account_deletion_requests set status='scheduled' where id=$1",[request.id]);
    throw error;
  }finally{client.release();}
}