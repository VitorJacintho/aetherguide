/**
 * Resume uma gravação do Aetherguide (.agrec) no terminal.
 *   npm run rec:info -- "C:\caminho\Sessao_2026-11-05_21-30-00.agrec"
 */
import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('Uso: npm run rec:info -- <arquivo.agrec>');
  process.exit(1);
}

const lines = readFileSync(file, 'utf8').split('\n').filter((l) => l.trim());
const header = JSON.parse(lines[0]);
if (header.format !== 'aetherguide-recording') {
  console.error('Este arquivo não é uma gravação do Aetherguide.');
  process.exit(1);
}

const events = [];
let footer = null;
let broken = 0;
for (const l of lines.slice(1)) {
  try {
    const v = JSON.parse(l);
    if (Array.isArray(v)) events.push(v);
    else if (v.footer) footer = v.footer;
  } catch {
    broken++;
  }
}

const LINE_NAMES = {
  '00': 'chat', '01': 'mudança de zona', '02': 'jogador principal', '03': 'combatente apareceu', '04': 'combatente sumiu',
  '11': 'party', '20': 'começou a conjurar', '21': 'habilidade (1 alvo)', '22': 'habilidade (vários alvos)',
  '23': 'conjuração cancelada', '24': 'tick de DoT/HoT', '25': 'morte', '26': 'ganhou efeito', '27': 'marcador (headmarker)',
  '30': 'perdeu efeito', '31': 'gauge do job', '33': 'controle do ator (vitória/wipe…)', '35': 'tether', '37': 'efeito resolvido',
  '38': 'status do ator', '40': 'mapa',
};

const kinds = new Map();
const myAbilities = new Map();
const statuses = new Map();
let player = null;
let playerId = null;
for (const [, e] of events) {
  const kind = e.type === 'LogLine' ? e.line[0] : e.type;
  kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
  if (e.type === 'ChangePrimaryPlayer') {
    player = e.charName;
    playerId = Number(e.charID).toString(16).toUpperCase();
  }
  if (e.type !== 'LogLine') continue;
  const l = e.line;
  if (l[0] === '02') {
    player = l[3];
    playerId = l[2];
  }
  if ((l[0] === '21' || l[0] === '22') && (l[2] === playerId || l[3] === player)) myAbilities.set(l[5], (myAbilities.get(l[5]) ?? 0) + 1);
  if (l[0] === '26') statuses.set(l[3], (statuses.get(l[3]) ?? 0) + 1);
}

const ms = footer?.durationMs ?? events[events.length - 1]?.[0] ?? 0;
const mmss = (t) => `${Math.floor(t / 60000)}:${String(Math.floor((t % 60000) / 1000)).padStart(2, '0')}`;
const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

console.log(`\n${basename(file)}  (${(statSync(file).size / 1024).toFixed(0)} KB)`);
console.log(`  início: ${header.startedAt}   app ${header.app}   fonte ${header.source ?? '?'}`);
console.log(`  duração: ${mmss(ms)}   eventos: ${events.length}${footer ? '' : '   ⚠ sem rodapé (gravação interrompida)'}${broken ? `   ⚠ ${broken} linha(s) corrompida(s)` : ''}`);
console.log(`  personagem: ${footer?.player ?? player ?? '?'}   zonas: ${(footer?.zones ?? []).join(', ') || '?'}`);

console.log('\n  Tipos de evento:');
for (const [k, n] of top(kinds, 30)) console.log(`    ${String(n).padStart(7)}  ${k}${LINE_NAMES[k] ? `  (${LINE_NAMES[k]})` : ''}`);

if (myAbilities.size) {
  console.log('\n  Habilidades do personagem:');
  for (const [k, n] of top(myAbilities, 20)) console.log(`    ${String(n).padStart(5)}  ${k}`);
}
if (statuses.size) {
  console.log('\n  Efeitos mais aplicados:');
  for (const [k, n] of top(statuses, 15)) console.log(`    ${String(n).padStart(5)}  ${k}`);
}
console.log('');
