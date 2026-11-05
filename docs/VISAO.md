# Aetherguide — visão do produto

> Nome provisório. Um companheiro para quem está começando em Final Fantasy XIV,
> começando pelo **Black Mage (BLM)**.

## 1. Problema

FFXIV é enorme e pouco amigável para quem chega agora:

- O Black Mage tem um ciclo Fogo/Gelo com vários recursos (Umbral Hearts, Polyglot,
  Paradox, Astral Soul, Thunderhead…) que o jogo explica mal.
- A rotação muda conforme o nível — o que você faz no nível 40 é diferente do 90.
- Não há cliente em português; a comunidade usa muitas gírias em inglês (`o/`, `tyfp`,
  `LB`, `W2W`, `sprout`…) e tem regras sociais próprias (etiqueta de dungeon, RP IC/OOC).
- Equipamento confunde iniciantes (ex.: usar gear "of Healing" em vez de "of Casting",
  melhorar Piety em vez de Critical Hit).

## 2. Público

1. **Iniciante absoluto** que escolheu Thaumaturge/Black Mage.
2. **Jogador casual** que chegou ao nível máximo mas sente que "joga errado".
3. **Jogador brasileiro** com barreira de inglês no chat e no RP.

## 3. Pilares

| Pilar | Pergunta que responde | Onde fica |
|---|---|---|
| **Aprender** | "O que eu aperto no meu nível?" | Progressão, Rotação, Treino |
| **Equipar** | "Que stats e equipamento eu uso?" | Build |
| **Comunicar** | "O que significa isso no chat? Como falo com o grupo?" | Comunicação |
| **Jogar melhor** | "Estou fazendo certo agora?" | Overlay |
| **Rotina** | "O que eu faço hoje?" | Ferramentas → checklist |

## 4. Funcionalidades

### MVP (o que este repositório já entrega)

- **Progressão por nível**: digite seu nível e veja a rotação certa, o que desbloqueou e o
  que vem a seguir.
- **Rotação explicada**: cada recurso do BLM explicado em português, loop do nível 100,
  AoE, movimentação, downtime e erros comuns.
- **Treinador de rotação**: um simulador simplificado; você escolhe a próxima magia e o app
  diz se foi a melhor escolha e por quê.
- **Build**: stats, matéria, comida/poção, onde conseguir equipamento.
- **Comunicação**: glossário pesquisável, frases prontas EN↔PT, etiqueta e guia de RP.
- **Ferramentas**: calculadora de GCD (Spell Speed), checklist diário/semanal com reset
  automático no horário de Brasília.
- **Overlay (protótipo)**: página HTML compatível com OverlayPlugin (ACT/IINACT), com modo
  demonstração.

### Próximas fases

1. ~~**Ícones e dados oficiais** via XIVAPI~~ ✅ feito: ícones, IDs do jogo (overlay em qualquer idioma) e
   conferência automática de níveis/recargas (`npm run fetch:xivapi`).
2. **Perfil do personagem** (Lodestone): puxar nível do BLM e equipamento atual.
3. ~~**Análise de log** (FFLogs API)~~ ✅ primeira versão: tempo conjurando, Thunder, Polyglot,
   cooldowns, Ley Lines, Flare Star/Despair, magias canceladas, poções, mortes e linha do tempo.
   Próximos passos: comparar com o melhor parse da mesma luta e explicar mecânicas por timestamp.
4. **Guia de dungeon/trial**: mecânicas de cada conteúdo em linguagem simples, com foco no
   que o BLM precisa fazer (onde colocar Ley Lines, quando usar Addle).
5. **App desktop** (Tauri ou Electron): ícone na bandeja, janela de overlay própria e
   atalhos globais para frases prontas.
6. **Outros jobs**: a estrutura de dados (`src/data/blm`, `src/engine/blm.ts`) foi feita
   para ser repetida por job.

## 5. Ideias de overlay

Todas usam o **OverlayPlugin** (ACT ou IINACT), que entrega eventos do jogo para uma
página HTML. Marcadas com ✅ as que o protótipo já faz.

### Combate (BLM)
- ✅ **Gauge simplificado**: Fogo/Gelo e stacks, Umbral Hearts, Astral Soul (0–6),
  Polyglot, Paradox, barra de MP mostrando quantos Fire IV ainda cabem.
- ✅ **Coach "próximo passo"**: uma linha dizendo a próxima magia sugerida e o porquê
  ("Astral Soul 6/6 → Flare Star").
- ✅ **Timer do Thunder** no alvo, com alerta quando faltar menos de 3 s.
- ✅ **Cooldowns**: Ley Lines (2 cargas), Triplecast (2 cargas), Swiftcast, Manafont,
  Amplifier.
- ✅ **Alerta de janela de burst**: quando buffs de grupo (Divination, Battle Litany,
  Technical Finish…) estão ativos, lembra de gastar o Polyglot guardado.
- **Medidor "ABC" (Always Be Casting)**: % de tempo conjurando; mostra quando você ficou
  parado sem motivo.
- **Detector de erros ao vivo**: Polyglot transbordando, Fire IV sem MP para o Despair,
  Thunder caindo.
- **Lembrete de mecânicas**: integrar com timelines do cactbot para avisar "movimento em
  5 s — guarde Xenoglossy/Triplecast".

### Comunicação
- ✅ **Tradutor de gírias do chat**: quando alguém escreve `tyfp`, `LB pls`, `W2W`, aparece
  um balão explicando.
- **Frases rápidas**: atalho que copia uma frase pronta em inglês para colar no chat.
- **Aviso de "primeira vez"**: detectar quando você é sprout/first-timer e sugerir avisar
  o grupo.

### Qualidade de vida
- ✅ **Lembrete de comida** (Well Fed acabando ou ausente).
- **Lembrete de reparo/spiritbond**, **checklist do dia** (roulettes pendentes) num canto
  da tela fora de combate.
- **DPS pessoal discreto** (só para você; nunca comente parses no chat do jogo).

## 6. Arquitetura

```
┌─────────────────────────┐        ┌──────────────────────────┐
│  App (React + Vite)     │        │  Overlay (overlay.html)  │
│  guias, treino, build   │        │  roda dentro do ACT/IINACT│
└──────────┬──────────────┘        └──────────┬───────────────┘
           │   compartilham                    │
           ▼                                   ▼
   src/data/*   (dados do job, glossário)   src/overlay/overlayApi.ts
   src/engine/blm.ts (motor de regras)  ◀── eventos: LogLine, ChangePrimaryPlayer,
                                             onPlayerChangedEvent (cactbot)
```

- **Dados versionados por patch** em `src/data` — quando o jogo mudar, só os dados mudam.
- **Motor de regras** (`src/engine/blm.ts`): o mesmo código alimenta o Treinador e o
  Coach do overlay.
- **Overlay sem dependência de memória do jogo**: só lê o que o OverlayPlugin entrega
  (linhas de log e, se o cactbot estiver instalado, o gauge do job).

## 7. Riscos e cuidados

- **Termos de Serviço**: ferramentas de terceiros (ACT, IINACT) violam os ToS da Square
  Enix. Na prática, punições acontecem quando o jogador expõe o uso (ex.: criticar o DPS
  dos outros). O app avisa isso e nunca incentiva comentar parses.
- **Patches mudam o BLM**: o conteúdo indica o patch de referência e linka as fontes.
- **Simplificações**: o Treinador usa valores de MP aproximados; o objetivo é ensinar a
  ordem das magias, não números exatos.

## 8. Fontes de referência

- The Balance — guia básico, nivelamento e openers do BLM (marcados como patch 7.4).
- Icy Veins — mudanças do BLM no Dawntrail.
- Lodestone — notas oficiais de patch (sempre a fonte final).
