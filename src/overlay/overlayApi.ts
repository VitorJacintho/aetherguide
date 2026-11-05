/**
 * Cliente mínimo do OverlayPlugin (ACT / IINACT).
 *
 * Funciona de dois jeitos, igual ao common.js oficial do OverlayPlugin:
 *  - "plugin": a página roda dentro do ACT e recebe `window.OverlayPluginApi`;
 *  - "websocket": a página roda num navegador/OBS e conecta via
 *    `?OVERLAY_WS=ws://127.0.0.1:10501/ws` (padrão do IINACT e do WSServer do OverlayPlugin).
 *
 * Só lê dados que o plugin entrega (linhas de log, combatentes, eventos do cactbot).
 * Nada aqui lê a memória do jogo nem envia comandos para ele.
 */

export type OverlayEvent = { type: string; [key: string]: any };
type Handler = (e: OverlayEvent) => void;

interface PluginApi {
  ready: boolean;
  callHandler(msg: string, cb?: (data: string) => void): void;
}

declare global {
  interface Window {
    OverlayPluginApi?: PluginApi;
    __OverlayCallback?: (e: OverlayEvent) => void;
  }
}

export type ConnectionMode = 'connecting' | 'plugin' | 'websocket' | 'offline';

type Transport = (msg: object, cb?: (data: any) => void) => void;

const handlers = new Map<string, Set<Handler>>();
const taps = new Set<Handler>();
let send: Transport | null = null;

/* ---- contexto atual: para gravações que começam no meio da sessão ---- */

/** Eventos que descrevem "onde estou / quem sou": guardamos o último de cada. */
const CONTEXT_EVENTS = new Set(['ChangePrimaryPlayer', 'ChangeZone', 'PartyChanged', 'onPlayerChangedEvent', 'InCombat']);
const context = new Map<string, OverlayEvent>();
/** Efeitos ativos (linha 26 ainda sem a linha 30 correspondente), com o horário em que chegaram. */
const activeEffects = new Map<string, { e: OverlayEvent; at: number }>();

function remember(e: OverlayEvent) {
  if (CONTEXT_EVENTS.has(e.type)) {
    context.set(e.type, e);
    return;
  }
  if (e.type === '__combatants') {
    context.set(e.type, e);
    return;
  }
  if (e.type !== 'LogLine') return;
  const l = e.line as string[];
  if (l[0] === '01' || l[0] === '02') context.set(`LogLine:${l[0]}`, e);
  else if (l[0] === '26') {
    activeEffects.set(`${l[2]}|${l[7]}`, { e, at: performance.now() });
    if (activeEffects.size > 800) pruneEffects();
  } else if (l[0] === '30') activeEffects.delete(`${l[2]}|${l[7]}`);
}

function pruneEffects() {
  const now = performance.now();
  for (const [k, { e, at }] of activeEffects) {
    const dur = parseFloat((e.line as string[])[4]);
    if (!(dur - (now - at) / 1000 > 0)) activeEffects.delete(k);
  }
}

/**
 * "Foto" do estado atual em forma de eventos: jogador, zona, party, dados do personagem
 * e efeitos ativos (com a duração corrigida para o tempo que ainda falta).
 * O gravador escreve isso no começo do arquivo, para a reprodução saber quem é quem.
 */
export function contextSnapshot(): OverlayEvent[] {
  pruneEffects();
  const now = performance.now();
  const effects = [...activeEffects.values()].map(({ e, at }) => {
    const line = [...(e.line as string[])];
    line[4] = (parseFloat(line[4]) - (now - at) / 1000).toFixed(2);
    return { type: 'LogLine', line };
  });
  const order = (e: OverlayEvent) => (e.type === 'LogLine' ? 1 : 0); // eventos de contexto antes das linhas
  return [...context.values()].sort((a, b) => order(a) - order(b)).concat(effects);
}

function dispatch(e: OverlayEvent) {
  remember(e);
  taps.forEach((t) => t(e));
  handlers.get(e.type)?.forEach((h) => h(e));
}

/** Injeta um evento como se tivesse vindo do OverlayPlugin (usado na reprodução de gravações). */
export const emit = dispatch;

/** Observa todos os eventos recebidos, de qualquer tipo (usado pelo gravador). */
export function onTap(handler: Handler): () => void {
  taps.add(handler);
  return () => taps.delete(handler);
}

/** Substitui a conexão por uma fonte falsa (reprodução de gravações). */
export function setReplayTransport(t: Transport) {
  send = t;
}

export function on(type: string, handler: Handler): () => void {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type)!.add(handler);
  return () => handlers.get(type)?.delete(handler);
}

export function call<T = any>(msg: { call: string; [k: string]: unknown }): Promise<T | null> {
  return new Promise((resolve) => {
    if (!send) return resolve(null);
    send(msg, (data) => {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      // a gravação guarda as respostas de getCombatants (MP, nível, job) como eventos
      if (msg.call === 'getCombatants' && parsed?.combatants) {
        const ev = { type: '__combatants', combatants: parsed.combatants };
        remember(ev);
        taps.forEach((t) => t(ev));
      }
      resolve(parsed);
    });
  });
}

function wsUrlFromQuery(): string | null {
  const p = new URLSearchParams(window.location.search);
  const ws = p.get('OVERLAY_WS');
  if (ws) return ws;
  const hostPort = p.get('HOST_PORT');
  if (hostPort) return hostPort.endsWith('/') ? `${hostPort}ws` : `${hostPort}/ws`;
  return null;
}

export const RETRY_SECONDS = 5;

/** URL do WebSocket configurada na página (null = modo plugin dentro do ACT). */
export const websocketUrl = wsUrlFromQuery;

/**
 * Conecta e assina os eventos, avisando cada mudança de estado em `onMode`.
 *  - WebSocket: se cair ou o ACT/IINACT ainda não estiver aberto, tenta de novo
 *    a cada RETRY_SECONDS (o app desktop pode abrir antes do ACT).
 *  - Plugin (dentro do ACT): espera até `timeoutMs` pela API aparecer.
 */
export function connect(events: string[], onMode: (m: ConnectionMode) => void, timeoutMs = 3000): void {
  const wsUrl = wsUrlFromQuery();

  if (wsUrl) {
    let seq = 0;
    const pending = new Map<number, (d: any) => void>();
    const open = () => {
      const ws = new WebSocket(wsUrl);
      ws.addEventListener('message', (msg) => {
        const data = JSON.parse(msg.data);
        if (data.rseq !== undefined && pending.has(data.rseq)) {
          pending.get(data.rseq)!(data);
          pending.delete(data.rseq);
        } else {
          dispatch(data);
        }
      });
      ws.addEventListener('open', () => {
        send = (obj: any, cb) => {
          if (cb) {
            obj.rseq = seq++;
            pending.set(obj.rseq, cb);
          }
          ws.send(JSON.stringify(obj));
        };
        send({ call: 'subscribe', events });
        onMode('websocket');
      });
      // 'error' sempre vem seguido de 'close'
      ws.addEventListener('close', () => {
        send = null;
        pending.clear();
        onMode('offline');
        setTimeout(open, RETRY_SECONDS * 1000);
      });
    };
    open();
    return;
  }

  const started = Date.now();
  const tryApi = () => {
    const api = window.OverlayPluginApi;
    if (api && api.ready) {
      window.__OverlayCallback = dispatch;
      send = (obj, cb) => api.callHandler(JSON.stringify(obj), cb);
      send({ call: 'subscribe', events });
      onMode('plugin');
    } else if (Date.now() - started > timeoutMs) {
      onMode('offline');
    } else {
      setTimeout(tryApi, 250);
    }
  };
  tryApi();
}
