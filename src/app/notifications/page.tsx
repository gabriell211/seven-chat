import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { NotificationsList, type NotificationItem } from "@/components/notifications-list";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications, profiles, users } from "@/db/schema";

export const dynamic="force-dynamic";

export default async function Notifications(){
  const session=await getSession();
  if(!session)return <AppShell><div className="card empty"><div><div className="empty-icon">◌</div><strong>Entre para ver suas notificações.</strong><p>A atividade da sua conta aparece aqui.</p><Link className="button compact" href="/login">Entrar</Link></div></div></AppShell>;

  const rows=await db.select().from(notifications).where(eq(notifications.userId,session.userId)).orderBy(desc(notifications.createdAt)).limit(100).catch(()=>[]);
  const actorIds=[...new Set(rows.map(n=>n.actorId).filter((v):v is string=>Boolean(v)))];
  const actors=actorIds.length?await db.select({
    id:users.id,username:users.username,displayName:profiles.displayName
  }).from(users).innerJoin(profiles,eq(users.id,profiles.userId)).where(inArray(users.id,actorIds)).catch(()=>[]):[];
  const actorMap=new Map(actors.map(a=>[a.id,a]));

  const initial:NotificationItem[]=rows.map(n=>{
    const actor=n.actorId?actorMap.get(n.actorId):null;
    return {
      id:n.id,type:n.type,entityType:n.entityType,entityId:n.entityId,
      createdAt:n.createdAt.toISOString(),readAt:n.readAt?.toISOString()??null,
      actorName:actor?.displayName??null,actorUsername:actor?.username??null,payload:(n.payload as Record<string,unknown>)??{}
    };
  });

  return <AppShell>
    <div className="page-heading">
      <div><span className="eyebrow">ATIVIDADE</span><h1>Notificações</h1><p className="muted">Eventos reais gerados pelas interações da sua conta.</p></div>
    </div>
    <NotificationsList initial={initial}/>
  </AppShell>;
}
