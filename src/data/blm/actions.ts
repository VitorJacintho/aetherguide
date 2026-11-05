/**
 * Ações do Thaumaturge / Black Mage (Dawntrail, referência patch 7.4–7.55).
 * Os nomes ficam em inglês porque o jogo não tem cliente em português
 * e é assim que a comunidade se refere a eles.
 *
 * Ao atualizar para um patch novo, confira níveis e recargas no Lodestone.
 */

export type ActionKind = 'GCD' | 'oGCD' | 'Role';
export type Aspect = 'fire' | 'ice' | 'thunder' | 'unaspected' | 'utility';

export interface BlmAction {
  id: string;
  name: string;
  level: number;
  kind: ActionKind;
  aspect: Aspect;
  aoe?: boolean;
  /** recarga em segundos (apenas oGCD/Role) */
  recast?: number;
  charges?: number;
  short: string;
  tip?: string;
}

export const BLM_ACTIONS: BlmAction[] = [
  { id: 'blizzard', name: 'Blizzard', level: 1, kind: 'GCD', aspect: 'ice',
    short: 'Magia de gelo básica. No início, serve para recuperar MP e entrar em Umbral Ice.' },
  { id: 'fire', name: 'Fire', level: 2, kind: 'GCD', aspect: 'fire',
    short: 'Magia de fogo básica. Dá Astral Fire e, nos níveis baixos, pode dar o proc Firestarter.' },
  { id: 'transpose', name: 'Transpose', level: 4, kind: 'oGCD', aspect: 'utility', recast: 5,
    short: 'Troca Astral Fire ↔ Umbral Ice sem gastar GCD.',
    tip: 'Nos níveis baixos é o coração da rotação. No nível alto, use para downtime e para AoE.' },
  { id: 'thunder', name: 'Thunder', level: 6, kind: 'GCD', aspect: 'thunder',
    short: 'Dano + dano contínuo (DoT). No Dawntrail precisa do buff Thunderhead.',
    tip: 'Renove só quando faltar menos de 3 s no alvo.' },
  { id: 'addle', name: 'Addle', level: 8, kind: 'Role', aspect: 'utility', recast: 90,
    short: 'Reduz o dano causado pelo inimigo (mais forte contra dano mágico).',
    tip: 'Combine com o grupo antes de raidwides (ataques em toda a party).' },
  { id: 'sleep', name: 'Sleep', level: 10, kind: 'Role', aspect: 'utility',
    short: 'Coloca inimigos para dormir. Quase não é usado em conteúdo de grupo.' },
  { id: 'blizzard2', name: 'Blizzard II', level: 12, kind: 'GCD', aspect: 'ice', aoe: true,
    short: 'Gelo em área ao seu redor.' },
  { id: 'lucid', name: 'Lucid Dreaming', level: 14, kind: 'Role', aspect: 'utility', recast: 60,
    short: 'Regenera MP. Para o BLM quase não serve: Astral Fire bloqueia a regeneração.' },
  { id: 'scathe', name: 'Scathe', level: 15, kind: 'GCD', aspect: 'unaspected',
    short: 'Instantâneo e fraco. Último recurso para se mover sem perder GCD.' },
  { id: 'fire2', name: 'Fire II', level: 18, kind: 'GCD', aspect: 'fire', aoe: true,
    short: 'Fogo em área no alvo.' },
  { id: 'swiftcast', name: 'Swiftcast', level: 18, kind: 'Role', aspect: 'utility', recast: 60,
    short: 'Torna a próxima magia instantânea. Recarga cai para 40 s no nível 94.',
    tip: 'Sua principal ferramenta de movimento junto com Triplecast.' },
  { id: 'thunder2', name: 'Thunder II', level: 26, kind: 'GCD', aspect: 'thunder', aoe: true,
    short: 'Thunder em área (DoT em vários alvos).' },
  { id: 'manaward', name: 'Manaward', level: 30, kind: 'oGCD', aspect: 'utility', recast: 120,
    short: 'Escudo pessoal. Use antes de dano forte que vai atingir você.' },
  { id: 'manafont', name: 'Manafont', level: 30, kind: 'oGCD', aspect: 'utility', recast: 120,
    short: 'Restaura todo o MP (só em Astral Fire). No nível alto também dá Umbral Hearts, Thunderhead e Paradox. Recarga cai para 100 s no nível 84.',
    tip: 'Use no fim da fase de fogo, depois do Despair, para fazer outra fase de fogo.' },
  { id: 'fire3', name: 'Fire III', level: 35, kind: 'GCD', aspect: 'fire',
    short: 'Leva direto para Astral Fire III. É como você entra na fase de fogo.' },
  { id: 'blizzard3', name: 'Blizzard III', level: 35, kind: 'GCD', aspect: 'ice',
    short: 'Leva direto para Umbral Ice III. É como você entra na fase de gelo.' },
  { id: 'umbralSoul', name: 'Umbral Soul', level: 35, kind: 'GCD', aspect: 'ice',
    short: 'Só funciona em Umbral Ice e sem alvo: mantém o gelo e recupera recursos no downtime.',
    tip: 'Quando o chefe some, faça Transpose para o gelo e use Umbral Soul.' },
  { id: 'freeze', name: 'Freeze', level: 40, kind: 'GCD', aspect: 'ice', aoe: true,
    short: 'Gelo em área forte. A partir do 58 também dá Umbral Hearts.' },
  { id: 'surecast', name: 'Surecast', level: 44, kind: 'Role', aspect: 'utility', recast: 120,
    short: 'Anula knockback (empurrão) e puxões por alguns segundos.' },
  { id: 'thunder3', name: 'Thunder III', level: 45, kind: 'GCD', aspect: 'thunder',
    short: 'Versão melhorada do Thunder para alvo único.' },
  { id: 'flare', name: 'Flare', level: 50, kind: 'GCD', aspect: 'fire', aoe: true,
    short: 'Grande explosão de fogo em área. Gasta todo o MP restante.' },
  { id: 'aetherialManipulation', name: 'Aetherial Manipulation', level: 50, kind: 'oGCD', aspect: 'utility', recast: 10,
    short: 'Teleporta você até um membro da party.',
    tip: 'Use com macro de mouseover para fugir de mecânicas.' },
  { id: 'leyLines', name: 'Ley Lines', level: 52, kind: 'oGCD', aspect: 'utility', recast: 120, charges: 2,
    short: 'Cria um círculo no chão: dentro dele suas magias ficam mais rápidas (20 s).',
    tip: 'Fique numa borda do círculo para ter espaço de desviar.' },
  { id: 'blizzard4', name: 'Blizzard IV', level: 58, kind: 'GCD', aspect: 'ice',
    short: 'Em Umbral Ice dá 3 Umbral Hearts (deixam o Fire IV mais barato).' },
  { id: 'fire4', name: 'Fire IV', level: 60, kind: 'GCD', aspect: 'fire',
    short: 'Sua principal fonte de dano. Só pode ser usado em Astral Fire.' },
  { id: 'betweenTheLines', name: 'Between the Lines', level: 62, kind: 'oGCD', aspect: 'utility', recast: 3,
    short: 'Teleporta você de volta para dentro do Ley Lines.' },
  { id: 'thunder4', name: 'Thunder IV', level: 64, kind: 'GCD', aspect: 'thunder', aoe: true,
    short: 'Versão melhorada do Thunder em área.' },
  { id: 'triplecast', name: 'Triplecast', level: 66, kind: 'oGCD', aspect: 'utility', recast: 60, charges: 2,
    short: 'As próximas 3 magias ficam instantâneas.',
    tip: 'Guarde para momentos de movimento. Não gaste em magias que já são instantâneas.' },
  { id: 'foul', name: 'Foul', level: 70, kind: 'GCD', aspect: 'unaspected', aoe: true,
    short: 'Gasta 1 Polyglot. Instantâneo, dano em área.' },
  { id: 'despair', name: 'Despair', level: 72, kind: 'GCD', aspect: 'fire',
    short: 'Finalizador da fase de fogo: gasta todo o MP restante (mínimo 800).' },
  { id: 'xenoglossy', name: 'Xenoglossy', level: 80, kind: 'GCD', aspect: 'unaspected',
    short: 'Gasta 1 Polyglot. Instantâneo e a magia mais forte do BLM em alvo único.',
    tip: 'Não deixe o Polyglot transbordar. Guarde 1–2 para momentos de movimento ou burst.' },
  { id: 'highFire2', name: 'High Fire II', level: 82, kind: 'GCD', aspect: 'fire', aoe: true,
    short: 'Substitui o Fire II.' },
  { id: 'highBlizzard2', name: 'High Blizzard II', level: 82, kind: 'GCD', aspect: 'ice', aoe: true,
    short: 'Substitui o Blizzard II.' },
  { id: 'amplifier', name: 'Amplifier', level: 86, kind: 'oGCD', aspect: 'utility', recast: 120,
    short: 'Dá 1 Polyglot na hora.',
    tip: 'Use quase sempre que estiver pronto, desde que não transborde o Polyglot.' },
  { id: 'paradox', name: 'Paradox', level: 90, kind: 'GCD', aspect: 'unaspected',
    short: 'Instantâneo. Em Astral Fire dá o proc Firestarter.',
    tip: 'Aparece no lugar do Fire/Blizzard quando o marcador de Paradox está ativo.' },
  { id: 'highThunder', name: 'High Thunder', level: 92, kind: 'GCD', aspect: 'thunder',
    short: 'Thunder de alvo único no nível máximo. Gasta Thunderhead.' },
  { id: 'highThunder2', name: 'High Thunder II', level: 92, kind: 'GCD', aspect: 'thunder', aoe: true,
    short: 'Thunder em área no nível máximo.' },
  { id: 'retrace', name: 'Retrace', level: 96, kind: 'oGCD', aspect: 'utility', recast: 40,
    short: 'Move o Ley Lines ativo para onde você está (uma vez por Ley Lines).' },
  { id: 'flareStar', name: 'Flare Star', level: 100, kind: 'GCD', aspect: 'fire',
    short: 'Precisa de 6 Astral Soul (1 por Fire IV, 3 por Flare). Dano enorme.' },
];

/** Marcos importantes que não são ações (traços/mecânicas). */
export const BLM_MILESTONES: { level: number; text: string }[] = [
  { level: 30, text: 'Você vira Black Mage (quest "Taking the Black" em Ul\'dah).' },
  { level: 58, text: 'Umbral Hearts: Blizzard IV/Freeze dão corações que barateiam o Fire IV.' },
  { level: 70, text: 'Polyglot: a cada 30 s em Fogo/Gelo você ganha 1 stack (usado no Foul).' },
  { level: 80, text: 'Polyglot passa a acumular 2 stacks.' },
  { level: 90, text: 'Paradox: marcador ganho ao trocar Fogo III ↔ Gelo III.' },
  { level: 94, text: 'Swiftcast passa a ter 40 s de recarga.' },
  { level: 98, text: 'Polyglot passa a acumular 3 stacks.' },
  { level: 100, text: 'Astral Soul: 6 stacks liberam Flare Star.' },
];

export function actionsUpTo(level: number) {
  return BLM_ACTIONS.filter((a) => a.level <= level);
}

export function actionsBetween(from: number, to: number) {
  return BLM_ACTIONS.filter((a) => a.level >= from && a.level <= to);
}
