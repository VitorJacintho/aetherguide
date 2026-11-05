import { useEffect, useMemo, useState } from 'react';
import { useLocal } from '../hooks/useLocal';

/* ---------------- Calculadora de GCD ---------------- */

// Constantes de nível 100 (Dawntrail)
const SUB = 420;
const DIV = 2780;

/** Fórmula de velocidade aproximada (Dawntrail). Retorna segundos com 2 casas. */
function speedTime(sps: number, baseMs: number, haste = 0): number {
  const mod = Math.floor((130 * (sps - SUB)) / DIV);
  let ms = Math.floor((baseMs * (1000 - mod)) / 1000);
  ms = Math.floor((ms * (100 - haste)) / 100);
  return Math.floor(ms / 10) / 100;
}

function nextTier(sps: number): number | null {
  const current = speedTime(sps, 2500);
  for (let s = sps + 1; s < sps + 2000; s++) {
    if (speedTime(s, 2500) < current) return s;
  }
  return null;
}

function GcdCalculator() {
  const [sps, setSps] = useLocal('sps', 420);
  const gcd = speedTime(sps, 2500);
  const cast = speedTime(sps, 2000);
  const gcdLL = speedTime(sps, 2500, 15);
  const castLL = speedTime(sps, 2000, 15);
  const tier = nextTier(sps);

  return (
    <div className="card">
      <h3>⏱️ Calculadora de GCD (nível 100)</h3>
      <p className="muted">Digite o Spell Speed que aparece no seu Character (C).</p>
      <input type="number" value={sps} min={420} max={5000} onChange={(e) => setSps(Number(e.target.value) || SUB)} />
      <table style={{ marginTop: 12 }}>
        <thead><tr><th></th><th>Normal</th><th>No Ley Lines</th></tr></thead>
        <tbody>
          <tr><td>GCD (recast 2,5 s)</td><td><b>{gcd.toFixed(2)}s</b></td><td>{gcdLL.toFixed(2)}s</td></tr>
          <tr><td>Conjuração base 2,0 s</td><td><b>{cast.toFixed(2)}s</b></td><td>{castLL.toFixed(2)}s</td></tr>
        </tbody>
      </table>
      {tier && (
        <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>
          Próximo GCD ({speedTime(tier, 2500).toFixed(2)}s) com <b>{tier}</b> de Spell Speed (+{tier - sps}).
        </p>
      )}
      <p className="muted" style={{ fontSize: '.8rem', marginTop: 8, marginBottom: 0 }}>Fórmula aproximada, sem outros buffs de velocidade.</p>
    </div>
  );
}

/* ---------------- Checklist diário/semanal ---------------- */

type Reset = { kind: 'daily'; hourUtc: number } | { kind: 'weekly'; weekday: number; hourUtc: number };

interface Task {
  id: string;
  label: string;
  reset: Reset;
}

const DAILY: Reset = { kind: 'daily', hourUtc: 15 };
const GC: Reset = { kind: 'daily', hourUtc: 20 };
const WEEKLY: Reset = { kind: 'weekly', weekday: 2, hourUtc: 8 }; // terça 08:00 UTC

const TASKS: Task[] = [
  { id: 'roulette-leveling', label: 'Roleta de Leveling', reset: DAILY },
  { id: 'roulette-msq', label: 'Roleta de Main Scenario', reset: DAILY },
  { id: 'roulette-trials', label: 'Roleta de Trials', reset: DAILY },
  { id: 'roulette-alliance', label: 'Roleta de Alliance Raids', reset: DAILY },
  { id: 'roulette-expert', label: 'Roleta de Expert (nível máximo)', reset: DAILY },
  { id: 'allied', label: 'Quests de Allied Society (tribos)', reset: DAILY },
  { id: 'mini-cactpot', label: 'Mini Cactpot ×3 (Gold Saucer)', reset: DAILY },
  { id: 'gc', label: 'Grand Company: Supply & Provisioning', reset: GC },
  { id: 'wondrous', label: 'Wondrous Tails', reset: WEEKLY },
  { id: 'custom', label: 'Custom Deliveries', reset: WEEKLY },
  { id: 'tomes', label: 'Limite semanal de Tomestones', reset: WEEKLY },
  { id: 'hunts', label: 'Elite Hunts semanais', reset: WEEKLY },
  { id: 'jumbo', label: 'Jumbo Cactpot (bilhetes)', reset: WEEKLY },
  { id: 'fashion', label: 'Fashion Report', reset: WEEKLY },
];

function lastReset(r: Reset, now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), r.hourUtc));
  if (r.kind === 'daily') {
    if (d > now) d.setUTCDate(d.getUTCDate() - 1);
    return d;
  }
  const diff = (d.getUTCDay() - r.weekday + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  if (d > now) d.setUTCDate(d.getUTCDate() - 7);
  return d;
}

function nextReset(r: Reset, now: Date): Date {
  const d = lastReset(r, now);
  d.setUTCDate(d.getUTCDate() + (r.kind === 'daily' ? 1 : 7));
  return d;
}

const fmtBrt = (d: Date) =>
  d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit' });

function Checklist() {
  const [done, setDone] = useLocal<Record<string, number>>('checklist', {});
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const isDone = (t: Task) => (done[t.id] ?? 0) >= lastReset(t.reset, now).getTime();
  const groups = useMemo(() => [
    { title: 'Diárias', tasks: TASKS.filter((t) => t.reset.kind === 'daily'), next: nextReset(DAILY, now) },
    { title: 'Semanais', tasks: TASKS.filter((t) => t.reset.kind === 'weekly'), next: nextReset(WEEKLY, now) },
  ], [now]);

  return (
    <div className="card">
      <h3>✅ Rotina do dia e da semana</h3>
      <p className="muted">Desmarca sozinho no reset. Horários no fuso de Brasília.</p>
      {groups.map((g) => (
        <div key={g.title} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <b>{g.title}</b>
            <span className="muted" style={{ fontSize: '.85rem' }}>reset: {fmtBrt(g.next)}</span>
          </div>
          {g.tasks.map((t) => {
            const checked = isDone(t);
            return (
              <label key={t.id} className={`check ${checked ? 'done' : ''}`}>
                <input type="checkbox" checked={checked}
                  onChange={() => setDone((d) => ({ ...d, [t.id]: checked ? 0 : Date.now() }))} />
                <span>
                  {t.label}
                  {t.id === 'gc' && <small className="muted"> (reset {fmtBrt(nextReset(GC, now))})</small>}
                </span>
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function Ferramentas() {
  return (
    <>
      <h1>Ferramentas</h1>
      <p className="lead">Utilitários do dia a dia.</p>
      <div className="grid grid-2">
        <GcdCalculator />
        <Checklist />
      </div>
    </>
  );
}
