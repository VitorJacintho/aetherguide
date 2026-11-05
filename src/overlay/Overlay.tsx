import { useEffect, useState, useSyncExternalStore } from 'react';
import { Gauge } from '../components/Gauge';
import { ActionIcon, StatusIcon } from '../components/ActionIcon';
import { ACTION_NAMES, DOT_DURATION, cooldownRemaining, recommend, type OgcdId } from '../engine/blm';
import { RETRY_SECONDS, websocketUrl, type ConnectionMode } from './overlayApi';
import { desktop } from '../desktop';
import { startDemo } from './demo';
import { startFromRecording, startLive } from './live';
import { Recorder, parseRecording, startReplay } from './recording';
import { tracker } from './tracker';
import { ALL_MODULE_IDS, DEFAULT_MODULE_IDS, type ModuleId } from './modules';
import { dutyTitle } from '../data/duties';
import { DUTY_TIPS } from '../data/mechanics';
import type { Callout } from './tracker';

const params = new URLSearchParams(window.location.search);
const isDemo = params.get('demo') === '1';
/** reprodução: `replay=<url>` (navegador) ou `replayFile=<nome>` (app desktop) */
const replayUrl = params.get('replay');
const replayFile = params.get('replayFile');
const isReplay = !!(replayUrl || replayFile);
const replaySpeed = Math.min(16, Math.max(0.25, Number(params.get('speed')) || 1));
const modules = new Set<ModuleId>(
  params.get('modules')?.split(',').filter((m): m is ModuleId => (ALL_MODULE_IDS as string[]).includes(m)) ?? DEFAULT_MODULE_IDS,
);

/** Lê os avisos de mecânica em voz alta, em português (se houver voz pt no sistema). */
function useVoice(callouts: Callout[]) {
  const [spoken] = useState(() => new Set<number>());
  useEffect(() => {
    if (!modules.has('voice') || !('speechSynthesis' in window)) return;
    for (const c of callouts) {
      if (spoken.has(c.id)) continue;
      spoken.add(c.id);
      const u = new SpeechSynthesisUtterance(c.text);
      u.lang = 'pt-BR';
      u.rate = 1.15;
      const voice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('pt'));
      if (voice) u.voice = voice;
      speechSynthesis.speak(u);
    }
  }, [callouts, spoken]);
}

type Mode = ConnectionMode | 'demo' | 'replay';
const CD_LIST: OgcdId[] = ['leyLines', 'triplecast', 'swiftcast', 'manafont', 'amplifier'];
const MODE_LABEL: Record<Mode, string> = {
  connecting: 'conectando…',
  plugin: 'ACT',
  websocket: 'WebSocket',
  offline: 'desconectado',
  demo: 'demo',
  replay: 'gravação',
};
const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

interface ReplayState {
  progressMs: number;
  durationMs: number;
  ended: boolean;
  error: string | null;
}

/** Carrega e reproduz a gravação indicada na URL. */
function useReplay(): ReplayState | null {
  const [st, setSt] = useState<ReplayState | null>(isReplay ? { progressMs: 0, durationMs: 0, ended: false, error: null } : null);
  useEffect(() => {
    if (!isReplay) return;
    let stop: (() => void) | null = null;
    const load = replayFile && desktop ? desktop.readRecording(replayFile) : fetch(replayUrl!).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    });
    load
      .then((text) => {
        const rec = parseRecording(text);
        startFromRecording();
        stop = startReplay(
          rec,
          replaySpeed,
          (ms) => setSt((s) => s && { ...s, progressMs: ms, durationMs: rec.durationMs }),
          () => setSt((s) => s && { ...s, ended: true }),
        );
      })
      .catch((e) => setSt((s) => s && { ...s, error: e instanceof Error ? e.message : String(e) }));
    const t = setInterval(() => tracker.tick(), 100);
    return () => {
      stop?.();
      clearInterval(t);
    };
  }, []);
  return st;
}

/** App desktop: grava os eventos recebidos quando o app pede (botão, bandeja ou Ctrl+Shift+R). */
function useRecorder(): { events: number; durationMs: number } | null {
  const [status, setStatus] = useState<{ events: number; durationMs: number } | null>(null);
  useEffect(() => {
    if (!desktop || isDemo || isReplay) return;
    const api = desktop;
    let rec: Recorder | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    const off = api.onRecorderCommand(async (c) => {
      if (c.cmd === 'start' && !rec) {
        rec = new Recorder((chunk) => api.recorderAppend(chunk), { includePrivateChat: !!c.includePrivateChat });
        rec.start();
        timer = setInterval(() => {
          if (!rec) return;
          const s = rec.status();
          setStatus(s);
          api.recorderStatus(s);
        }, 1000);
        setStatus({ events: 0, durationMs: 0 });
      } else if (c.cmd === 'stop' && rec) {
        const r = rec;
        rec = null;
        if (timer) clearInterval(timer);
        setStatus(null);
        await api.recorderFinish(await r.stop());
      }
    });
    return () => {
      off();
      if (timer) clearInterval(timer);
    };
  }, []);
  return status;
}

/** No app desktop: overlay destravado mostra borda e pode ser arrastado. */
function useUnlocked(): boolean {
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    if (!desktop) return;
    desktop.getSettings().then((s) => setUnlocked(!s.overlay.locked));
    return desktop.onLock((locked) => setUnlocked(!locked));
  }, []);
  useEffect(() => {
    document.body.classList.toggle('ov-unlocked', unlocked);
  }, [unlocked]);
  return unlocked;
}

function UnlockBar() {
  return (
    <div className="ov-dragbar">
      ⠿ Arraste para posicionar · <b>{desktop?.shortcuts.lock}</b> trava e deixa os cliques passarem
    </div>
  );
}

function ReplayBar({ r }: { r: ReplayState }) {
  if (r.error) return <div className="ov-replay error">Não consegui abrir a gravação: {r.error}</div>;
  const pct = r.durationMs ? (r.progressMs / r.durationMs) * 100 : 0;
  return (
    <div className="ov-replay">
      <span>{r.ended ? '■ Fim da gravação' : `▶ Gravação · ${replaySpeed}x`}</span>
      <span>{mmss(r.progressMs)} / {mmss(r.durationMs)}</span>
      <div className="ov-replay-track"><div style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export default function Overlay() {
  const snap = useSyncExternalStore(tracker.subscribe, tracker.get);
  const [mode, setMode] = useState<Mode>(isDemo ? 'demo' : isReplay ? 'replay' : 'connecting');
  const unlocked = useUnlocked();
  const replay = useReplay();
  const recording = useRecorder();
  useVoice(snap.callouts);

  useEffect(() => {
    if (isReplay) return; // useReplay cuida de tudo
    if (isDemo) {
      startDemo();
      return;
    }
    startLive(setMode);
    const t = setInterval(() => tracker.tick(), 100);
    return () => clearInterval(t);
  }, []);

  const { blm, now } = snap;
  const advice = recommend(blm);
  const foodLeft = snap.foodUntil === null ? null : snap.foodUntil - now;
  const notBlm = snap.player.isBlm === false;
  const wsUrl = websocketUrl();

  if (mode === 'offline' || (mode === 'connecting' && wsUrl)) {
    return (
      <div className="ov-panel">
        {unlocked && <UnlockBar />}
        <div className="ov-head"><b>Aetherguide</b><span className="ov-mode off">{mode === 'offline' ? 'desconectado' : 'conectando…'}</span></div>
        {wsUrl ? (
          <p className="ov-small">
            Aguardando o ACT ou IINACT em <code>{wsUrl}</code>. Tentando de novo a cada {RETRY_SECONDS} s.
            {desktop && ' Para ver um exemplo, ative o modo demonstração na bandeja ou na página Overlay do app.'}
          </p>
        ) : (
          <p className="ov-small">
            Não encontrei o OverlayPlugin. Adicione esta página como overlay no ACT/IINACT, use
            <code>?OVERLAY_WS=ws://127.0.0.1:10501/ws</code> ou abra com <code>?demo=1</code> para testar.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="ov-panel">
      {unlocked && <UnlockBar />}
      {replay && <ReplayBar r={replay} />}
      <div className="ov-head">
        <b>BLM {snap.player.level ? `· nv ${snap.player.level}` : ''}</b>
        <span style={{ display: 'flex', gap: 6 }}>
          {recording && <span className="ov-rec">● REC {mmss(recording.durationMs)}</span>}
          <span className={`ov-mode ${mode === 'demo' || mode === 'replay' ? 'demo' : ''}`}>
            {MODE_LABEL[mode]}{snap.gaugeSource === 'cactbot' ? ' + cactbot' : ''}
          </span>
        </span>
      </div>

      {modules.has('callouts') && snap.callouts.map((c) => (
        <div key={c.id} className="ov-callout">
          <div><span className="ov-callout-icon">{c.icon}</span> <b>{c.label.toUpperCase()}</b> · {c.name}
            <span className="ov-callout-time">{Math.max(0, Math.ceil(c.until - now))}</span>
          </div>
          <small>{c.text}</small>
        </div>
      ))}

      {modules.has('duty') && snap.duty && (
        <div className="ov-duty">
          📖 <b>{dutyTitle(snap.duty.name)}</b>
          <small> · nv {snap.duty.level} · {snap.duty.mechanics.length > 0 ? `${new Set(snap.duty.mechanics.map((m) => m.name)).size} mecânicas no guia` : 'só dicas gerais'}</small>
          <small className="ov-duty-tip">{DUTY_TIPS[snap.duty.type][Math.floor(now / 20) % DUTY_TIPS[snap.duty.type].length]}</small>
        </div>
      )}

      {notBlm && <p className="ov-small">Troque para Black Mage para ver o gauge e o coach.</p>}

      {modules.has('burst') && snap.burst && (
        <div className="ov-burst">
          ⚡ JANELA DE BURST · {Math.ceil(snap.burst.until - now)}s
          <small>{snap.burst.names.join(', ')} — gaste Polyglot ({blm.polyglot}) aqui</small>
        </div>
      )}

      {!notBlm && modules.has('coach') && (
        <div className="ov-coach">
          <ActionIcon id={advice.gcd} size={42} />
          <div style={{ minWidth: 0 }}>
            <div className="ov-next">
              <span className="ov-label">Próximo</span>
              <b>{ACTION_NAMES[advice.gcd]}</b>
              {advice.ogcds.map((o) => (
                <span key={o.id} className="ov-ogcd">+ <ActionIcon id={o.id} size={18} /> {ACTION_NAMES[o.id]}</span>
              ))}
            </div>
            <div className="ov-why">{advice.why}</div>
          </div>
        </div>
      )}

      {!notBlm && modules.has('gauge') && <div className="ov-block"><Gauge state={blm} compact /></div>}

      {!notBlm && modules.has('dot') && (
        <div className="ov-block ov-row">
          <span className="ov-label">Thunder</span>
          <div className={`ov-bar ${blm.dot > 0 && blm.dot < 3 ? 'urgent' : ''}`}>
            <div style={{ width: `${(blm.dot / DOT_DURATION) * 100}%` }} />
            <span>{blm.dot > 0 ? `${blm.dot.toFixed(1)}s` : 'fora do alvo'}{blm.thunderhead ? ' · Thunderhead ✓' : ''}</span>
          </div>
        </div>
      )}

      {!notBlm && modules.has('cds') && (
        <div className="ov-block ov-cds">
          {CD_LIST.map((id) => {
            const c = blm.cooldowns[id];
            const left = cooldownRemaining(blm, id);
            return (
              <div key={id} className={`ov-cd ${c.charges > 0 ? 'ready' : ''}`} title={ACTION_NAMES[id]}>
                <ActionIcon id={id} size={36} />
                {left > 0 && <b className="ov-cd-time">{Math.ceil(left)}</b>}
                {c.max > 1 && <span className="ov-cd-charges">{c.charges}</span>}
              </div>
            );
          })}
          {blm.leyLines > 0 && (
            <div className="ov-cd ready active" title="Dentro do Ley Lines">
              <StatusIcon name="Circle of Power" size={36} />
              <b className="ov-cd-time">{Math.ceil(blm.leyLines)}</b>
            </div>
          )}
        </div>
      )}

      {modules.has('food') && (foodLeft === null || foodLeft < 600) && (
        <div className="ov-food">
          <StatusIcon name="Well Fed" size={20} />
          {foodLeft === null ? 'Sem comida (Well Fed)' : `Comida acaba em ${Math.ceil(foodLeft / 60)} min`}
        </div>
      )}

      {modules.has('chat') && snap.chat.map((c) => (
        <div key={c.id} className="ov-chat">
          <div><b>{c.sender}:</b> {c.message}</div>
          {c.terms.map((t) => <small key={t.term}><span>{t.term}</span> {t.meaning}</small>)}
        </div>
      ))}
    </div>
  );
}
