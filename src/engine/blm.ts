/**
 * Motor de regras simplificado do Black Mage (nível 100, alvo único).
 *
 * Usado em dois lugares:
 *  - Treinador de rotação (o jogador escolhe a magia, o motor avalia);
 *  - Coach do overlay (o motor acompanha as magias usadas no jogo e sugere a próxima).
 *
 * IMPORTANTE: os valores de MP são aproximados. O objetivo é ensinar a ORDEM
 * das magias e o PORQUÊ, não reproduzir o jogo ao centésimo.
 */

export type Element = 'none' | 'AF' | 'UI';

export type GcdId =
  | 'fire3' | 'fire4' | 'paradox' | 'despair' | 'flareStar'
  | 'blizzard3' | 'blizzard4' | 'highThunder' | 'xenoglossy' | 'umbralSoul';

export type OgcdId = 'transpose' | 'manafont' | 'amplifier' | 'leyLines' | 'triplecast' | 'swiftcast';

export type ActionId = GcdId | OgcdId;

export interface Cooldown {
  charges: number;
  max: number;
  recast: number;
  /** momento (s) em que a próxima carga volta, ou null se cheio */
  nextAt: number | null;
}

export interface BlmState {
  time: number;
  element: Element;
  stacks: number;
  hearts: number;
  astralSoul: number;
  polyglot: number;
  polyglotTimer: number;
  paradox: boolean;
  firestarter: boolean;
  thunderhead: boolean;
  /** segundos restantes do DoT do Thunder no alvo */
  dot: number;
  mp: number;
  leyLines: number;
  triplecast: number;
  swiftcast: boolean;
  cooldowns: Record<OgcdId, Cooldown>;
}

export const MAX_MP = 10000;
export const MAX_POLYGLOT = 3;
export const POLYGLOT_INTERVAL = 30;
export const DOT_DURATION = 30;
export const LEY_LINES_DURATION = 20;
export const BASE_GCD = 2.5;

export const GCD_IDS: GcdId[] = [
  'fire3', 'fire4', 'paradox', 'flareStar', 'despair',
  'blizzard3', 'blizzard4', 'highThunder', 'xenoglossy', 'umbralSoul',
];
export const OGCD_IDS: OgcdId[] = ['leyLines', 'amplifier', 'manafont', 'triplecast', 'swiftcast', 'transpose'];

export const ACTION_NAMES: Record<ActionId, string> = {
  fire3: 'Fire III',
  fire4: 'Fire IV',
  paradox: 'Paradox',
  despair: 'Despair',
  flareStar: 'Flare Star',
  blizzard3: 'Blizzard III',
  blizzard4: 'Blizzard IV',
  highThunder: 'High Thunder',
  xenoglossy: 'Xenoglossy',
  umbralSoul: 'Umbral Soul',
  transpose: 'Transpose',
  manafont: 'Manafont',
  amplifier: 'Amplifier',
  leyLines: 'Ley Lines',
  triplecast: 'Triplecast',
  swiftcast: 'Swiftcast',
};

/** nomes em inglês como aparecem no log do jogo → id interno */
export const ACTION_BY_LOG_NAME: Record<string, ActionId> = Object.fromEntries(
  (Object.entries(ACTION_NAMES) as [ActionId, string][]).map(([id, name]) => [name.toLowerCase(), id]),
);

export function isGcd(id: ActionId): id is GcdId {
  return (GCD_IDS as string[]).includes(id);
}

function cd(recast: number, max = 1): Cooldown {
  return { charges: max, max, recast, nextAt: null };
}

export function initialState(): BlmState {
  return {
    time: 0,
    element: 'none',
    stacks: 0,
    hearts: 0,
    astralSoul: 0,
    polyglot: 0,
    polyglotTimer: 0,
    paradox: false,
    firestarter: false,
    thunderhead: false,
    dot: 0,
    mp: MAX_MP,
    leyLines: 0,
    triplecast: 0,
    swiftcast: false,
    cooldowns: {
      transpose: cd(5),
      manafont: cd(100),
      amplifier: cd(120),
      leyLines: cd(120, 2),
      triplecast: cd(60, 2),
      swiftcast: cd(40),
    },
  };
}

/** Avança o relógio: DoT, Ley Lines, Polyglot e recargas. */
export function advance(state: BlmState, seconds: number): BlmState {
  if (seconds <= 0) return state;
  const s: BlmState = { ...state, cooldowns: { ...state.cooldowns } };
  s.time += seconds;
  s.dot = Math.max(0, s.dot - seconds);
  s.leyLines = Math.max(0, s.leyLines - seconds);

  if (s.element !== 'none') {
    s.polyglotTimer += seconds;
    while (s.polyglotTimer >= POLYGLOT_INTERVAL) {
      s.polyglotTimer -= POLYGLOT_INTERVAL;
      // no máximo o timer reinicia e o stack é perdido
      if (s.polyglot < MAX_POLYGLOT) s.polyglot += 1;
    }
  }

  for (const id of OGCD_IDS) {
    const c = { ...s.cooldowns[id] };
    while (c.nextAt !== null && c.nextAt <= s.time) {
      c.charges += 1;
      c.nextAt = c.charges < c.max ? c.nextAt + c.recast : null;
    }
    s.cooldowns[id] = c;
  }
  return s;
}

export function gcdLength(state: BlmState): number {
  // Circle of Power (Ley Lines) acelera ~15%
  return state.leyLines > 0 ? Math.floor(BASE_GCD * 0.85 * 100) / 100 : BASE_GCD;
}

export function cooldownRemaining(state: BlmState, id: OgcdId): number {
  const c = state.cooldowns[id];
  if (c.charges > 0 || c.nextAt === null) return 0;
  return Math.max(0, c.nextAt - state.time);
}

function fire4Cost(state: BlmState) {
  if (state.element !== 'AF') return 800;
  return state.hearts > 0 ? 800 : 1600;
}

export interface Check {
  ok: boolean;
  reason?: string;
}

export function canUse(state: BlmState, id: ActionId): Check {
  switch (id) {
    case 'fire4':
      if (state.element !== 'AF') return { ok: false, reason: 'Fire IV só funciona em Astral Fire.' };
      if (state.mp < fire4Cost(state)) return { ok: false, reason: 'MP insuficiente para Fire IV.' };
      return { ok: true };
    case 'fire3': {
      if (state.firestarter || state.element === 'UI') return { ok: true };
      const cost = state.element === 'AF' ? 4000 : 2000;
      return state.mp >= cost ? { ok: true } : { ok: false, reason: 'MP insuficiente para Fire III.' };
    }
    case 'paradox':
      if (!state.paradox) return { ok: false, reason: 'Você não tem o marcador de Paradox.' };
      if (state.element === 'AF' && state.mp < 1600) return { ok: false, reason: 'MP insuficiente para Paradox.' };
      return { ok: true };
    case 'despair':
      if (state.element !== 'AF') return { ok: false, reason: 'Despair só funciona em Astral Fire.' };
      if (state.mp < 800) return { ok: false, reason: 'Despair precisa de pelo menos 800 MP.' };
      return { ok: true };
    case 'flareStar':
      return state.astralSoul >= 6 ? { ok: true } : { ok: false, reason: `Flare Star precisa de 6 Astral Soul (você tem ${state.astralSoul}).` };
    case 'blizzard3':
    case 'blizzard4':
      if (id === 'blizzard4' && state.element !== 'UI') return { ok: false, reason: 'Blizzard IV só funciona em Umbral Ice.' };
      return { ok: true };
    case 'highThunder':
      return state.thunderhead ? { ok: true } : { ok: false, reason: 'Precisa do buff Thunderhead (ganho ao trocar Fogo ↔ Gelo).' };
    case 'xenoglossy':
      return state.polyglot > 0 ? { ok: true } : { ok: false, reason: 'Sem Polyglot.' };
    case 'umbralSoul':
      return state.element === 'UI' ? { ok: true } : { ok: false, reason: 'Umbral Soul só funciona em Umbral Ice.' };
    case 'transpose':
      if (state.element === 'none') return { ok: false, reason: 'Transpose precisa de Astral Fire ou Umbral Ice ativo.' };
      return state.cooldowns.transpose.charges > 0 ? { ok: true } : { ok: false, reason: 'Transpose em recarga.' };
    case 'manafont':
      if (state.element !== 'AF') return { ok: false, reason: 'Manafont só pode ser usado em Astral Fire.' };
      return state.cooldowns.manafont.charges > 0 ? { ok: true } : { ok: false, reason: 'Manafont em recarga.' };
    case 'amplifier':
      if (state.element === 'none') return { ok: false, reason: 'Amplifier precisa de Astral Fire ou Umbral Ice ativo.' };
      return state.cooldowns.amplifier.charges > 0 ? { ok: true } : { ok: false, reason: 'Amplifier em recarga.' };
    case 'leyLines':
      if (state.leyLines > 0) return { ok: false, reason: 'Já existe um Ley Lines ativo.' };
      return state.cooldowns.leyLines.charges > 0 ? { ok: true } : { ok: false, reason: 'Ley Lines em recarga.' };
    default: {
      const c = state.cooldowns[id];
      return c.charges > 0 ? { ok: true } : { ok: false, reason: `${ACTION_NAMES[id]} em recarga.` };
    }
  }
}

function spendCharge(s: BlmState, id: OgcdId) {
  const c = { ...s.cooldowns[id] };
  c.charges -= 1;
  if (c.nextAt === null) c.nextAt = s.time + c.recast;
  s.cooldowns = { ...s.cooldowns, [id]: c };
}

function enterElement(s: BlmState, el: 'AF' | 'UI', stacks: number) {
  const prev = s.element;
  const prevStacks = s.stacks;
  // Paradox: UI III com 3 corações → Fogo, ou AF III → Gelo
  if (el === 'AF' && prev === 'UI' && prevStacks === 3 && s.hearts === 3) s.paradox = true;
  if (el === 'UI' && prev === 'AF' && prevStacks === 3) s.paradox = true;
  if (prev !== el) s.thunderhead = true;
  if (el === 'UI') s.astralSoul = 0;
  if (prev === 'none') s.polyglotTimer = 0;
  s.element = el;
  s.stacks = stacks;
}

/** Aplica o efeito da ação de forma instantânea (não avança o relógio). */
export function applyAction(state: BlmState, id: ActionId): BlmState {
  const s: BlmState = { ...state, cooldowns: { ...state.cooldowns } };
  const isCastSpell = ['fire3', 'fire4', 'despair', 'flareStar', 'blizzard3', 'blizzard4'].includes(id);
  const instantByProc = id === 'fire3' && s.firestarter;

  switch (id) {
    case 'fire3':
      if (s.firestarter) s.firestarter = false;
      else if (s.element === 'AF') s.mp -= 4000;
      else if (s.element === 'none') s.mp -= 2000;
      enterElement(s, 'AF', 3);
      break;
    case 'fire4':
      s.mp -= fire4Cost(s);
      if (s.hearts > 0) s.hearts -= 1;
      s.astralSoul = Math.min(6, s.astralSoul + 1);
      break;
    case 'paradox':
      s.paradox = false;
      if (s.element === 'AF') {
        s.mp -= 1600;
        s.firestarter = true;
      } else if (s.element === 'UI') {
        s.mp = Math.min(MAX_MP, s.mp + 2500);
      }
      break;
    case 'despair':
      s.mp = 0;
      s.stacks = 3;
      break;
    case 'flareStar':
      s.astralSoul = 0;
      break;
    case 'blizzard3':
      if (s.element === 'none') s.mp -= 800;
      enterElement(s, 'UI', 3);
      s.mp = Math.min(MAX_MP, s.mp + 2500);
      break;
    case 'blizzard4':
      s.hearts = 3;
      s.mp = MAX_MP;
      break;
    case 'highThunder':
      s.thunderhead = false;
      s.dot = DOT_DURATION;
      break;
    case 'xenoglossy':
      s.polyglot -= 1;
      break;
    case 'umbralSoul':
      s.stacks = Math.min(3, s.stacks + 1);
      s.hearts = Math.min(3, s.hearts + 1);
      s.mp = Math.min(MAX_MP, s.mp + 2500);
      break;
    case 'transpose':
      spendCharge(s, 'transpose');
      enterElement(s, s.element === 'AF' ? 'UI' : 'AF', 1);
      break;
    case 'manafont':
      spendCharge(s, 'manafont');
      s.stacks = 3; // também concede Astral Fire III
      s.mp = MAX_MP;
      s.hearts = 3;
      s.thunderhead = true;
      s.paradox = true;
      break;
    case 'amplifier':
      spendCharge(s, 'amplifier');
      s.polyglot = Math.min(MAX_POLYGLOT, s.polyglot + 1);
      break;
    case 'leyLines':
      spendCharge(s, 'leyLines');
      s.leyLines = LEY_LINES_DURATION;
      break;
    case 'triplecast':
      spendCharge(s, 'triplecast');
      s.triplecast = 3;
      break;
    case 'swiftcast':
      spendCharge(s, 'swiftcast');
      s.swiftcast = true;
      break;
  }

  // Swiftcast/Triplecast só são gastos por magias com tempo de conjuração
  if (isCastSpell && !instantByProc) {
    if (s.swiftcast) s.swiftcast = false;
    else if (s.triplecast > 0) s.triplecast -= 1;
  }
  s.mp = Math.max(0, s.mp);
  return s;
}

/** Usa a ação e, se for GCD, avança o relógio em um GCD. */
export function step(state: BlmState, id: ActionId): BlmState {
  const gcd = isGcd(id) ? gcdLength(state) : 0;
  return advance(applyAction(state, id), gcd);
}

export interface Advice {
  gcd: GcdId;
  why: string;
  ogcds: { id: OgcdId; why: string }[];
}

/** Prioridade simplificada para alvo único no nível 100. */
export function recommend(state: BlmState): Advice {
  const ogcds: Advice['ogcds'] = [];
  const ready = (id: OgcdId) => state.cooldowns[id].charges > 0;

  if (state.element !== 'none') {
    if (ready('leyLines') && state.leyLines === 0 && state.cooldowns.leyLines.charges === state.cooldowns.leyLines.max)
      ogcds.push({ id: 'leyLines', why: 'Ley Lines com as 2 cargas: use para não desperdiçar recarga.' });
    if (ready('amplifier') && state.polyglot < MAX_POLYGLOT)
      ogcds.push({ id: 'amplifier', why: 'Amplifier pronto e o Polyglot não vai transbordar.' });
    if (ready('manafont') && state.element === 'AF' && state.mp < 800 && state.astralSoul < 6)
      ogcds.push({ id: 'manafont', why: 'MP acabou em Astral Fire: Manafont dá outra fase de fogo inteira.' });
  }

  const gcd = ((): { gcd: GcdId; why: string } => {
    if (state.polyglot >= MAX_POLYGLOT && state.polyglotTimer >= POLYGLOT_INTERVAL - 8)
      return { gcd: 'xenoglossy', why: 'Polyglot cheio e outro stack chegando: gaste para não desperdiçar.' };
    if (state.thunderhead && state.dot < 3)
      return { gcd: 'highThunder', why: state.dot === 0 ? 'O Thunder não está no alvo.' : 'O Thunder está acabando (menos de 3 s).' };

    if (state.element === 'none') {
      return state.mp >= 8000
        ? { gcd: 'fire3', why: 'Comece entrando em Astral Fire III.' }
        : { gcd: 'blizzard3', why: 'Pouco MP: entre em Umbral Ice III para recuperar.' };
    }

    if (state.element === 'AF') {
      if (state.astralSoul >= 6) return { gcd: 'flareStar', why: 'Astral Soul 6/6: Flare Star liberado.' };
      if (state.stacks < 3) {
        if (state.firestarter) return { gcd: 'fire3', why: 'Firestarter: Fire III grátis e instantâneo leva ao Astral Fire III.' };
        if (state.paradox) return { gcd: 'paradox', why: 'Em Astral Fire I, o Paradox gera Firestarter para subir ao AF III.' };
        return { gcd: 'fire3', why: 'Suba para Astral Fire III antes de usar Fire IV.' };
      }
      if (state.paradox && state.hearts === 0 && state.mp >= 1600)
        return { gcd: 'paradox', why: 'Corações acabaram: hora do Paradox (gera Firestarter para depois).' };
      if (state.mp >= fire4Cost(state) + 800)
        return { gcd: 'fire4', why: state.hearts > 0 ? 'Fire IV com Umbral Heart (custo reduzido).' : 'Fire IV: sua principal fonte de dano.' };
      if (state.mp >= 800) return { gcd: 'despair', why: 'Sem MP para outro Fire IV: feche a fase de fogo com Despair.' };
      if (ready('manafont'))
        return { gcd: 'fire4', why: 'Use Manafont (oGCD) agora: MP volta cheio e você continua com Fire IV.' };
      return { gcd: 'blizzard3', why: 'MP zerado: vá para Umbral Ice III.' };
    }

    // Umbral Ice
    if (state.stacks < 3) return { gcd: 'blizzard3', why: 'Suba para Umbral Ice III.' };
    if (state.hearts < 3) return { gcd: 'blizzard4', why: 'Blizzard IV: enche o MP e dá 3 Umbral Hearts.' };
    if (state.paradox) return { gcd: 'paradox', why: 'Use o Paradox ganho ao entrar no gelo.' };
    return { gcd: 'fire3', why: 'Gelo completo e MP cheio: volte ao Astral Fire III.' };
  })();

  return { ...gcd, ogcds };
}
