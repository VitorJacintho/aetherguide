import type { PageId } from '../App';
import { useLocal } from '../hooks/useLocal';
import { bracketFor } from '../data/blm/leveling';
import { SpellChip } from '../components/ActionIcon';

const STEPS: { title: string; text: string; page: PageId }[] = [
  { title: '1. Descubra o que fazer no seu nível', text: 'A rotação muda conforme você sobe. Digite seu nível e veja exatamente o que apertar.', page: 'progressao' },
  { title: '2. Entenda o Fogo e o Gelo', text: 'Os recursos do Black Mage explicados sem jargão: Umbral Hearts, Polyglot, Paradox, Astral Soul…', page: 'rotacao' },
  { title: '3. Treine a rotação', text: 'Um simulador que diz se a magia que você escolheu foi a melhor — e por quê.', page: 'treino' },
  { title: '4. Equipe-se direito', text: 'Quais atributos importam, onde colocar Materia e os erros mais comuns de equipamento.', page: 'build' },
  { title: '5. Fale a língua do jogo', text: 'Glossário de gírias, frases prontas em inglês, etiqueta de dungeon e guia de RP.', page: 'comunicacao' },
  { title: '6. Overlay enquanto joga', text: 'Gauge, próximo passo sugerido, timers e tradutor de gírias do chat sobre o jogo.', page: 'overlay' },
];

export default function Home({ go }: { go: (p: PageId) => void }) {
  const [level] = useLocal('level', 30);
  const bracket = bracketFor(level);

  return (
    <>
      <h1>Bem-vindo(a), futuro(a) Black Mage ✦</h1>
      <p className="lead">
        O Black Mage é o mago de dano bruto do FFXIV: alterna entre <b style={{ color: 'var(--fire)' }}>Fogo</b> (onde causa
        dano) e <b style={{ color: 'var(--ice)' }}>Gelo</b> (onde recupera MP). Parece complicado, mas o ciclo é sempre o
        mesmo — e este app te guia passo a passo.
      </p>

      <div className="card clickable" onClick={() => go('progressao')} style={{ margin: '18px 0' }}>
        <span className="badge gold">Seu nível: {level}</span>
        <h3 style={{ marginTop: 8 }}>{bracket.title}</h3>
        <div className="chips">
          {bracket.single.map((s, i) => (
            <SpellChip key={i} text={s} />
          ))}
        </div>
        <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>Clique para mudar o nível e ver detalhes.</p>
      </div>

      <h2>Por onde começar</h2>
      <div className="grid grid-2">
        {STEPS.map((s) => (
          <div key={s.page} className="card clickable" onClick={() => go(s.page)}>
            <h3>{s.title}</h3>
            <p className="muted" style={{ margin: 0 }}>{s.text}</p>
          </div>
        ))}
      </div>

      <h2>Ainda não é Black Mage?</h2>
      <div className="card">
        <p>
          Todo Black Mage começa como <b>Thaumaturge</b>. A guilda fica em <b>Ul'dah</b> (Steps of Nald). Se você criou o
          personagem com outra classe, pode pegar Thaumaturge a partir do nível 10 na guilda.
        </p>
        <p style={{ margin: 0 }}>
          No <b>nível 30</b>, depois de concluir a quest de classe desse nível, aceite <b>"Taking the Black"</b> em Ul'dah para
          receber o Soul Crystal e virar Black Mage. Equipe o cristal — sem ele você continua Thaumaturge!
        </p>
      </div>
    </>
  );
}
