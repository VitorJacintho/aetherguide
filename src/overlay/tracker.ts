/**
 * Estado do overlay: guarda o motor do BLM + informações extras
 * (burst da party, comida, chat) e avisa a interface quando muda.
 * É alimentado tanto pelo jogo (live.ts) quanto pela simulação (demo.ts).
 */
import { ACTION_BY_LOG_NAME, ACTION_NAMES, MAX_MP, advance, applyAction, initialState, type ActionId, type BlmState } from '../engine/blm';
import { findTerms, type GlossaryEntry } from '../data/glossary';
import { ACTION_KEY_BY_GAME_ID } from '../data/xivapi';

export interface ChatNote {
  id: number;
  sender: string;
  message: string;
  terms: GlossaryEntry[];
  at: number;
}

export interface Snapshot {
  blm: BlmState;
  now: number;
  burst: { names: string[]; until: number } | null;
  foodUntil: number | null;
  chat: ChatNote[];
  player: { name: string | null; level: number | null; isBlm: boolean | null };
  gaugeSource: 'inferido' | 'cactbot';
  lastAction: ActionId | null;
}

/** Buffs/debuffs de party que marcam a janela de burst (~a cada 2 min). */
export const RAID_BUFFS = new Set([
  'Divination', 'Battle Litany', 'Brotherhood', 'Technical Finish', 'Embolden', 'Searing Light',
  'Arcane Circle', 'Battle Voice', 'Radiant Finale', 'Starry Muse', 'Chain Stratagem', 'Dokumori',
]);

// o DoT do High Thunder II também se chama "High Thunder" no jogo
const DOT_NAMES = new Set(['High Thunder', 'Thunder III', 'Thunder', 'Thunder II', 'Thunder IV']);
const CHAT_NOTE_TTL = 14;

export const clock = () => performance.now() / 1000;

class Tracker {
  private snap: Snapshot;
  private listeners = new Set<() => void>();
  private chatSeq = 0;

  constructor() {
    const now = clock();
    this.snap = {
      blm: { ...initialState(), time: now },
      now,
      burst: null,
      foodUntil: null,
      chat: [],
      player: { name: null, level: null, isBlm: null },
      gaugeSource: 'inferido',
      lastAction: null,
    };
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  get = () => this.snap;

  private set(patch: Partial<Snapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((l) => l());
  }

  /** Avança o relógio do motor até agora e limpa itens expirados. */
  tick() {
    const now = clock();
    const blm = advance(this.snap.blm, now - this.snap.blm.time);
    this.set({
      now,
      blm,
      burst: this.snap.burst && this.snap.burst.until > now ? this.snap.burst : null,
      chat: this.snap.chat.filter((c) => now - c.at < CHAT_NOTE_TTL),
    });
  }

  reset() {
    const now = clock();
    this.set({ blm: { ...initialState(), time: now }, burst: null, lastAction: null });
  }

  /* ---------- entradas ---------- */

  setPlayer(p: Partial<Snapshot['player']>) {
    this.set({ player: { ...this.snap.player, ...p } });
  }

  useAction(id: ActionId) {
    this.tick();
    this.set({ blm: applyAction(this.snap.blm, id), lastAction: id });
  }

  /**
   * Habilidade vinda do log: tenta pelo ID do jogo (funciona em qualquer idioma)
   * e, se não reconhecer, pelo nome em inglês.
   */
  useActionFromLog(gameId: number, logName: string) {
    const key = ACTION_KEY_BY_GAME_ID.get(gameId);
    const id = key && key in ACTION_NAMES ? (key as ActionId) : ACTION_BY_LOG_NAME[logName.toLowerCase()];
    if (id) this.useAction(id);
  }

  statusGained(name: string, duration: number, onPlayer: boolean, fromPlayer: boolean) {
    const now = clock();
    const blm = { ...this.snap.blm };
    if (fromPlayer && DOT_NAMES.has(name) && !onPlayer) blm.dot = duration;
    if (onPlayer) {
      if (name === 'Thunderhead') blm.thunderhead = true;
      if (name === 'Firestarter') blm.firestarter = true;
      if (name === 'Circle of Power') blm.leyLines = duration;
      if (name === 'Well Fed') this.set({ foodUntil: now + duration });
    }
    if (RAID_BUFFS.has(name)) {
      const names = new Set(this.snap.burst?.names ?? []);
      names.add(name);
      const until = Math.max(this.snap.burst?.until ?? 0, now + duration);
      this.set({ burst: { names: [...names], until } });
    }
    this.set({ blm });
  }

  statusLost(name: string, onPlayer: boolean) {
    if (!onPlayer) return;
    const blm = { ...this.snap.blm };
    if (name === 'Thunderhead') blm.thunderhead = false;
    if (name === 'Firestarter') blm.firestarter = false;
    if (name === 'Circle of Power') blm.leyLines = 0;
    if (name === 'Well Fed') this.set({ foodUntil: null });
    this.set({ blm });
  }

  setMp(mp: number) {
    this.set({ blm: { ...this.snap.blm, mp: Math.min(MAX_MP, mp) } });
  }

  /** Gauge real vindo do cactbot (onPlayerChangedEvent.jobDetail). */
  setGauge(g: { umbralStacks: number; umbralHearts: number; polyglot: number; paradox: boolean; astralSoulStacks?: number; nextPolyglotMilliseconds?: number }) {
    const blm = { ...this.snap.blm };
    blm.element = g.umbralStacks > 0 ? 'AF' : g.umbralStacks < 0 ? 'UI' : 'none';
    blm.stacks = Math.abs(g.umbralStacks);
    blm.hearts = g.umbralHearts;
    blm.polyglot = g.polyglot;
    blm.paradox = g.paradox;
    if (g.astralSoulStacks !== undefined) blm.astralSoul = g.astralSoulStacks;
    if (g.nextPolyglotMilliseconds !== undefined) blm.polyglotTimer = Math.max(0, 30 - g.nextPolyglotMilliseconds / 1000);
    this.set({ blm, gaugeSource: 'cactbot' });
  }

  chat(sender: string, message: string) {
    const terms = findTerms(message);
    if (terms.length === 0) return;
    const note: ChatNote = { id: this.chatSeq++, sender, message, terms, at: clock() };
    this.set({ chat: [...this.snap.chat, note].slice(-3) });
  }

  setBurst(names: string[], seconds: number) {
    this.set({ burst: { names, until: clock() + seconds } });
  }

  setFood(seconds: number | null) {
    this.set({ foodUntil: seconds === null ? null : clock() + seconds });
  }
}

export const tracker = new Tracker();
