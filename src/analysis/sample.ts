/**
 * Gera uma luta de exemplo no formato de eventos do FFLogs, usando o motor de
 * regras do BLM, com erros colocados de propósito. Serve para mostrar a análise
 * sem precisar de login e para testar o analisador.
 */
import {
  advance, applyAction, canUse, gcdLength, initialState, isGcd, recommend,
  type ActionId, type BlmState, type GcdId,
} from '../engine/blm';
import { actionGameIds, statusIds } from '../data/xivapi';
import { STATUS_OFFSET, type FFEvent, type ReportFight } from './types';
import type { FightEvents } from './fflogsApi';

const PLAYER = 1;
const HEALER = 2;
const BOSS = 99;
const START = 1_000_000;
const DURATION = 380;
const INSTANT: GcdId[] = ['paradox', 'highThunder', 'xenoglossy'];

/** Erros colocados no exemplo (para conferir a análise). */
export const SAMPLE_MISTAKES = [
  'Não usou Xenoglossy até ~1:35 (Polyglot transbordou)',
  'Esqueceu o Thunder entre 2:20 e 3:20',
  'Renovou o Thunder cedo perto de 1:00',
  'Parou de conjurar por 5 s em ~3:20 e 3 s em ~4:20',
  'Cancelou 2 Fire IV (andou cedo demais)',
  'Morreu em 5:00',
  'Saiu do segundo Ley Lines 8 s antes do fim',
  'Usou só uma poção',
];

export function sampleFight(): { fight: ReportFight; playerId: number; events: FightEvents } {
  const mine: FFEvent[] = [];
  const buffsOnMe: FFEvent[] = [];
  const deaths: FFEvent[] = [];
  const ts = (t: number) => START + Math.round(t * 1000);
  const aId = (key: string) => actionGameIds(key)[0] ?? 0;
  const sId = (name: string) => (statusIds(name)[0] ?? 0) + STATUS_OFFSET;

  const buff = (t: number, len: number, name: string, source = PLAYER) => {
    const e = { abilityGameID: sId(name), sourceID: source, targetID: PLAYER };
    buffsOnMe.push({ ...e, timestamp: ts(t), type: 'applybuff' }, { ...e, timestamp: ts(t + len), type: 'removebuff' });
    if (source === PLAYER) mine.push({ ...e, timestamp: ts(t), type: 'applybuff' }, { ...e, timestamp: ts(t + len), type: 'removebuff' });
  };

  mine.push({ timestamp: ts(0), type: 'combatantinfo', sourceID: PLAYER, level: 100 });
  for (const t of [7, 127, 247, 367]) buff(t, 20, 'Divination', HEALER);
  buff(5, 30, 'Medicated');

  let state: BlmState = initialState();
  let t = 0;
  let dotUntil: number | null = null;
  let llUses = 0;
  const done = new Set<string>();
  const once = (k: string, cond: boolean) => cond && !done.has(k) && (done.add(k), true);

  const flushDot = (now: number) => {
    if (dotUntil !== null && dotUntil <= now) {
      mine.push({ timestamp: ts(dotUntil), type: 'removedebuff', sourceID: PLAYER, targetID: BOSS, abilityGameID: sId('High Thunder') });
      dotUntil = null;
    }
  };

  const cast = (id: ActionId) => {
    flushDot(t);
    const castTime = isGcd(id) && !INSTANT.includes(id as GcdId) && !(id === 'fire3' && state.firestarter) ? 1.6 : 0;
    if (castTime > 0) mine.push({ timestamp: ts(t), type: 'begincast', sourceID: PLAYER, targetID: BOSS, abilityGameID: aId(id) });
    const at = t + castTime;
    mine.push({ timestamp: ts(at), type: 'cast', sourceID: PLAYER, targetID: BOSS, abilityGameID: aId(id) });

    if (id === 'highThunder') {
      const type = dotUntil !== null && dotUntil > at ? 'refreshdebuff' : 'applydebuff';
      mine.push({ timestamp: ts(at), type, sourceID: PLAYER, targetID: BOSS, abilityGameID: sId('High Thunder') });
      dotUntil = at + 30;
    }
    if (id === 'leyLines') {
      llUses++;
      buff(at, llUses === 2 ? 12 : 20, 'Circle of Power');
    }
    state = applyAction(state, id);
  };

  while (t < DURATION - 1) {
    // morte em 5:00: 15 s caído, perde Fogo/Gelo
    if (once('death', t >= 300)) {
      deaths.push({ timestamp: ts(t), type: 'death', targetID: PLAYER });
      state = advance({ ...state, element: 'none', stacks: 0, hearts: 0, astralSoul: 0, paradox: false, thunderhead: false }, 15);
      t += 15;
      continue;
    }
    // pausas sem conjurar
    for (const [k, at, len] of [['idle1', 200, 5], ['idle2', 260, 3]] as const) {
      if (once(k, t >= at)) {
        state = advance(state, len);
        t += len;
      }
    }
    // conjurações canceladas (custam ~1 s)
    for (const [k, at] of [['cancel1', 110], ['cancel2', 230]] as const) {
      if (state.element === 'AF' && once(k, t >= at)) {
        mine.push({ timestamp: ts(t), type: 'begincast', sourceID: PLAYER, targetID: BOSS, abilityGameID: aId('fire4') });
        state = advance(state, 1);
        t += 1;
      }
    }

    const advice = recommend(state);
    for (const o of advice.ogcds) cast(o.id);

    let gcd = recommend(state).gcd;
    if (gcd === 'xenoglossy' && t < 95) gcd = recommend({ ...state, polyglot: 0 }).gcd;
    if (gcd === 'highThunder' && t >= 140 && t < 200) gcd = recommend({ ...state, thunderhead: false }).gcd;
    if (state.thunderhead && dotUntil !== null && dotUntil - t > 8 && once('early', t >= 58)) gcd = 'highThunder';
    if (!canUse(state, gcd).ok) gcd = recommend(state).gcd;

    const len = gcdLength(state);
    cast(gcd);
    state = advance(state, len);
    t += len;
  }
  flushDot(DURATION);

  const sort = (xs: FFEvent[]) => xs.sort((a, b) => a.timestamp - b.timestamp);
  return {
    playerId: PLAYER,
    fight: {
      id: 1,
      name: 'Exemplo: boneco de treino',
      kill: true,
      startTime: START,
      endTime: START + DURATION * 1000,
      encounterID: 1,
      difficulty: 100,
      friendlyPlayers: [PLAYER, HEALER],
    },
    events: { mine: sort(mine), buffsOnMe: sort(buffsOnMe), deaths },
  };
}
