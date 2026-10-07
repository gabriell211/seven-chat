import Link from "next/link";
import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles, users } from "@/db/schema";

export const dynamic="force-dynamic";

export default async function ProfilePage(){
  const session=await getSession();
  if(!session)return <AppShell><div className="card empty"><div><div className="empty-icon">◎</div><strong>Entre para ver seu perfil.</strong><p>Seu perfil reúne identidade, interesses e recursos sociais.</p><Link className="button compact" href="/login">Entrar</Link></div></div></AppShell>;

  const [profile]=await db.select({
    username:users.username,displayName:profiles.displayName,bio:profiles.bio,
    isVip:profiles.isVip,region:profiles.region,languages:profiles.languages,interests:profiles.interests,avatarUrl:profiles.avatarUrl,bannerUrl:profiles.bannerUrl
  }).from(users).innerJoin(profiles,eq(users.id,profiles.userId)).where(eq(users.id,session.userId)).limit(1);

  return <AppShell>
    <div className="page-heading">
      <div><span className="eyebrow">PERFIL</span><h1>Seu espaço</h1><p className="muted">Mostre quem você é e personalize sua presença.</p></div>
      <Link className="button secondary compact" href="/settings#profile">Editar perfil</Link>
    </div>
    {profile?<div className="grid">
      <section className="card profile-hero">
        <div className="profile-cover" style={profile.bannerUrl?{backgroundImage:`linear-gradient(180deg,transparent,rgba(0,0,0,.25)),url("${profile.bannerUrl}")`}:undefined}/>
        <div className="profile-main">
          <div className="avatar lg" style={profile.avatarUrl?{backgroundImage:`url("${profile.avatarUrl}")`,backgroundSize:"cover",backgroundPosition:"center"}:undefined}>{profile.avatarUrl?"":profile.displayName[0]?.toUpperCase()}</div>
          <div className="profile-title">
            <h2>{profile.displayName}</h2>
            {profile.isVip&&<span className="vip-badge">VIP</span>}
          </div>
          <div className="muted">@{profile.username}</div>
          <p style={{maxWidth:680,lineHeight:1.65}}>{profile.bio||"Adicione uma bio para contar um pouco sobre você."}</p>
          <div className="profile-meta">
            <span className="pill">{profile.region||"Região não informada"}</span>
            {profile.languages.map(v=><span className="pill" key={v}>{v}</span>)}
            {profile.interests.map(v=><span className="pill" key={v}>{v}</span>)}
          </div>
        </div>
      </section>
      <div className="feature-grid">
        <Link href="/chat" className="feature-tile"><div className="feature-tile-icon">✉</div><div><h3>Conversas</h3><p>Acesse mensagens e grupos privados.</p></div></Link>
        <Link href="/wallet" className="feature-tile"><div className="feature-tile-icon">◇</div><div><h3>Carteira</h3><p>Veja diamantes, gifts e movimentações.</p></div></Link>
        <Link href="/vip" className="feature-tile"><div className="feature-tile-icon">◆</div><div><h3>Seven VIP</h3><p>Personalize sua presença e recursos sociais.</p></div></Link>
      </div>
    </div>:<div className="card empty">Perfil não encontrado.</div>}
  </AppShell>;
}