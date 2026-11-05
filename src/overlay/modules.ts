export const OVERLAY_MODULES = [
  { id: 'callouts', label: 'Avisos de mecânica', desc: 'Quando o chefe começa uma mecânica conhecida, explica o que fazer.', defaultOn: true },
  { id: 'duty', label: 'Guia da dungeon/trial', desc: 'Ao entrar numa duty, mostra o nome, o nível e uma dica.', defaultOn: true },
  { id: 'voice', label: 'Avisos por voz (português)', desc: 'Lê os avisos de mecânica em voz alta. Precisa de uma voz em português no Windows.', defaultOn: false },
  { id: 'coach', label: 'Coach: próximo passo', desc: 'Sugere a próxima magia e explica o motivo.', defaultOn: true },
  { id: 'gauge', label: 'Gauge', desc: 'Fogo/Gelo, Umbral Hearts, Astral Soul, Polyglot, Paradox e MP.', defaultOn: true },
  { id: 'dot', label: 'Timer do Thunder', desc: 'Pisca quando faltam menos de 3 s.', defaultOn: true },
  { id: 'cds', label: 'Cooldowns', desc: 'Ley Lines, Triplecast, Swiftcast, Manafont e Amplifier.', defaultOn: true },
  { id: 'burst', label: 'Janela de burst', desc: 'Avisa quando os buffs da party estão ativos.', defaultOn: true },
  { id: 'food', label: 'Lembrete de comida', desc: 'Avisa se o Well Fed está acabando ou ausente.', defaultOn: true },
  { id: 'chat', label: 'Tradutor de gírias', desc: 'Explica siglas do chat (tyfp, W2W, LB…).', defaultOn: true },
] as const;

export type ModuleId = (typeof OVERLAY_MODULES)[number]['id'];
export const ALL_MODULE_IDS: ModuleId[] = OVERLAY_MODULES.map((m) => m.id);
export const DEFAULT_MODULE_IDS: ModuleId[] = OVERLAY_MODULES.filter((m) => m.defaultOn).map((m) => m.id);
