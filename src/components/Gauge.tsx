import { MAX_MP, MAX_POLYGLOT, type BlmState } from '../engine/blm';
import { ActionIcon, StatusIcon } from './ActionIcon';

function Pips({ count, max, kind }: { count: number; max: number; kind: string }) {
  return (
    <div className="pips">
      {Array.from({ length: max }, (_, i) => (
        <div key={i} className={`pip ${kind} ${i < count ? 'on' : ''}`} />
      ))}
    </div>
  );
}

/** Quantos Fire IV ainda cabem antes do Despair (aproximado). */
export function fire4Left(state: Pick<BlmState, 'mp' | 'hearts' | 'element' | 'paradox'>): number {
  if (state.element !== 'AF') return 0;
  // reserva MP para o Despair (800) e, se houver marcador, para o Paradox (1600)
  let mp = state.mp - 800 - (state.paradox ? 1600 : 0);
  let hearts = state.hearts;
  let n = 0;
  while (mp > 0) {
    const cost = hearts > 0 ? 800 : 1600;
    if (mp < cost) break;
    mp -= cost;
    hearts = Math.max(0, hearts - 1);
    n++;
  }
  return n;
}

export function Gauge({ state, compact = false }: { state: BlmState; compact?: boolean }) {
  const el = state.element;
  const left = fire4Left(state);
  return (
    <div className="gauge">
      <div className="gauge-row">
        {!compact && <span className="gauge-label">Elemento</span>}
        <span className={`element ${el}`}>
          {el === 'AF' ? `🔥 Astral Fire ${state.stacks}` : el === 'UI' ? `❄️ Umbral Ice ${state.stacks}` : '— neutro'}
        </span>
        <Pips count={state.stacks} max={3} kind={el === 'UI' ? 'ice' : 'fire'} />
      </div>
      <div className="gauge-row">
        {!compact && <span className="gauge-label">Umbral Hearts</span>}
        <Pips count={state.hearts} max={3} kind="heart" />
        {!compact && <span className="gauge-label" style={{ minWidth: 0, marginLeft: 12 }}>Astral Soul</span>}
        <Pips count={state.astralSoul} max={6} kind="soul" />
      </div>
      <div className="gauge-row">
        {!compact && <span className="gauge-label">Polyglot</span>}
        <Pips count={state.polyglot} max={MAX_POLYGLOT} kind="poly" />
        <span className={`flag ${state.paradox ? 'on' : ''}`}><ActionIcon id="paradox" size={16} />Paradox</span>
        <span className={`flag ${state.firestarter ? 'on' : ''}`}><StatusIcon name="Firestarter" size={18} />Firestarter</span>
        <span className={`flag ${state.thunderhead ? 'on' : ''}`}><StatusIcon name="Thunderhead" size={18} />Thunderhead</span>
      </div>
      <div className="gauge-row">
        {!compact && <span className="gauge-label">MP</span>}
        <div className="mpbar">
          <div style={{ width: `${(state.mp / MAX_MP) * 100}%` }} />
          <span>
            {state.mp} / {MAX_MP}
            {el === 'AF' ? ` · ${left} Fire IV antes do Despair` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
