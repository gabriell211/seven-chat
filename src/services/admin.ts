import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { userRoles } from "@/db/schema";
import { getRequestSession, type Session } from "@/lib/auth";

export type AdminRole="moderator"|"admin"|"super_admin";
const adminRoles:AdminRole[]=["moderator","admin","super_admin"];

export async function requireAdmin(req:Request,allowed:AdminRole[]=adminRoles):Promise<Session&{role:AdminRole}>{
  const session=await getRequestSession(req);
  if(!session)throw new Error("UNAUTHORIZED");
  const [row]=await db.select({role:userRoles.role}).from(userRoles).where(and(
    eq(userRoles.userId,session.userId),inArray(userRoles.role,allowed)
  )).limit(1);
  if(!row||!adminRoles.includes(row.role as AdminRole))throw new Error("FORBIDDEN");
  return {...session,role:row.role as AdminRole};
}