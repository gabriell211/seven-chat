import Link from "next/link";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { PostActions } from "@/components/post-actions";
import { PostComposer } from "@/components/post-composer";
import { StoryStrip, type TextStory } from "@/components/story-strip";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { postReactions, posts, profiles, savedPosts, stories, users } from "@/db/schema";

export const dynamic="force-dynamic";

export default async function FeedPage(){
  const session=await getSession();
  let feed:Array<{id:string;body:string;createdAt:Date;username:string;displayName:string}>=[];
  let storyRows:Array<{id:string;username:string;displayName:string;textContent:string|null;createdAt:Date}>=[];
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
          textContent:stories.textContent,createdAt:stories.createdAt
        }).from(stories)
          .innerJoin(users,eq(stories.authorId,users.id))
          .innerJoin(profiles,eq(stories.authorId,profiles.userId))
          .where(and(gt(stories.expiresAt,new Date()),eq(stories.type,"text")))
          .orderBy(desc(stories.createdAt))
          .limit(18)
      ]);
    }catch{}
  }

  const uniqueStories=[...new Map(storyRows.filter(s=>s.textContent).map(s=>[s.username,s])).values()];
  const storyData:TextStory[]=uniqueStories.map(s=>({
    id:s.id,username:s.username,displayName:s.displayName,textContent:s.textContent!,createdAt:s.createdAt.toISOString()
  }));

  const feedIds=feed.map(p=>p.id);
  let liked=new Set<string>(),saved=new Set<string>();
  if(session&&feedIds.length){
    const [reactionRows,savedRows]=await Promise.all([
      db.select({postId:postReactions.postId}).from(postReactions)
        .where(and(eq(postReactions.userId,session.userId),inArray(postReactions.postId,feedIds))),
      db.select({postId:savedPosts.postId}).from(savedPosts)
        .where(and(eq(savedPosts.userId,session.userId),inArray(savedPosts.postId,feedIds)))
    ]).catch(()=>[[],[]] as const);
    liked=new Set(reactionRows.map(r=>r.postId));
    saved=new Set(savedRows.map(r=>r.postId));
  }

  return <AppShell>
    <div className="page-heading">
      <div><span className="eyebrow">FEED</span><h1>Para você</h1><p className="muted">Publicações reais da comunidade, com ações persistidas no banco.</p></div>
      <Link className="button secondary compact" href="/explore">Encontrar pessoas</Link>
    </div>

    {session&&<StoryStrip stories={storyData}/>}

    <div className="grid two">
      <section className="grid">
        {session&&<PostComposer username={session.username}/>}

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
            <PostActions postId={p.id} loggedIn={Boolean(session)} initialLiked={liked.has(p.id)} initialSaved={saved.has(p.id)}/>
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
          <span className="live-chip">RTC</span>
          <h3>Lives e salas</h3>
          <p className="muted">Só ficam disponíveis quando o servidor RTC está realmente configurado.</p>
          <Link className="button secondary compact" href="/lives">Ver status</Link>
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
