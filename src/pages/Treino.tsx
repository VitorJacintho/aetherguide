import { useMemo, useState } from 'react';
import { Gauge } from '../components/Gauge';
import { ActionIcon } from '../components/ActionIcon';
import {
  ACTION_NAMES, GCD_IDS, OGCD_IDS, canUse, cooldownRemaining, initialState, isGcd, recommend, step,
  type ActionId, type BlmState,
} from '../engine/blm';

const ASPECT: Record<ActionId, string> = {
  fire3: 'fire', fire4: 'fire', despair: 'fire', flareStar: 'fire',
  blizzard3: 'ice', blizzard4: 'ice', umbralSoul: 'ice',
  highThunder: 'thunder',
  paradox: 'unaspected', xenoglossy: 'unaspected',
  transpose: '', manafont: '', amplifier: '', leyLines: '', triplecast: '', swiftcast: '',
};

type Verdict = 'good' | 'ok' | 'bad' | 'info';

interface Entry {
  id: ActionId;
  verdict: Verdict;
}

export default function Treino() {
  const [state, setState] = useState<BlmState>(initialState);
  const [history, setHistory] = useState<Entry[]>([]);
  const [feedback, setFeedback] = useState<{ verdict: Verdict; text: string } | null>(null);
  const [showHint, setShowHint] = useState(true);

  const advice = useMemo(() => recommend(state), [state]);
  const gcds = history.filter((h) => isGcd(h.id));
  const score = gcds.filter((h) => h.verdict === 'good').length;

  function use(id: ActionId) {
    const check = canUse(state, id);
    if (!check.ok) return;

    let verdict: Verdict = 'info';
    let text = '';
    if (isGcd(id)) {
      if (id === advice.gcd) {
        verdict = 'good';
        text = `✔ Boa! ${advice.why}`;
      } else if (id === 'xenoglossy') {
        verdict = 'ok';
        text = `≈ Xenoglossy é ótimo para se mover, mas parado o ideal era ${ACTION_NAMES[advice.gcd]}: ${advice.why}`;
      } else {
        verdict = 'bad';
        text = `✘ O ideal era ${ACTION_NAMES[advice.gcd]}: ${advice.why}`;
      }
      const missed = advice.ogcds.filter((o) => o.id !== 'leyLines');
      if (missed.length > 0 && verdict !== 'bad') {
        text += ` (Dica: dava para encaixar ${missed.map((o) => ACTION_NAMES[o.id]).join(' e ')} antes.)`;
      }
    } else {
      const suggested = advice.ogcds.find((o) => o.id === id);
      text = suggested ? `✔ ${ACTION_NAMES[id]}: ${suggested.why}` : `${ACTION_NAMES[id]} usado.`;
      verdict = suggested ? 'good' : 'info';
    }

    setFeedback({ verdict, text });
    setHistory((h) => [...h, { id, verdict }].slice(-40));
    setState((s) => step(s, id));
  }

  function reset() {
    setState(initialState());
    setHistory([]);
    setFeedback(null);
  }

  return (
    <>
      <h1>Treinador de rotação</h1>
      <p className="lead">
        Você está no nível 100, contra um boneco de treino. Escolha a próxima magia; o treinador diz se foi a melhor escolha
        e explica o porquê. Habilidades em cinza não podem ser usadas agora (passe o mouse para ver o motivo).
      </p>

      <div className="grid grid-2">
        <div className="card">
          <Gauge state={state} />
          <div className="chips" style={{ marginTop: 12 }}>
            <span className="badge thunder">Thunder no alvo: {state.dot.toFixed(1)}s</span>
            <span className="badge">Ley Lines: {state.leyLines > 0 ? `${state.leyLines.toFixed(1)}s` : '—'}</span>
            <span className="badge">Tempo: {state.time.toFixed(1)}s</span>
            {state.triplecast > 0 && <span className="badge gold">Triplecast ×{state.triplecast}</span>}
            {state.swiftcast && <span className="badge gold">Swiftcast</span>}
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>Placar: {score}/{gcds.length} GCDs ideais</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <label className="muted" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={showHint} onChange={(e) => setShowHint(e.target.checked)} /> Mostrar dica
              </label>
              <button className="btn small" onClick={reset}>Recomeçar</button>
            </div>
          </div>
          {showHint && (
            <p className="muted" style={{ marginTop: 10 }}>
              💡 Próximo ideal: <ActionIcon id={advice.gcd} size={22} /> <b style={{ color: 'var(--text)' }}>{ACTION_NAMES[advice.gcd]}</b> — {advice.why}
              {advice.ogcds.length > 0 && <><br />Encaixe: {advice.ogcds.map((o) => ACTION_NAMES[o.id]).join(', ')}</>}
            </p>
          )}
          {feedback && <div className={`feedback ${feedback.verdict === 'bad' ? 'bad' : feedback.verdict === 'info' ? '' : 'good'}`}>{feedback.text}</div>}
          <div className="history">
            {history.slice(-20).map((h, i) => (
              <span key={i} className={`history-item ${h.verdict}`} title={ACTION_NAMES[h.id]}>
                <ActionIcon id={h.id} size={isGcd(h.id) ? 30 : 22} />
              </span>
            ))}
          </div>
        </div>
      </div>

      <h2>Magias (GCD)</h2>
      <div className="trainer-actions">
        {GCD_IDS.map((id) => {
          const c = canUse(state, id);
          return (
            <button key={id} className={`spell ${ASPECT[id]} ${showHint && advice.gcd === id ? 'hint' : ''}`}
              disabled={!c.ok} title={c.reason} onClick={() => use(id)}>
              <ActionIcon id={id} size={44} />
              <span className="spell-name">{ACTION_NAMES[id]}</span>
            </button>
          );
        })}
      </div>

      <h2>Habilidades (oGCD)</h2>
      <div className="trainer-actions">
        {OGCD_IDS.map((id) => {
          const c = canUse(state, id);
          const cdLeft = cooldownRemaining(state, id);
          const cd = state.cooldowns[id];
          return (
            <button key={id} className={`spell ${showHint && advice.ogcds.some((o) => o.id === id) ? 'hint' : ''}`}
              disabled={!c.ok} title={c.reason} onClick={() => use(id)}>
              <ActionIcon id={id} size={44} />
              <span className="spell-name">{ACTION_NAMES[id]}</span>
              <small>{cdLeft > 0 ? `${cdLeft.toFixed(0)}s` : cd.max > 1 ? `${cd.charges}/${cd.max} cargas` : 'pronto'}</small>
            </button>
          );
        })}
      </div>

      <div className="callout warn" style={{ marginTop: 20 }}>
        Simulação simplificada: valores de MP e tempos são aproximados. O objetivo é aprender a <b>ordem</b> das magias e o
        <b> porquê</b> de cada escolha.
      </div>
    </>
  );
}
