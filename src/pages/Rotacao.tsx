import { useState } from 'react';
import type { PageId } from '../App';
import { SpellChip } from '../components/ActionIcon';

type Tab = 'conceitos' | 'loop' | 'aoe' | 'movimento' | 'downtime' | 'erros';

const TABS: { id: Tab; label: string }[] = [
  { id: 'conceitos', label: 'Conceitos' },
  { id: 'loop', label: 'Rotação nível 100' },
  { id: 'aoe', label: 'Vários inimigos' },
  { id: 'movimento', label: 'Movimento' },
  { id: 'downtime', label: 'Downtime e morte' },
  { id: 'erros', label: 'Erros comuns' },
];

const RESOURCES: { name: string; cls: string; text: string }[] = [
  { name: 'Astral Fire (AF)', cls: 'fire', text: 'Fase de fogo. Magias de fogo batem mais forte, mas custam o dobro de MP e o MP não regenera. Em AF III as magias de gelo conjuram mais rápido.' },
  { name: 'Umbral Ice (UI)', cls: 'ice', text: 'Fase de gelo. Magias de gelo não gastam MP e recuperam MP. Em UI III as magias de fogo conjuram mais rápido. Desde o patch 7.2, AF e UI não expiram mais sozinhos.' },
  { name: 'Enochian', cls: 'thunder', text: 'Bônus passivo de dano sempre ativo enquanto você estiver em Fogo ou Gelo. Você só perde se cair para o estado neutro (morrendo, por exemplo).' },
  { name: 'Umbral Hearts', cls: 'ice', text: 'Ganhos com Blizzard IV, Freeze ou Umbral Soul. Cada magia de fogo em AF gasta 1 coração e anula o custo dobrado de MP (Despair não gasta).' },
  { name: 'Polyglot', cls: 'unaspected', text: 'A cada 30 s em Fogo ou Gelo você ganha 1 stack (máximo 3 no nível 98+). Gaste com Xenoglossy (alvo único) ou Foul (área). Se estiver no máximo, o stack seguinte é perdido.' },
  { name: 'Paradox', cls: 'unaspected', text: 'Marcador ganho ao ir de UI III (com 3 corações) para o Fogo, ou de AF III para o Gelo. Paradox é instantâneo; em AF ele dá Firestarter.' },
  { name: 'Firestarter', cls: 'fire', text: 'Seu próximo Fire III fica instantâneo e sem custo de MP.' },
  { name: 'Thunderhead', cls: 'thunder', text: 'Ganho toda vez que você entra no Fogo ou no Gelo. É consumido pelo High Thunder. Renove o Thunder quando faltar menos de 3 s no alvo.' },
  { name: 'Astral Soul', cls: 'fire', text: 'Nível 100: cada Fire IV dá 1 stack (Flare dá 3). Com 6 stacks você libera o Flare Star. Os stacks somem quando você sai do Fogo.' },
];

const LOOP: { name: string; cls: string; note: string }[] = [
  { name: 'Blizzard III', cls: 'ice', note: 'Entra em Umbral Ice III. Ganha Paradox e Thunderhead.' },
  { name: 'Blizzard IV', cls: 'ice', note: '3 Umbral Hearts e MP cheio.' },
  { name: 'Paradox', cls: 'unaspected', note: 'Gasta o Paradox ganho ao entrar no gelo.' },
  { name: 'Fire III', cls: 'fire', note: 'Volta para Astral Fire III (instantâneo se tiver Firestarter). Ganha outro Paradox.' },
  { name: 'Fire IV ×3', cls: 'fire', note: 'Gastam os 3 corações (MP mais barato). +3 Astral Soul.' },
  { name: 'Paradox', cls: 'unaspected', note: 'Dá Firestarter para o próximo ciclo. Pode mudar de posição para ajudar no movimento.' },
  { name: 'Fire IV ×3', cls: 'fire', note: 'Completa 6 Astral Soul.' },
  { name: 'Flare Star', cls: 'fire', note: 'Gasta as 6 Astral Soul.' },
  { name: 'Despair', cls: 'fire', note: 'Gasta todo o MP restante. Fim da fase de fogo.' },
];

export default function Rotacao({ go }: { go: (p: PageId) => void }) {
  const [tab, setTab] = useState<Tab>('conceitos');

  return (
    <>
      <h1>Rotação do Black Mage</h1>
      <p className="lead">
        A ideia central: <b style={{ color: 'var(--fire)' }}>Fogo causa dano mas gasta MP</b>,{' '}
        <b style={{ color: 'var(--ice)' }}>Gelo recupera MP</b>. Você passa a maior parte do tempo no Fogo e só visita o Gelo
        para reabastecer.
      </p>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'conceitos' && (
        <div className="grid grid-2">
          {RESOURCES.map((r) => (
            <div key={r.name} className="card">
              <span className={`badge ${r.cls}`}>{r.name}</span>
              <p style={{ margin: '8px 0 0' }}>{r.text}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'loop' && (
        <>
          <div className="card">
            <h3>O ciclo padrão (alvo único)</h3>
            <div className="chips" style={{ marginBottom: 14 }}>
              {LOOP.map((s, i) => (
                <span key={i} style={{ display: 'contents' }}>
                  {i > 0 && <span className="arrow">→</span>}
                  <SpellChip text={s.name} className={s.cls} />
                </span>
              ))}
              <span className="arrow">↺</span>
            </div>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {LOOP.map((s, i) => (
                <li key={i} style={{ marginBottom: 4 }}><b>{s.name}:</b> {s.note}</li>
              ))}
            </ol>
          </div>
          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <div className="card">
              <h3>Encaixe ao longo do ciclo</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li><b>High Thunder:</b> quando o DoT tiver menos de 3 s (e você tiver Thunderhead).</li>
                <li><b>Xenoglossy:</b> não deixe o Polyglot transbordar; guarde stacks para movimento e para a janela de buffs da party.</li>
                <li><b>Amplifier:</b> quase sempre que estiver pronto, se não for transbordar o Polyglot.</li>
                <li><b>Manafont:</b> depois do Despair — dá MP, corações, Thunderhead e Paradox para outra fase de fogo.</li>
                <li><b>Ley Lines:</b> quando o chefe vai ficar parado por ~20 s.</li>
              </ul>
            </div>
            <div className="card">
              <h3>Opener (começo da luta)</h3>
              <p>
                Comece a conjurar <b>Fire III ~4 s antes</b> do fim da contagem para ela acertar exatamente no início. Use uma
                poção de Intelligence no começo.
              </p>
              <p>
                O opener padrão dos jogadores avançados é o <b>"5+7"</b>: 5 Fire IV antes do Manafont e 7 depois, para fazer dois
                Flare Star seguidos dentro dos buffs da party. A sequência exata está na{' '}
                <a href="https://www.thebalanceffxiv.com/jobs/casters/black-mage/openers/" target="_blank" rel="noreferrer">The Balance</a>.
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Iniciante? Basta abrir com Fire III, High Thunder, Ley Lines e seguir o ciclo normal.
              </p>
            </div>
          </div>
          <div className="callout">
            Pratique esse ciclo no <a href="#/treino" onClick={(e) => { e.preventDefault(); go('treino'); }}>Treinador de rotação</a>.
          </div>
        </>
      )}

      {tab === 'aoe' && (
        <div className="grid grid-2">
          <div className="card">
            <h3>3 ou mais inimigos (nível 100)</h3>
            <div className="chips">
              {['Freeze (em UI)', 'Foul / High Thunder II', 'Transpose', 'Flare', 'Flare', 'Flare Star', 'Transpose'].map((s, i) => (
                <span key={i} style={{ display: 'contents' }}>
                  {i > 0 && <span className="arrow">→</span>}
                  <SpellChip text={s} className={/Flare/.test(s) ? 'fire' : /Freeze/.test(s) ? 'ice' : /Transpose/.test(s) ? '' : 'unaspected'} />
                </span>
              ))}
            </div>
            <ul style={{ marginTop: 12, paddingLeft: 18 }}>
              <li>Freeze no Gelo dá MP suficiente para os dois Flare.</li>
              <li>Foul / High Thunder II servem de "filler" enquanto o Transpose recarrega.</li>
              <li>Manafont rende mais dois Flare e outro Flare Star.</li>
              <li>Um Ether de pelo menos 800 MP permite um Flare extra em dungeons.</li>
            </ul>
          </div>
          <div className="card">
            <h3>Exatamente 2 inimigos</h3>
            <p>Use a rotação de área trocando Freeze por Blizzard IV. Nesse caso o Foul rende mais que o Xenoglossy.</p>
            <h3>Dungeon: dica de grupo</h3>
            <p style={{ margin: 0 }}>
              O Limit Break de caster é em área: em puxadas grandes (W2W) ele é ótimo. Combine com o grupo antes de usar.
            </p>
          </div>
        </div>
      )}

      {tab === 'movimento' && (
        <div className="grid grid-2">
          <div className="card">
            <h3>Magias instantâneas</h3>
            <p>Use estas quando precisar andar: <b>Xenoglossy</b>, <b>Paradox</b>, <b>High Thunder</b> e <b>Fire III com Firestarter</b>.</p>
            <p className="muted" style={{ margin: 0 }}>Depois de uma instantânea dá para encaixar até 2 habilidades oGCD.</p>
          </div>
          <div className="card">
            <h3>Swiftcast e Triplecast</h3>
            <p style={{ margin: 0 }}>Tornam magias de conjuração instantâneas. São suas ferramentas principais de movimento — não gaste em magias que já são instantâneas.</p>
          </div>
          <div className="card">
            <h3>Ley Lines, Between the Lines e Retrace</h3>
            <p style={{ margin: 0 }}>
              Fique numa <b>borda</b> do círculo para poder desviar para o outro lado. Precisou sair? Use uma instantânea, saia e
              volte com <b>Between the Lines</b>. Se o chefe se mexeu, <b>Retrace</b> move o círculo até você.
            </p>
          </div>
          <div className="card">
            <h3>Slidecast e outras ferramentas</h3>
            <p style={{ margin: 0 }}>
              Você pode começar a andar no finalzinho da barra de conjuração. <b>Aetherial Manipulation</b> teleporta até um aliado e
              <b> Surecast</b> anula empurrões.
            </p>
          </div>
        </div>
      )}

      {tab === 'downtime' && (
        <div className="grid grid-2">
          <div className="card">
            <h3>Chefe sumiu (downtime)</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Se estiver no Fogo, use <b>Transpose</b> para ir ao Gelo.</li>
              <li>Use <b>Umbral Soul</b> até ter MP cheio e 3 corações — sem gastar Blizzard III/IV.</li>
              <li>DoTs não causam dano enquanto o inimigo está fora de alcance.</li>
              <li>No fim da luta, gaste todo o Polyglot.</li>
            </ul>
          </div>
          <div className="card">
            <h3>Voltando depois de morrer</h3>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              <li>Blizzard III (instantâneo com Swiftcast ou Triplecast).</li>
              <li>High Thunder se o DoT caiu.</li>
              <li>Blizzard IV e siga o ciclo normal.</li>
            </ol>
          </div>
        </div>
      )}

      {tab === 'erros' && (
        <div className="grid grid-2">
          {[
            ['Ficar no Fogo sem MP', 'Se o MP acabou e não tem Manafont, vá para o Gelo. Ficar parado é o pior que pode acontecer.'],
            ['Polyglot transbordando', 'No máximo de stacks, o próximo é perdido. Gaste um Xenoglossy antes.'],
            ['Esquecer o Thunder', 'Boa parte do dano do High Thunder vem do DoT. Renove quando faltar menos de 3 s.'],
            ['Renovar Thunder cedo demais', 'Renovar com muito tempo sobrando desperdiça dano.'],
            ['Usar Lucid Dreaming', 'Astral Fire bloqueia a regeneração de MP — o Lucid quase não faz nada para o BLM.'],
            ['Medo do Ley Lines', 'Coloque quando o chefe vai ficar parado e use as ferramentas de movimento. Ley Lines parado no CD é dano perdido.'],
            ['Cancelar magias para andar', 'Aprenda o slidecast e planeje instantâneas para a mecânica.'],
            ['Gastar Triplecast em instantâneas', 'Xenoglossy, Paradox e High Thunder já são instantâneas.'],
          ].map(([t, d]) => (
            <div key={t} className="card">
              <h3>❌ {t}</h3>
              <p className="muted" style={{ margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>
      )}

      <p className="muted" style={{ fontSize: '.85rem', marginTop: 20 }}>
        Referência: guias da <a href="https://www.thebalanceffxiv.com/jobs/casters/black-mage/basic-guide/" target="_blank" rel="noreferrer">The Balance</a>{' '}
        (patch 7.4). Sempre confira as notas de patch no Lodestone após atualizações.
      </p>
    </>
  );
}
