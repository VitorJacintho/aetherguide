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

const handlers = new Map<string, Set<Handler>>();
let send: ((msg: object, cb?: (data: any) => void) => void) | null = null;

function dispatch(e: OverlayEvent) {
  handlers.get(e.type)?.forEach((h) => h(e));
}

export function on(type: string, handler: Handler): () => void {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type)!.add(handler);
  return () => handlers.get(type)?.delete(handler);
}

export function call<T = any>(msg: object): Promise<T | null> {
  return new Promise((resolve) => {
    if (!send) return resolve(null);
    send(msg, (data) => resolve(typeof data === 'string' ? JSON.parse(data) : data));
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
