const STATS: { name: string; tier: 'top' | 'good' | 'meh' | 'no'; text: string }[] = [
  { name: 'Intelligence', tier: 'top', text: 'Atributo principal dos casters. Vem do item level: equipamento melhor = mais Intelligence.' },
  { name: 'Critical Hit', tier: 'top', text: 'Chance e dano de acertos críticos. Normalmente o melhor atributo secundário.' },
  { name: 'Determination', tier: 'good', text: 'Aumento de dano constante, sem aleatoriedade.' },
  { name: 'Direct Hit', tier: 'good', text: 'Chance de "acerto direto" (dano extra).' },
  { name: 'Spell Speed', tier: 'meh', text: 'Deixa magias e GCD mais rápidos. Use só o necessário para o ritmo que você prefere — veja a calculadora em Ferramentas.' },
  { name: 'Piety', tier: 'no', text: 'Regeneração de MP para healers. Não serve para Black Mage!' },
];

const TIER_LABEL = { top: 'Prioridade', good: 'Bom', meh: 'Situacional', no: 'Evite' } as const;
const TIER_CLASS = { top: 'gold', good: 'ice', meh: 'thunder', no: 'fire' } as const;

const MATERIA: [string, string, string][] = [
  ['Savage Aim', 'Critical Hit', '✅'],
  ['Savage Might', 'Determination', '✅'],
  ["Heavens' Eye", 'Direct Hit', '✅'],
  ['Quicktongue', 'Spell Speed', '⚠️ só se quiser um GCD mais rápido'],
  ['Battledance', 'Piety', '❌ de healer'],
];

const GEAR_SOURCES: { range: string; text: string }[] = [
  { range: 'Subindo de nível', text: 'Recompensas de quests (MSQ e de job), drops de dungeon e itens baratos no Market Board. Troque o equipamento a cada ~5 níveis.' },
  { range: 'Nível 50, 60, 70…', text: 'Dungeons da roleta de Leveling dão itens do nível. Tomestones antigos (Poetics) compram equipamento de expansões passadas.' },
  { range: 'Nível máximo (iniciante)', text: 'Equipamento de dungeon e de tomestone de semanas anteriores, equipamento de crafter (com Materia) e raids normais.' },
  { range: 'Nível máximo (avançado)', text: 'Tomestones da semana, raids Savage, trials Extreme (armas) e armas Relic.' },
];

export default function Build() {
  return (
    <>
      <h1>Build & Equipamento</h1>
      <p className="lead">
        No FFXIV não existe árvore de talentos: sua "build" é o equipamento, a Materia e a comida. A regra de ouro para iniciantes:
        <b> o maior item level vence</b>. Os detalhes abaixo só importam no nível máximo.
      </p>

      <div className="callout warn">
        <b>Erro nº 1 de iniciante:</b> equipamento <b>"of Healing"</b> (feito para healers, com Mind e Piety). O Black Mage usa
        <b> "of Casting"</b> — é o mesmo dos outros casters (Summoner, Red Mage, Pictomancer). Acessórios também: "of Casting".
      </div>

      <h2>Atributos</h2>
      <div className="grid grid-3">
        {STATS.map((s) => (
          <div key={s.name} className="card">
            <span className={`badge ${TIER_CLASS[s.tier]}`}>{TIER_LABEL[s.tier]}</span>
            <h3 style={{ marginTop: 8 }}>{s.name}</h3>
            <p className="muted" style={{ margin: 0 }}>{s.text}</p>
          </div>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 10 }}>
        A distribuição exata muda a cada tier de equipamento. Para montar o conjunto ideal (BiS) use o{' '}
        <a href="https://xivgear.app" target="_blank" rel="noreferrer">xivgear.app</a> ou a página de BiS da{' '}
        <a href="https://www.thebalanceffxiv.com/jobs/casters/black-mage/" target="_blank" rel="noreferrer">The Balance</a>.
      </p>

      <h2>Materia</h2>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Materia</th><th>Atributo</th><th>Para o BLM</th></tr></thead>
          <tbody>
            {MATERIA.map(([m, s, v]) => (
              <tr key={m}><td><b>{m}</b></td><td>{s}</td><td>{v}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        Coloque Materia só nos espaços normais. "Overmeld" (espaços extras) é caro e arriscado — deixe para quando estiver no
        endgame.
      </p>

      <h2>Comida e poção</h2>
      <div className="grid grid-2">
        <div className="card">
          <h3>🍲 Comida</h3>
          <p style={{ margin: 0 }}>
            Dá Vitality e atributos secundários por 30 min (e +3% de EXP). Escolha a comida mais recente que aumente
            Critical Hit, Direct Hit ou Determination. Use sempre em raids e trials difíceis.
          </p>
        </div>
        <div className="card">
          <h3>🧪 Poção (Tincture / Gemdraught)</h3>
          <p style={{ margin: 0 }}>
            Use uma <b>Gemdraught of Intelligence</b> do maior grau disponível no começo da luta e de novo a cada ~6 minutos,
            junto com os buffs da party.
          </p>
        </div>
      </div>

      <h2>Onde conseguir equipamento</h2>
      <div className="grid grid-2">
        {GEAR_SOURCES.map((g) => (
          <div key={g.range} className="card">
            <h3>{g.range}</h3>
            <p className="muted" style={{ margin: 0 }}>{g.text}</p>
          </div>
        ))}
      </div>
    </>
  );
}
