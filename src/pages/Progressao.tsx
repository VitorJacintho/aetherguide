import { useLocal } from '../hooks/useLocal';
import { ActionIcon, SpellChip } from '../components/ActionIcon';
import { BLM_ACTIONS, BLM_MILESTONES } from '../data/blm/actions';
import { LEVEL_BRACKETS, LEVELING_TIPS, bracketFor } from '../data/blm/leveling';

const KIND_LABEL = { GCD: 'GCD', oGCD: 'oGCD', Role: 'Role' } as const;

export default function Progressao() {
  const [level, setLevel] = useLocal('level', 30);
  const bracket = bracketFor(level);
  const nextUnlock = BLM_ACTIONS.filter((a) => a.level > level).sort((a, b) => a.level - b.level)[0];
  const newHere = BLM_ACTIONS.filter((a) => a.level >= bracket.from && a.level <= level);
  const milestones = BLM_MILESTONES.filter((m) => m.level <= level).slice(-3);

  return (
    <>
      <h1>Progressão do Black Mage</h1>
      <p className="lead">Escolha seu nível atual. Tudo abaixo se ajusta: rotação, habilidades novas e o que vem a seguir.</p>

      <div className="level-picker card">
        <div className="big">{level}</div>
        <div style={{ flex: 1 }}>
          <input type="range" min={1} max={100} value={level} onChange={(e) => setLevel(Number(e.target.value))} />
          <div className="chips" style={{ marginTop: 6 }}>
            {LEVEL_BRACKETS.map((b) => (
              <button key={b.from} className="btn small" onClick={() => setLevel(b.to)}>
                {b.from === b.to ? b.from : `${b.from}–${b.to}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <span className="badge gold">Níveis {bracket.from}–{bracket.to}</span>
          <h3 style={{ marginTop: 8 }}>{bracket.title}</h3>
          <h4 className="muted" style={{ margin: '10px 0 6px' }}>Alvo único</h4>
          <div className="chips">
            {bracket.single.map((s, i) => (
              <span key={i} style={{ display: 'contents' }}>
                {i > 0 && <span className="arrow">→</span>}
                <SpellChip text={s} className={/fire|despair|flare/i.test(s) ? 'fire' : /blizzard|freeze/i.test(s) ? 'ice' : /paradox|xeno|foul/i.test(s) ? 'unaspected' : ''} />
              </span>
            ))}
          </div>
          {bracket.aoe && (
            <>
              <h4 className="muted" style={{ margin: '14px 0 6px' }}>Vários inimigos (3+)</h4>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {bracket.aoe.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </>
          )}
        </div>
        <div className="card">
          <h3>Dicas para esta fase</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {bracket.tips.map((t, i) => <li key={i} style={{ marginBottom: 6 }}>{t}</li>)}
          </ul>
          {milestones.length > 0 && (
            <>
              <h4 className="muted" style={{ margin: '14px 0 6px' }}>Marcos que você já passou</h4>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {milestones.map((m) => <li key={m.level}><b>{m.level}:</b> {m.text}</li>)}
              </ul>
            </>
          )}
          {nextUnlock && (
            <div className="callout" style={{ marginBottom: 0, display: 'flex', gap: 10, alignItems: 'center' }}>
              <ActionIcon id={nextUnlock.id} size={36} />
              <span><b>Próxima habilidade:</b> {nextUnlock.name} no nível {nextUnlock.level} — {nextUnlock.short}</span>
            </div>
          )}
        </div>
      </div>

      {newHere.length > 0 && (
        <>
          <h2>Novidades desta faixa</h2>
          <div className="grid grid-3">
            {newHere.map((a) => (
              <div key={a.id} className="card">
                <div className="name-with-icon">
                  <ActionIcon id={a.id} size={36} />
                  <span><span className={`badge ${a.aspect}`}>{a.level}</span> <b>{a.name}</b></span>
                </div>
                <p className="muted" style={{ margin: '6px 0 0' }}>{a.short}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <h2>Todas as habilidades</h2>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table>
          <thead>
            <tr><th>Nível</th><th>Habilidade</th><th>Tipo</th><th>O que faz</th></tr>
          </thead>
          <tbody>
            {BLM_ACTIONS.map((a) => (
              <tr key={a.id} className={a.level > level ? 'locked' : a.id === nextUnlock?.id ? 'next' : ''}>
                <td>{a.level}</td>
                <td>
                  <span className="name-with-icon">
                    <ActionIcon id={a.id} size={32} />
                    <span>
                      <b>{a.name}</b>
                      {a.aoe && <span className="badge" style={{ marginLeft: 6 }}>AoE</span>}
                    </span>
                  </span>
                </td>
                <td>
                  <span className={`badge ${a.aspect}`}>{KIND_LABEL[a.kind]}</span>
                  {a.recast && <div className="muted" style={{ fontSize: '.75rem' }}>{a.recast}s{a.charges ? ` · ${a.charges} cargas` : ''}</div>}
                </td>
                <td>
                  {a.short}
                  {a.tip && <div className="muted" style={{ fontSize: '.85rem' }}>💡 {a.tip}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: '.85rem', marginTop: 8 }}>
        Se uma habilidade não apareceu no seu jogo ao atingir o nível, procure uma quest de job pendente (ícone azul com "+").
      </p>

      <h2>Como subir de nível mais rápido</h2>
      <div className="grid grid-3">
        {LEVELING_TIPS.map((t) => (
          <div key={t.title} className="card">
            <h3>{t.title}</h3>
            <p className="muted" style={{ margin: 0 }}>{t.text}</p>
          </div>
        ))}
      </div>
    </>
  );
}
