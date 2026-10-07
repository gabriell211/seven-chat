import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FollowButton } from "@/components/follow-button";
import { StartChatButton } from "@/components/start-chat-button";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { follows, posts, profiles, users } from "@/db/schema";

export const dynamic="force-dynamic";

export default async function PublicProfile({params}:{params:Promise<{username:string}>}){
  const {username}=await params;
  const session=await getSession();
  const clean=decodeURIComponent(username).replace(/^@/,"");

  const [profile]=await db.select({
    id:users.id,username:users.username,displayName:profiles.displayName,bio:profiles.bio,
    avatarUrl:profiles.avatarUrl,bannerUrl:profiles.bannerUrl,region:profiles.region,
    languages:profiles.languages,interests:profiles.interests,isVip:profiles.isVip,isPrivate:profiles.isPrivate
  }).from(users).innerJoin(profiles,eq(users.id,profiles.userId))
    .where(and(eq(users.username,clean),eq(users.status,"active"))).limit(1);

  if(!profile)notFound();

  const [[followersCount],[followingCount],userPosts,followingRow]=await Promise.all([
    db.select({value:count()}).from(follows).where(eq(follows.followingId,profile.id)),
    db.select({value:count()}).from(follows).where(eq(follows.followerId,profile.id)),
    db.select({id:posts.id,body:posts.body,createdAt:posts.createdAt})
      .from(posts).where(and(eq(posts.authorId,profile.id),eq(posts.visibility,"public")))
      .orderBy(desc(posts.createdAt)).limit(20),
    session&&session.userId!==profile.id
      ?db.select({followerId:follows.followerId}).from(follows).where(and(eq(follows.followerId,session.userId),eq(follows.followingId,profile.id))).limit(1)
      :Promise.resolve([])
  ]);

  const isMe=session?.userId===profile.id;

  return <AppShell>
    <section className="card profile-hero">
      <div className="profile-cover" style={profile.bannerUrl?{backgroundImage:`linear-gradient(180deg,transparent,rgba(0,0,0,.25)),url("${profile.bannerUrl}")`}:undefined}/>
      <div className="profile-main">
        <div className="public-profile-top">
          <div className="avatar lg">{profile.displayName[0]?.toUpperCase()}</div>
          <div className="public-profile-actions">
            {isMe?<Link className="button secondary" href="/settings">Editar perfil</Link>:session?<FollowButton userId={profile.id} initialFollowing={followingRow.length>0}/>:<Link className="button" href="/login">Entrar para seguir</Link>}
            {!isMe&&session&&<StartChatButton userId={profile.id}/>}
          </div>
        </div>
        <div className="profile-title"><h1>{profile.displayName}</h1>{profile.isVip&&<span className="vip-badge">VIP</span>}</div>
        <div className="muted">@{profile.username}</div>
        <p className="public-profile-bio">{profile.bio||"Este perfil ainda não adicionou uma bio."}</p>
        <div className="public-profile-stats">
          <div><strong>{followersCount?.value??0}</strong><span>seguidores</span></div>
          <div><strong>{followingCount?.value??0}</strong><span>seguindo</span></div>
          <div><strong>{userPosts.length}</strong><span>publicações</span></div>
        </div>
        <div className="profile-meta">
          {profile.region&&<span className="pill">{profile.region}</span>}
          {profile.languages.map(v=><span className="pill" key={v}>{v}</span>)}
          {profile.interests.map(v=><span className="pill" key={v}>{v}</span>)}
        </div>
      </div>
    </section>

    <div className="page-heading profile-content-heading">
      <div><span className="eyebrow">PUBLICAÇÕES</span><h2>Atividade pública</h2></div>
    </div>

    {profile.isPrivate&&!isMe?<div className="card empty"><div><div className="empty-icon">🔒</div><strong>Perfil privado</strong><p>As publicações deste perfil não estão disponíveis publicamente.</p></div></div>:<div className="grid">
      {userPosts.length?userPosts.map(p=><article className="card post" key={p.id}>
        <div className="posthead"><div className="userrow"><div className="avatar sm">{profile.displayName[0]?.toUpperCase()}</div><div><strong>{profile.displayName}</strong><div className="muted" style={{fontSize:12}}>@{profile.username}</div></div></div><span className="pill">{p.createdAt.toLocaleDateString("pt-BR")}</span></div>
        <div className="post-body">{p.body}</div>
      </article>):<div className="card empty"><div><div className="empty-icon">✦</div><strong>Nenhuma publicação pública ainda.</strong><p>Quando houver posts públicos, eles aparecerão aqui.</p></div></div>}
    </div>}
  </AppShell>;
}
