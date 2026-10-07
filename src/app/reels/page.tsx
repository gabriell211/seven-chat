import { desc, eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { ReelCard } from "@/components/reel-card";
import { db } from "@/lib/db";
import { reels, profiles, users } from "@/db/schema";

export const dynamic="force-dynamic";

export default async function Reels(){
  const rows=process.env.DATABASE_URL?await db.select({
    id:reels.id,caption:reels.caption,videoUrl:reels.videoUrl,thumbnailUrl:reels.thumbnailUrl,
    mediaAssetId:reels.mediaAssetId,thumbnailAssetId:reels.thumbnailAssetId,
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
      <div><span className="eyebrow">VÍDEOS CURTOS</span><h1>Reels</h1><p className="muted">Vídeos públicos do storage com visualizações únicas registradas no banco.</p></div>
      <span className="pill">{rows.length} recentes</span>
    </div>

    {rows.length?<div className="reels-grid">{rows.map(reel=><ReelCard key={reel.id} reel={{
      ...reel,createdAt:reel.createdAt.toISOString()
    }}/>)}</div>:<div className="card empty"><div><div className="empty-icon">▶</div><strong>Nenhum reel publicado ainda.</strong><p>Reels reais aparecerão aqui quando houver mídia publicada no catálogo.</p></div></div>}
  </AppShell>;
}
