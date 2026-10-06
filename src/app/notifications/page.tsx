import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/db/schema";

export const dynamic="force-dynamic";

function label(type:string){
  const map:Record<string,string>={
    follow:"começou a seguir você",
    reaction:"reagiu ao seu conteúdo",
    comment:"comentou em uma publicação",
    message:"enviou uma mensagem",
    gift:"enviou um presente",
    live:"iniciou uma live",
    room:"abriu uma sala"
  };
  return map[type]??type.replaceAll("_"," ");
}

export default async function Notifications(){
  const session=await getSession();
  if(!session)return <AppShell><div className="card empty"><div><div className="empty-icon">◌</div><strong>Entre para ver suas notificações.</strong><p>A atividade da sua conta aparece aqui.</p><Link className="button compact" href="/login">Entrar</Link></div></div></AppShell>;

  const rows=await db.select().from(notifications).where(eq(notifications.userId,session.userId)).orderBy(desc(notifications.createdAt)).limit(50).catch(()=>[]);

  return <AppShell>
    <div className="page-heading">
      <div><span className="eyebrow">ATIVIDADE</span><h1>Notificações</h1><p className="muted">Acompanhe interações importantes sem perder nada.</p></div>
      <span className="pill">{rows.filter(n=>!n.readAt).length} novas</span>
    </div>
    <section className="card notification-list">
      {rows.length?rows.map(n=><article className={"notification-item "+(!n.readAt?"is-unread":"")} key={n.id}>
        <div className="notification-icon">{n.type==="gift"?"◇":n.type==="message"?"✉":"✦"}</div>
        <div className="notification-copy"><strong>{label(n.type)}</strong><span>{n.createdAt.toLocaleString("pt-BR")}</span></div>
        {!n.readAt&&<span className="status-dot" aria-label="Não lida"/>}
      </article>):<div className="empty"><div><div className="empty-icon">✓</div><strong>Tudo tranquilo por aqui.</strong><p>Quando alguém interagir com você, a atividade vai aparecer nesta lista.</p></div></div>}
    </section>
  </AppShell>;
}