import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { posts, profiles, users } from "@/db/schema";

export const dynamic="force-dynamic";

export default async function FeedPage(){
  const session=await getSession();
  let feed:Array<{id:string;body:string;createdAt:Date;username:string;displayName:string}>=[];
  if(process.env.DATABASE_URL){
    try{
      feed=await db.select({
        id:posts.id,body:posts.body,createdAt:posts.createdAt,
        username:users.username,displayName:profiles.displayName
      }).from(posts)
        .innerJoin(users,eq(posts.authorId,users.id))
        .innerJoin(profiles,eq(posts.authorId,profiles.userId))
        .where(eq(posts.visibility,"public"))
        .orderBy(desc(posts.createdAt))
        .limit(30);
    }catch{}
  }

  return <AppShell>
    <div className="page-heading">
      <div><span className="eyebrow">FEED</span><h1>Para você</h1><p className="muted">Acompanhe pessoas, conversas e momentos da comunidade.</p></div>
      <Link className="button secondary compact" href="/explore">Encontrar pessoas</Link>
    </div>

    <div className="grid two">
      <section className="grid">
        {session&&<form action="/api/posts" method="post" className="card composer">
          <div className="composer-head">
            <div className="avatar sm">{session.username[0]?.toUpperCase()}</div>
            <div><strong>@{session.username}</strong><div className="muted" style={{fontSize:12}}>Compartilhe algo com a comunidade</div></div>
          </div>
          <textarea className="textarea" name="body" maxLength={4000} placeholder="No que você está pensando?" required/>
          <div className="composer-actions">
            <span className="muted" style={{fontSize:12}}>Post público · até 4.000 caracteres</span>
            <button className="button compact">Publicar</button>
          </div>
        </form>}

        {feed.length===0?
          <div className="card empty"><div><div className="empty-icon">✦</div><strong>Seu feed está pronto para ganhar vida.</strong><p>Publique algo ou encontre pessoas para começar a acompanhar novidades por aqui.</p><Link className="button compact" href="/explore">Explorar comunidade</Link></div></div>
          :feed.map(p=><article className="card post" key={p.id}>
            <div className="posthead">
              <div className="userrow">
                <div className="avatar">{p.displayName[0]?.toUpperCase()}</div>
                <div><strong>{p.displayName}</strong><div className="muted" style={{fontSize:12}}>@{p.username}</div></div>
              </div>
              <span className="pill">{p.createdAt.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}</span>
            </div>
            <div className="post-body">{p.body}</div>
          </article>)
        }
      </section>

      <aside className="grid">
        <div className="card feature-card">
          <span className="eyebrow">DESCOBRIR</span>
          <h3>Encontre sua turma</h3>
          <p className="muted">Descubra perfis por interesses, idioma e região sem sair do Seven Chat.</p>
          <div className="quick-grid">
            <Link className="quick-link" href="/explore">Explorar</Link>
            <Link className="quick-link" href="/rooms">Salas de voz</Link>
          </div>
        </div>
        <div className="card feature-card">
          <span className="live-chip">AO VIVO</span>
          <h3>Tem sempre algo acontecendo</h3>
          <p className="muted">Entre em lives, participe de salas e acompanhe batalhas em tempo real.</p>
          <Link className="button secondary compact" href="/lives">Ver lives</Link>
        </div>
        <div className="card soft">
          <div className="row between"><span className="muted">Atalhos</span><span className="pill">Seven</span></div>
          <div className="quick-grid" style={{marginTop:12}}>
            <Link className="quick-link" href="/chat">Mensagens</Link>
            <Link className="quick-link" href="/reels">Reels</Link>
            <Link className="quick-link" href="/notifications">Atividade</Link>
            <Link className="quick-link" href="/profile">Meu perfil</Link>
          </div>
        </div>
      </aside>
    </div>
  </AppShell>;
}