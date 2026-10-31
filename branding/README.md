# Seven Chat — identidade visual

Símbolo abstrato de conversas conectadas. Sem número 7, texto, marca d'água ou perfis fictícios.

## Prévia vetorial

![Seven Chat modo claro](seven-chat-light.svg)
![Seven Chat modo escuro](seven-chat-dark.svg)

## Arquivos mestres
- `seven-chat-light.svg` e `seven-chat-dark.svg`: ícone vetorial sobre fundo adequado à aparência.
- `seven-chat-light-symbol.svg` e `seven-chat-dark-symbol.svg`: símbolo com fundo transparente, útil para componentes web, splash e materiais gráficos.

Todos são SVG de 1024 × 1024 unidades, com preenchimentos em degradê; podem ser redimensionados sem perda de nitidez. O repositório também contém recursos VectorDrawable para Android, com fallback para versões antigas, ícone adaptativo Android 8+, tema claro/escuro e `monochrome` para ícones temáticos do sistema Android.

A versão Android usa vetores nativos para preservar nitidez; o mestre em SVG mantém o acabamento em degradê. `scripts/check_brand.py` verifica integridade dos recursos. Isso **não** substitui conferir visualmente o ícone em um aparelho real, e não autoriza release sem o restante da homologação.

A implementação está concentrada na PR #10, sem alteração direta na `main` até aprovação.
