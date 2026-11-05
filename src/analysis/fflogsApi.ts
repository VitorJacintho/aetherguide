/**
 * Cliente mínimo da API v2 do FFLogs (GraphQL).
 *
 * Login: "client credentials". O jogador cria um cliente de API gratuito em
 * https://www.fflogs.com/api/clients/ e cola o Client ID e o Client Secret no app.
 * As credenciais ficam SÓ no localStorage do navegador dele — nunca no repositório.
 * Esse fluxo dá acesso a logs públicos e não listados.
 */
import type { FFEvent, ReportActor, ReportFight, ReportInfo } from './types';

const TOKEN_URL = 'https://www.fflogs.com/oauth/token';
const API_URL = 'https://www.fflogs.com/api/v2/client';
const STORE_KEY = 'aetherguide.fflogs';

interface Stored {
  clientId: string;
  clientSecret: string;
  token?: string;
  expiresAt?: number;
}

function load(): Stored | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

function save(s: Stored | null) {
  if (s) localStorage.setItem(STORE_KEY, JSON.stringify(s));
  else localStorage.removeItem(STORE_KEY);
}

export function hasCredentials(): boolean {
  return !!load()?.clientId;
}

export function clearCredentials() {
  save(null);
}

export class FFLogsError extends Error {}

function networkError(e: unknown): FFLogsError {
  return new FFLogsError(
    'Não foi possível falar com o fflogs.com. Verifique sua internet — redes de empresa/escola às vezes bloqueiam o site. ' +
      `(${e instanceof Error ? e.message : String(e)})`,
  );
}

async function fetchToken(clientId: string, clientSecret: string): Promise<{ token: string; expiresAt: number }> {
  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
  } catch (e) {
    throw networkError(e);
  }
  if (res.status === 401 || res.status === 400) throw new FFLogsError('Client ID ou Client Secret inválidos.');
  if (!res.ok) throw new FFLogsError(`O FFLogs recusou o login (HTTP ${res.status}).`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  // renova 5 min antes de expirar
  return { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 300) * 1000 };
}

/** Salva as credenciais e testa obtendo um token. */
export async function connect(clientId: string, clientSecret: string): Promise<void> {
  const t = await fetchToken(clientId.trim(), clientSecret.trim());
  save({ clientId: clientId.trim(), clientSecret: clientSecret.trim(), ...t });
}

async function getToken(): Promise<string> {
  const s = load();
  if (!s) throw new FFLogsError('Conecte sua chave de API do FFLogs primeiro.');
  if (s.token && s.expiresAt && s.expiresAt > Date.now()) return s.token;
  const t = await fetchToken(s.clientId, s.clientSecret);
  save({ ...s, ...t });
  return t.token;
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
  } catch (e) {
    throw networkError(e);
  }
  if (res.status === 429) throw new FFLogsError('Limite de consultas do FFLogs atingido. Tente de novo em alguns minutos.');
  if (!res.ok) throw new FFLogsError(`Erro do FFLogs (HTTP ${res.status}).`);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    const msg = json.errors[0].message;
    if (/permission|private/i.test(msg)) throw new FFLogsError('Este log é privado. Só logs públicos ou não listados podem ser analisados.');
    throw new FFLogsError(msg);
  }
  if (!json.data) throw new FFLogsError('Resposta vazia do FFLogs.');
  return json.data;
}

/* ---------------- URL do log ---------------- */

export interface ParsedUrl {
  code: string;
  fight?: number | 'last';
  source?: number;
}

/** Aceita a URL inteira do relatório ou só o código (16 caracteres). */
export function parseReportUrl(input: string): ParsedUrl | null {
  const text = input.trim();
  const m = text.match(/reports\/(?:a:)?([a-zA-Z0-9]{16})/) ?? text.match(/^([a-zA-Z0-9]{16})$/);
  if (!m) return null;
  const params = new URLSearchParams(text.replace(/^[^?#]*[?#]?/, '').replace(/#/g, '&'));
  const fight = params.get('fight');
  const source = params.get('source');
  return {
    code: m[1],
    fight: fight === 'last' ? 'last' : fight ? Number(fight) : undefined,
    source: source ? Number(source) : undefined,
  };
}

/* ---------------- consultas ---------------- */

export async function getReport(code: string): Promise<ReportInfo> {
  const data = await gql<{
    reportData: {
      report: {
        title: string;
        startTime: number;
        fights: ReportFight[];
        masterData: { actors: ReportActor[] };
      } | null;
    };
  }>(
    `query ($code: String!) {
      reportData {
        report(code: $code) {
          title
          startTime
          fights { id name kill startTime endTime encounterID difficulty friendlyPlayers }
          masterData { actors(type: "Player") { id name server subType } }
        }
      }
    }`,
    { code },
  );
  const r = data.reportData.report;
  if (!r) throw new FFLogsError('Log não encontrado. Confira o link.');
  return {
    code,
    title: r.title,
    startTime: r.startTime,
    // só lutas contra chefes (encounterID > 0)
    fights: r.fights.filter((f) => f.encounterID > 0),
    players: r.masterData.actors,
  };
}

const EVENTS_QUERY = `query ($code: String!, $fights: [Int]!, $start: Float!, $end: Float!, $source: Int, $target: Int, $type: EventDataType!) {
  reportData {
    report(code: $code) {
      events(fightIDs: $fights, startTime: $start, endTime: $end, sourceID: $source, targetID: $target, dataType: $type, limit: 10000) {
        data
        nextPageTimestamp
      }
    }
  }
}`;

async function eventsPaged(vars: { code: string; fight: ReportFight; source?: number; target?: number; type: string }) {
  const all: FFEvent[] = [];
  let start = vars.fight.startTime;
  for (let page = 0; page < 30; page++) {
    const data = await gql<{ reportData: { report: { events: { data: FFEvent[]; nextPageTimestamp: number | null } } } }>(
      EVENTS_QUERY,
      { code: vars.code, fights: [vars.fight.id], start, end: vars.fight.endTime, source: vars.source, target: vars.target, type: vars.type },
    );
    const ev = data.reportData.report.events;
    all.push(...ev.data);
    if (!ev.nextPageTimestamp) break;
    start = ev.nextPageTimestamp;
  }
  return all;
}

export interface FightEvents {
  /** tudo que o jogador fez (casts, buffs/debuffs que aplicou, dano) */
  mine: FFEvent[];
  /** buffs recebidos (inclusive de outros jogadores) */
  buffsOnMe: FFEvent[];
  deaths: FFEvent[];
}

export async function getFightEvents(code: string, fight: ReportFight, playerId: number): Promise<FightEvents> {
  const [mine, buffsOnMe, deaths] = await Promise.all([
    eventsPaged({ code, fight, source: playerId, type: 'All' }),
    eventsPaged({ code, fight, target: playerId, type: 'Buffs' }),
    eventsPaged({ code, fight, type: 'Deaths' }),
  ]);
  return { mine, buffsOnMe, deaths };
}
