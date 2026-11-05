/**
 * Liga os eventos do OverlayPlugin ao tracker.
 *
 * Linhas de log usadas (formato do OverlayPlugin, campos separados em `line[]`):
 *  00 ChatLog       [00, hora, canal(hex), remetente, mensagem]
 *  02 ChangePrimary [02, hora, id, nome]
 *  21/22 Ability    [21, hora, origemId, origemNome, acaoId, acaoNome, alvoId, alvoNome, ...]
 *  26 GainsEffect   [26, hora, efeitoId, efeitoNome, duracao, origemId, origemNome, alvoId, alvoNome, ...]
 *  30 LosesEffect   [30, hora, efeitoId, efeitoNome, '', origemId, origemNome, alvoId, alvoNome, ...]
 *
 * Habilidades e efeitos são reconhecidos pelo ID do jogo (dados da XIVAPI), então
 * funciona com o cliente em qualquer idioma. O nome em inglês fica como reserva.
 */
import { STATUS_NAME_BY_GAME_ID } from '../data/xivapi';
import { call, connect, on, type ConnectionMode } from './overlayApi';
import { tracker } from './tracker';

/** Canais de chat de jogadores (say, shout, tell, party, alliance, FC, yell, linkshells, CWLS). */
const PLAYER_CHANNELS = new Set([
  '000A', '000B', '000C', '000D', '000E', '000F', '0018', '001E',
  '0010', '0011', '0012', '0013', '0014', '0015', '0016', '0017',
  '0025', '0026', '0027', '0028', '0029', '002A', '002B', '002C',
]);

const BLM_JOB_ID = 25;

let playerId: string | null = null;
let playerName: string | null = null;
let lastAbilityKey = '';

const sameId = (a: string | undefined, b: string | null) =>
  !!a && !!b && a.toUpperCase() === b.toUpperCase();

function handleLine(line: string[]) {
  const type = line[0];
  if (type === '02') {
    playerId = line[2];
    playerName = line[3];
    tracker.setPlayer({ name: playerName });
    return;
  }
  if (type === '00') {
    const channel = (line[2] ?? '').toUpperCase();
    if (PLAYER_CHANNELS.has(channel)) tracker.chat(line[3] ?? '', line[4] ?? '');
    return;
  }
  if (type === '21' || type === '22') {
    if (!sameId(line[2], playerId) && line[3] !== playerName) return;
    // ataques em área geram uma linha 22 por alvo: conta só uma vez
    const key = `${line[1]}|${line[4]}`;
    if (key === lastAbilityKey) return;
    lastAbilityKey = key;
    tracker.useActionFromLog(parseInt(line[4] ?? '', 16), line[5] ?? '');
    return;
  }
  if (type === '26') {
    const onPlayer = sameId(line[7], playerId);
    const fromPlayer = sameId(line[5], playerId);
    tracker.statusGained(statusName(line), parseFloat(line[4] ?? '0') || 0, onPlayer, fromPlayer);
    return;
  }
  if (type === '30') {
    tracker.statusLost(statusName(line), sameId(line[7], playerId));
  }
}

/** Nome canônico (inglês) do status: pelo ID do jogo, senão pelo texto do log. */
function statusName(line: string[]): string {
  return STATUS_NAME_BY_GAME_ID.get(parseInt(line[2] ?? '', 16)) ?? line[3] ?? '';
}

interface Combatant {
  ID: number;
  Name: string;
  CurrentMP: number;
  Job: number;
  Level: number;
}

export function startLive(onMode: (m: ConnectionMode) => void): void {
  on('LogLine', (e) => handleLine(e.line as string[]));
  on('ChangePrimaryPlayer', (e) => {
    playerId = Number(e.charID).toString(16).toUpperCase();
    playerName = e.charName;
    tracker.setPlayer({ name: playerName });
  });
  // Evento do cactbot (se instalado): gauge real do job
  on('onPlayerChangedEvent', (e) => {
    const d = e.detail;
    if (!d) return;
    tracker.setPlayer({ name: d.name, level: d.level, isBlm: d.job === 'BLM' });
    if (typeof d.currentMP === 'number') tracker.setMp(d.currentMP);
    if (d.job === 'BLM' && d.jobDetail) tracker.setGauge(d.jobDetail);
  });

  connect(['LogLine', 'ChangePrimaryPlayer', 'onPlayerChangedEvent'], onMode);

  // Sem cactbot, pega MP/nível/job do jogador a cada segundo (sem conexão, call() devolve null)
  setInterval(async () => {
    if (!playerName || tracker.get().gaugeSource === 'cactbot') return;
    const res = await call<{ combatants: Combatant[] }>({ call: 'getCombatants', names: [playerName] });
    const me = res?.combatants?.[0];
    if (!me) return;
    tracker.setMp(me.CurrentMP);
    tracker.setPlayer({ level: me.Level, isBlm: me.Job === BLM_JOB_ID });
  }, 1000);
}
