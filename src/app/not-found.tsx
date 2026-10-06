import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function NotFound(){
  return <AppShell><div className="card empty"><div><div className="empty-icon">404</div><strong>Essa página não está por aqui.</strong><p>O endereço pode ter mudado ou o conteúdo não existe mais.</p><Link className="button compact" href="/">Voltar ao início</Link></div></div></AppShell>;
}
