import { desc, eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { LivesBrowser } from "@/components/lives-browser";
import { gifts, liveSessions, users, profiles } from "@/db/schema";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic="force-dynamic";

export default async function Lives(){
  const session=await getSession();
  const [rows,giftRows]=process.env.DATABASE_URL?await Promise.all([
    db.select({
      id:liveSessions.id,title:liveSessions.title,category:liveSessions.category,
      viewerCount:liveSessions.viewerCount,peakViewers:liveSessions.peakViewers,
      thumbnailUrl:liveSessions.thumbnailUrl,
      hostId:users.id,hostUsername:users.username,hostDisplayName:profiles.displayName
    }).from(liveSessions)
      .innerJoin(users,eq(liveSessions.hostId,users.id))
      .innerJoin(profiles,eq(users.id,profiles.userId))
      .where(eq(liveSessions.status,"live"))
      .orderBy(desc(liveSessions.startedAt))
      .limit(50)
      .catch(()=>[]),
    db.select({
      id:gifts.id,name:gifts.name,priceDiamonds:gifts.priceDiamonds,
      category:gifts.category,animationType:gifts.animationType,assetUrl:gifts.assetUrl
    }).from(gifts).where(eq(gifts.isActive,true)).limit(40).catch(()=>[])
  ]):[[],[]];

  const data=rows.map(live=>({...live,isHost:session?.userId===live.hostId}));

  return <AppShell>
    <div className="page-heading">
      <div><span className="eyebrow">SEVEN LIVE</span><h1>Ao vivo agora</h1><p className="muted">Assista, converse, envie gifts, participe como convidado ou abra sua própria transmissão.</p></div>
      <span className="live-chip">{data.length} AO VIVO</span>
    </div>
    <LivesBrowser lives={data} gifts={giftRows} loggedIn={Boolean(session)}/>
  </AppShell>;
}
