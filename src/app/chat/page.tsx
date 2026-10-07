import Link from "next/link";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { AppShell } from "@/components/app-shell";
import { ChatThreadClient } from "@/components/chat-thread-client";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversationMembers, conversations, messages, profiles, users } from "@/db/schema";

export const dynamic="force-dynamic";

export default async function ChatPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const session=await requireSession().catch(()=>null);
  if(!session)return <AppShell><div className="card empty"><div><div className="empty-icon">✉</div><strong>Entre para abrir suas conversas.</strong><p>Suas mensagens ficam disponíveis depois que você acessa sua conta.</p><Link className="button compact" href="/login">Entrar</Link></div></div></AppShell>;

  const params=await searchParams;
  const baseConvs=await db.select({id:conversations.id,title:conversations.title,type:conversations.type})
    .from(conversationMembers)
    .innerJoin(conversations,eq(conversationMembers.conversationId,conversations.id))
    .where(eq(conversationMembers.userId,session.userId))
    .limit(50);

  const convIds=baseConvs.map(c=>c.id);
  const peers=convIds.length?await db.select({
    conversationId:conversationMembers.conversationId,
    userId:users.id,username:users.username,displayName:profiles.displayName
  }).from(conversationMembers)
    .innerJoin(users,eq(conversationMembers.userId,users.id))
    .innerJoin(profiles,eq(users.id,profiles.userId))
    .where(and(inArray(conversationMembers.conversationId,convIds),ne(conversationMembers.userId,session.userId)))
    .catch(()=>[]):[];

  const peerByConversation=new Map<string,(typeof peers)[number]>();
  for(const peer of peers)if(!peerByConversation.has(peer.conversationId))peerByConversation.set(peer.conversationId,peer);

  const convs=baseConvs.map(c=>{
    const peer=peerByConversation.get(c.id);
    return {
      ...c,
      displayTitle:c.title??(c.type==="direct"?(peer?.displayName??"Conversa"):"Grupo"),
      subtitle:c.type==="direct"?(peer?"@"+peer.username:"Mensagem direta"):"Grupo privado",
      initial:(c.title??peer?.displayName??"C")[0]?.toUpperCase()??"C"
    };
  });

  const requested=typeof params.conversation==="string"?params.conversation:null;
  const active=(requested&&convs.find(c=>c.id===requested))||convs[0];
  const rows=active?await db.select().from(messages).where(eq(messages.conversationId,active.id)).orderBy(desc(messages.createdAt)).limit(100):[];

  return <AppShell>
    <div className="page-heading">
      <div><span className="eyebrow">MENSAGENS</span><h1>Chat</h1><p className="muted">Converse com seus contatos e grupos com atualização automática.</p></div>
      <Link className="button secondary compact" href="/explore">Nova conversa</Link>
    </div>

    <div className="chat-layout">
      <section className="card chat-sidebar">
        <div className="row between" style={{marginBottom:12}}><strong>Conversas</strong><span className="pill">{convs.length}</span></div>
        <div className="list">
          {convs.length?convs.map(c=><Link className={"conversation-item "+(active?.id===c.id?"is-active":"")} key={c.id} href={"/chat?conversation="+c.id}>
            <div className="avatar sm">{c.initial}</div>
            <div className="conversation-copy"><strong>{c.displayTitle}</strong><span>{c.subtitle}</span></div>
          </Link>):<div className="empty" style={{minHeight:180}}><div><strong>Nenhuma conversa ainda.</strong><p>Encontre alguém em Explorar para começar.</p></div></div>}
        </div>
      </section>

      <section className="card messages">
        <div className="messages-head">
          <div className="userrow">
            <div className="avatar sm">{active?.initial??"M"}</div>
            <div><strong>{active?.displayTitle??"Mensagens"}</strong><div className="muted" style={{fontSize:12}}>{active?.subtitle??"Selecione uma conversa"}</div></div>
          </div>
        </div>
        {!active?<div className="empty"><div><div className="empty-icon">⌁</div><strong>Suas mensagens aparecem aqui.</strong><p>Quando uma conversa for criada, ela ficará disponível neste painel.</p></div></div>:<>
          <div className="message-stream">
            {[...rows].reverse().map(m=><div key={m.id} className={"bubble "+(m.senderId===session.userId?"me":"")}>{m.body??("["+m.type+"]")}</div>)}
            {rows.length===0&&<div className="empty" style={{minHeight:220}}><div><strong>Comece a conversa.</strong><p>Envie a primeira mensagem abaixo.</p></div></div>}
          </div>
          <ChatThreadClient conversationId={active.id}/>
        </>}
      </section>
    </div>
  </AppShell>;
}
