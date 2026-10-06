import type { Metadata, Viewport } from "next";
import "@livekit/components-styles";
import "./globals.css";

export const metadata:Metadata={
  title:{default:"Seven Chat",template:"%s · Seven Chat"},
  description:"Rede social, chat, salas, lives e comunidade em um só lugar.",
  applicationName:"Seven Chat",
  category:"social"
};

export const viewport:Viewport={
  themeColor:"#07060a",
  colorScheme:"dark",
  width:"device-width",
  initialScale:1
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="pt-BR"><body>{children}</body></html>;
}
