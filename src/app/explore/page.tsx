import Link from "next/link";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { profiles, users } from "@/db/schema";

export const dynamic="force-dynamic";

export default async function Explore({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const p=await searchParams;
  const q=typeof p.q==="string"?p.q.trim().slice(0,80):"";
  let people:Array<{id:string;username:string;displayName:string;region:string|null;isVip:boolean;interests:string[]}>=[];

  if(process.env.DATABASE_URL){
    try{
      const pattern="%"+q.replace(/[%_]/g,"")+"%";
      people=await db.select({
        id:users.id,username:users.username,displayName:profiles.displayName,
        region:profiles.region,isVip:profiles.isVip,interests:profiles.interests
      }).from(users)
        .innerJoin(profiles,eq(users.id,profiles.userId))
        .where(and(
          eq(users.status,"active"),
          eq(profiles.isPrivate,false),
          q.length>=2?or(ilike(users.username,pattern),ilike(profiles.displayName,pattern),ilike(profiles.bio,pattern)):undefined
        ))
        .orderBy(desc(users.createdAt))
        .limit(24);
    }catch{}
  }

  return <AppShell>
    <div className="page-heading">
      <div><span className="eyebrow">DESCOBRIR</span><h1>Explorar</h1><p className="muted">Encontre pessoas e espaços que combinam com você.</p></div>
      <div className="section-tabs"><span className="section-tab active">Pessoas</span><Link className="section-tab" href="/rooms">Salas</Link><Link className="section-tab" href="/lives">Lives</Link></div>
    </div>

    <form className="explore-search" method="get">
      <input className="input" name="q" defaultValue={q} placeholder="Buscar por nome, @usuário ou bio..." />
      <button className="button">Buscar</button>
    </form>

    {q&&<div className="explore-result-meta"><span className="muted">Resultados para</span> <strong>“{q}”</strong></div>}

    {people.length?<div className="feature-grid">{people.map(person=><Link className="feature-tile person-card" key={person.id} href={"/u/"+person.username}>
      <div className="row">
        <div className="avatar">{person.displayName[0]?.toUpperCase()}</div>
        <div style={{minWidth:0}}><strong>{person.displayName} {person.isVip?"◆":""}</strong><div className="muted" style={{fontSize:12}}>@{person.username}</div></div>
      </div>
      <div>
        <p>{person.region||"Região não informada"}</p>
        <div className="row" style={{flexWrap:"wrap",gap:6}}>{person.interests.slice(0,3).map(v=><span className="pill" key={v}>{v}</span>)}</div>
      </div>
      <span className="person-card-cta">Ver perfil →</span>
    </Link>)}</div>:<div className="card empty"><div><div className="empty-icon">⌕</div><strong>{q?"Nenhum perfil encontrado.":"A comunidade está começando."}</strong><p>{q?"Tente outro nome ou usuário.":"Novos perfis públicos aparecerão aqui conforme forem entrando no Seven Chat."}</p></div></div>}
  </AppShell>;
}
