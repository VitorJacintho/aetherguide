export const OVERLAY_MODULES = [
  { id: 'coach', label: 'Coach: próximo passo', desc: 'Sugere a próxima magia e explica o motivo.' },
  { id: 'gauge', label: 'Gauge', desc: 'Fogo/Gelo, Umbral Hearts, Astral Soul, Polyglot, Paradox e MP.' },
  { id: 'dot', label: 'Timer do Thunder', desc: 'Pisca quando faltam menos de 3 s.' },
  { id: 'cds', label: 'Cooldowns', desc: 'Ley Lines, Triplecast, Swiftcast, Manafont e Amplifier.' },
  { id: 'burst', label: 'Janela de burst', desc: 'Avisa quando os buffs da party estão ativos.' },
  { id: 'food', label: 'Lembrete de comida', desc: 'Avisa se o Well Fed está acabando ou ausente.' },
  { id: 'chat', label: 'Tradutor de gírias', desc: 'Explica siglas do chat (tyfp, W2W, LB…).' },
] as const;

export type ModuleId = (typeof OVERLAY_MODULES)[number]['id'];
export const ALL_MODULE_IDS: ModuleId[] = OVERLAY_MODULES.map((m) => m.id);
