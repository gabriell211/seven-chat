import { desc, eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { RoomsBrowser } from "@/components/rooms-browser";
import { rooms, users, profiles } from "@/db/schema";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isRtcConfigured } from "@/lib/rtc";

export const dynamic="force-dynamic";

export default async function Rooms(){
  const session=await getSession();
  const rtcReady=isRtcConfigured();
  const rows=process.env.DATABASE_URL?await db.select({
    id:rooms.id,title:rooms.title,description:rooms.description,visibility:rooms.visibility,
    vipOnly:rooms.vipOnly,stageLimit:rooms.stageLimit,hostId:users.id,
    hostUsername:users.username,hostDisplayName:profiles.displayName
  }).from(rooms)
    .innerJoin(users,eq(rooms.hostId,users.id))
    .innerJoin(profiles,eq(users.id,profiles.userId))
    .where(eq(rooms.status,"active"))
    .orderBy(desc(rooms.createdAt))
    .limit(50)
    .catch(()=>[]):[];

  const data=rows.map(room=>({...room,canPublishLocal:session?.userId===room.hostId}));

  return <AppShell>
    <div className="page-heading">
      <div><span className="eyebrow">ÁUDIO SOCIAL</span><h1>Salas de voz</h1><p className="muted">Salas conectadas ao backend e ao servidor RTC quando disponível.</p></div>
      <span className="pill"><span className="status-dot"/> {rtcReady?data.length+" ativas":"RTC offline"}</span>
    </div>
    {!rtcReady&&<div className="error">Áudio ao vivo está desativado porque o servidor LiveKit ainda não está configurado. O sistema não criará salas que ninguém consegue usar.</div>}
    <RoomsBrowser rooms={data} loggedIn={Boolean(session)} rtcReady={rtcReady}/>
  </AppShell>;
}
