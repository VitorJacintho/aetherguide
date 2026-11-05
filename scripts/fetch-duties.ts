/**
 * Gera src/data/duties.json: dungeons e trials com as mecânicas dos chefes.
 *
 *  - Lista de duties (nome, nível, item level, expansão, zona): XIVAPI v2 (dados do jogo).
 *  - Mecânicas (IDs das habilidades dos chefes e o tipo de cada uma): gatilhos do cactbot
 *    (https://github.com/OverlayPlugin/cactbot, licença Apache-2.0).
 *  - Nomes das habilidades: XIVAPI, pelo ID.
 *
 * Os textos em português ficam no app (src/data/mechanics.ts), por tipo de mecânica.
 *   npm run fetch:duties
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const XIV = 'https://v2.xivapi.com/api';
const REPO = 'OverlayPlugin/cactbot';
const HEADERS = { 'User-Agent': 'aetherguide-data-fetch (fan project)' };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} em ${url}`);
  return res.json();
}
async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} em ${url}`);
  return res.text();
}

/* ---------------- XIVAPI: lista de duties ---------------- */

interface Duty {
  id: number;
  zoneId: number;
  name: string;
  type: 'dungeon' | 'trial';
  level: number;
  ilvl: number;
  expansion: string;
  highEnd: boolean;
  mechanics: Mechanic[];
}

async function fetchDuties(): Promise<Duty[]> {
  const out: Duty[] = [];
  for (const [contentType, type] of [[2, 'dungeon'], [4, 'trial']] as const) {
    let cursor: string | null = null;
    do {
      const url = new URL(`${XIV}/search`);
      if (cursor) url.searchParams.set('cursor', cursor);
      else {
        url.searchParams.set('sheets', 'ContentFinderCondition');
        url.searchParams.set('query', `+ContentType=${contentType}`);
        url.searchParams.set('fields', 'Name,ClassJobLevelRequired,ItemLevelRequired,TerritoryType.ExVersion.Name,HighEndDuty');
        url.searchParams.set('limit', '100');
      }
      const json = await getJson(url.href);
      for (const r of json.results) {
        const f = r.fields;
        if (!f.Name || !f.ClassJobLevelRequired) continue;
        out.push({
          id: r.row_id,
          zoneId: f.TerritoryType?.value ?? 0,
          name: f.Name,
          type,
          level: f.ClassJobLevelRequired,
          ilvl: f.ItemLevelRequired,
          expansion: f.TerritoryType?.fields?.ExVersion?.fields?.Name ?? '',
          highEnd: !!f.HighEndDuty,
          mechanics: [],
        });
      }
      cursor = json.next ?? null;
      await sleep(150);
    } while (cursor);
  }
  return out;
}

/* ---------------- cactbot: gatilhos ---------------- */

interface Mechanic {
  ids: number[];
  name: string;
  boss: string | null;
  kind: string;
  /** texto original do cactbot (inglês) quando não há tipo padronizado */
  note?: string;
}

/** Tipo de mecânica a partir da resposta padronizada do cactbot (resources/responses.ts). */
const RESPONSE_KIND: Record<string, string> = {
  tankBuster: 'tankbuster', tankBusterSwap: 'tankbuster', sharedTankBuster: 'tankbuster', miniBuster: 'tankbuster', tankCleave: 'tankbuster',
  aoe: 'raidwide', bigAoe: 'raidwide', bleedAoe: 'raidwide',
  spread: 'spread', protean: 'spread', rolePositions: 'spread', spreadThenStack: 'spread', stackThenSpread: 'stack',
  stackMarker: 'stack', stackMarkerOn: 'stack', getTogether: 'stack', stackMiddle: 'stack', doritoStack: 'stack',
  stackPartner: 'stack', stackInTower: 'towers', healerGroups: 'stack',
  knockback: 'knockback', knockbackOn: 'knockback', drawIn: 'drawin',
  lookAway: 'gaze', lookAwayFromTarget: 'gaze', lookAwayFromSource: 'gaze', lookTowards: 'lookat',
  getBehind: 'behind', goFrontOrSides: 'frontsides', awayFromFront: 'frontsides',
  getUnder: 'in', getIn: 'in', getOut: 'out', outOfMelee: 'out', moveAway: 'out', awayFrom: 'out',
  getInThenOut: 'inout', getOutThenIn: 'outin',
  killAdds: 'adds', killExtraAdd: 'adds',
  stun: 'interrupt', stunIfPossible: 'interrupt', stunOrInterruptIfPossible: 'interrupt', interrupt: 'interrupt', interruptIfPossible: 'interrupt',
  sleep: 'sleep', preyOn: 'targeted', meteorOnYou: 'targeted', earthshaker: 'targeted',
  stopMoving: 'stop', stopEverything: 'stop', moveAround: 'move', breakChains: 'chains', moveChainsTogether: 'chains',
  getTowers: 'towers',
};

/** Classifica textos livres do cactbot (inglês) por palavras-chave. */
function classifyText(text: string): string | null {
  const t = text.toLowerCase();
  if (/tank ?buster|buster on/.test(t)) return 'tankbuster';
  if (/look away|gaze/.test(t)) return 'gaze';
  if (/knockback/.test(t)) return 'knockback';
  if (/\bspread\b/.test(t)) return 'spread';
  if (/\bstack\b/.test(t)) return 'stack';
  if (/\baoe\b|raidwide/.test(t)) return 'raidwide';
  if (/kill adds|\badds\b/.test(t)) return 'adds';
  if (/tower/.test(t)) return 'towers';
  if (/get behind|go behind/.test(t)) return 'behind';
  if (/interrupt|stun/.test(t)) return 'interrupt';
  if (/^(get )?out\b|go out|away from|stay out|out of/.test(t)) return 'out';
  if (/^(get )?in\b|get under|go in/.test(t)) return 'in';
  if (/dodge|avoid|cleave|puddle|line aoe|lines?\b|safe spot|safe side|move to/.test(t)) return 'dodge';
  return null;
}

/** Separa os objetos de nível superior do array `triggers: [...]` (respeitando strings e comentários). */
function triggerBlocks(src: string): string[] {
  const start = src.indexOf('triggers: [');
  if (start < 0) return [];
  const blocks: string[] = [];
  let depth = 0;
  let objStart = -1;
  for (let i = start + 'triggers: ['.length; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    if (c === '/' && next === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && next === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (c === "'" || c === '"' || c === '`') {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++;
      continue;
    }
    if (c === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && objStart >= 0) blocks.push(src.slice(objStart, i + 1));
    } else if (c === ']' && depth === 0) break;
  }
  return blocks;
}

const unquote = (s: string) => s.replace(/\\'/g, "'").replace(/\\"/g, '"');

function parseTriggers(src: string): Omit<Mechanic, 'name'>[] {
  const out: Omit<Mechanic, 'name'>[] = [];
  for (const b of triggerBlocks(src)) {
    const type = /\btype: '(\w+)'/.exec(b)?.[1];
    if (type !== 'StartsUsing' && type !== 'Ability') continue;
    const net = /netRegex: \{([\s\S]*?)\}/.exec(b)?.[1] ?? '';
    const idPart = /\bid: (\[[^\]]*\]|'[^']*')/.exec(net)?.[1] ?? '';
    const ids = [...idPart.matchAll(/'([0-9A-Fa-f]{1,5})'/g)].map((m) => parseInt(m[1], 16));
    if (ids.length === 0) continue;
    const sourceRaw = /\bsource: (?:\[\s*)?'((?:[^'\\]|\\.)*)'/.exec(net)?.[1];
    const response = /response: Responses\.(\w+)\(/.exec(b)?.[1];
    const en = /\ben: '((?:[^'\\]|\\.)*)'/.exec(b)?.[1] ?? /\ben: "((?:[^"\\]|\\.)*)"/.exec(b)?.[1];
    let kind = response ? RESPONSE_KIND[response] ?? null : null;
    if (!kind && en) kind = classifyText(unquote(en));
    out.push({
      ids,
      boss: sourceRaw ? unquote(sourceRaw) : null,
      kind: kind ?? 'custom',
      // texto livre do cactbot: guardado como dica específica (em inglês)
      ...(!response && en ? { note: unquote(en).replace(/\$\{[^}]+\}/g, '…') } : {}),
    });
  }
  return out;
}

async function fetchCactbot(): Promise<{ byZone: Map<number, Omit<Mechanic, 'name'>[]>; sha: string }> {
  const tree = await getJson(`https://api.github.com/repos/${REPO}/git/trees/main?recursive=1`);
  const sha: string = tree.sha;
  const raw = (path: string) => getText(`https://raw.githubusercontent.com/${REPO}/${sha}/${path}`);

  const zoneSrc = await raw('resources/zone_id.ts');
  const zoneIds = new Map<string, number>();
  for (const m of zoneSrc.matchAll(/'(\w+)': (\d+),/g)) zoneIds.set(m[1], Number(m[2]));

  const files: string[] = tree.tree
    .map((n: { path: string }) => n.path)
    .filter((p: string) => /^ui\/raidboss\/data\/0[2-7]-\w+\/(dungeon|trial)\/[^/]+\.ts$/.test(p));

  const byZone = new Map<number, Omit<Mechanic, 'name'>[]>();
  for (const path of files) {
    const src = await raw(path);
    const zoneName = /zoneId: ZoneId\.(\w+)/.exec(src)?.[1];
    const zone = zoneName ? zoneIds.get(zoneName) : undefined;
    if (!zone) continue;
    byZone.set(zone, [...(byZone.get(zone) ?? []), ...parseTriggers(src)]);
    process.stdout.write('.');
  }
  return { byZone, sha };
}

/* ---------------- nomes das habilidades ---------------- */

async function actionNames(ids: number[]): Promise<Map<number, string>> {
  const names = new Map<number, string>();
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += 100) {
    const url = new URL(`${XIV}/sheet/Action`);
    url.searchParams.set('rows', unique.slice(i, i + 100).join(','));
    url.searchParams.set('fields', 'Name');
    const json = await getJson(url.href);
    for (const r of json.rows) if (r.fields?.Name) names.set(r.row_id, r.fields.Name);
    await sleep(150);
  }
  return names;
}

/* ---------------- montagem ---------------- */

async function main() {
  console.log('Buscando duties na XIVAPI…');
  const duties = await fetchDuties();
  console.log(`${duties.length} duties. Lendo gatilhos do cactbot`);
  const { byZone, sha } = await fetchCactbot();
  console.log('\nBuscando nomes das habilidades…');
  const names = await actionNames([...byZone.values()].flat().flatMap((m) => m.ids));

  let withMechanics = 0;
  for (const d of duties) {
    const list = byZone.get(d.zoneId) ?? [];
    const seen = new Set<string>();
    for (const m of list) {
      const key = m.ids.join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      const name = m.ids.map((id) => names.get(id)).find(Boolean);
      if (!name) continue; // habilidades sem nome no jogo costumam ser internas
      d.mechanics.push({ ...m, name });
    }
    if (d.mechanics.length) withMechanics++;
  }
  duties.sort((a, b) => a.level - b.level || a.ilvl - b.ilvl || a.name.localeCompare(b.name));

  const data = {
    sources: {
      duties: 'https://v2.xivapi.com (dados do jogo)',
      mechanics: `https://github.com/${REPO} (Apache-2.0), commit ${sha}`,
    },
    generatedAt: new Date().toISOString(),
    duties,
  };
  const out = join(import.meta.dirname, '..', 'src', 'data', 'duties.json');
  await writeFile(out, `${JSON.stringify(data)}\n`);
  const kinds = new Map<string, number>();
  for (const m of duties.flatMap((d) => d.mechanics)) kinds.set(m.kind, (kinds.get(m.kind) ?? 0) + 1);
  console.log(`${duties.length} duties, ${withMechanics} com mecânicas. Tipos:`, Object.fromEntries([...kinds].sort((a, b) => b[1] - a[1])));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
