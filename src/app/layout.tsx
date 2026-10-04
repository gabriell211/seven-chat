import type { Metadata } from "next";
import "@livekit/components-styles";
import "./globals.css";
export const metadata: Metadata = { title:{default:"Seven Chat",template:"%s · Seven Chat"}, description:"Rede social, chat, salas, lives e comunidade em um só lugar." };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>;}