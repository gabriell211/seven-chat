import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  comments, liveSessions, messages, notifications, posts, reports, rooms, userRoles, users
} from "@/db/schema";
import type { AdminRole } from "@/services/admin";

export class ModerationError extends Error{
  constructor(public readonly code:string,message:string){super(message);}
}

async function resolveTargetUser(targetType:string,targetId:string):Promise<string|null>{
  if(targetType==="user")return targetId;
  if(targetType==="post"){
    const [row]=await db.select({id:posts.authorId}).from(posts).where(eq(posts.id,targetId)).limit(1);return row?.id??null;
  }
  if(targetType==="comment"){
    const [row]=await db.select({id:comments.authorId}).from(comments).where(eq(comments.id,targetId)).limit(1);return row?.id??null;
  }
  if(targetType==="message"){
    const [row]=await db.select({id:messages.senderId}).from(messages).where(eq(messages.id,targetId)).limit(1);return row?.id??null;
  }
  if(targetType==="live"){
    const [row]=await db.select({id:liveSessions.hostId}).from(liveSessions).where(eq(liveSessions.id,targetId)).limit(1);return row?.id??null;
  }
  if(targetType==="room"){
    const [row]=await db.select({id:rooms.hostId}).from(rooms).where(eq(rooms.id,targetId)).limit(1);return row?.id??null;
  }
  return null;
}

async function assertHierarchy(actorRole:AdminRole,targetUserId:string|null){
  if(!targetUserId)return;
  const roles=await db.select({role:userRoles.role}).from(userRoles)
    .where(eq(userRoles.userId,targetUserId));
  const protectedRole=roles.find(v=>["admin","super_admin"].includes(v.role))?.role;
  if(protectedRole&&actorRole!=="super_admin"){
    throw new ModerationError("MODERATION_HIERARCHY","Somente super_admin pode moderar administradores.");
  }
}

export async function executeModeration(input:{
  actorId:string;actorRole:AdminRole;reportId:string;action:"none"|"warn"|"restrict"|"suspend"|"ban"|"remove_content";reason:string;
}){
  const [report]=await db.select({
    id:reports.id,targetType:reports.targetType,targetId:reports.targetId,status:reports.status
  }).from(reports).where(eq(reports.id,input.reportId)).limit(1);
  if(!report)throw new ModerationError("REPORT_NOT_FOUND","Denúncia não encontrada.");

  const targetUserId=await resolveTargetUser(report.targetType,report.targetId);
  await assertHierarchy(input.actorRole,targetUserId);

  if(["suspend","ban"].includes(input.action)&&input.actorRole==="moderator"){
    throw new ModerationError("MODERATION_ROLE_FORBIDDEN","Moderador não pode suspender ou banir contas.");
  }

  await db.transaction(async tx=>{
    if(input.action==="warn"&&targetUserId){
      await tx.insert(notifications).values({
        userId:targetUserId,type:"moderation_warning",entityType:report.targetType,entityId:report.targetId,
        payload:{reason:input.reason}
      });
    }else if(input.action==="restrict"&&targetUserId){
      await tx.update(users).set({status:"restricted",updatedAt:new Date()}).where(eq(users.id,targetUserId));
    }else if(input.action==="suspend"&&targetUserId){
      await tx.update(users).set({status:"suspended",updatedAt:new Date()}).where(eq(users.id,targetUserId));
    }else if(input.action==="ban"&&targetUserId){
      await tx.update(users).set({status:"banned",updatedAt:new Date()}).where(eq(users.id,targetUserId));
    }else if(input.action==="remove_content"){
      if(report.targetType==="post")await tx.delete(posts).where(eq(posts.id,report.targetId));
      else if(report.targetType==="comment")await tx.delete(comments).where(eq(comments.id,report.targetId));
      else if(report.targetType==="message")await tx.update(messages).set({body:null,mediaAssetId:null,mediaUrl:null,deletedAt:new Date()}).where(eq(messages.id,report.targetId));
      else if(report.targetType==="live")await tx.update(liveSessions).set({status:"ended",endedAt:new Date()}).where(eq(liveSessions.id,report.targetId));
      else if(report.targetType==="room")await tx.update(rooms).set({status:"ended",endedAt:new Date()}).where(eq(rooms.id,report.targetId));
      else if(report.targetType==="user")throw new ModerationError("INVALID_REMOVE_TARGET","Use restrição, suspensão ou banimento para usuários.");
    }

    await tx.update(reports).set({status:"resolved"}).where(eq(reports.id,report.id));
  });
  return {reportId:report.id,targetUserId,action:input.action};
}