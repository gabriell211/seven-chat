import { desc, eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { RoomsBrowser } from "@/components/rooms-browser";
import { rooms, users, profiles } from "@/db/schema";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic="force-dynamic";

export default async function Rooms(){
  const session=await getSession();
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
      <div><span className="eyebrow">ÁUDIO SOCIAL</span><h1>Salas de voz</h1><p className="muted">Entre para ouvir, subir ao palco ou criar seu próprio espaço.</p></div>
      <span className="pill"><span className="status-dot"/> {data.length} ativas</span>
    </div>
    <RoomsBrowser rooms={data} loggedIn={Boolean(session)}/>
  </AppShell>;
}