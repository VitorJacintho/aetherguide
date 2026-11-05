import { useMemo, useState } from 'react';
import { OVERLAY_MODULES, type ModuleId } from '../overlay/modules';
import { XIVAPI_INFO } from '../data/xivapi';

export default function OverlayInfo() {
  const [enabled, setEnabled] = useState<Set<ModuleId>>(() => new Set(OVERLAY_MODULES.map((m) => m.id)));

  const toggle = (id: ModuleId) =>
    setEnabled((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
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

      <h2>Como instalar</h2>
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
