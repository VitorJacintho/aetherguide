import { useEffect, useMemo, useState } from 'react';
import { useLocal } from '../hooks/useLocal';
import { byBoss, dutyTitle, isHardContent, loadDutyFile, type Duty, type DutyMechanic } from '../data/duties';
import { DUTY_TIPS, kindInfo } from '../data/mechanics';

type TypeFilter = 'dungeon' | 'trial' | 'all';
const TYPE_LABEL = { dungeon: 'Dungeon', trial: 'Trial' } as const;
const EXPANSION_PT: Record<string, string> = {
  'A Realm Reborn': 'A Realm Reborn (2.x)',
  Heavensward: 'Heavensward (3.x)',
  Stormblood: 'Stormblood (4.x)',
  Shadowbringers: 'Shadowbringers (5.x)',
  Endwalker: 'Endwalker (6.x)',
  Dawntrail: 'Dawntrail (7.x)',
};

/** Remove repetições (mesma habilidade com IDs diferentes em variações da luta). */
function uniqueMechanics(list: DutyMechanic[]) {
  const seen = new Set<string>();
  return list.filter((m) => {
    const key = `${m.name}|${m.kind}|${m.note ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function MechanicRow({ m }: { m: DutyMechanic }) {
  const k = kindInfo(m.kind);
  return (
    <div className="mech">
      <div className="mech-icon" title={k.label}>{k.icon}</div>
      <div>
        <div><b>{m.name}</b> <span className="badge">{k.label}</span></div>
        <div className="muted" style={{ fontSize: '.9rem' }}>{k.what}</div>
        <div style={{ fontSize: '.9rem' }}>🧙 {k.blm}</div>
        {m.note && <div className="muted" style={{ fontSize: '.8rem' }}>Dica do cactbot (inglês): <i>{m.note}</i></div>}
      </div>
    </div>
  );
}

function DutyDetail({ duty, onBack, sources }: { duty: Duty; onBack: () => void; sources: string }) {
  const groups = byBoss(duty.mechanics);
  return (
    <>
      <button className="btn small" onClick={onBack}>← Voltar para a lista</button>
      <h1 style={{ marginTop: 12 }}>{dutyTitle(duty.name)}</h1>
      <div className="chips" style={{ marginBottom: 14 }}>
        <span className="badge gold">{TYPE_LABEL[duty.type]}</span>
        <span className="badge">Nível {duty.level}</span>
        {duty.ilvl > 0 && <span className="badge">Item level {duty.ilvl}</span>}
        <span className="badge">{EXPANSION_PT[duty.expansion] ?? duty.expansion}</span>
      </div>

      <div className="card">
        <h3>Dicas gerais para Black Mage</h3>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {DUTY_TIPS[duty.type].map((t) => <li key={t} style={{ marginBottom: 4 }}>{t}</li>)}
        </ul>
      </div>

      <h2>Mecânicas dos chefes</h2>
      {groups.length === 0 ? (
        <div className="callout">
          Ainda não temos as mecânicas desta {duty.type === 'dungeon' ? 'dungeon' : 'trial'} (a fonte que usamos não cobre).
          As dicas gerais acima continuam valendo — e avise o grupo que é sua primeira vez!
        </div>
      ) : (
        <div className="grid" style={{ gap: 14 }}>
          {groups.map((g) => (
            <div key={g.boss} className="card">
              <h3>{g.boss}</h3>
              {uniqueMechanics(g.mechanics).map((m) => <MechanicRow key={m.ids.join(',')} m={m} />)}
            </div>
          ))}
        </div>
      )}
      <p className="muted" style={{ fontSize: '.8rem', marginTop: 14 }}>
        Os nomes das habilidades aparecem em inglês, como na barra de conjuração do chefe. Fontes: duties da XIVAPI (dados do
        jogo); mecânicas do <a href="https://github.com/OverlayPlugin/cactbot" target="_blank" rel="noreferrer">cactbot</a>{' '}
        (licença Apache-2.0). <span title={sources}>ⓘ</span>
      </p>
    </>
  );
}

export default function Dungeons() {
  const [level] = useLocal('level', 30);
  const [file, setFile] = useState<Awaited<ReturnType<typeof loadDutyFile>> | null>(null);
  const [type, setType] = useLocal<TypeFilter>('duties.type', 'dungeon');
  const [onlyMine, setOnlyMine] = useLocal('duties.onlyMine', true);
  const [showHard, setShowHard] = useLocal('duties.showHard', false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    loadDutyFile().then(setFile);
  }, []);

  const filtered = useMemo(() => {
    if (!file) return [];
    const q = query.trim().toLowerCase();
    return file.duties.filter((d) =>
      (type === 'all' || d.type === type) &&
      (showHard || !isHardContent(d)) &&
      (!onlyMine || d.level <= level) &&
      (!q || d.name.toLowerCase().includes(q) || d.mechanics.some((m) => m.boss?.toLowerCase().includes(q))),
    );
  }, [file, type, showHard, onlyMine, level, query]);

  const recommended = useMemo(
    () => filtered.filter((d) => d.level <= level && d.level >= level - 4 && !isHardContent(d)).slice(-6).reverse(),
    [filtered, level],
  );

  if (!file) return <p className="muted">Carregando dungeons…</p>;

  const duty = file.duties.find((d) => d.id === selected);
  if (duty) return <DutyDetail duty={duty} onBack={() => setSelected(null)} sources={`${file.sources.duties} · ${file.sources.mechanics}`} />;

  const expansions = [...new Set(filtered.map((d) => d.expansion))];

  return (
    <>
      <h1>Dungeons & Trials</h1>
      <p className="lead">
        Antes de entrar, veja o que cada chefe faz e o que o Black Mage deve fazer em cada mecânica. No app desktop, o overlay
        mostra esse guia sozinho quando você entra na dungeon — e avisa quando o chefe começa uma mecânica.
      </p>

      <div className="card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="tabs" style={{ margin: 0 }}>
          {(['dungeon', 'trial', 'all'] as TypeFilter[]).map((t) => (
            <button key={t} className={type === t ? 'active' : ''} onClick={() => setType(t)}>
              {t === 'dungeon' ? 'Dungeons' : t === 'trial' ? 'Trials' : 'Todos'}
            </button>
          ))}
        </div>
        <input type="search" placeholder="Buscar duty ou chefe…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <label className="muted" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /> Até o meu nível ({level})
        </label>
        <label className="muted" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={showHard} onChange={(e) => setShowHard(e.target.checked)} /> Extreme/Unreal
        </label>
      </div>

      {recommended.length > 0 && !query && (
        <>
          <h2>Para o seu nível agora</h2>
          <div className="grid grid-3">
            {recommended.map((d) => (
              <div key={d.id} className="card clickable" onClick={() => setSelected(d.id)}>
                <span className="badge gold">{TYPE_LABEL[d.type]} · nível {d.level}</span>
                <h3 style={{ marginTop: 8 }}>{dutyTitle(d.name)}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {d.mechanics.length > 0 ? `${byBoss(d.mechanics).length} chefe(s) com guia` : 'Dicas gerais'}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {expansions.map((exp) => (
        <div key={exp}>
          <h2>{EXPANSION_PT[exp] ?? exp}</h2>
          <div className="card" style={{ padding: 0 }}>
            <table>
              <thead><tr><th style={{ width: 70 }}>Nível</th><th>Nome</th><th style={{ width: 90 }}>Tipo</th><th style={{ width: 150 }}>Guia</th></tr></thead>
              <tbody>
                {filtered.filter((d) => d.expansion === exp).map((d) => (
                  <tr key={d.id} className="clickable-row" onClick={() => setSelected(d.id)}>
                    <td>{d.level}</td>
                    <td><b>{dutyTitle(d.name)}</b>{d.ilvl > 0 && <span className="muted" style={{ fontSize: '.8rem' }}> · ilvl {d.ilvl}</span>}</td>
                    <td><span className="badge">{TYPE_LABEL[d.type]}</span></td>
                    <td className="muted">{d.mechanics.length > 0 ? `✅ ${uniqueMechanics(d.mechanics).length} mecânicas` : 'só dicas gerais'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {filtered.length === 0 && <p className="muted">Nada encontrado com esses filtros.</p>}
    </>
  );
}
