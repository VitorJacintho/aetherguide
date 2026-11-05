/**
 * Ponte com o app desktop (Electron). Fora do app (navegador/ACT) é `null`.
 * A implementação fica em electron/preload.cjs.
 */
export interface OverlaySettings {
  visible: boolean;
  locked: boolean;
  source: 'ws' | 'demo' | 'replay';
  wsUrl: string;
  modules: string[];
  x: number | null;
  y: number | null;
  replayFile: string | null;
  replaySpeed: number;
}

export interface DesktopSettings {
  overlay: OverlaySettings;
  recorder: { includePrivateChat: boolean };
}

export interface RecorderStatus {
  recording: boolean;
  name: string | null;
  startedAt: number | null;
  events: number;
  durationMs: number;
}

export interface RecordingInfo {
  name: string;
  bytes: number;
  modified: number;
  startedAt: string | null;
  durationMs: number | null;
  events: number | null;
  player: string | null;
  zones: string[];
  /** sem rodapé: o app fechou durante a gravação */
  incomplete: boolean;
}

export interface RecordingSummaryIpc {
  events: number;
  durationMs: number;
  player: string | null;
  zones: string[];
  typeCounts: Record<string, number>;
}

export interface DesktopApi {
  isDesktop: true;
  shortcuts: { toggle: string; lock: string; record: string };
  getSettings(): Promise<DesktopSettings>;
  setOverlay(patch: Partial<OverlaySettings> & { resetPosition?: boolean }): Promise<DesktopSettings>;
  onSettings(cb: (s: DesktopSettings) => void): () => void;
  onLock(cb: (locked: boolean) => void): () => void;

  // gravações (janela principal)
  toggleRecording(): Promise<{ ok: boolean; error?: string }>;
  getRecorderStatus(): Promise<RecorderStatus>;
  onRecorderStatus(cb: (s: RecorderStatus) => void): () => void;
  listRecordings(): Promise<RecordingInfo[]>;
  onRecordingsChanged(cb: () => void): () => void;
  deleteRecording(name: string): Promise<void>;
  openRecordingsFolder(): Promise<void>;
  playRecording(name: string, speed: number): Promise<DesktopSettings>;
  setRecorderOptions(opts: { includePrivateChat: boolean }): Promise<DesktopSettings>;

  // gravações (janela de overlay)
  readRecording(name: string): Promise<string>;
  onRecorderCommand(cb: (c: { cmd: 'start' | 'stop'; includePrivateChat?: boolean }) => void): () => void;
  recorderAppend(chunk: string): Promise<boolean>;
  recorderStatus(s: { events: number; durationMs: number }): void;
  recorderFinish(summary: RecordingSummaryIpc): Promise<void>;
}

declare global {
  interface Window {
    aetherguide?: DesktopApi;
  }
}

export const desktop: DesktopApi | null = typeof window !== 'undefined' ? window.aetherguide ?? null : null;
