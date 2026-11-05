/** Formato dos dados da API v2 do FFLogs (só os campos que usamos). */

export interface FFEvent {
  /** milissegundos desde o início do relatório */
  timestamp: number;
  type: string;
  sourceID?: number;
  targetID?: number;
  targetInstance?: number;
  /** ID da ação no jogo; status vêm somados de 1.000.000 */
  abilityGameID?: number;
  /** formato antigo/alternativo */
  ability?: { guid: number; name?: string };
  fight?: number;
  /** duração em ms (alguns eventos de buff) */
  duration?: number;
  /** nível do personagem (evento combatantinfo) */
  level?: number;
}

export interface ReportFight {
  id: number;
  name: string;
  kill: boolean | null;
  startTime: number;
  endTime: number;
  encounterID: number;
  difficulty: number | null;
  friendlyPlayers: number[] | null;
}

export interface ReportActor {
  id: number;
  name: string;
  server: string | null;
  /** job, ex.: "BlackMage" */
  subType: string;
}

export interface ReportInfo {
  code: string;
  title: string;
  startTime: number;
  fights: ReportFight[];
  players: ReportActor[];
}

/** No FFLogs, IDs de status = ID do jogo + 1.000.000. */
export const STATUS_OFFSET = 1_000_000;

export const abilityId = (e: FFEvent) => e.abilityGameID ?? e.ability?.guid ?? 0;
