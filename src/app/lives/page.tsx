import { desc, eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { LivesBrowser } from "@/components/lives-browser";
import { liveSessions, users, profiles } from "@/db/schema";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic="force-dynamic";

export default async function Lives(){
  const session=await getSession();
  const rows=process.env.DATABASE_URL?await db.select({
    id:liveSessions.id,title:liveSessions.title,category:liveSessions.category,
    viewerCount:liveSessions.viewerCount,peakViewers:liveSessions.peakViewers,
    hostId:users.id,hostUsername:users.username,hostDisplayName:profiles.displayName
  }).from(liveSessions)
    .innerJoin(users,eq(liveSessions.hostId,users.id))
    .innerJoin(profiles,eq(users.id,profiles.userId))
    .where(eq(liveSessions.status,"live"))
    .orderBy(desc(liveSessions.startedAt))
    .limit(50)
    .catch(()=>[]):[];

  const data=rows.map(live=>({...live,isHost:session?.userId===live.hostId}));

  return <AppShell>
    <div className="page-heading">
      <div><span className="eyebrow">TRANSMISSÕES</span><h1>Lives</h1><p className="muted">Assista, participe e crie momentos ao vivo com a comunidade.</p></div>
      <span className="live-chip">{data.length} AO VIVO</span>
    </div>
    <LivesBrowser lives={data} loggedIn={Boolean(session)}/>
  </AppShell>;
}