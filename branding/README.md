# Seven Chat — símbolo oficial

Um símbolo próprio composto por **duas curvas de conversa conectadas**, sem número 7, letras nem marcas de terceiros. A mesma geometria é usada em todas as versões.

## Arquivos oficiais sem perda de qualidade

- [Ícone claro (SVG)](seven-chat-icon-light.svg) — degradê azul sobre superfície clara.
- [Ícone escuro (SVG)](seven-chat-icon-dark.svg) — branco e ciano sobre superfície azul-marinho.
- O Android usa **VectorDrawable** no tema claro e escuro, inclusive versões pré-Android 8.
- Android 8+ usa **Adaptive Icon**, com camadas separadas de foreground/background.
- Android 13+ pode usar a variante **monochrome** com a cor escolhida pelo sistema.

Os arquivos SVG são vetoriais e têm `viewBox="0 0 108 108"` e uma área de exportação de **1024 × 1024 pixels**. É possível exportar PNG de 1024/2048/4096 px sem alterar a geometria nem recomprimir uma imagem original. Os PDF exportados de SVG permanecem vetoriais.

### Exportar em alta resolução

Com Inkscape instalado:

```bash
inkscape branding/seven-chat-icon-light.svg --export-type=png --export-width=1024 --export-filename=SevenChat-icon-light.png
inkscape branding/seven-chat-icon-dark.svg --export-type=png --export-width=1024 --export-filename=SevenChat-icon-dark.png
inkscape branding/seven-chat-icon-light.svg --export-type=pdf --export-filename=SevenChat-icon-light.pdf
inkscape branding/seven-chat-icon-dark.svg --export-type=pdf --export-filename=SevenChat-icon-dark.pdf
```

### Homologação visual

`python3 scripts/check_brand.py` valida XML, mesmos traçados vetoriais, temas e integração com o Manifest. O workflow Android executa essa checagem antes de compilar o APK. **Isso não equivale a teste visual em aparelho real, build aprovado ou autorização de release.**

Todo trabalho permanece na [PR #10](https://github.com/gabriell211/seven-chat/pull/10), sem merge na `main` até aprovação de CI e homologação integral.
