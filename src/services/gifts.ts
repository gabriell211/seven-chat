import { randomUUID } from "node:crypto";
import { pool } from "@/lib/db";

export type SendGiftInput={
  senderId:string;
  receiverId:string;
  giftId:string;
  quantity:number;
  idempotencyKey:string;
};

export class GiftError extends Error{
  constructor(public readonly code:string,message:string){super(message);}
}

export async function sendGift(input:SendGiftInput):Promise<{transactionId:string;giftTransactionId:string}>{
  if(input.senderId===input.receiverId)throw new GiftError("GIFT_SELF_SEND","Você não pode enviar gift para si mesmo.");
  if(!Number.isInteger(input.quantity)||input.quantity<1||input.quantity>100)throw new GiftError("GIFT_INVALID_QUANTITY","Quantidade inválida.");
  const client=await pool.connect();
  try{
    await client.query("begin isolation level serializable");
    const existing=await client.query<{id:string}>("select id from ledger_transactions where idempotency_key=$1 limit 1",[input.idempotencyKey]);
    if(existing.rowCount){
      const giftTx=await client.query<{id:string}>("select id from gift_transactions where ledger_transaction_id=$1 limit 1",[existing.rows[0].id]);
      await client.query("commit");
      return {transactionId:existing.rows[0].id,giftTransactionId:giftTx.rows[0]?.id??""};
    }
    const gift=await client.query<{price_diamonds:number}>("select price_diamonds from gifts where id=$1 and is_active=true for share",[input.giftId]);
    if(!gift.rowCount)throw new GiftError("GIFT_NOT_AVAILABLE","Gift indisponível.");
    const amount=gift.rows[0].price_diamonds*input.quantity;
    const senderAccount=await client.query<{id:string}>(
      "select id from ledger_accounts where owner_type='user' and owner_id=$1 and asset='diamonds' and status='active' for update",
      [input.senderId]
    );
    if(!senderAccount.rowCount)throw new GiftError("WALLET_NOT_FOUND","Carteira não encontrada.");
    const balanceResult=await client.query<{balance:string}>(
      "select coalesce(sum(case when direction='credit' then amount else -amount end),0)::text as balance from ledger_entries where account_id=$1",
      [senderAccount.rows[0].id]
    );
    const balance=Number(balanceResult.rows[0]?.balance??0);
    if(balance<amount)throw new GiftError("GIFT_INSUFFICIENT_BALANCE","Saldo insuficiente.");
    let sink=await client.query<{id:string}>("select id from ledger_accounts where owner_type='system' and owner_id is null and asset='diamonds' and status='active' order by created_at asc limit 1 for update");
    if(!sink.rowCount){
      sink=await client.query<{id:string}>("insert into ledger_accounts(id,owner_type,owner_id,asset,status) values($1,'system',null,'diamonds','active') returning id",[randomUUID()]);
    }
    const transactionId=randomUUID();
    const giftTransactionId=randomUUID();
    await client.query(
      "insert into ledger_transactions(id,type,reference_type,reference_id,idempotency_key,status,posted_at) values($1,'gift_purchase','gift',$2,$3,'posted',now())",
      [transactionId,input.giftId,input.idempotencyKey]
    );
    await client.query(
      "insert into ledger_entries(id,transaction_id,account_id,direction,amount) values($1,$2,$3,'debit',$4),($5,$2,$6,'credit',$4)",
      [randomUUID(),transactionId,senderAccount.rows[0].id,amount,randomUUID(),sink.rows[0].id]
    );
    await client.query(
      "insert into gift_transactions(id,sender_id,receiver_id,gift_id,ledger_transaction_id,quantity) values($1,$2,$3,$4,$5,$6)",
      [giftTransactionId,input.senderId,input.receiverId,input.giftId,transactionId,input.quantity]
    );
    await client.query("commit");
    return {transactionId,giftTransactionId};
  }catch(error){
    await client.query("rollback");
    if(error instanceof GiftError)throw error;
    const pgError=error as {code?:string};
    if(pgError.code==="40001")throw new GiftError("GIFT_RETRY","Conflito concorrente. Tente novamente.");
    if(pgError.code==="23505")throw new GiftError("GIFT_DUPLICATE","Operação duplicada.");
    throw error;
  }finally{client.release();}
}