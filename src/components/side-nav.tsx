"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName =
  | "home"
  | "search"
  | "reels"
  | "live"
  | "rooms"
  | "chat"
  | "bell"
  | "wallet"
  | "vip"
  | "profile"
  | "settings";

const items: Array<{ href: string; label: string; icon: IconName; mobile?: boolean }> = [
  { href: "/", label: "Início", icon: "home", mobile: true },
  { href: "/explore", label: "Explorar", icon: "search", mobile: true },
  { href: "/reels", label: "Reels", icon: "reels", mobile: true },
  { href: "/lives", label: "Lives", icon: "live" },
  { href: "/rooms", label: "Salas", icon: "rooms" },
  { href: "/chat", label: "Chat", icon: "chat", mobile: true },
  { href: "/notifications", label: "Notificações", icon: "bell" },
  { href: "/wallet", label: "Carteira", icon: "wallet" },
  { href: "/vip", label: "VIP", icon: "vip" },
  { href: "/profile", label: "Perfil", icon: "profile", mobile: true },
  { href: "/settings", label: "Configurações", icon: "settings" },
];

function Icon({ name }: { name: IconName }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name) {
    case "home": return <svg {...common}><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></svg>;
    case "search": return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "reels": return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="4"/><path d="m4 8 16 0"/><path d="m9 3 3 5"/><path d="m14 3 3 5"/><path d="m10 12 5 3-5 3z"/></svg>;
    case "live": return <svg {...common}><path d="M8.6 16.4a6.2 6.2 0 0 1 0-8.8"/><path d="M15.4 7.6a6.2 6.2 0 0 1 0 8.8"/><path d="M5.2 19.8a11 11 0 0 1 0-15.6"/><path d="M18.8 4.2a11 11 0 0 1 0 15.6"/><circle cx="12" cy="12" r="2"/></svg>;
    case "rooms": return <svg {...common}><circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M3.5 20c.6-4 2.6-6 4.5-6s3.9 2 4.5 6"/><path d="M12.2 16.3c1-1.5 2.4-2.3 3.8-2.3 1.9 0 3.9 2 4.5 6"/></svg>;
    case "chat": return <svg {...common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 2 1.6-4.2A7 7 0 0 1 3 12V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 10h8M8 14h5"/></svg>;
    case "bell": return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;
    case "wallet": return <svg {...common}><path d="M4 6h14a2 2 0 0 1 2 2v10H6a2 2 0 0 1-2-2z"/><path d="M4 6V5a2 2 0 0 1 2-2h10"/><path d="M16 11h4v4h-4a2 2 0 1 1 0-4"/></svg>;
    case "vip": return <svg {...common}><path d="m3 8 4-4 5 4 5-4 4 4-4 11H7z"/><path d="M7 14h10"/></svg>;
    case "profile": return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-5 3.5-8 8-8s7.2 3 8 8"/></svg>;
    case "settings": return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1z"/></svg>;
  }
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="Navegação principal">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${active ? "is-active" : ""} ${item.mobile ? "mobile-core" : ""}`}
          >
            <span className="nav-icon"><Icon name={item.icon} /></span>
            <span className="nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
