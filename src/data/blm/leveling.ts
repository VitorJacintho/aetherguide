/**
 * Rotação recomendada por faixa de nível.
 * Baseado no guia de nivelamento da The Balance (marcado como patch 7.4),
 * reescrito em português com dicas para iniciantes.
 */

export interface LevelBracket {
  from: number;
  to: number;
  title: string;
  single: string[];
  aoe?: string[];
  tips: string[];
}

export const LEVEL_BRACKETS: LevelBracket[] = [
  {
    from: 1, to: 34, title: 'Thaumaturge: o básico de Fogo e Gelo',
    single: ['Fire (até o MP ficar baixo)', 'Transpose', 'Blizzard (até o MP encher)', 'Transpose', '↺ repetir'],
    aoe: ['Blizzard II (até o MP encher)', 'Transpose', 'Fire II ×3', 'Transpose', '↺ repetir'],
    tips: [
      'Mantenha o Thunder no alvo. Renove só quando faltar menos de 3 s.',
      'Em Astral Fire o fogo bate mais forte mas gasta o dobro de MP; em Umbral Ice o MP volta.',
      'Faça as quests da guilda de Thaumaturge (Ul\'dah) — elas ensinam e dão equipamento.',
    ],
  },
  {
    from: 35, to: 57, title: 'Fire III e Blizzard III',
    single: ['Blizzard III', 'Blizzard (até o MP encher)', 'Fire III', 'Fire (até o MP ficar baixo)', '↺ repetir'],
    aoe: ['35–39: Blizzard II ×2 → Fire II ×4', '40–49: em Umbral Ice, Freeze sem parar', '50–57: Freeze ×2 → Transpose → Fire II → Flare → Transpose'],
    tips: [
      'Firestarter (Fire III instantâneo e grátis): use quando aparecer, sem cancelar uma magia no meio.',
      'Sem inimigo para atacar? Fique em Umbral Ice e use Umbral Soul.',
      'Slidecast: você pode começar a andar no finalzinho da barra de conjuração (~0,5 s antes de acabar).',
    ],
  },
  {
    from: 58, to: 59, title: 'Blizzard IV e Umbral Hearts',
    single: ['Blizzard III', 'Blizzard IV', 'Fire III', 'Fire (até o MP ficar baixo)', '↺ repetir'],
    aoe: ['Em Umbral Ice: Freeze', 'filler (Thunder II / Freeze)', 'Transpose', 'Flare ×2', 'Transpose'],
    tips: ['Blizzard IV substitui o Blizzard: dá 3 Umbral Hearts, que deixam as magias de fogo mais baratas.'],
  },
  {
    from: 60, to: 71, title: 'Fire IV vira sua principal magia',
    single: ['Blizzard III', 'Blizzard IV', 'Fire III', 'Fire IV ×7 (até o MP acabar)', '↺ repetir'],
    aoe: ['Em Umbral Ice: Freeze', 'Foul / Thunder II', 'Transpose', 'Flare ×2', 'Transpose'],
    tips: [
      'Nível 70: Foul gasta Polyglot. Use sempre que tiver — não deixe transbordar.',
      'Ley Lines (52) e Triplecast (66): use Ley Lines quando o chefe vai ficar parado; Triplecast para se mover.',
    ],
  },
  {
    from: 72, to: 79, title: 'Despair fecha a fase de fogo',
    single: ['Blizzard III', 'Blizzard IV', 'Fire III', 'Fire IV ×7', 'Despair', '↺ repetir'],
    aoe: ['Em Umbral Ice: Freeze', 'Foul / Thunder IV', 'Transpose', 'Flare ×2', 'Transpose'],
    tips: ['Despair gasta todo o MP que sobrou — é sempre a última magia de fogo antes do gelo.'],
  },
  {
    from: 80, to: 89, title: 'Xenoglossy e movimento',
    single: ['Blizzard III', 'Blizzard IV', 'Fire III', 'Fire IV ×7', 'Despair', '↺ repetir (Xenoglossy quando precisar se mover ou o Polyglot for transbordar)'],
    aoe: ['Em Umbral Ice: Freeze', 'Foul / Thunder IV', 'Transpose', 'Flare ×2', 'Transpose'],
    tips: [
      'Xenoglossy substitui o Foul em alvo único. É instantâneo: ótimo para mecânicas de movimento.',
      'Nível 86: Amplifier dá 1 Polyglot. Use quando não for transbordar.',
    ],
  },
  {
    from: 90, to: 99, title: 'Paradox',
    single: ['Blizzard III', 'Blizzard IV', 'Paradox', 'Fire III', 'Fire IV ×3', 'Paradox', 'Fire IV ×3', 'Despair', '↺ repetir'],
    aoe: ['Em Umbral Ice: Freeze', 'Foul / High Thunder II', 'Transpose', 'Flare ×2', 'Transpose'],
    tips: [
      'O Paradox é instantâneo e pode mudar de lugar dentro da fase de fogo para ajudar no movimento.',
      'Paradox em Astral Fire dá Firestarter: um Fire III grátis e instantâneo.',
      'Nível 96: Retrace move o Ley Lines para onde você está.',
    ],
  },
  {
    from: 100, to: 100, title: 'Nível máximo: Flare Star',
    single: ['Blizzard III', 'Blizzard IV', 'Paradox', 'Fire III', 'Fire IV ×3', 'Paradox', 'Fire IV ×3', 'Flare Star', 'Despair', '↺ repetir'],
    aoe: ['Em Umbral Ice: Freeze', 'Foul / High Thunder II', 'Transpose', 'Flare ×2', 'Flare Star', 'Transpose'],
    tips: [
      'Cada Fire IV dá 1 Astral Soul; com 6 você libera o Flare Star.',
      'Flare Star e Despair podem trocar de ordem se você precisar se mover.',
      'Manafont depois do Despair permite mais uma fase de fogo completa.',
    ],
  },
];

export function bracketFor(level: number): LevelBracket {
  return LEVEL_BRACKETS.find((b) => level >= b.from && level <= b.to) ?? LEVEL_BRACKETS[0];
}

export const LEVELING_TIPS: { title: string; text: string }[] = [
  { title: 'Roleta de Leveling', text: 'Uma vez por dia dá muita EXP. Faça sempre que puder.' },
  { title: 'Missão principal (MSQ)', text: 'Dá bastante EXP e libera conteúdo. Muitas vezes é o suficiente para subir.' },
  { title: 'Duty Support / Trust', text: 'Faça dungeons com NPCs se ainda estiver inseguro para jogar com pessoas.' },
  { title: 'Bônus do Armoury', text: 'Classes abaixo do seu nível mais alto ganham EXP extra.' },
  { title: 'Deep Dungeons', text: 'Palace of the Dead (1–60), Heaven-on-High (60–70) e Eureka Orthos (81–90) são ótimos para subir nível.' },
  { title: 'FATEs e Hunting Log', text: 'Boas para preencher a barra entre uma dungeon e outra.' },
];
