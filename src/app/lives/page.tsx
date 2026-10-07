import { and, desc, eq, inArray, or } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { LivesBrowser } from "@/components/lives-browser";
import { follows, gifts, liveBattles, liveGuests, liveSessions, users, profiles } from "@/db/schema";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isRtcConfigured } from "@/lib/rtc";

export const dynamic="force-dynamic";

export default async function Lives(){
  const session=await getSession();
  const rtcReady=isRtcConfigured();
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

  const liveIds=rows.map(v=>v.id);
  const hostIds=rows.map(v=>v.hostId);
  const [guestRows,followRows,battleRows]=session&&rows.length?await Promise.all([
    db.select({liveId:liveGuests.liveId}).from(liveGuests).where(and(
      eq(liveGuests.userId,session.userId),eq(liveGuests.status,"accepted"),inArray(liveGuests.liveId,liveIds)
    )).catch(()=>[]),
    db.select({followingId:follows.followingId}).from(follows).where(and(
      eq(follows.followerId,session.userId),inArray(follows.followingId,hostIds)
    )).catch(()=>[]),
    db.select().from(liveBattles).where(and(
      inArray(liveBattles.status,["invited","active"]),
      or(inArray(liveBattles.liveAId,liveIds),inArray(liveBattles.liveBId,liveIds))
    )).orderBy(desc(liveBattles.createdAt)).catch(()=>[])
  ]):[[],[],[]];

  const guestIds=new Set(guestRows.map(v=>v.liveId));
  const followingIds=new Set(followRows.map(v=>v.followingId));
  const battleMap=new Map<string,(typeof battleRows)[number]>();
  for(const battle of battleRows){
    if(!battleMap.has(battle.liveAId))battleMap.set(battle.liveAId,battle);
    if(!battleMap.has(battle.liveBId))battleMap.set(battle.liveBId,battle);
  }

  const data=rows.map(live=>{
    const battle=battleMap.get(live.id);
    return {
      ...live,
      isHost:session?.userId===live.hostId,
      canPublish:session?.userId===live.hostId||guestIds.has(live.id),
      initialFollowing:followingIds.has(live.hostId),
      battle:battle?{
        id:battle.id,status:battle.status,liveAId:battle.liveAId,liveBId:battle.liveBId,
        scoreA:battle.scoreA,scoreB:battle.scoreB,durationSeconds:battle.durationSeconds,
        startsAt:battle.startsAt?.toISOString()??null,endsAt:battle.endsAt?.toISOString()??null
      }:null
    };
  });

  return <AppShell>
    <div className="page-heading">
      <div><span className="eyebrow">SEVEN LIVE</span><h1>Ao vivo agora</h1><p className="muted">Transmissões, comentários, gifts e batalhas conectados ao backend real.</p></div>
      <span className="live-chip">{rtcReady?data.length+" AO VIVO":"RTC OFFLINE"}</span>
    </div>
    {!rtcReady&&<div className="error">Vídeo ao vivo está desativado porque o servidor LiveKit ainda não está configurado no Vercel. Nenhuma live falsa será criada.</div>}
    <LivesBrowser lives={data} gifts={giftRows} loggedIn={Boolean(session)} rtcReady={rtcReady}/>
  </AppShell>;
}
