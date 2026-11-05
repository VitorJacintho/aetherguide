import { useMemo, useState } from 'react';
import { GLOSSARY, findTerms, type GlossaryCategory } from '../data/glossary';
import { BLM_MACROS, CHAT_COMMANDS, ETIQUETTE, PHRASE_GROUPS, RP_GUIDE } from '../data/communication';

type Tab = 'glossario' | 'frases' | 'etiqueta' | 'rp' | 'tradutor';

const CATEGORIES: (GlossaryCategory | 'Todas')[] = ['Todas', 'Chat', 'Grupo', 'Combate', 'Conteúdo', 'Mercado', 'RP', 'Black Mage'];

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className="btn small" onClick={async () => {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1200);
    }}>{done ? 'Copiado!' : 'Copiar'}</button>
  );
}

export default function Comunicacao() {
  const [tab, setTab] = useState<Tab>('glossario');
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('Todas');
  const [chatLine, setChatLine] = useState('o/ FT here, LB on the W2W pull? tyfp gg');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GLOSSARY.filter((g) =>
      (cat === 'Todas' || g.category === cat) &&
      (!q || [g.term, ...(g.aliases ?? []), g.meaning].some((s) => s.toLowerCase().includes(q))),
    );
  }, [query, cat]);

  const translated = useMemo(() => findTerms(chatLine), [chatLine]);

  return (
    <>
      <h1>Comunicação & Roleplay</h1>
      <p className="lead">
        O FFXIV é muito social. Não existe cliente em português, mas você não precisa ser fluente em inglês: algumas siglas e
        frases prontas resolvem quase tudo.
      </p>
      <div className="tabs">
        {([['glossario', 'Glossário'], ['tradutor', 'Tradutor de chat'], ['frases', 'Frases prontas'], ['etiqueta', 'Etiqueta & comandos'], ['rp', 'Guia de RP']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'glossario' && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <input type="search" placeholder="Buscar: tyfp, LB, aggro…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
            <select value={cat} onChange={(e) => setCat(e.target.value as typeof cat)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="card" style={{ padding: 0 }}>
            <table>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.term}>
                    <td style={{ width: 180 }}>
                      <b>{g.term}</b>
                      {g.aliases && <div className="muted" style={{ fontSize: '.8rem' }}>{g.aliases.join(', ')}</div>}
                    </td>
                    <td>{g.meaning}</td>
                    <td style={{ width: 110 }}><span className="badge">{g.category}</span></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td className="muted">Nada encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'tradutor' && (
        <div className="card">
          <h3>Cole uma mensagem do chat</h3>
          <p className="muted">O overlay faz isso automaticamente durante o jogo; aqui você pode testar.</p>
          <input type="text" value={chatLine} onChange={(e) => setChatLine(e.target.value)} style={{ width: '100%' }} />
          <div style={{ marginTop: 12 }}>
            {translated.length === 0 && <p className="muted">Nenhuma gíria reconhecida.</p>}
            {translated.map((g) => (
              <p key={g.term} style={{ margin: '0 0 6px' }}><span className="badge gold">{g.term}</span> {g.meaning}</p>
            ))}
          </div>
        </div>
      )}

      {tab === 'frases' && (
        <div className="grid grid-2">
          {PHRASE_GROUPS.map((group) => (
            <div key={group.title} className="card">
              <h3>{group.title}</h3>
              {group.phrases.map((p) => (
                <div key={p.en} className="check" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <b>{p.en}</b>
                    <div className="muted" style={{ fontSize: '.85rem' }}>{p.pt}</div>
                  </div>
                  <CopyButton text={p.en} />
                </div>
              ))}
            </div>
          ))}
          <div className="card">
            <h3>Macros úteis</h3>
            {BLM_MACROS.map((m) => (
              <div key={m.title} style={{ marginBottom: 12 }}>
                <b>{m.title}</b>
                <pre style={{ background: 'var(--bg-2)', padding: 10, borderRadius: 8, margin: '6px 0' }}>{m.lines.join('\n')}</pre>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span className="muted" style={{ fontSize: '.85rem' }}>{m.note}</span>
                  <CopyButton text={m.lines.join('\n')} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'etiqueta' && (
        <>
          <div className="grid grid-3">
            {ETIQUETTE.map((e) => (
              <div key={e.title} className="card">
                <h3>{e.title}</h3>
                <p className="muted" style={{ margin: 0 }}>{e.text}</p>
              </div>
            ))}
          </div>
          <h2>Comandos de chat</h2>
          <div className="card" style={{ padding: 0 }}>
            <table>
              <tbody>
                {CHAT_COMMANDS.map((c) => (
                  <tr key={c.cmd}><td style={{ width: 240 }}><code>{c.cmd}</code></td><td>{c.what}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'rp' && (
        <>
          <p className="muted">
            Roleplay (RP) é interpretar seu personagem como se ele fosse real. É totalmente opcional, mas a comunidade é grande e
            acolhedora. O básico:
          </p>
          <div className="grid grid-2">
            {RP_GUIDE.map((r) => (
              <div key={r.title} className="card">
                <h3>{r.title}</h3>
                <p className="muted" style={{ margin: 0 }}>{r.text}</p>
              </div>
            ))}
          </div>
          <div className="callout">
            <b>Ideia para o seu Black Mage:</b> a magia negra é vista com desconfiança desde a Guerra dos Magos entre Mhach (magia
            negra) e Amdapor (magia branca), que levou à Sexta Era Umbral. Um personagem que esconde o que estuda, ou que quer
            provar que a magia negra pode ser usada para o bem, rende ótimas histórias.
          </div>
        </>
      )}
    </>
  );
}
