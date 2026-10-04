import { eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles, users } from "@/db/schema";
export const dynamic="force-dynamic";
export default async function ProfilePage(){
  const session=await getSession();
  if(!session)return <AppShell><div className="card empty">Entre para ver seu perfil.</div></AppShell>;
  const [profile]=await db.select({
    username:users.username,displayName:profiles.displayName,bio:profiles.bio,
    isVip:profiles.isVip,region:profiles.region,languages:profiles.languages,interests:profiles.interests
  }).from(users).innerJoin(profiles,eq(users.id,profiles.userId)).where(eq(users.id,session.userId)).limit(1);
  return <AppShell><div className="card">{profile?<div className="stack">
    <div className="userrow"><div className="avatar">{profile.displayName[0]?.toUpperCase()}</div><div><h2 style={{margin:0}}>{profile.displayName} {profile.isVip?"◆":""}</h2><div className="muted">@{profile.username}</div></div></div>
    <p>{profile.bio||"Sem bio ainda."}</p>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><span className="pill">{profile.region||"Região não informada"}</span>{profile.languages.map(v=><span className="pill" key={v}>{v}</span>)}{profile.interests.map(v=><span className="pill" key={v}>{v}</span>)}</div>
  </div>:<div className="empty">Perfil não encontrado.</div>}</div></AppShell>;
}