/**
 * Simulador de ACT/IINACT para desenvolvimento: um servidor WebSocket que fala o
 * protocolo do OverlayPlugin e transmite uma luta de Black Mage gerada pelo motor
 * de regras. Permite testar o app (conexão, overlay, gravação) sem abrir o jogo.
 *
 *   npm run fake-act            (porta 10501, a mesma do ACT/IINACT)
 *   PORT=10599 npm run fake-act
 *
 * Linhas no formato do OverlayPlugin: 00 chat, 01 zona, 02 jogador, 21 habilidade,
 * 26/30 ganha/perde efeito, e 39 (HP) para testar os filtros da gravação.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  advance, applyAction, canUse, gcdLength, initialState, recommend, type ActionId, type BlmState,
} from '../src/engine/blm.ts';

const PORT = Number(process.env.PORT ?? 10501);
const PLAYER = { id: 0x10abcdef, name: 'Fake Mage' };
const BOSS = { id: 0x40000001, name: 'Striking Dummy' };
const HEALER = { id: 0x10111111, name: 'Fake Astro' };

const xivapi = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'src', 'data', 'xivapi.json'), 'utf8'));

/** Dungeon simulada (FAKE_DUTY="Nome"), com os chefes conjurando as mecânicas reais a cada 8 s. */
const dutyFile = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'src', 'data', 'duties.json'), 'utf8'));
const DUTY = dutyFile.duties.find((d: any) => d.name === (process.env.FAKE_DUTY ?? 'Ihuykatumu'));
const DUTY_CASTS = (DUTY?.mechanics ?? []).filter((m: any) => m.kind !== 'custom' || m.note);
const ZONE = DUTY ? { id: DUTY.zoneId as number, name: DUTY.name as string } : { id: 1, name: 'Fake Training Grounds' };
const hex = (n: number) => n.toString(16).toUpperCase();
const actionHex = (key: string) => hex(xivapi.actions[key]?.ids?.[0] ?? 0);
const statusHex = (name: string) => hex(xivapi.statuses[name]?.ids?.[0] ?? 0);
const NAMES: Record<string, string> = Object.fromEntries(Object.entries(xivapi.actions).map(([k, a]: [string, any]) => [k, a.name]));

const CHAT: [string, string][] = [
  ['Tank Lalafell', 'o/ hi all, W2W ok?'],
  ['Fake Astro', 'FT here, sorry in advance!'],
  ['Random Roe', 'LB on this pull pls'],
  ['Fake Astro', 'gg tyfp o/'],
];

const clients = new Set<WebSocket>();
const now = () => new Date().toISOString();

function send(ws: WebSocket, obj: unknown) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}
function broadcast(obj: unknown) {
  for (const ws of clients) send(ws, obj);
}
function line(...fields: (string | number)[]) {
  const l = fields.map(String);
  broadcast({ type: 'LogLine', line: l, rawLine: l.join('|') });
}

const ability = (key: string) =>
  line('21', now(), hex(PLAYER.id), PLAYER.name, actionHex(key), NAMES[key] ?? key, hex(BOSS.id), BOSS.name, '0', '0');
const gain = (name: string, dur: number, src = PLAYER, tgt = PLAYER) =>
  line('26', now(), statusHex(name), name, dur.toFixed(2), hex(src.id), src.name, hex(tgt.id), tgt.name, '00', '100', '100');
const lose = (name: string, src = PLAYER, tgt = PLAYER) =>
  line('30', now(), statusHex(name), name, '', hex(src.id), src.name, hex(tgt.id), tgt.name, '00');

/* ---------------- simulação ---------------- */

let state: BlmState = initialState();
let last = performance.now();
let nextGcd = 0;
let elapsed = 0;
let dotUntil: number | null = null;
let llUntil: number | null = null;
let nextChat = 3;
let nextBurst = 8;
let chatIdx = 0;
let nextBossCast = 4;
let castIdx = 0;

function use(id: ActionId) {
  const before = state;
  ability(id);
  state = applyAction(state, id);
  if (id === 'highThunder') {
    gain('High Thunder', 30, PLAYER, BOSS);
    dotUntil = elapsed + 30;
  }
  if (id === 'leyLines') {
    gain('Circle of Power', 20);
    llUntil = elapsed + 20;
  }
  if (!before.thunderhead && state.thunderhead) gain('Thunderhead', 30);
  if (before.thunderhead && !state.thunderhead) lose('Thunderhead');
  if (!before.firestarter && state.firestarter) gain('Firestarter', 30);
  if (before.firestarter && !state.firestarter) lose('Firestarter');
}

function tick() {
  const t = performance.now();
  const dt = (t - last) / 1000;
  last = t;
  elapsed += dt;
  state = advance(state, dt);
  if (clients.size === 0) return;

  if (dotUntil !== null && elapsed >= dotUntil) {
    lose('High Thunder', PLAYER, BOSS);
    dotUntil = null;
  }
  if (llUntil !== null && elapsed >= llUntil) {
    lose('Circle of Power');
    llUntil = null;
  }
  if (elapsed >= nextGcd) {
    const advice = recommend(state);
    for (const o of advice.ogcds) use(o.id);
    const gcd = recommend(state).gcd;
    if (canUse(state, gcd).ok) use(gcd);
    nextGcd = elapsed + gcdLength(state);
  }
  if (elapsed >= nextChat) {
    const [who, msg] = CHAT[chatIdx++ % CHAT.length];
    line('00', now(), '000E', who, msg);
    nextChat = elapsed + 12;
  }
  if (elapsed >= nextBurst) {
    gain('Divination', 20, HEALER, PLAYER);
    nextBurst = elapsed + 120;
  }
  if (DUTY_CASTS.length && elapsed >= nextBossCast) {
    const m = DUTY_CASTS[castIdx++ % DUTY_CASTS.length];
    line('20', now(), '40000002', m.boss ?? BOSS.name, hex(m.ids[0]), m.name, hex(PLAYER.id), PLAYER.name, '4.00', '0', '0', '0', '0');
    nextBossCast = elapsed + 8;
  }
  // linha "barulhenta" de HP, que a gravação deve descartar
  line('39', now(), hex(PLAYER.id), PLAYER.name, '100000', '100000', String(Math.round(state.mp)), '10000');
}

function greet(ws: WebSocket) {
  send(ws, { type: 'ChangePrimaryPlayer', charID: PLAYER.id, charName: PLAYER.name });
  send(ws, { type: 'ChangeZone', zoneID: ZONE.id, zoneName: ZONE.name });
  send(ws, { type: 'LogLine', line: ['02', now(), hex(PLAYER.id), PLAYER.name], rawLine: '' });
  send(ws, { type: 'LogLine', line: ['01', now(), hex(ZONE.id), ZONE.name], rawLine: '' });
  const wf = ['26', now(), statusHex('Well Fed'), 'Well Fed', '1800.00', hex(PLAYER.id), PLAYER.name, hex(PLAYER.id), PLAYER.name, '00'];
  send(ws, { type: 'LogLine', line: wf, rawLine: wf.join('|') });
}

const wss = new WebSocketServer({ host: '127.0.0.1', port: PORT });
wss.on('connection', (ws) => {
  console.log('[fake-act] cliente conectado');
  ws.on('message', (raw) => {
    let msg: { call?: string; rseq?: number };
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (msg.call === 'subscribe') {
      clients.add(ws);
      greet(ws);
    } else if (msg.call === 'getCombatants') {
      send(ws, {
        rseq: msg.rseq,
        combatants: [{ ID: PLAYER.id, Name: PLAYER.name, CurrentMP: Math.round(state.mp), MaxMP: 10000, Job: 25, Level: 100 }],
      });
    } else if (msg.rseq !== undefined) {
      send(ws, { rseq: msg.rseq });
    }
  });
  ws.on('close', () => {
    clients.delete(ws);
    console.log('[fake-act] cliente desconectado');
  });
});
wss.on('listening', () => console.log(`[fake-act] ouvindo em ws://127.0.0.1:${PORT}/ws`));
wss.on('error', (e) => {
  console.error(`[fake-act] erro: ${e.message}`);
  process.exit(1);
});
setInterval(tick, 100);
