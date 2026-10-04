import { randomUUID } from "node:crypto";
import { pool } from "@/lib/db";
import { ensureSystemDiamondAccount, ensureUserDiamondAccount, getLedgerBalance, postLedgerTransaction } from "@/services/ledger";

export class FanError extends Error{constructor(public readonly code:string,message:string){super(message);}}

export async function buyMegaFan(input:{fanUserId:string;creatorUserId:string;productCode:string;idempotencyKey:string}){
  if(input.fanUserId===input.creatorUserId)throw new FanError("FAN_SELF_PURCHASE","Mega Fã é ligado a outro criador.");
  const effectiveIdempotencyKey=`fan:${input.fanUserId}:${input.idempotencyKey}`;
  const client=await pool.connect();
  try{
    await client.query("begin isolation level serializable");
    const existing=await client.query<{id:string}>("select id from ledger_transactions where idempotency_key=$1",[effectiveIdempotencyKey]);
    if(existing.rowCount){
      const membership=await client.query<{id:string;ends_at:Date}>("select id,ends_at from fan_statuses where ledger_transaction_id=$1 limit 1",[existing.rows[0].id]);
      await client.query("commit");
      return {transactionId:existing.rows[0].id,membershipId:membership.rows[0]?.id??"",endsAt:membership.rows[0]?.ends_at,duplicate:true};
    }
    const product=await client.query<{id:string;duration_days:number;price_diamonds:number;tier:string}>(
      "select id,duration_days,price_diamonds,tier from fan_products where code=$1 and is_active=true for share",
      [input.productCode]
    );
    if(!product.rowCount)throw new FanError("FAN_PRODUCT_NOT_FOUND","Plano Mega Fã indisponível.");
    const creator=await client.query<{id:string}>("select id from users where id=$1 and status='active'",[input.creatorUserId]);
    if(!creator.rowCount)throw new FanError("CREATOR_NOT_FOUND","Criador indisponível.");
    const userAccount=await ensureUserDiamondAccount(client,input.fanUserId);
    const amount=product.rows[0].price_diamonds;
    if(await getLedgerBalance(client,userAccount)<amount)throw new FanError("INSUFFICIENT_BALANCE","Saldo insuficiente.");
    const sink=await ensureSystemDiamondAccount(client);
    const ledger=await postLedgerTransaction(client,{
      type:"mega_fan_purchase",referenceType:"fan_product",referenceId:product.rows[0].id,idempotencyKey:effectiveIdempotencyKey,
      entries:[{accountId:userAccount,direction:"debit",amount},{accountId:sink,direction:"credit",amount}]
    });
    const current=await client.query<{end_at:Date}>(
      "select max(ends_at) end_at from fan_statuses where fan_user_id=$1 and creator_user_id=$2 and status='active' and ends_at>now()",
      [input.fanUserId,input.creatorUserId]
    );
    const startsAt=current.rows[0]?.end_at&&new Date(current.rows[0].end_at)>new Date()?new Date(current.rows[0].end_at):new Date();
    const endsAt=new Date(startsAt.getTime()+product.rows[0].duration_days*86400000);
    const membershipId=randomUUID();
    await client.query(
      "insert into fan_statuses(id,fan_user_id,creator_user_id,status,starts_at,ends_at,ledger_transaction_id) values($1,$2,$3,'active',$4,$5,$6)",
      [membershipId,input.fanUserId,input.creatorUserId,startsAt,endsAt,ledger.transactionId]
    );
    await client.query("commit");
    return {transactionId:ledger.transactionId,membershipId,endsAt,duplicate:false};
  }catch(error){
    await client.query("rollback");
    if(error instanceof FanError)throw error;
    if((error as {code?:string}).code==="40001")throw new FanError("FAN_RETRY","Conflito concorrente. Tente novamente.");
    throw error;
  }finally{client.release();}
}