import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { db } from "@/lib/db";
import { profiles, users } from "@/db/schema";

export const dynamic="force-dynamic";

export default async function Explore(){
  let people:Array<{id:string;username:string;displayName:string;region:string|null;isVip:boolean;interests:string[]}>=[];

  if(process.env.DATABASE_URL){
    try{
      people=await db.select({
        id:users.id,username:users.username,displayName:profiles.displayName,
        region:profiles.region,isVip:profiles.isVip,interests:profiles.interests
      }).from(users)
        .innerJoin(profiles,eq(users.id,profiles.userId))
        .where(and(eq(users.status,"active"),eq(profiles.isPrivate,false)))
        .orderBy(desc(users.createdAt))
        .limit(18);
    }catch{}
  }

  return <AppShell>
    <div className="page-heading">
      <div><span className="eyebrow">DESCOBRIR</span><h1>Explorar</h1><p className="muted">Encontre pessoas e espaços que combinam com você.</p></div>
      <div className="section-tabs"><span className="section-tab active">Pessoas</span><Link className="section-tab" href="/rooms">Salas</Link><Link className="section-tab" href="/lives">Lives</Link></div>
    </div>

    {people.length?<div className="feature-grid">{people.map(person=><article className="feature-tile" key={person.id}>
      <div className="row">
        <div className="avatar">{person.displayName[0]?.toUpperCase()}</div>
        <div style={{minWidth:0}}><strong>{person.displayName} {person.isVip?"◆":""}</strong><div className="muted" style={{fontSize:12}}>@{person.username}</div></div>
      </div>
      <div>
        <p>{person.region||"Região não informada"}</p>
        <div className="row" style={{flexWrap:"wrap",gap:6}}>{person.interests.slice(0,3).map(v=><span className="pill" key={v}>{v}</span>)}</div>
      </div>
    </article>)}</div>:<div className="card empty"><div><div className="empty-icon">⌕</div><strong>A comunidade está começando.</strong><p>Novos perfis públicos aparecerão aqui conforme forem entrando no Seven Chat.</p></div></div>}
  </AppShell>;
}