import { useState } from 'react';
import { analyzeBlm, type Analysis, type Finding } from '../analysis/analyzeBlm';
import {
  FFLogsError, clearCredentials, connect, getFightEvents, getReport, hasCredentials, parseReportUrl,
} from '../analysis/fflogsApi';
import { SAMPLE_MISTAKES, sampleFight } from '../analysis/sample';
import type { ReportInfo } from '../analysis/types';

const STATUS_ICON = { good: '✅', warn: '⚠️', bad: '❌', info: 'ℹ️' } as const;
const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const errMsg = (e: unknown) => (e instanceof FFLogsError ? e.message : `Erro inesperado: ${e instanceof Error ? e.message : String(e)}`);

function ConnectCard({ onChange }: { onChange: () => void }) {
  const [connected, setConnected] = useState(hasCredentials);
  const [open, setOpen] = useState(!hasCredentials());
  const [id, setId] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await connect(id, secret);
      setConnected(true);
      setOpen(false);
      setSecret('');
      onChange();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <h3 style={{ margin: 0 }}>1. Chave de API do FFLogs {connected && <span className="badge gold">conectado</span>}</h3>
        {connected && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn small" onClick={() => setOpen((o) => !o)}>{open ? 'Fechar' : 'Trocar chave'}</button>
            <button className="btn small" onClick={() => { clearCredentials(); setConnected(false); setOpen(true); onChange(); }}>Desconectar</button>
          </div>
        )}
      </div>
      {open && (
        <>
          <ol style={{ paddingLeft: 18, marginTop: 10 }}>
            <li>Entre no <a href="https://www.fflogs.com" target="_blank" rel="noreferrer">fflogs.com</a> e abra{' '}
              <a href="https://www.fflogs.com/api/clients/" target="_blank" rel="noreferrer">fflogs.com/api/clients</a>.</li>
            <li>Clique em <b>Create Client</b>. Nome: qualquer um (ex.: Aetherguide). Redirect URL: <code>http://localhost</code>.
              Deixe <b>"Public Client" desmarcado</b>.</li>
            <li>Copie o <b>Client ID</b> e o <b>Client Secret</b> e cole aqui.</li>
          </ol>
          <div className="grid grid-2" style={{ gap: 8 }}>
            <input type="text" placeholder="Client ID" value={id} onChange={(e) => setId(e.target.value)} autoComplete="off" />
            <input type="password" placeholder="Client Secret" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
            <button className="btn primary" disabled={busy || !id || !secret} onClick={save}>{busy ? 'Conectando…' : 'Salvar e conectar'}</button>
            <small className="muted">A chave fica só neste navegador (localStorage). Nunca compartilhe o Client Secret.</small>
          </div>
          {error && <div className="feedback bad">{error}</div>}
        </>
      )}
    </div>
  );
}

function Timeline({ a }: { a: Analysis }) {
  const x = (t: number) => `${(t / a.duration) * 100}%`;
  const w = (len: number) => `${Math.max(0.3, (len / a.duration) * 100)}%`;
  const minutes = Array.from({ length: Math.floor(a.duration / 60) + 1 }, (_, i) => i);
  return (
    <div className="card">
      <h3>Linha do tempo</h3>
      <div className="tl">
        <div className="tl-burst">
          {a.timeline.burst.map((b, i) => <div key={i} style={{ left: x(b.start), width: w(b.end - b.start) }} title="Buffs da party" />)}
        </div>
        <div className="tl-bar">
          {a.timeline.segments.map((s, i) => <div key={i} className={`tl-${s.kind}`} style={{ left: x(s.start), width: w(s.end - s.start) }} />)}
          {a.timeline.idle.map((g, i) => <div key={`i${i}`} className="tl-idle" style={{ left: x(g.start), width: w(g.length) }} title={`Parado ${g.length.toFixed(1)} s em ${mmss(g.start)}`} />)}
          {a.timeline.deaths.map((d, i) => <span key={`d${i}`} className="tl-death" style={{ left: x(d) }} title={`Morte em ${mmss(d)}`}>☠</span>)}
        </div>
        <div className="tl-axis">
          {minutes.map((m) => <span key={m} style={{ left: x(m * 60) }}>{m}:00</span>)}
        </div>
      </div>
      <div className="chips" style={{ marginTop: 26, fontSize: '.8rem' }}>
        <span className="chip fire">Astral Fire</span>
        <span className="chip ice">Umbral Ice</span>
        <span className="chip" style={{ borderColor: 'var(--bad)' }}>Parado sem conjurar</span>
        <span className="chip" style={{ borderColor: 'var(--gold)' }}>Buffs da party</span>
        <span className="chip">☠ Morte</span>
      </div>
    </div>
  );
}

function FindingCard({ f }: { f: Finding }) {
  return (
    <div className={`card finding ${f.status}`}>
      <div className="finding-head">
        <span>{STATUS_ICON[f.status]} {f.title}</span>
        <b>{f.value}</b>
      </div>
      <p className="muted" style={{ margin: '6px 0' }}>{f.detail}</p>
      {f.tip && f.status !== 'good' && <p style={{ margin: 0, fontSize: '.9rem' }}>💡 {f.tip}</p>}
    </div>
  );
}

function Result({ a, sample }: { a: Analysis; sample: boolean }) {
  return (
    <>
      <h2>
        {a.fightName} <span className="badge">{a.kill ? 'vitória' : 'derrota'}</span>{' '}
        <span className="badge">{mmss(a.duration)}</span> <span className="badge">{a.gcdCount} GCDs</span>{' '}
        <span className="badge">nível {a.level}</span>
      </h2>
      {sample && (
        <div className="callout">
          <b>Este é um exemplo gerado pelo app.</b> Erros colocados de propósito: {SAMPLE_MISTAKES.join('; ')}.
        </div>
      )}
      {a.priorities.length > 0 ? (
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <h3>🎯 Foque nisto primeiro</h3>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {a.priorities.map((p) => <li key={p.id} style={{ marginBottom: 6 }}><b>{p.title} ({p.value}):</b> {p.tip}</li>)}
          </ol>
        </div>
      ) : (
        <div className="card"><h3>🏆 Nada importante para corrigir. Mandou bem!</h3></div>
      )}
      <div style={{ marginTop: 14 }}><Timeline a={a} /></div>
      <div className="grid grid-2" style={{ marginTop: 14 }}>
        {a.findings.map((f) => <FindingCard key={f.id} f={f} />)}
      </div>
      <p className="muted" style={{ fontSize: '.85rem', marginTop: 12 }}>
        Análise heurística, focada nos erros mais comuns de iniciantes. Para uma análise completa, veja também o{' '}
        <a href="https://xivanalysis.com" target="_blank" rel="noreferrer">xivanalysis</a>.
      </p>
    </>
  );
}

export default function Analise() {
  const [, setTick] = useState(0);
  const [url, setUrl] = useState('');
  const [report, setReport] = useState<ReportInfo | null>(null);
  const [fightId, setFightId] = useState<number | null>(null);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ a: Analysis; sample: boolean } | null>(null);
  const connected = hasCredentials();

  const fight = report?.fights.find((f) => f.id === fightId) ?? null;
  const players = report && fight ? report.players.filter((p) => fight.friendlyPlayers?.includes(p.id)) : [];
  const player = players.find((p) => p.id === playerId) ?? null;

  async function loadReport() {
    const parsed = parseReportUrl(url);
    if (!parsed) {
      setError('Não reconheci o link. Cole a URL de um relatório, ex.: https://www.fflogs.com/reports/AbCdEf1234567890');
      return;
    }
    setBusy('Carregando o relatório…');
    setError(null);
    setResult(null);
    try {
      const r = await getReport(parsed.code);
      if (r.fights.length === 0) throw new FFLogsError('Esse relatório não tem lutas contra chefes.');
      setReport(r);
      const f = parsed.fight === 'last' || parsed.fight === undefined
        ? r.fights[r.fights.length - 1]
        : r.fights.find((x) => x.id === parsed.fight) ?? r.fights[r.fights.length - 1];
      setFightId(f.id);
      const inFight = r.players.filter((p) => f.friendlyPlayers?.includes(p.id));
      const pick = inFight.find((p) => p.id === parsed.source) ?? inFight.find((p) => p.subType === 'BlackMage') ?? inFight[0];
      setPlayerId(pick?.id ?? null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  async function analyze() {
    if (!report || !fight || !player) return;
    setBusy('Baixando os eventos da luta…');
    setError(null);
    try {
      const events = await getFightEvents(report.code, fight, player.id);
      setResult({ a: analyzeBlm(fight, player.id, events), sample: false });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  function showSample() {
    const s = sampleFight();
    setError(null);
    setResult({ a: analyzeBlm(s.fight, s.playerId, s.events), sample: true });
  }

  return (
    <>
      <h1>Analisar logs (FFLogs)</h1>
      <p className="lead">
        Cole o link de uma luta sua no FFLogs e veja, em português, o que melhorar: tempo parado, Thunder, Polyglot desperdiçado,
        cooldowns, Ley Lines, mortes e mais.
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <button className="btn" onClick={showSample}>👀 Ver um exemplo (sem login)</button>
      </div>

      <div className="grid" style={{ gap: 14 }}>
        <ConnectCard onChange={() => setTick((n) => n + 1)} />

        <div className="card" style={{ opacity: connected ? 1 : 0.5 }}>
          <h3>2. Link do log</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input type="text" style={{ flex: 1, minWidth: 260 }} placeholder="https://www.fflogs.com/reports/…" value={url}
              disabled={!connected} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadReport()} />
            <button className="btn primary" disabled={!connected || !url || !!busy} onClick={loadReport}>Carregar</button>
          </div>
          <small className="muted">O log precisa ser público ou não listado. Logs privados não aparecem pela API.</small>

          {report && (
            <div className="grid grid-2" style={{ gap: 8, marginTop: 12 }}>
              <label>
                <small className="muted">Luta</small><br />
                <select style={{ width: '100%' }} value={fightId ?? ''} onChange={(e) => setFightId(Number(e.target.value))}>
                  {report.fights.map((f) => (
                    <option key={f.id} value={f.id}>
                      #{f.id} {f.name} — {f.kill ? 'vitória' : 'derrota'} ({mmss((f.endTime - f.startTime) / 1000)})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <small className="muted">Jogador</small><br />
                <select style={{ width: '100%' }} value={playerId ?? ''} onChange={(e) => setPlayerId(Number(e.target.value))}>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}{p.server ? ` @${p.server}` : ''} — {p.subType}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {player && player.subType !== 'BlackMage' && (
            <div className="feedback bad">Por enquanto o Aetherguide só analisa Black Mage. Escolha um jogador de BLM.</div>
          )}
          {report && (
            <button className="btn primary" style={{ marginTop: 12 }} disabled={!player || player.subType !== 'BlackMage' || !!busy} onClick={analyze}>
              Analisar
            </button>
          )}
        </div>
      </div>

      {busy && <p className="muted">⏳ {busy}</p>}
      {error && <div className="feedback bad">{error}</div>}
      {result && <Result a={result.a} sample={result.sample} />}
    </>
  );
}
