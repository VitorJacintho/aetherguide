/**
 * Gravação e reprodução de sessões.
 *
 * Formato (.agrec): JSON Lines.
 *   linha 1   → cabeçalho {"format":"aetherguide-recording","version":1,...} (escrito pelo app)
 *   linhas    → [ms desde o início, evento do OverlayPlugin]
 *   última    → {"footer":{events, durationMs, player, zones, typeCounts}}
 *
 * O arquivo é escrito aos poucos (a cada 2 s), então uma gravação não se perde
 * se o app fechar no meio.
 */
import { contextSnapshot, emit, onTap, setReplayTransport, type OverlayEvent } from './overlayApi';
import { setClock, tracker } from './tracker';

export const RECORDING_FORMAT = 'aetherguide-recording';

/** Linhas muito frequentes que não usamos: HP (39), depuração (251/252), memória de combatentes (261). */
export const NOISY_TYPES = new Set(['39', '251', '252', '261']);
/** Canais públicos/do grupo: say, shout, party, alliance, yell. Tells, FC e linkshells ficam de fora por padrão. */
const PUBLIC_CHAT = new Set(['000A', '000B', '000E', '000F', '001E']);

export interface RecorderOptions {
  includePrivateChat: boolean;
}

export interface RecordingSummary {
  events: number;
  durationMs: number;
  player: string | null;
  zones: string[];
  typeCounts: Record<string, number>;
}

export class Recorder {
  private buf: string[] = [];
  private t0 = 0;
  private count = 0;
  private typeCounts: Record<string, number> = {};
  private player: string | null = null;
  private zones = new Set<string>();
  private off: (() => void) | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private sink: (chunk: string) => Promise<unknown>;
  private opts: RecorderOptions;

  constructor(sink: (chunk: string) => Promise<unknown>, opts: RecorderOptions) {
    this.sink = sink;
    this.opts = opts;
  }

  start() {
    this.t0 = performance.now();
    // começa com a "foto" do contexto (quem é o jogador, zona, efeitos ativos…)
    for (const e of contextSnapshot()) this.capture(e);
    this.off = onTap((e) => this.capture(e));
    this.timer = setInterval(() => void this.flush(), 2000);
  }

  private capture(e: OverlayEvent) {
    let ev: OverlayEvent = e;
    let kind = e.type;
    if (e.type === 'LogLine') {
      const line = e.line as string[];
      kind = line[0];
      if (NOISY_TYPES.has(kind)) return;
      if (kind === '00' && !this.opts.includePrivateChat && !PUBLIC_CHAT.has((line[2] ?? '').toUpperCase())) return;
      if (kind === '01' && line[3]) this.zones.add(line[3]);
      if (kind === '02' && line[3]) this.player = line[3];
      ev = { type: 'LogLine', line }; // rawLine repete a linha: descartada para economizar espaço
    } else if (e.type === 'ChangePrimaryPlayer') {
      this.player = e.charName;
    } else if (e.type === 'ChangeZone' && e.zoneName) {
      this.zones.add(e.zoneName);
    }
    this.typeCounts[kind] = (this.typeCounts[kind] ?? 0) + 1;
    this.count++;
    this.buf.push(JSON.stringify([Math.round(performance.now() - this.t0), ev]));
  }

  async flush() {
    if (this.buf.length === 0) return;
    const chunk = `${this.buf.join('\n')}\n`;
    this.buf = [];
    await this.sink(chunk);
  }

  status() {
    return { events: this.count, durationMs: Math.round(performance.now() - this.t0) };
  }

  async stop(): Promise<RecordingSummary> {
    this.off?.();
    if (this.timer) clearInterval(this.timer);
    await this.flush();
    return {
      events: this.count,
      durationMs: Math.round(performance.now() - this.t0),
      player: this.player,
      zones: [...this.zones],
      typeCounts: this.typeCounts,
    };
  }
}

/* ---------------- reprodução ---------------- */

export interface Recording {
  header: Record<string, unknown>;
  events: [number, OverlayEvent][];
  footer: RecordingSummary | null;
  durationMs: number;
}

export function parseRecording(text: string): Recording {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length === 0) throw new Error('Arquivo de gravação vazio.');
  const header = JSON.parse(lines[0]);
  if (header?.format !== RECORDING_FORMAT) throw new Error('Este arquivo não é uma gravação do Aetherguide.');
  const events: [number, OverlayEvent][] = [];
  let footer: RecordingSummary | null = null;
  for (const l of lines.slice(1)) {
    let v: unknown;
    try {
      v = JSON.parse(l);
    } catch {
      continue; // última linha cortada (app fechou no meio da escrita)
    }
    if (Array.isArray(v)) events.push(v as [number, OverlayEvent]);
    else if (v && typeof v === 'object' && 'footer' in v) footer = (v as { footer: RecordingSummary }).footer;
  }
  const durationMs = footer?.durationMs ?? events[events.length - 1]?.[0] ?? 0;
  return { header, events, footer, durationMs };
}

/**
 * Reproduz uma gravação: troca o relógio do overlay por um relógio virtual
 * (`speed` vezes mais rápido), zera o estado e injeta os eventos no horário gravado.
 * Responde getCombatants com o último snapshot gravado.
 */
export function startReplay(
  rec: Recording,
  speed: number,
  onProgress: (ms: number) => void,
  onEnd: () => void,
): () => void {
  const start = performance.now();
  const virtualMs = () => (performance.now() - start) * speed;
  setClock(() => virtualMs() / 1000);
  tracker.reset();

  let lastCombatants: unknown = { combatants: [] };
  setReplayTransport((msg, cb) => {
    if ((msg as { call?: string }).call === 'getCombatants') cb?.(lastCombatants);
    else cb?.(null);
  });

  let i = 0;
  const timer = setInterval(() => {
    const t = virtualMs();
    while (i < rec.events.length && rec.events[i][0] <= t) {
      const ev = rec.events[i++][1];
      if (ev.type === '__combatants') lastCombatants = { combatants: ev.combatants };
      else emit(ev);
    }
    onProgress(Math.min(t, rec.durationMs));
    if (i >= rec.events.length) {
      clearInterval(timer);
      onEnd();
    }
  }, 50);
  return () => clearInterval(timer);
}
