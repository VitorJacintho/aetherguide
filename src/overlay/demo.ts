/**
 * Modo demonstração: simula uma luta usando o próprio motor de regras,
 * para testar o overlay sem abrir o jogo (overlay.html?demo=1).
 */
import { canUse, gcdLength, recommend } from '../engine/blm';
import { clock, tracker } from './tracker';

const SAMPLE_CHAT: [string, string][] = [
  ['Tank Lalafell', 'o/ hi all, W2W ok?'],
  ['Healer Miqo', 'FT here, sorry in advance!'],
  ['Random Roe', 'LB on this pull pls'],
  ['Tank Lalafell', 'brb 1 min'],
  ['Healer Miqo', 'gg tyfp o/'],
  ['Random Roe', 'stack for the raidwide, TB on MT'],
];

export function startDemo() {
  tracker.setPlayer({ name: 'Demo Black Mage', level: 100, isBlm: true });
  tracker.setFood(9 * 60);

  const start = clock();
  let nextGcd = start + 1;
  let nextChat = start + 4;
  let chatIdx = 0;
  let nextBurst = start + 6;
  let nextMove = start + 25;

  setInterval(() => {
    tracker.tick();
    const now = clock();
    const state = tracker.get().blm;

    if (now >= nextGcd) {
      const advice = recommend(state);
      for (const o of advice.ogcds) tracker.useAction(o.id);
      const after = tracker.get().blm;

      // a cada ~25 s simula uma mecânica de movimento: usa uma instantânea
      let gcd = recommend(after).gcd;
      if (now >= nextMove) {
        if (canUse(after, 'xenoglossy').ok) gcd = 'xenoglossy';
        nextMove = now + 25;
      }
      if (canUse(after, gcd).ok) tracker.useAction(gcd);
      nextGcd = now + gcdLength(tracker.get().blm);
    }

    if (now >= nextChat) {
      const [who, msg] = SAMPLE_CHAT[chatIdx++ % SAMPLE_CHAT.length];
      tracker.chat(who, msg);
      nextChat = now + 9;
    }

    if (now >= nextBurst) {
      tracker.setBurst(['Divination', 'Battle Litany', 'Technical Finish'], 20);
      nextBurst = now + 120;
    }
  }, 100);
}
