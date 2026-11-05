import { useEffect, useState } from 'react';
import Home from './pages/Home';
import Progressao from './pages/Progressao';
import Rotacao from './pages/Rotacao';
import Treino from './pages/Treino';
import Build from './pages/Build';
import Comunicacao from './pages/Comunicacao';
import Ferramentas from './pages/Ferramentas';
import OverlayInfo from './pages/OverlayInfo';
import Analise from './pages/Analise';
import Dungeons from './pages/Dungeons';

export type PageId =
  | 'inicio' | 'progressao' | 'rotacao' | 'treino' | 'dungeons' | 'analise' | 'build' | 'comunicacao' | 'ferramentas' | 'overlay';

const PAGES: { id: PageId; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Início', icon: '🏠' },
  { id: 'progressao', label: 'Progressão', icon: '📈' },
  { id: 'rotacao', label: 'Rotação', icon: '🔥' },
  { id: 'treino', label: 'Treinar rotação', icon: '🎯' },
  { id: 'dungeons', label: 'Dungeons & Trials', icon: '🗺️' },
  { id: 'analise', label: 'Analisar logs', icon: '📊' },
  { id: 'build', label: 'Build & Gear', icon: '🛡️' },
  { id: 'comunicacao', label: 'Comunicação & RP', icon: '💬' },
  { id: 'ferramentas', label: 'Ferramentas', icon: '🧰' },
  { id: 'overlay', label: 'Overlay', icon: '🖥️' },
];

function readHash(): PageId {
  const h = window.location.hash.replace('#/', '') as PageId;
  return PAGES.some((p) => p.id === h) ? h : 'inicio';
}

export default function App() {
  const [page, setPage] = useState<PageId>(readHash);

  useEffect(() => {
    const onHash = () => setPage(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (id: PageId) => {
    window.location.hash = `/${id}`;
    window.scrollTo(0, 0);
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">✦</div>
          <div>
            <strong>Aetherguide</strong>
            <small>Black Mage · Dawntrail</small>
          </div>
        </div>
        <nav className="nav">
          {PAGES.map((p) => (
            <button key={p.id} className={page === p.id ? 'active' : ''} onClick={() => go(p.id)}>
              <span>{p.icon}</span>
              {p.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          Conteúdo de referência: patch 7.4–7.55. Projeto de fã, sem vínculo com a Square Enix. Ícones © SQUARE ENIX, via
          XIVAPI.
        </div>
      </aside>
      <main>
        {page === 'inicio' && <Home go={go} />}
        {page === 'progressao' && <Progressao />}
        {page === 'rotacao' && <Rotacao go={go} />}
        {page === 'treino' && <Treino />}
        {page === 'dungeons' && <Dungeons />}
        {page === 'analise' && <Analise />}
        {page === 'build' && <Build />}
        {page === 'comunicacao' && <Comunicacao />}
        {page === 'ferramentas' && <Ferramentas />}
        {page === 'overlay' && <OverlayInfo />}
      </main>
    </div>
  );
}
