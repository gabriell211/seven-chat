import { and, desc, eq, isNull } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { ProfileEditor } from "@/components/profile-editor";
import { PrivacySettings, type DeletionState, type DeviceSession, type ExportState } from "@/components/privacy-settings";
import { accountDeletionRequests, dataExportRequests, profiles, userSessions } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function Settings(){
  const session=await getSession();
  if(!session)return <AppShell><div className="card empty">Entre para acessar as configurações.</div></AppShell>;

  const [sessionRows,exportRows,deletionRows,profileRows]=await Promise.all([
    db.select({id:userSessions.id,deviceName:userSessions.deviceName,platform:userSessions.platform,lastSeenAt:userSessions.lastSeenAt,expiresAt:userSessions.expiresAt})
      .from(userSessions).where(and(eq(userSessions.userId,session.userId),isNull(userSessions.revokedAt))).orderBy(desc(userSessions.lastSeenAt)).limit(50),
    db.select().from(dataExportRequests).where(eq(dataExportRequests.userId,session.userId)).orderBy(desc(dataExportRequests.requestedAt)).limit(1),
    db.select().from(accountDeletionRequests).where(eq(accountDeletionRequests.userId,session.userId)).orderBy(desc(accountDeletionRequests.requestedAt)).limit(1),
    db.select({
      displayName:profiles.displayName,bio:profiles.bio,region:profiles.region,
      languages:profiles.languages,interests:profiles.interests,isPrivate:profiles.isPrivate
    }).from(profiles).where(eq(profiles.userId,session.userId)).limit(1)
  ]);

  const initialSessions:DeviceSession[]=sessionRows.map(s=>({...s,lastSeenAt:s.lastSeenAt.toISOString(),expiresAt:s.expiresAt.toISOString()}));
  const e=exportRows[0];
  const initialExport:ExportState=e?{id:e.id,status:e.status,requestedAt:e.requestedAt.toISOString(),completedAt:e.completedAt?.toISOString()??null,expiresAt:e.expiresAt?.toISOString()??null,download:null}:null;
  const d=deletionRows[0];
  const initialDeletion:DeletionState=d?{id:d.id,status:d.status,scheduledFor:d.scheduledFor.toISOString(),requestedAt:d.requestedAt.toISOString()}:null;
  const profile=profileRows[0];

  return <AppShell>
    <div className="page-heading">
      <div><span className="eyebrow">PREFERÊNCIAS</span><h1>Configurações</h1><p className="muted">Perfil, privacidade, dispositivos e controle dos seus dados.</p></div>
      <span className="pill">@{session.username}</span>
    </div>
    <div className="settings-grid">
      <aside className="card settings-nav">
        <a href="#profile" className="active">Perfil público</a>
        <a href="#devices">Dispositivos</a>
        <a href="#data">Meus dados</a>
        <a href="#account">Conta</a>
      </aside>
      <div className="grid">
        {profile&&<ProfileEditor initial={profile}/>}
        <PrivacySettings initialSessions={initialSessions} initialExport={initialExport} initialDeletion={initialDeletion}/>
      </div>
    </div>
  </AppShell>;
}
