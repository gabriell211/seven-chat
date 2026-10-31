# Seven Chat — Android em Java

Aplicativo Android **nativo em Java**. Projeto independente, sem dependência de geradores proprietários ou camadas externas de marca-d'água.

## Estado real

**Versão 0.1.0 (protótipo local, não produção).** Interface de navegação e funcionalidades locais:
- Feed local: publicações de texto e fotos, curtir, salvar, buscar, comentar e excluir.
- Escolha de foto pelo seletor de documentos Android (permissão persistida da URI).
- Perfil local: editar nome e biografia.
- Telas de mensagens, salas, lives e Seven VIP sinalizadas como **em desenvolvimento**.

**Ainda não implementado:** autenticação real, backend, sincronização, perfis públicos, moderação, mensagens entre pessoas, chamadas, salas de voz, lives, gifts, compras e validação de VIP. Nenhum pagamento fictício ou estado VIP fabricado é permitido.

O SQLite local **não é** um banco de dados compartilhado e **não pode** ser usado para autorizar recursos premium ou armazenar saldos reais.

## Compilação

Requisitos: JDK 17, Android SDK 35 e Gradle 8.9.

```sh
gradle testDebugUnitTest
gradle assembleDebug
```

APK de teste: `app/build/outputs/apk/debug/app-debug.apk`. A workflow Android também executa testes e disponibiliza o APK de depuração como artefato quando aprovada.

## Arquitetura

- `domain/PostRules` — validação e regras puras (testes JVM).
- `data/LocalPostStore` — armazenamento SQLite, com índices e comandos parametrizados.
- `ui/UiKit` — componentes Java reutilizáveis.
- `MainActivity` — navegação local do protótipo.

## Próximas etapas para produção

Criar API Java compatível com autenticação OAuth e sessões, perfis multiusuário, feed com autorização e moderação, realtime para mensagens, mídia com armazenamento seguro, serviço WebRTC para voz e vídeo, verificação de assinaturas na loja e recibos confirmados no backend, notificações e observabilidade. Evoluir o app para camadas de apresentação/serviços/repositórios antes do crescimento do projeto.

## Substituição do projeto anterior

Esta árvore é uma substituição integral do código antigo da branch principal. O histórico Git foi preservado e uma cópia do projeto anterior está em `backup/legacy-before-java-20261031`.
