/**
 * Baixa da XIVAPI v2 (https://v2.xivapi.com) os dados oficiais das ações e
 * status usados pelo app:
 *   - ícones em public/icons/{actions,status}/*.png
 *   - IDs do jogo + nível/recarga oficiais em src/data/xivapi.json
 * e imprime um relatório comparando com os valores anotados em actions.ts.
 *
 * Rode depois de cada patch:  npm run fetch:xivapi
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { BLM_ACTIONS } from '../src/data/blm/actions.ts';

const API = 'https://v2.xivapi.com/api';
const ROOT = join(import.meta.dirname, '..');
const HEADERS = { 'User-Agent': 'aetherguide-data-fetch (fan project)' };

/** Status que o overlay acompanha. A chave é o nome canônico (inglês). */
const STATUSES = [
  'Thunderhead', 'Firestarter', 'Circle of Power', 'Well Fed', 'Medicated', 'Triplecast', 'Swiftcast',
  // o DoT do High Thunder II também se chama "High Thunder" no jogo
  'High Thunder', 'Thunder', 'Thunder II', 'Thunder III', 'Thunder IV',
  'Divination', 'Battle Litany', 'Brotherhood', 'Technical Finish', 'Embolden', 'Searing Light',
  'Arcane Circle', 'Battle Voice', 'Radiant Finale', 'Starry Muse', 'Chain Stratagem', 'Dokumori',
];
const STATUS_ICONS = new Set(['Thunderhead', 'Firestarter', 'Circle of Power', 'Well Fed']);

/**
 * A planilha guarda a recarga BASE; traços reduzem no nível alto.
 * Conferido no guia oficial do Lodestone (Enhanced Manafont nv 84, Enhanced Swiftcast nv 94).
 */
const TRAIT_RECAST: Record<string, number> = { manafont: 100, swiftcast: 40 };

interface IconRef { id: number; path: string; path_hr1: string }
interface Row<F> { row_id: number; fields: F }
interface ActionFields {
  Name: string;
  IsPlayerAction: boolean;
  ClassJobLevel: number;
  Recast100ms: number;
  MaxCharges: number;
  Icon: IconRef;
  ClassJob: { value: number; fields?: { Abbreviation: string } };
}
interface StatusFields { Name: string; Icon: IconRef }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let gameVersion = '';

async function search<F>(sheet: string, query: string, fields: string): Promise<Row<F>[]> {
  const url = new URL(`${API}/search`);
  url.searchParams.set('sheets', sheet);
  url.searchParams.set('query', query);
  url.searchParams.set('fields', fields);
  url.searchParams.set('limit', '50');
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} em ${url}`);
  const json = (await res.json()) as { version: string; results: Row<F>[] };
  gameVersion = json.version;
  await sleep(120); // educação com a API pública
  return json.results;
}

async function downloadIcon(icon: IconRef, file: string) {
  const url = `${API}/asset?path=${encodeURIComponent(icon.path_hr1)}&format=png`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ao baixar ${icon.path_hr1}`);
  const out = join(ROOT, 'public', file);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, Buffer.from(await res.arrayBuffer()));
  await sleep(120);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const JOB_PREF = ['BLM', 'THM'];

async function main() {
  const actions: Record<string, unknown> = {};
  const report: string[] = [];

  for (const a of BLM_ACTIONS) {
    // Sem filtrar IsPlayerAction: ações de "substituição" (ex.: Paradox, que aparece
    // no lugar do Fire/Blizzard) vêm marcadas como não-jogador na planilha.
    const rows = (await search<ActionFields>(
      'Action',
      `+Name="${a.name}" +IsPvP=false`,
      'Name,IsPlayerAction,ClassJobLevel,Recast100ms,MaxCharges,Icon,ClassJob.Abbreviation',
    )).filter((r) => r.fields.Name === a.name && r.fields.ClassJobLevel > 0);

    if (rows.length === 0) {
      report.push(`❓ ${a.name}: não encontrado`);
      continue;
    }
    // prefere ação de jogador e a linha do BLM/THM; ações de role têm ClassJob = -1
    rows.sort((x, y) => {
      const rank = (r: Row<ActionFields>) => {
        const i = JOB_PREF.indexOf(r.fields.ClassJob.fields?.Abbreviation ?? '');
        return (r.fields.IsPlayerAction ? 0 : 10) + (i === -1 ? 9 : i);
      };
      return rank(x) - rank(y);
    });
    const main = rows[0].fields;
    const icon = `icons/actions/${a.id}.png`;
    await downloadIcon(main.Icon, icon);

    const baseRecast = main.Recast100ms / 10;
    const recast = TRAIT_RECAST[a.id] ?? baseRecast;
    actions[a.id] = {
      name: a.name,
      ids: rows.map((r) => r.row_id),
      level: main.ClassJobLevel,
      recast,
      baseRecast,
      maxCharges: main.MaxCharges,
      icon,
    };

    if (main.ClassJobLevel !== a.level) report.push(`⚠ ${a.name}: nível anotado ${a.level}, oficial ${main.ClassJobLevel}`);
    // Swiftcast é anotado com a recarga base e o texto explica a redução no 94
    if (a.recast !== undefined && a.recast !== recast && a.recast !== baseRecast)
      report.push(`⚠ ${a.name}: recarga anotada ${a.recast}s, oficial ${recast}s`);
    if ((a.charges ?? 0) !== main.MaxCharges && main.MaxCharges > 0)
      report.push(`ℹ ${a.name}: cargas anotadas ${a.charges ?? 1}, oficial ${main.MaxCharges}`);
    process.stdout.write('.');
  }

  const statuses: Record<string, unknown> = {};
  for (const name of STATUSES) {
    const rows = (await search<StatusFields>('Status', `+Name="${name}"`, 'Name,Icon'))
      .filter((r) => r.fields.Name === name);
    if (rows.length === 0) {
      report.push(`❓ status ${name}: não encontrado`);
      continue;
    }
    let icon: string | undefined;
    if (STATUS_ICONS.has(name)) {
      icon = `icons/status/${slug(name)}.png`;
      await downloadIcon(rows[0].fields.Icon, icon);
    }
    statuses[name] = { ids: rows.map((r) => r.row_id), ...(icon ? { icon } : {}) };
    process.stdout.write('.');
  }

  const data = {
    source: 'https://v2.xivapi.com',
    gameVersion,
    fetchedAt: new Date().toISOString(),
    actions,
    statuses,
  };
  await writeFile(join(ROOT, 'src', 'data', 'xivapi.json'), JSON.stringify(data, null, 2) + '\n');

  console.log(`\n\n${Object.keys(actions).length} ações e ${Object.keys(statuses).length} status salvos (versão ${gameVersion}).`);
  console.log(report.length ? report.join('\n') : 'Nenhuma diferença com actions.ts.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
