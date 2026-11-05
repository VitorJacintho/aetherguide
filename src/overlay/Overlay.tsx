import { useEffect, useState, useSyncExternalStore } from 'react';
import { Gauge } from '../components/Gauge';
import { ActionIcon, StatusIcon } from '../components/ActionIcon';
import { ACTION_NAMES, DOT_DURATION, cooldownRemaining, recommend, type OgcdId } from '../engine/blm';
import { RETRY_SECONDS, websocketUrl, type ConnectionMode } from './overlayApi';
import { desktop } from '../desktop';
import { startDemo } from './demo';
import { startLive } from './live';
import { tracker } from './tracker';
import { ALL_MODULE_IDS, type ModuleId } from './modules';

const params = new URLSearchParams(window.location.search);
const isDemo = params.get('demo') === '1';
const modules = new Set<ModuleId>(
  params.get('modules')?.split(',').filter((m): m is ModuleId => (ALL_MODULE_IDS as string[]).includes(m)) ?? ALL_MODULE_IDS,
);

const CD_LIST: OgcdId[] = ['leyLines', 'triplecast', 'swiftcast', 'manafont', 'amplifier'];
const MODE_LABEL: Record<ConnectionMode | 'demo', string> = {
  connecting: 'conectando…',
  plugin: 'ACT',
  websocket: 'WebSocket',
  offline: 'desconectado',
  demo: 'demo',
};

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

export default function Overlay() {
  const snap = useSyncExternalStore(tracker.subscribe, tracker.get);
  const [mode, setMode] = useState<ConnectionMode | 'demo'>(isDemo ? 'demo' : 'connecting');
  const unlocked = useUnlocked();

  useEffect(() => {
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
      <div className="ov-head">
        <b>BLM {snap.player.level ? `· nv ${snap.player.level}` : ''}</b>
        <span className={`ov-mode ${mode === 'demo' ? 'demo' : ''}`}>
          {MODE_LABEL[mode]}{snap.gaugeSource === 'cactbot' ? ' + cactbot' : ''}
        </span>
      </div>

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
