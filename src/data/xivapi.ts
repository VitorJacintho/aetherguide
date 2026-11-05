/**
 * Acesso tipado aos dados oficiais baixados da XIVAPI (npm run fetch:xivapi).
 * Ícones ficam em public/icons e são servidos de forma relativa, para funcionar
 * tanto no navegador quanto aberto direto do disco pelo ACT.
 */
import raw from './xivapi.json';

interface ActionData {
  name: string;
  ids: number[];
  level: number;
  recast: number;
  baseRecast: number;
  maxCharges: number;
  icon: string;
}
interface StatusData {
  ids: number[];
  icon?: string;
}

const data = raw as unknown as {
  gameVersion: string;
  fetchedAt: string;
  actions: Record<string, ActionData>;
  statuses: Record<string, StatusData>;
};

const BASE = import.meta.env.BASE_URL;

export const XIVAPI_INFO = { gameVersion: data.gameVersion, fetchedAt: data.fetchedAt };

export function actionIconUrl(key: string): string | null {
  const a = data.actions[key];
  return a ? `${BASE}${a.icon}` : null;
}

export function statusIconUrl(name: string): string | null {
  const s = data.statuses[name];
  return s?.icon ? `${BASE}${s.icon}` : null;
}

/** ID da ação no jogo (como aparece no log) → chave interna (ex.: 3577 → "fire4"). */
export const ACTION_KEY_BY_GAME_ID = new Map<number, string>(
  Object.entries(data.actions).flatMap(([key, a]) => a.ids.map((id) => [id, key] as [number, string])),
);

/** ID do status no jogo → nome canônico em inglês (ex.: 3870 → "Thunderhead"). */
export const STATUS_NAME_BY_GAME_ID = new Map<number, string>(
  Object.entries(data.statuses).flatMap(([name, s]) => s.ids.map((id) => [id, name] as [number, string])),
);

/** IDs de jogo de um status pelo nome canônico (ex.: "High Thunder" → [3871, 3872]). */
export function statusIds(name: string): number[] {
  return data.statuses[name]?.ids ?? [];
}

/** IDs de jogo de uma ação pela chave interna (ex.: "fire4" → [3577]). */
export function actionGameIds(key: string): number[] {
  return data.actions[key]?.ids ?? [];
}

/** Nomes das ações do mais longo para o mais curto ("Fire IV" antes de "Fire"). */
const NAMES = Object.entries(data.actions)
  .map(([key, a]) => ({ key, name: a.name.toLowerCase() }))
  .sort((a, b) => b.name.length - a.name.length);

/** Descobre a ação no começo de um texto livre ("Fire IV ×3" → "fire4"). */
export function actionKeyFromText(text: string): string | null {
  const t = text.trim().toLowerCase();
  const hit = NAMES.find((n) => t === n.name || t.startsWith(`${n.name} `) || t.startsWith(`${n.name}(`));
  return hit?.key ?? null;
}
