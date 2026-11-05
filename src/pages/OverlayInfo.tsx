import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_MODULE_IDS, OVERLAY_MODULES, type ModuleId } from '../overlay/modules';
import { XIVAPI_INFO } from '../data/xivapi';
import {
  desktop, type DesktopApi, type DesktopSettings, type OverlaySettings, type RecorderStatus, type RecordingInfo,
} from '../desktop';

const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
const size = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

/** Gravações de sessão: gravar, listar, reproduzir no overlay e excluir. */
function RecordingsPanel({ api }: { api: DesktopApi }) {
  const [status, setStatus] = useState<RecorderStatus | null>(null);
  const [list, setList] = useState<RecordingInfo[]>([]);
  const [s, setS] = useState<DesktopSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => api.listRecordings().then(setList);
    api.getRecorderStatus().then(setStatus);
    api.getSettings().then(setS);
    refresh();
    const offs = [api.onRecorderStatus(setStatus), api.onRecordingsChanged(refresh), api.onSettings(setS)];
    return () => offs.forEach((off) => off());
  }, [api]);

  async function toggle() {
    setError(null);
    const r = await api.toggleRecording();
    if (!r.ok) setError(r.error ?? 'Não foi possível gravar.');
  }

  async function remove(name: string) {
    if (!window.confirm(`Excluir a gravação "${name}"?`)) return;
    try {
      await api.deleteRecording(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!s) return null;
  const recording = !!status?.recording;
  const live = s.overlay.source === 'ws';

  return (
    <div className="card" data-recordings-panel style={{ marginBottom: 14 }}>
      <h3>⏺ Gravações de sessão</h3>
      <p className="muted">
        Grava tudo o que o ACT/IINACT envia enquanto você joga. Depois dá para reproduzir a luta no overlay — e, se você
        mandar o arquivo, eu uso para melhorar o Aetherguide com dados reais.
      </p>
      <div className="chips">
        <button className={`btn ${recording ? '' : 'primary'}`} onClick={toggle} disabled={!recording && !live}>
          {recording ? `■ Parar gravação (${mmss(status!.durationMs)} · ${status!.events.toLocaleString('pt-BR')} eventos)` : '● Gravar sessão'}
        </button>
        <button className="btn" onClick={() => api.openRecordingsFolder()}>📂 Abrir pasta</button>
        <span className="muted" style={{ fontSize: '.85rem' }}>Atalho no jogo: <kbd>{api.shortcuts.record}</kbd></span>
      </div>
      {!live && !recording && (
        <p className="muted" style={{ fontSize: '.85rem' }}>Para gravar, escolha a fonte "ACT ou IINACT" acima.</p>
      )}
      <label className="check" style={{ borderBottom: 'none' }}>
        <input type="checkbox" checked={s.recorder.includePrivateChat}
          onChange={(e) => api.setRecorderOptions({ includePrivateChat: e.target.checked })} />
        <span>
          Incluir mensagens privadas (tells), de FC e de linkshells
          <br /><small className="muted">Desligado por padrão. Mensagens públicas e da party sempre entram (o tradutor de gírias usa).</small>
        </span>
      </label>
      {error && <div className="feedback bad">{error}</div>}

      {s.overlay.source === 'replay' && (
        <div className="callout" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span>▶ O overlay está reproduzindo <b>{s.overlay.replayFile}</b> ({s.overlay.replaySpeed}x).</span>
          <button className="btn small" onClick={() => api.setOverlay({ source: 'ws' })}>Voltar ao jogo ao vivo</button>
        </div>
      )}

      {list.length === 0 ? (
        <p className="muted" style={{ marginBottom: 0 }}>Nenhuma gravação ainda.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr><th>Gravação</th><th>Duração</th><th>Eventos</th><th>Personagem / zona</th><th>Tamanho</th><th></th></tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const active = recording && status?.name === r.name;
                return (
                  <tr key={r.name}>
                    <td>
                      {new Date(r.startedAt ?? r.modified).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      {active && <span className="badge fire" style={{ marginLeft: 6 }}>gravando</span>}
                      {r.incomplete && <span className="badge" style={{ marginLeft: 6 }} title="O app fechou durante a gravação">incompleta</span>}
                      <div className="muted" style={{ fontSize: '.75rem' }}>{r.name}</div>
                    </td>
                    <td>{r.durationMs !== null ? mmss(r.durationMs) : '—'}</td>
                    <td>{r.events !== null ? r.events.toLocaleString('pt-BR') : '—'}</td>
                    <td>{r.player ?? '—'}{r.zones.length > 0 && <div className="muted" style={{ fontSize: '.75rem' }}>{r.zones.join(', ')}</div>}</td>
                    <td>{size(r.bytes)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn small" disabled={active} onClick={() => api.playRecording(r.name, 1)} title="Reproduzir no overlay">▶ 1x</button>{' '}
                      <button className="btn small" disabled={active} onClick={() => api.playRecording(r.name, 4)} title="Reproduzir 4x mais rápido">▶ 4x</button>{' '}
                      <button className="btn small" disabled={active} onClick={() => remove(r.name)} title="Excluir">🗑</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted" style={{ fontSize: '.8rem', marginTop: 10, marginBottom: 0 }}>
        As gravações contêm nomes de personagens e mensagens do chat público/party. Revise antes de compartilhar publicamente.
      </p>
    </div>
  );
}

/** Controles do overlay quando a página roda dentro do app desktop. */
function DesktopPanel({ api }: { api: DesktopApi }) {
  const [s, setS] = useState<DesktopSettings | null>(null);
  const [wsDraft, setWsDraft] = useState('');

  useEffect(() => {
    api.getSettings().then((x) => {
      setS(x);
      setWsDraft(x.overlay.wsUrl);
    });
    return api.onSettings(setS);
  }, [api]);

  if (!s) return null;
  const o = s.overlay;
  const set = (patch: Partial<OverlaySettings> & { resetPosition?: boolean }) => api.setOverlay(patch).then(setS);

  return (
    <div className="card" data-desktop-panel style={{ borderColor: 'var(--accent)', marginBottom: 14 }}>
      <h3>🖥️ Overlay do app</h3>
      <div className="chips">
        <button className="btn primary" onClick={() => set({ visible: !o.visible })}>{o.visible ? 'Ocultar overlay' : 'Mostrar overlay'}</button>
        <button className="btn" onClick={() => set({ locked: !o.locked })}>
          {o.locked ? '🔓 Destravar para mover' : '🔒 Travar (cliques passam para o jogo)'}
        </button>
        <button className="btn" onClick={() => set({ resetPosition: true })}>Posição padrão</button>
      </div>
      <p className="muted" style={{ marginTop: 10 }}>
        Atalhos que funcionam até dentro do jogo: <kbd>{api.shortcuts.toggle}</kbd> mostra/oculta ·{' '}
        <kbd>{api.shortcuts.lock}</kbd> trava/destrava. Fechar esta janela não fecha o overlay — use o ícone na bandeja para sair.
      </p>

      <h4 style={{ margin: '14px 0 4px' }}>De onde vêm os dados</h4>
      <label className="check">
        <input type="radio" name="source" checked={o.source === 'ws'} onChange={() => set({ source: 'ws' })} />
        <span style={{ flex: 1 }}>
          <b>ACT ou IINACT (jogo de verdade)</b>
          <span style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <input type="text" value={wsDraft} onChange={(e) => setWsDraft(e.target.value)} style={{ flex: 1 }} />
            <button className="btn small" disabled={wsDraft === o.wsUrl} onClick={() => set({ wsUrl: wsDraft, source: 'ws' })}>Salvar</button>
          </span>
        </span>
      </label>
      <label className="check">
        <input type="radio" name="source" checked={o.source === 'demo'} onChange={() => set({ source: 'demo' })} />
        <span><b>Demonstração</b> — luta simulada, para testar sem abrir o jogo</span>
      </label>

      <div className="callout" style={{ marginBottom: 0 }}>
        <b>Para usar no jogo:</b>
        <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>
          <li>No FFXIV: <i>System Configuration → Display Settings → Screen Mode</i> = <b>Borderless Windowed</b>. Em tela cheia
            exclusiva nenhum overlay aparece por cima.</li>
          <li>Abra o <b>ACT</b> (com o plugin do FFXIV e o OverlayPlugin) e, na aba <i>OverlayPlugin WSServer</i>, clique em
            <b> Start</b> — ou use o <b>IINACT</b>, que já liga o WebSocket na porta 10501.</li>
          <li>Opcional e recomendado: <b>cactbot</b>, para o gauge vir direto do jogo.</li>
        </ol>
      </div>
    </div>
  );
}

export default function OverlayInfo() {
  const [enabled, setEnabled] = useState<Set<ModuleId>>(() => new Set(DEFAULT_MODULE_IDS));

  // no app desktop, os módulos escolhidos aqui valem para a janela de overlay
  useEffect(() => {
    desktop?.getSettings().then((s) => setEnabled(new Set(s.overlay.modules as ModuleId[])));
  }, []);

  const toggle = (id: ModuleId) =>
    setEnabled((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      desktop?.setOverlay({ modules: [...n] });
      return n;
    });

  const moduleParam = OVERLAY_MODULES.filter((m) => enabled.has(m.id)).map((m) => m.id).join(',');
  const base = useMemo(() => new URL('overlay.html', window.location.href.split('#')[0]).href, []);
  const liveUrl = `${base}?modules=${moduleParam}`;
  const wsUrl = `${liveUrl}&OVERLAY_WS=ws://127.0.0.1:10501/ws`;
  const demoUrl = `${base}?demo=1&modules=${moduleParam}`;

  return (
    <>
      <h1>Overlay para usar enquanto joga</h1>
      <p className="lead">
        Um painel pequeno e translúcido por cima do jogo. Ele lê os eventos que o <b>OverlayPlugin</b> entrega (as mesmas linhas
        de log que ferramentas como o ACT usam) e mostra dicas em tempo real.
      </p>

      {desktop && <DesktopPanel api={desktop} />}
      {desktop && <RecordingsPanel api={desktop} />}

      <div className="grid grid-2">
        <div className="card">
          <h3>Escolha os módulos</h3>
          {OVERLAY_MODULES.map((m) => (
            <label key={m.id} className="check">
              <input type="checkbox" checked={enabled.has(m.id)} onChange={() => toggle(m.id)} />
              <span><b>{m.label}</b><br /><small className="muted">{m.desc}</small></span>
            </label>
          ))}
        </div>
        <div className="card" style={{ display: 'grid', placeItems: 'start center', background: 'linear-gradient(135deg, #3b4d6b, #6b4f3b)' }}>
          <iframe key={demoUrl} src={demoUrl} title="Prévia do overlay" style={{ width: 360, height: 520, border: 0, background: 'transparent' }} />
          <small style={{ color: '#fff', textShadow: '0 1px 2px #000' }}>Prévia em modo demonstração (luta simulada)</small>
        </div>
      </div>

      <h2>{desktop ? 'Alternativa: usar dentro do próprio ACT' : 'Como instalar'}</h2>
      <div className="grid grid-2">
        <div className="card">
          <h3>Opção A — ACT + OverlayPlugin</h3>
          <ol style={{ paddingLeft: 18, margin: 0 }}>
            <li>Instale o ACT (Advanced Combat Tracker) com o plugin do FFXIV e o OverlayPlugin.</li>
            <li>No ACT: <b>Plugins → OverlayPlugin.dll → New</b>, tipo <b>Custom → MiniParse</b>.</li>
            <li>No campo URL, cole: <code style={{ wordBreak: 'break-all' }}>{liveUrl}</code></li>
            <li>Ajuste posição e tamanho; marque "Enable Clickthru" para o mouse passar pelo overlay.</li>
          </ol>
        </div>
        <div className="card">
          <h3>Opção B — WebSocket (IINACT, navegador ou OBS)</h3>
          <p>Ative o servidor WebSocket do OverlayPlugin (porta padrão 10501) e use:</p>
          <code style={{ wordBreak: 'break-all', display: 'block' }}>{wsUrl}</code>
        </div>
      </div>

      <div className="callout">
        <b>Recomendado:</b> instale também o <b>cactbot</b>. Com ele o overlay lê o gauge real do job (Fogo/Gelo, Polyglot,
        Astral Soul…). Sem ele, o gauge é <b>estimado</b> a partir das magias que você usa, e o MP vem dos dados do personagem.
      </div>
      <div className="callout warn">
        <b>Termos de Serviço:</b> ferramentas de terceiros não são permitidas pelos termos da Square Enix. Na prática, punições
        acontecem quando o jogador expõe o uso — por exemplo, comentando o desempenho dos outros. Use por sua conta e risco e
        nunca mencione overlays ou parses no chat do jogo.
      </div>
      <p className="muted" style={{ fontSize: '.85rem' }}>
        Magias e efeitos são reconhecidos pelo ID oficial do jogo, então o overlay funciona com o cliente em qualquer idioma.
        O tradutor de gírias entende o chat em inglês. Dados e ícones: <a href="https://v2.xivapi.com" target="_blank" rel="noreferrer">XIVAPI</a>{' '}
        (versão do jogo {XIVAPI_INFO.gameVersion}, baixado em {new Date(XIVAPI_INFO.fetchedAt).toLocaleDateString('pt-BR')}).
      </p>
    </>
  );
}
