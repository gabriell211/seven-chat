import { AppShell } from "@/components/app-shell";
import { PrivacySettings } from "@/components/privacy-settings";
import { getSession } from "@/lib/auth";

export default async function Settings(){
  const session=await getSession();
  return <AppShell>{session?<div className="grid"><div className="card"><h2>Configurações</h2><p className="muted">Privacidade, segurança, dispositivos, exportação e exclusão de conta.</p></div><PrivacySettings/></div>:<div className="card empty">Entre para acessar as configurações.</div>}</AppShell>;
}