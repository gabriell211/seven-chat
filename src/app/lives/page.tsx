import { and, desc, eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { LivesBrowser } from "@/components/lives-browser";
import { fanProducts, gifts, liveSessions, profiles, users } from "@/db/schema";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic="force-dynamic";

export default async function Lives({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const session=await getSession();
  const params=await searchParams;
  const requestedLive=typeof params.live==="string"?params.live:null;

  const [rows,giftRows,people,fanRows]=process.env.DATABASE_URL?await Promise.all([
    db.select({
      id:liveSessions.id,title:liveSessions.title,category:liveSessions.category,
      viewerCount:liveSessions.viewerCount,peakViewers:liveSessions.peakViewers,
      hostId:users.id,hostUsername:users.username,hostDisplayName:profiles.displayName,
      hostAvatarUrl:profiles.avatarUrl
    }).from(liveSessions)
      .innerJoin(users,eq(liveSessions.hostId,users.id))
      .innerJoin(profiles,eq(users.id,profiles.userId))
      .where(eq(liveSessions.status,"live"))
      .orderBy(desc(liveSessions.startedAt))
      .limit(50)
      .catch(()=>[]),
    db.select({
      id:gifts.id,name:gifts.name,priceDiamonds:gifts.priceDiamonds,
      category:gifts.category,animationType:gifts.animationType
    }).from(gifts).where(eq(gifts.isActive,true)).limit(60).catch(()=>[]),
    db.select({
      id:users.id,username:users.username,displayName:profiles.displayName,avatarUrl:profiles.avatarUrl
    }).from(users)
      .innerJoin(profiles,eq(users.id,profiles.userId))
      .where(and(eq(users.status,"active"),eq(profiles.isPrivate,false)))
      .orderBy(desc(users.createdAt))
      .limit(40)
      .catch(()=>[])
  ]):[[],[],[]];

  const data=rows.map(live=>({...live,isHost:session?.userId===live.hostId}));

  return <AppShell>
    <div className="page-heading live-page-heading">
      <div><span className="eyebrow">SEVEN LIVE</span><h1>Ao vivo agora</h1><p className="muted">Assista, converse, envie presentes, participe como convidado ou abra sua própria LIVE.</p></div>
      <span className="live-chip">{data.length} AO VIVO</span>
    </div>
    <LivesBrowser
      lives={data}
      gifts={giftRows}
      suggestedUsers={people}
      loggedIn={Boolean(session)}
      currentUserId={session?.userId??""}
      initialLiveId={requestedLive}
    />
  </AppShell>;
}
