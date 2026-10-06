# Seven Chat — LIVE Parity Matrix

Atualizado em: 2026-10-06

Objetivo: usar a experiência do TikTok LIVE como referência funcional e de fluxo, sem copiar marca, identidade visual, assets ou código proprietário.

## Estados

- ✅ implementado e ligado ao backend real
- 🟡 implementação parcial / exige refinamento
- 🔴 ainda não implementado
- ⚙️ backend já existe, UI ainda incompleta

## 1. Descoberta de LIVEs

| Recurso | Seven |
| --- | --- |
| Grade de LIVEs ativas | ✅ |
| Card com host, título, categoria e público | ✅ |
| Abrir LIVE em experiência imersiva | ✅ |
| Deep link /lives?live=<id> | ✅ |
| Filtros visuais de descoberta | 🟡 |
| Ranking real por popularidade | 🔴 |
| Recomendação personalizada | 🔴 |
| Seguindo / recomendadas com ranking real | 🔴 |

## 2. Pré-LIVE do criador

| Recurso | Seven |
| --- | --- |
| Título | ✅ |
| Categoria | ✅ |
| Estúdio antes de iniciar | ✅ |
| Checagem de RTC | 🟡 |
| Preview real de câmera antes de iniciar | 🔴 |
| Escolher câmera/microfone antes de iniciar | 🔴 |
| Permissão de pedidos de convidados | 🔴 |
| Ativar/desativar comentários | 🔴 |
| Filtro de palavras / comentários | 🔴 |
| Ativar/desativar gifts | 🔴 |
| Restrição etária da LIVE | 🔴 |
| Adicionar moderadores antes da LIVE | 🟡 |
| Capa/thumbnail específica | 🔴 |

## 3. Palco — espectador

| Recurso | Seven |
| --- | --- |
| Vídeo full-screen | ✅ |
| Header do host | ✅ |
| Seguir host | ✅ |
| Contagem de participantes via RTC | ✅ |
| Título/categoria sobrepostos | ✅ |
| Comentários sobre o vídeo | ✅ |
| Enviar comentário | ✅ |
| Comentário fixado | ✅ |
| Presentes reais | ✅ |
| Compartilhar LIVE | ✅ |
| Pedir para participar | ✅ |
| Aceitar convite para participar | ✅ |
| Sair da LIVE | ✅ |
| Mega Fã via diamantes | ✅ |
| Likes rápidos/contador de likes | 🔴 |
| Gift animation full-screen | 🟡 |
| Ranking de contribuidores | 🔴 |
| Badge persistente de Mega Fã nos comentários | 🔴 |
| Entrada destacada de Mega Fã | 🔴 |

## 4. Palco — host

| Recurso | Seven |
| --- | --- |
| Publicar câmera/microfone via RTC | ✅ |
| Encerrar LIVE | ✅ |
| Convidar pessoa | ✅ |
| Receber pedido de participação | ✅ |
| Aceitar pedido | ✅ |
| Remover convidado | ✅ |
| Até 4 convidados | ✅ |
| Layout grade | ✅ |
| Layout painel/foco | ✅ |
| Criar batalha | ✅ |
| Receber convite de batalha | ✅ |
| Aceitar/recusar batalha | ✅ |
| Encerrar batalha | ✅ |
| Placar e cronômetro | ✅ |
| Gifts pontuam batalha | ✅ |
| Gerenciar moderadores | ✅ |
| Fixar comentário | ✅ |
| Apagar comentário | ✅ |
| Banir espectador | ✅ |
| Silenciar temporariamente | 🔴 |
| Desbanir pela UI | 🔴 |
| Filtrar palavras | 🔴 |
| Desativar comentários | 🔴 |
| Desativar gifts | 🔴 |
| Efeitos/stickers/filtros de câmera | 🔴 |
| Flip de câmera | 🟡 via controle do RTC/dispositivo |

## 5. Convidado / co-host

| Recurso | Seven |
| --- | --- |
| Convite do host | ✅ |
| Pedido do espectador | ✅ |
| Aceitar/recusar | ✅ |
| Publicação de áudio/vídeo | ✅ |
| Sair do palco | ✅ |
| Host remover | ✅ |
| Limite de participantes | ✅ |
| Layout adaptativo | ✅ |
| Tela de preview antes de entrar | 🔴 |
| Escolha câmera/mic antes de entrar | 🔴 |
| Gifts direcionados a convidado | 🔴 |
| Co-host entre duas LIVEs com vídeo cruzado | 🟡 |
| Recomendações automáticas de co-host | 🔴 |

## 6. Batalhas

| Recurso | Seven |
| --- | --- |
| Convite entre LIVEs | ✅ |
| Aceitar/recusar | ✅ |
| Duração configurada pelo backend | ✅ |
| Placar real | ✅ |
| Gifts adicionam pontos | ✅ |
| Timer | ✅ |
| Encerrar | ✅ |
| Vencedor persistido | ✅ |
| Likes adicionam pontos | 🔴 |
| Batalha solo/time | 🟡 apenas 1x1 atualmente |
| Gift específico como regra de partida | 🔴 |
| Vídeo simultâneo da LIVE adversária no mesmo palco | 🔴 |

## 7. Moderação e segurança

| Recurso | Seven |
| --- | --- |
| Adicionar/remover moderador | ✅ |
| Apagar comentário | ✅ |
| Fixar comentário | ✅ |
| Banir usuário da LIVE | ✅ |
| Banimentos impedem comentários | ✅ |
| Realtime de ações de moderação | ✅ |
| Silenciamento temporário | 🔴 |
| Filtro por palavras-chave | 🔴 |
| Filtro automático de comentários | 🔴 |
| Reportar comentário pela UI | 🔴 |
| Configuração de audiência adulta | 🔴 |

## 8. Gifts e economia

| Recurso | Seven |
| --- | --- |
| Catálogo de gifts | ✅ |
| Preço em diamantes | ✅ |
| Saldo validado no servidor | ✅ |
| Idempotência | ✅ |
| Gift durante LIVE | ✅ |
| Gift contabiliza batalha | ✅ |
| Animação 3D quando asset permitir | 🟡 |
| Gift combo | 🔴 |
| Gift box / caixa de presentes | 🔴 |
| Ranking de presenteadores | 🔴 |
| Resumo financeiro pós-LIVE | 🔴 |

## 9. Mega Fã / Fan Club

| Recurso | Seven |
| --- | --- |
| Produto Mega Fã | ✅ |
| Compra com diamantes | ✅ |
| Vínculo fã → criador | ✅ |
| Prazo de assinatura | ✅ |
| Entrada pelo palco da LIVE | ✅ |
| Badge persistente no chat LIVE | 🔴 |
| Níveis do fã-clube | 🔴 |
| Missões por assistir/comentar/presentear | 🔴 |
| Chat exclusivo | 🔴 |
| Entrada destacada | 🔴 |

## 10. Pós-LIVE

| Recurso | Seven |
| --- | --- |
| Status ended | ✅ |
| endedAt | ✅ |
| Pico de espectadores | ⚙️ campo existe |
| Resumo pós-LIVE | ✅ |
| Total de comentários | ✅ |
| Total de gifts/diamantes | ✅ |
| Novos seguidores | ✅ |
| Replay/recording | 🔴 |
| Download replay | 🔴 |
| Criar clipe de replay | 🔴 |
| Excluir replay | 🔴 |
| Retenção configurável | 🔴 |

## 11. Realtime / infraestrutura

| Recurso | Seven |
| --- | --- |
| RTC LiveKit | ✅ |
| Realtime websocket próprio | ✅ |
| Canal live:<id> | ✅ |
| Evento de comentários | ✅ |
| Evento de convidados | ✅ |
| Evento de batalha | ✅ |
| Evento de gift | ✅ |
| Fallback por polling | ✅ |
| Tracking real de viewerCount no banco | 🔴 |
| Reconexão visual refinada | 🟡 |
| Qualidade adaptativa/indicador de rede | 🔴 |

## 12. Mobile

| Recurso | Seven |
| --- | --- |
| Web responsiva estilo app | ✅ |
| App mobile com listagem Lives/Salas | ⚙️ |
| App mobile com palco RTC completo | 🔴 |
| Comentários/gifts no app mobile | 🔴 |
| Multi-guest no app mobile | 🔴 |
| Batalha no app mobile | 🔴 |
| Moderação no app mobile | 🔴 |

## Ordem de implementação restante

1. Finalizar build e validação visual do palco web.
2. Likes reais e pontuação de likes nas batalhas.
3. Configurações pré-LIVE: comentários, gifts, requests, filtro de palavras e audiência.
4. Preview real de câmera/mic antes de iniciar/entrar como guest.
5. Ranking de gifts e animações.
6. Mega Fã: badges, missões, níveis e entrada destacada.
7. Batalha com vídeo cruzado + solo/time + regras de gift específico.
8. Resumo pós-LIVE.
9. Recording/replay + clips.
10. Levar a mesma experiência para o app mobile.
