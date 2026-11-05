# Aetherguide ✦ — companheiro de Black Mage para FFXIV

App para ajudar quem está começando em Final Fantasy XIV, começando pelo **Black Mage**.
Visão completa, ideias e roadmap em [docs/VISAO.md](docs/VISAO.md).

## Rodando

```bash
npm install
npm run dev        # versão web em http://localhost:5173 e overlay em /overlay.html
npm run build      # gera dist/ (abre direto do disco, inclusive no ACT)
```

## App desktop (Windows)

O Aetherguide também roda como aplicativo (Electron), com uma **janela de overlay própria**:
transparente, sempre por cima do jogo e com os cliques passando para o jogo quando travada.

```bash
npm run app:dev    # desenvolvimento: Vite + Electron com recarga automática
npm run app        # build e abre o app
npm run dist:win   # gera release/Aetherguide-<versão>-instalador.exe e -portatil.exe
npm run app:selftest  # abre o app, tira capturas das janelas e confere overlay/bandeja/atalhos
```

- **Atalhos globais:** `Ctrl+Shift+O` mostra/oculta o overlay, `Ctrl+Shift+L` trava/destrava (destravado dá
  para arrastar). Também ficam no ícone da bandeja.
- **Fechar a janela principal** não fecha o overlay; para sair, use a bandeja.
- **Dados do jogo:** vêm do ACT (aba *OverlayPlugin WSServer → Start*) ou do IINACT, pelo WebSocket
  `ws://127.0.0.1:10501/ws`. Sem eles, o overlay fica aguardando e reconecta sozinho. Há um modo demonstração.
- **O FFXIV precisa estar em *Borderless Windowed*.** Em tela cheia exclusiva nenhum overlay aparece por cima.
- O `.exe` não é assinado digitalmente: na primeira vez o Windows pode mostrar "O Windows protegeu o computador" →
  *Mais informações* → *Executar assim mesmo*.
- Configurações (posição do overlay, módulos, fonte de dados) ficam em `%APPDATA%\aetherguide\settings.json`.
- Código em `electron/` (processo principal e preload). O ícone é gerado por `node scripts/make-icon.mjs`.

## O que tem

| Página | O que faz |
|---|---|
| Progressão | Escolha seu nível → rotação certa, habilidades novas e próximos desbloqueios |
| Rotação | Recursos do BLM explicados, loop do nível 100, AoE, movimento, downtime, erros comuns |
| Treinar rotação | Simulador: você escolhe a magia, ele diz se foi a melhor e por quê |
| Analisar logs | Lê uma luta do FFLogs e aponta o que melhorar (tempo parado, Thunder, Polyglot, cooldowns, Ley Lines, mortes) |
| Build & Gear | Atributos, Materia, comida/poção, onde conseguir equipamento |
| Comunicação & RP | Glossário, tradutor de gírias, frases prontas EN↔PT, etiqueta, comandos, guia de RP |
| Ferramentas | Calculadora de GCD (Spell Speed) e checklist diário/semanal com reset automático |
| Overlay | Configura e mostra como instalar o overlay |

## Overlay

`overlay.html` roda dentro do **OverlayPlugin** (ACT ou IINACT):

- No ACT: OverlayPlugin → New → Custom/MiniParse → URL `http://localhost:5173/overlay.html`
  (ou o caminho de `dist/overlay.html` depois do build).
- Via WebSocket: `overlay.html?OVERLAY_WS=ws://127.0.0.1:10501/ws`.
- Para testar sem o jogo: `overlay.html?demo=1`.
- Para escolher módulos: `?modules=coach,gauge,dot,cds,burst,food,chat`.

Com o **cactbot** instalado o gauge vem direto do jogo; sem ele, é estimado pelas magias usadas.
Magias e efeitos são reconhecidos pelo ID oficial do jogo, então funciona com o cliente em qualquer idioma.

## Análise de logs (FFLogs)

A página **Analisar logs** usa a [API v2 do FFLogs](https://www.fflogs.com/api/docs):

1. Crie um cliente em [fflogs.com/api/clients](https://www.fflogs.com/api/clients/) (redirect `http://localhost`,
   sem marcar "Public Client").
2. Cole o Client ID e o Client Secret na página. Eles ficam só no `localStorage` do seu navegador.
3. Cole o link de um relatório público ou não listado e escolha a luta e o jogador.

O botão **Ver um exemplo** mostra a análise de uma luta gerada pelo app (com erros de propósito), sem precisar
de login. Código em `src/analysis/`.

## Dados oficiais e ícones (XIVAPI)

```bash
npm run fetch:xivapi
```

Baixa da [XIVAPI v2](https://v2.xivapi.com) os ícones (`public/icons/`) e os IDs, níveis e recargas oficiais
(`src/data/xivapi.json`), e imprime um relatório comparando com os valores anotados em
`src/data/blm/actions.ts`. Rode depois de cada patch. Os arquivos ficam no repositório, então o app e o overlay
funcionam offline.

## Estrutura

```
src/
  data/blm/        ações, níveis e rotação por faixa (atualize aqui a cada patch)
  data/            glossário e conteúdo de comunicação
  engine/blm.ts    motor de regras do BLM (usado pelo Treinador e pelo overlay)
  pages/           páginas do app
  components/      componentes compartilhados (Gauge)
  overlay/         overlay: conexão com OverlayPlugin, leitura do log, modo demo
```

## Avisos

- Projeto de fã, sem vínculo com a Square Enix. FINAL FANTASY é marca registrada da Square Enix.
  Ícones e dados do jogo © SQUARE ENIX, obtidos via XIVAPI, para uso não comercial.
- Ferramentas de terceiros (ACT, IINACT, overlays) violam os Termos de Serviço do jogo. Use por sua
  conta e risco e nunca comente parses ou overlays no chat.
- Conteúdo de referência: guias da The Balance (patch 7.4) e notas de patch até 7.55.
