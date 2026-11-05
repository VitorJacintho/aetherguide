/**
 * Dungeons e trials (gerado por scripts/fetch-duties.ts).
 * O JSON é carregado sob demanda para não pesar o resto do app.
 */
export interface DutyMechanic {
  /** IDs das habilidades no jogo (como aparecem no log) */
  ids: number[];
  /** nome da habilidade (inglês, como aparece na barra de conjuração) */
  name: string;
  boss: string | null;
  kind: string;
  /** dica específica do cactbot, em inglês */
  note?: string;
}

export interface Duty {
  id: number;
  zoneId: number;
  name: string;
  type: 'dungeon' | 'trial';
  level: number;
  ilvl: number;
  expansion: string;
  highEnd: boolean;
  mechanics: DutyMechanic[];
}

interface DutyFile {
  sources: { duties: string; mechanics: string };
  generatedAt: string;
  duties: Duty[];
}

let cache: Promise<DutyFile> | null = null;

export function loadDutyFile(): Promise<DutyFile> {
  cache ??= import('./duties.json').then((m) => m.default as unknown as DutyFile);
  return cache;
}

export const loadDuties = () => loadDutyFile().then((f) => f.duties);

/** "the Thousand Maws of Toto-Rak" → "The Thousand Maws of Toto-Rak" */
export const dutyTitle = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

/** Extreme, Unreal e conteúdo de alto nível ficam escondidos por padrão para iniciantes. */
export const isHardContent = (d: Duty) => d.highEnd || /\((Extreme|Unreal|Savage)\)/i.test(d.name);

/** Agrupa as mecânicas por chefe, na ordem em que aparecem. */
export function byBoss(mechanics: DutyMechanic[]): { boss: string; mechanics: DutyMechanic[] }[] {
  const groups = new Map<string, DutyMechanic[]>();
  for (const m of mechanics) {
    const boss = m.boss ?? 'Outros';
    groups.set(boss, [...(groups.get(boss) ?? []), m]);
  }
  return [...groups].map(([boss, list]) => ({ boss, mechanics: list }));
}
