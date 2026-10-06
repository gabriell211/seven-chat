import { desc, eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { reels, profiles, users } from "@/db/schema";

export const dynamic="force-dynamic";

export default async function Reels(){
  const rows=process.env.DATABASE_URL?await db.select({
    id:reels.id,caption:reels.caption,videoUrl:reels.videoUrl,thumbnailUrl:reels.thumbnailUrl,
    durationMs:reels.durationMs,viewCount:reels.viewCount,createdAt:reels.createdAt,
    username:users.username,displayName:profiles.displayName
  }).from(reels)
    .innerJoin(users,eq(reels.authorId,users.id))
    .innerJoin(profiles,eq(reels.authorId,profiles.userId))
    .where(eq(reels.visibility,"public"))
    .orderBy(desc(reels.createdAt))
    .limit(20)
    .catch(()=>[]):[];

  return <AppShell>
    <div className="page-heading">
      <div><span className="eyebrow">VÍDEOS CURTOS</span><h1>Reels</h1><p className="muted">Descubra vídeos da comunidade em uma experiência vertical e direta.</p></div>
      <span className="pill">{rows.length} recentes</span>
    </div>

    {rows.length?<div className="reels-grid">{rows.map(reel=><article className="reel-card" key={reel.id}>
      <div className="reel-media">
        <video controls preload="metadata" poster={reel.thumbnailUrl??undefined} src={reel.videoUrl}/>
        <span className="reel-duration">{Math.max(1,Math.round(reel.durationMs/1000))}s</span>
      </div>
      <div className="reel-copy">
        <div className="userrow"><div className="avatar sm">{reel.displayName[0]?.toUpperCase()}</div><div><strong>{reel.displayName}</strong><div className="muted" style={{fontSize:12}}>@{reel.username}</div></div></div>
        {reel.caption&&<p>{reel.caption}</p>}
        <div className="row between"><span className="muted" style={{fontSize:12}}>{reel.viewCount} visualizações</span><span className="pill">{reel.createdAt.toLocaleDateString("pt-BR")}</span></div>
      </div>
    </article>)}</div>:<div className="card empty"><div><div className="empty-icon">▶</div><strong>Os primeiros reels vão aparecer aqui.</strong><p>Quando a comunidade publicar vídeos públicos, você poderá assistir nesta tela.</p></div></div>}
  </AppShell>;
}