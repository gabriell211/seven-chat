import Link from "next/link";
import { desc, eq, gt } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { PostActions } from "@/components/post-actions";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { posts, profiles, stories, users } from "@/db/schema";

export const dynamic="force-dynamic";

export default async function FeedPage(){
  const session=await getSession();
  let feed:Array<{id:string;body:string;createdAt:Date;username:string;displayName:string}>=[];
  let storyRows:Array<{id:string;username:string;displayName:string;type:string;textContent:string|null;createdAt:Date}>=[];
  if(process.env.DATABASE_URL){
    try{
      [feed,storyRows]=await Promise.all([
        db.select({
          id:posts.id,body:posts.body,createdAt:posts.createdAt,
          username:users.username,displayName:profiles.displayName
        }).from(posts)
          .innerJoin(users,eq(posts.authorId,users.id))
          .innerJoin(profiles,eq(posts.authorId,profiles.userId))
          .where(eq(posts.visibility,"public"))
          .orderBy(desc(posts.createdAt))
          .limit(30),
        db.select({
          id:stories.id,username:users.username,displayName:profiles.displayName,
          type:stories.type,textContent:stories.textContent,createdAt:stories.createdAt
        }).from(stories)
          .innerJoin(users,eq(stories.authorId,users.id))
          .innerJoin(profiles,eq(stories.authorId,profiles.userId))
          .where(gt(stories.expiresAt,new Date()))
          .orderBy(desc(stories.createdAt))
          .limit(18)
      ]);
    }catch{}
  }

  const uniqueStories=[...new Map(storyRows.map(s=>[s.username,s])).values()];

  return <AppShell>
    <div className="page-heading">
      <div><span className="eyebrow">FEED</span><h1>Para você</h1><p className="muted">Acompanhe pessoas, conversas e momentos da comunidade.</p></div>
      <Link className="button secondary compact" href="/explore">Encontrar pessoas</Link>
    </div>

    {session&&<section className="stories-strip">
      <Link className="story-item story-create" href="/profile">
        <span className="story-ring"><span className="story-avatar">+</span></span>
        <small>Seu story</small>
      </Link>
      {uniqueStories.map(s=><Link className="story-item" key={s.id} href={"/u/"+s.username}>
        <span className="story-ring"><span className="story-avatar">{s.displayName[0]?.toUpperCase()}</span></span>
        <small>{s.displayName.split(" ")[0]}</small>
      </Link>)}
    </section>}

    <div className="grid two">
      <section className="grid">
        {session&&<form action="/api/posts" method="post" className="card composer">
          <div className="composer-head">
            <div className="avatar sm">{session.username[0]?.toUpperCase()}</div>
            <div><strong>@{session.username}</strong><div className="muted" style={{fontSize:12}}>Compartilhe algo com a comunidade</div></div>
          </div>
          <textarea className="textarea" name="body" maxLength={4000} placeholder="No que você está pensando?" required/>
          <div className="composer-actions">
            <div className="composer-tools"><span>▧ Foto</span><span>▶ Vídeo</span><span>☺ Humor</span></div>
            <button className="button compact">Publicar</button>
          </div>
        </form>}

        {feed.length===0?
          <div className="card empty"><div><div className="empty-icon">✦</div><strong>Seu feed está pronto para ganhar vida.</strong><p>Publique algo ou encontre pessoas para começar a acompanhar novidades por aqui.</p><Link className="button compact" href="/explore">Explorar comunidade</Link></div></div>
          :feed.map(p=><article className="card post" id={"post-"+p.id} key={p.id}>
            <div className="posthead">
              <Link className="userrow" href={"/u/"+p.username}>
                <div className="avatar">{p.displayName[0]?.toUpperCase()}</div>
                <div><strong>{p.displayName}</strong><div className="muted" style={{fontSize:12}}>@{p.username}</div></div>
              </Link>
              <span className="pill">{p.createdAt.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}</span>
            </div>
            <div className="post-body">{p.body}</div>
            <PostActions postId={p.id} loggedIn={Boolean(session)}/>
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
