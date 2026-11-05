/**
 * Ponte com o app desktop (Electron). Fora do app (navegador/ACT) é `null`.
 * A implementação fica em electron/preload.cjs.
 */
export interface OverlaySettings {
  visible: boolean;
  locked: boolean;
  source: 'ws' | 'demo';
  wsUrl: string;
  modules: string[];
  x: number | null;
  y: number | null;
}

export interface DesktopSettings {
  overlay: OverlaySettings;
}

export interface DesktopApi {
  isDesktop: true;
  shortcuts: { toggle: string; lock: string };
  getSettings(): Promise<DesktopSettings>;
  setOverlay(patch: Partial<OverlaySettings> & { resetPosition?: boolean }): Promise<DesktopSettings>;
  onSettings(cb: (s: DesktopSettings) => void): () => void;
  onLock(cb: (locked: boolean) => void): () => void;
}

declare global {
  interface Window {
    aetherguide?: DesktopApi;
  }
}

export const desktop: DesktopApi | null = typeof window !== 'undefined' ? window.aetherguide ?? null : null;
