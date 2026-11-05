/**
 * Analisa a luta de um Black Mage a partir dos eventos do FFLogs e gera
 * métricas com dicas em português para iniciantes.
 *
 * Tudo aqui é heurístico: o objetivo é apontar os erros mais comuns
 * (ficar parado, deixar o Thunder cair, desperdiçar Polyglot…), não dar
 * uma nota exata como um simulador faria.
 */
import { BLM_ACTIONS } from '../data/blm/actions';
import { ACTION_KEY_BY_GAME_ID, statusIds } from '../data/xivapi';
import { abilityId, STATUS_OFFSET, type FFEvent, type ReportFight } from './types';
import type { FightEvents } from './fflogsApi';

export type Status = 'good' | 'warn' | 'bad' | 'info';

export interface Finding {
  id: string;
  title: string;
  status: Status;
  value: string;
  detail: string;
  tip?: string;
  /** quanto menor, mais importante corrigir primeiro */
  weight: number;
}

export interface Segment {
  start: number;
  end: number;
  kind: 'AF' | 'UI' | 'none';
}

export interface Analysis {
  fightName: string;
  kill: boolean;
  duration: number;
  level: number;
  gcdCount: number;
  findings: Finding[];
  priorities: Finding[];
  timeline: {
    segments: Segment[];
    idle: { start: number; length: number }[];
    deaths: number[];
    burst: { start: number; end: number }[];
  };
}

/* ---------------- conjuntos de IDs ---------------- */

const GCD_KEYS = new Set(BLM_ACTIONS.filter((a) => a.kind === 'GCD').map((a) => a.id));
const FIRE_ENTRY = new Set(['fire', 'fire2', 'fire3', 'highFire2', 'flare']);
const ICE_ENTRY = new Set(['blizzard', 'blizzard2', 'blizzard3', 'highBlizzard2', 'freeze', 'umbralSoul']);

const ids = (names: string[]) => new Set(names.flatMap((n) => statusIds(n)).map((id) => id + STATUS_OFFSET));
const THUNDER_DOTS = ids(['High Thunder', 'Thunder', 'Thunder II', 'Thunder III', 'Thunder IV']);
const CIRCLE_OF_POWER = ids(['Circle of Power']);
const MEDICATED = ids(['Medicated']);
const RAID_BUFFS = ids([
  'Divination', 'Battle Litany', 'Brotherhood', 'Technical Finish', 'Embolden', 'Searing Light',
  'Arcane Circle', 'Battle Voice', 'Radiant Finale', 'Starry Muse',
]);

const DOT_DURATION = 30;
const keyOf = (e: FFEvent) => ACTION_KEY_BY_GAME_ID.get(abilityId(e));

/* ---------------- utilidades ---------------- */

const pct = (x: number) => `${Math.round(x * 100)}%`;
const secs = (x: number) => `${x.toFixed(1)} s`;
const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** Junta intervalos de apply/remove de um status em [início, fim] (segundos relativos). */
function intervals(events: FFEvent[], statusSet: Set<number>, t0: number, tEnd: number, target?: number) {
  const out: { start: number; end: number }[] = [];
  let open: number | null = null;
  for (const e of events) {
    if (!statusSet.has(abilityId(e))) continue;
    if (target !== undefined && e.targetID !== target) continue;
    const t = Math.min(tEnd, Math.max(0, (e.timestamp - t0) / 1000));
    if (e.type === 'applybuff' || e.type === 'applydebuff') {
      if (open === null) open = t;
    } else if (e.type === 'removebuff' || e.type === 'removedebuff') {
      if (open !== null) out.push({ start: open, end: t });
      // buff que já existia antes do pull
      else if (out.length === 0) out.push({ start: 0, end: t });
      open = null;
    }
  }
  if (open !== null) out.push({ start: open, end: tEnd });
  return out;
}

const total = (iv: { start: number; end: number }[]) => iv.reduce((s, i) => s + (i.end - i.start), 0);

/* ---------------- análise ---------------- */

export function analyzeBlm(fight: ReportFight, playerId: number, ev: FightEvents): Analysis {
  const t0 = fight.startTime;
  const duration = (fight.endTime - fight.startTime) / 1000;
  const rel = (e: FFEvent) => (e.timestamp - t0) / 1000;
  const mine = [...ev.mine].sort((a, b) => a.timestamp - b.timestamp);
  const buffsOnMe = [...ev.buffsOnMe].sort((a, b) => a.timestamp - b.timestamp);

  const level = mine.find((e) => e.type === 'combatantinfo' && e.level)?.level ?? 100;
  const casts = mine.filter((e) => e.type === 'cast' && e.sourceID === playerId);
  const begins = mine.filter((e) => e.type === 'begincast' && e.sourceID === playerId);
  const deaths = ev.deaths.filter((e) => e.type === 'death' && e.targetID === playerId).map(rel);
  const count = (key: string) => casts.filter((c) => keyOf(c) === key).length;

  const findings: Finding[] = [];

  /* ---- 1. GCDs, tempo parado e magias canceladas ---- */
  const used = new Set<FFEvent>();
  let cancelled = 0;
  for (const b of begins) {
    const match = casts.find((c) => !used.has(c) && abilityId(c) === abilityId(b) && c.timestamp >= b.timestamp && c.timestamp - b.timestamp <= 6000);
    if (match) used.add(match);
    else cancelled++;
  }
  const beginOf = new Map<FFEvent, number>();
  for (const c of casts) {
    const b = [...begins].reverse().find((x) => abilityId(x) === abilityId(c) && x.timestamp <= c.timestamp && c.timestamp - x.timestamp <= 6000);
    beginOf.set(c, b ? rel(b) : rel(c));
  }
  const gcds = casts.filter((c) => GCD_KEYS.has(keyOf(c) ?? ''));
  const starts = gcds.map((c) => beginOf.get(c)!).sort((a, b) => a - b);

  const llWindows = casts.filter((c) => keyOf(c) === 'leyLines').map((c) => ({ start: rel(c), end: rel(c) + 20 }));
  const inLL = (t: number) => llWindows.some((w) => t >= w.start && t < w.end);
  const gaps = starts.slice(1).map((s, i) => ({ at: starts[i], gap: s - starts[i] }));
  const est = median(gaps.filter((g) => !inLL(g.at) && g.gap >= 2.2 && g.gap <= 2.8).map((g) => g.gap)) ?? 2.5;

  const idle: { start: number; length: number }[] = [];
  /** intervalos longos sem morte: provavelmente o chefe ficou fora de alcance */
  let downtime = 0;
  let deadTime = 0;
  for (const g of gaps) {
    const expected = inLL(g.at) ? est * 0.85 : est;
    const diedHere = deaths.some((d) => d >= g.at && d <= g.at + g.gap);
    if (diedHere) {
      deadTime += g.gap;
      continue;
    }
    if (g.gap >= 20) {
      downtime += g.gap;
      continue;
    }
    const extra = g.gap - expected;
    if (extra > 0.5) idle.push({ start: g.at + expected, length: extra });
  }
  const idleTotal = idle.reduce((s, i) => s + i.length, 0);
  const span = starts.length > 1 ? starts[starts.length - 1] - starts[0] : duration;
  const active = span - downtime - deadTime;
  const uptime = active > 0 ? 1 - idleTotal / active : 1;

  findings.push({
    id: 'abc',
    title: 'Sempre conjurando (ABC)',
    status: uptime >= 0.98 ? 'good' : uptime >= 0.93 ? 'warn' : 'bad',
    value: pct(uptime),
    detail: `${idle.length} pausa(s) sem conjurar, somando ${secs(idleTotal)}. GCD estimado: ${est.toFixed(2)} s.` +
      (downtime > 0 ? ` ${secs(downtime)} de intervalos longos (chefe provavelmente fora de alcance) não contam.` : '') +
      (deadTime > 0 ? ` ${secs(deadTime)} morto(a) não contam aqui.` : ''),
    tip: 'Se precisar andar, use uma instantânea (Xenoglossy, Paradox, High Thunder, Firestarter) ou Swiftcast/Triplecast em vez de parar.',
    weight: 1,
  });

  findings.push({
    id: 'cancel',
    title: 'Magias canceladas',
    status: cancelled === 0 ? 'good' : cancelled <= 2 ? 'warn' : 'bad',
    value: String(cancelled),
    detail: cancelled === 0 ? 'Nenhuma conjuração interrompida.' : `${cancelled} conjuração(ões) começaram e não terminaram — geralmente por se mexer cedo demais.`,
    tip: 'Pratique o slidecast: dá para começar a andar no finalzinho da barra de conjuração.',
    weight: 4,
  });

  /* ---- 2. Thunder no alvo ---- */
  const dotEvents = mine.filter((e) => THUNDER_DOTS.has(abilityId(e)) && e.sourceID === playerId);
  const byTarget = new Map<string, FFEvent[]>();
  for (const e of dotEvents) {
    const k = `${e.targetID}:${e.targetInstance ?? 0}`;
    byTarget.set(k, [...(byTarget.get(k) ?? []), e]);
  }
  let best = { uptime: 0, early: 0, clipped: 0, drops: 0 };
  for (const list of byTarget.values()) {
    let applied: number | null = null;
    let up = 0, early = 0, clipped = 0, drops = 0;
    for (const e of list) {
      const t = rel(e);
      const dur = e.duration ? e.duration / 1000 : DOT_DURATION;
      if (e.type === 'applydebuff') {
        if (applied !== null) up += Math.min(t - applied, dur);
        applied = t;
      } else if (e.type === 'refreshdebuff' && applied !== null) {
        const remaining = dur - (t - applied);
        if (remaining > 3.5) {
          early++;
          clipped += remaining;
        }
        up += t - applied;
        applied = t;
      } else if (e.type === 'removedebuff' && applied !== null) {
        up += t - applied;
        applied = null;
        if (t < duration - 3) drops++;
      }
    }
    if (applied !== null) up += Math.min(duration - applied, DOT_DURATION);
    if (up > best.uptime) best = { uptime: up, early, clipped, drops };
  }
  // o DoT continua ativo enquanto você está morto, então só desconta o tempo sem chefe
  const dotUptime = Math.min(1, best.uptime / Math.max(1, duration - downtime));
  findings.push({
    id: 'thunder',
    title: 'Thunder no alvo',
    status: dotUptime >= 0.9 ? 'good' : dotUptime >= 0.8 ? 'warn' : 'bad',
    value: pct(dotUptime),
    detail: `Caiu ${best.drops} vez(es). Renovado cedo demais ${best.early} vez(es) (${secs(best.clipped)} de DoT desperdiçados).`,
    tip: 'Renove o High Thunder quando faltar menos de 3 s. O overlay do Aetherguide pisca quando chega a hora.',
    weight: 2,
  });

  /* ---- 3. Polyglot desperdiçado ---- */
  const maxPoly = level >= 98 ? 3 : level >= 80 ? 2 : level >= 70 ? 1 : 0;
  if (maxPoly > 0) {
    type Mark = { t: number; kind: 'enter' | 'death' | 'spend' | 'amp' };
    const marks: Mark[] = [
      ...casts.map((c): Mark | null => {
        const k = keyOf(c) ?? '';
        if (FIRE_ENTRY.has(k) || ICE_ENTRY.has(k)) return { t: rel(c), kind: 'enter' };
        if (k === 'xenoglossy' || k === 'foul') return { t: rel(c), kind: 'spend' };
        if (k === 'amplifier') return { t: rel(c), kind: 'amp' };
        return null;
      }).filter((m): m is Mark => m !== null),
      ...deaths.map((t): Mark => ({ t, kind: 'death' })),
    ].sort((a, b) => a.t - b.t);

    let poly = 0, lost = 0, ampWasted = 0;
    let timerStart: number | null = null;
    const tick = (until: number) => {
      while (timerStart !== null && timerStart + 30 <= until) {
        timerStart += 30;
        if (poly < maxPoly) poly++;
        else lost++;
      }
    };
    for (const m of marks) {
      tick(m.t);
      if (m.kind === 'enter' && timerStart === null) timerStart = m.t;
      else if (m.kind === 'death') timerStart = null;
      else if (m.kind === 'spend') poly = Math.max(0, poly - 1);
      else if (m.kind === 'amp') {
        if (poly < maxPoly) poly++;
        else ampWasted++;
      }
    }
    tick(duration);
    const leftover = fight.kill ? poly : 0;
    const wasted = lost + ampWasted;
    findings.push({
      id: 'polyglot',
      title: 'Polyglot desperdiçado',
      status: wasted === 0 && leftover === 0 ? 'good' : wasted <= 1 ? 'warn' : 'bad',
      value: String(wasted),
      detail: `${lost} stack(s) perdido(s) por estar no máximo` +
        (ampWasted ? `, ${ampWasted} Amplifier usado(s) com Polyglot cheio` : '') +
        (leftover ? `. Sobraram ${leftover} no fim da luta.` : '.') +
        ` Estimativa: ${maxPoly} stacks no máximo para o nível ${level}.`,
      tip: 'Cada Xenoglossy perdido é uma das suas magias mais fortes jogada fora. Gaste antes de chegar no máximo e esvazie tudo antes do chefe morrer.',
      weight: 3,
    });
  }

  /* ---- 4. Cooldowns ---- */
  const possible = (recast: number, charges = 1) => charges + Math.floor(Math.max(0, duration - 15) / recast);
  const cdCheck = (key: string, name: string, recast: number, charges: number, minLevel: number, weight: number, tip: string) => {
    if (level < minLevel) return;
    const n = count(key);
    const max = possible(recast, charges);
    findings.push({
      id: key,
      title: name,
      status: n >= max - 1 ? 'good' : n >= max - 2 ? 'warn' : 'bad',
      value: `${n}/${max}`,
      detail: `Usado ${n} vez(es); cabiam cerca de ${max} nesta luta de ${mmss(duration)}.`,
      tip,
      weight,
    });
  };
  cdCheck('leyLines', 'Usos de Ley Lines', 120, 2, 52, 5, 'Ley Lines parado na recarga é dano perdido. Use quando o chefe for ficar parado ~20 s.');
  cdCheck('manafont', 'Usos de Manafont', level >= 84 ? 100 : 120, 1, 30, 5, 'Use o Manafont logo depois do Despair para fazer outra fase de fogo.');
  cdCheck('amplifier', 'Usos de Amplifier', 120, 1, 86, 6, 'Amplifier é um Polyglot de graça a cada 2 minutos — use sempre que não for transbordar.');

  findings.push({
    id: 'movement',
    title: 'Ferramentas de movimento',
    status: 'info',
    value: `${count('triplecast')} / ${count('swiftcast')}`,
    detail: `Triplecast usado ${count('triplecast')} vez(es) e Swiftcast ${count('swiftcast')} vez(es).`,
    tip: 'Não precisam ser usados sempre, mas existem para você não parar de conjurar quando a luta pede movimento.',
    weight: 9,
  });

  /* ---- 5. Dentro do Ley Lines ---- */
  const cop = intervals(buffsOnMe, CIRCLE_OF_POWER, t0, duration, playerId);
  const llPossible = llWindows.reduce((s, w) => s + Math.min(20, duration - w.start), 0);
  if (llPossible > 0) {
    const inside = Math.min(1, total(cop) / llPossible);
    findings.push({
      id: 'llInside',
      title: 'Tempo dentro do Ley Lines',
      status: inside >= 0.9 ? 'good' : inside >= 0.75 ? 'warn' : 'bad',
      value: pct(inside),
      detail: `${secs(total(cop))} dentro do círculo de ${secs(llPossible)} possíveis.`,
      tip: 'Fique numa borda do círculo para poder desviar sem sair. Se sair, volte com Between the Lines ou mova o círculo com Retrace.',
      weight: 6,
    });
  }

  /* ---- 6. Fases de fogo ---- */
  const segments: Segment[] = [];
  // `as` evita que o TS "estreite" para 'none' (o valor muda dentro de setEl)
  let el = 'none' as Segment['kind'];
  let segStart = 0;
  const setEl = (t: number, k: Segment['kind']) => {
    if (k === el) return;
    if (t > segStart) segments.push({ start: segStart, end: t, kind: el });
    el = k;
    segStart = t;
  };
  interface Phase { f4: number; fs: number; despair: number; end: 'ice' | 'death' | 'fight' }
  const phases: Phase[] = [];
  let phase: Phase | null = null;
  const timeline = [
    ...casts.map((c) => ({ t: rel(c), key: keyOf(c) ?? '' })),
    ...deaths.map((t) => ({ t, key: '__death' })),
  ].sort((a, b) => a.t - b.t);
  for (const { t, key } of timeline) {
    if (key === '__death') {
      if (phase) phases.push({ ...phase, end: 'death' });
      phase = null;
      setEl(t, 'none');
      continue;
    }
    if (FIRE_ENTRY.has(key) || (key === 'transpose' && el === 'UI')) {
      setEl(t, 'AF');
      if (!phase) phase = { f4: 0, fs: 0, despair: 0, end: 'fight' };
    } else if (ICE_ENTRY.has(key) || (key === 'transpose' && el === 'AF')) {
      if (phase) phases.push({ ...phase, end: 'ice' });
      phase = null;
      setEl(t, 'UI');
    }
    if (phase) {
      if (key === 'fire4') phase.f4++;
      if (key === 'flareStar') phase.fs++;
      if (key === 'despair') phase.despair++;
    }
  }
  if (phase) phases.push(phase);
  setEl(duration, 'none');

  const stPhases = phases.filter((p) => p.f4 >= 3);
  if (level >= 100 && stPhases.length > 0) {
    const expected = stPhases.reduce((s, p) => s + Math.floor(p.f4 / 6), 0);
    const got = stPhases.reduce((s, p) => s + p.fs, 0);
    const missing = Math.max(0, expected - got);
    findings.push({
      id: 'flareStar',
      title: 'Flare Star',
      status: missing === 0 ? 'good' : missing <= 1 ? 'warn' : 'bad',
      value: `${got}/${expected}`,
      detail: `${stPhases.length} fase(s) de fogo em alvo único. Pelo número de Fire IV, cabiam ${expected} Flare Star.`,
      tip: 'A cada 6 Fire IV você ganha 6 Astral Soul: use o Flare Star antes de sair do fogo, senão os stacks somem.',
      weight: 4,
    });
  }
  if (level >= 72) {
    const noDespair = stPhases.filter((p) => p.end === 'ice' && p.despair === 0).length;
    if (stPhases.length > 0) {
      findings.push({
        id: 'despair',
        title: 'Fases de fogo sem Despair',
        status: noDespair === 0 ? 'good' : noDespair <= 1 ? 'warn' : 'bad',
        value: String(noDespair),
        detail: noDespair === 0 ? 'Todas as fases de fogo terminaram com Despair.' : `${noDespair} fase(s) foram para o gelo sem usar o Despair.`,
        tip: 'O Despair gasta o MP que sobra no fim do fogo. Sempre feche a fase com ele antes do Blizzard III.',
        weight: 5,
      });
    }
  }

  /* ---- 7. Burst e poções ---- */
  const burst = intervals(buffsOnMe, RAID_BUFFS, t0, duration, playerId);
  const merged: { start: number; end: number }[] = [];
  for (const b of [...burst].sort((a, b) => a.start - b.start)) {
    const last = merged[merged.length - 1];
    if (last && b.start <= last.end) last.end = Math.max(last.end, b.end);
    else merged.push({ ...b });
  }
  const xenos = casts.filter((c) => keyOf(c) === 'xenoglossy').map(rel);
  if (merged.length > 0 && xenos.length > 0) {
    const inside = xenos.filter((t) => merged.some((w) => t >= w.start && t <= w.end)).length;
    findings.push({
      id: 'burst',
      title: 'Xenoglossy nos buffs da party',
      status: 'info',
      value: `${inside}/${xenos.length}`,
      detail: `${merged.length} janela(s) de buffs da party detectadas.`,
      tip: 'Sem perder stacks, guarde Polyglot para gastar quando os buffs da party (a cada ~2 min) estiverem ativos.',
      weight: 8,
    });
  }

  const pots = buffsOnMe.filter((e) => e.type === 'applybuff' && MEDICATED.has(abilityId(e)) && e.targetID === playerId).length;
  const potMax = Math.floor(Math.max(0, duration - 10) / 360) + 1;
  findings.push({
    id: 'pot',
    title: 'Poções',
    status: pots >= potMax ? 'good' : pots > 0 ? 'warn' : 'info',
    value: `${pots}/${potMax}`,
    detail: `Uma poção de Intelligence a cada ~6 min (recarga de 270 s, mas costuma-se alinhar com os buffs).`,
    tip: 'Use a Gemdraught of Intelligence no começo da luta e de novo junto com os buffs de 6 minutos.',
    weight: 7,
  });

  /* ---- 8. Mortes ---- */
  findings.push({
    id: 'deaths',
    title: 'Mortes',
    status: deaths.length === 0 ? 'good' : 'bad',
    value: String(deaths.length),
    detail: deaths.length === 0 ? 'Você não morreu. 👏' : `Morreu em ${deaths.map(mmss).join(', ')}.`,
    tip: 'Morrer custa muito mais dano do que qualquer erro de rotação. Sobreviver vem primeiro!',
    weight: 0,
  });

  const order: Record<Status, number> = { bad: 0, warn: 1, info: 2, good: 3 };
  const priorities = findings
    .filter((f) => f.status === 'bad' || f.status === 'warn')
    .sort((a, b) => order[a.status] - order[b.status] || a.weight - b.weight)
    .slice(0, 3);

  return {
    fightName: fight.name,
    kill: !!fight.kill,
    duration,
    level,
    gcdCount: gcds.length,
    findings,
    priorities,
    timeline: { segments, idle, deaths, burst: merged },
  };
}
