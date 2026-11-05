/**
 * O que cada tipo de mecânica significa e o que o Black Mage deve fazer.
 * Os tipos vêm dos gatilhos do cactbot (scripts/fetch-duties.ts); os textos são nossos.
 */
export interface MechanicKind {
  label: string;
  icon: string;
  /** o que acontece */
  what: string;
  /** o que o Black Mage faz */
  blm: string;
  /** frase curta para o aviso no overlay (e para a voz) */
  callout: string;
}

export const MECHANIC_KINDS: Record<string, MechanicKind> = {
  tankbuster: {
    label: 'Tankbuster', icon: '🛡️',
    what: 'Golpe muito forte no tank — às vezes em cone ou com área ao redor dele.',
    blm: 'Não fique perto do tank nem na frente do chefe. Se o grupo combinar, Addle ajuda o tank.',
    callout: 'Tankbuster. Fique longe do tank.',
  },
  raidwide: {
    label: 'Dano em todos', icon: '💥',
    what: 'Ataque que acerta a party inteira. Não dá para desviar.',
    blm: 'Continue conjurando. Bom momento para Manaward (seu escudo) e para Addle, se o grupo combinar.',
    callout: 'Dano em todos. Manaward.',
  },
  spread: {
    label: 'Espalhar', icon: '↔️',
    what: 'Marcadores em vários jogadores: se eles ficarem juntos, o dano se acumula.',
    blm: 'Afaste-se dos outros. Use Xenoglossy, Paradox ou Triplecast para andar sem parar de causar dano.',
    callout: 'Espalhe-se.',
  },
  stack: {
    label: 'Juntar', icon: '🫂',
    what: 'Dano dividido entre todos que estiverem junto do marcador.',
    blm: 'Vá para o marcador e fique colado na party. Use uma instantânea se precisar andar.',
    callout: 'Junte-se ao grupo.',
  },
  knockback: {
    label: 'Empurrão', icon: '💨',
    what: 'Empurra os jogadores para longe — às vezes para fora da arena.',
    blm: 'Use Surecast para ignorar o empurrão (assim você nem sai do Ley Lines). Sem Surecast, posicione-se para não cair.',
    callout: 'Empurrão. Use Surecast.',
  },
  drawin: {
    label: 'Puxão', icon: '🧲',
    what: 'Puxa os jogadores para perto do inimigo.',
    blm: 'Surecast também anula puxões.',
    callout: 'Puxão. Use Surecast.',
  },
  gaze: {
    label: 'Olhar', icon: '👁️',
    what: 'Ataque de olhar: quem estiver virado para o inimigo sofre um efeito ruim.',
    blm: 'Vire o personagem de costas para o inimigo até a magia dele terminar.',
    callout: 'Olhe para o outro lado.',
  },
  lookat: {
    label: 'Olhar para o alvo', icon: '👀',
    what: 'Você precisa ficar de frente para o alvo indicado.',
    blm: 'Vire o personagem para o alvo.',
    callout: 'Olhe para o alvo.',
  },
  behind: {
    label: 'Ir para trás', icon: '↩️',
    what: 'Ataque na frente (e às vezes nas laterais) do inimigo. Atrás dele é seguro.',
    blm: 'Vá para as costas do inimigo.',
    callout: 'Vá para trás do chefe.',
  },
  frontsides: {
    label: 'Frente ou costas', icon: '↪️',
    what: 'Ataque em cone na frente ou nas costas do inimigo.',
    blm: 'Saia da área marcada no chão — geralmente as laterais são seguras.',
    callout: 'Saia da frente ou das costas.',
  },
  in: {
    label: 'Entrar', icon: '🎯',
    what: 'A área segura é perto do inimigo (ou embaixo dele).',
    blm: 'Vá para perto do inimigo. Se o Ley Lines ficar longe, use Retrace depois.',
    callout: 'Entre embaixo do chefe.',
  },
  out: {
    label: 'Sair', icon: '🏃',
    what: 'Ataque em área ao redor do inimigo ou de um ponto marcado.',
    blm: 'Afaste-se. Se precisar sair do Ley Lines, volte depois com Between the Lines.',
    callout: 'Saia de perto.',
  },
  inout: {
    label: 'Dentro, depois fora', icon: '🔁',
    what: 'Duas partes: primeiro o seguro é perto do inimigo, depois longe.',
    blm: 'Comece perto e saia logo depois do primeiro golpe.',
    callout: 'Dentro, depois fora.',
  },
  outin: {
    label: 'Fora, depois dentro', icon: '🔁',
    what: 'Duas partes: primeiro o seguro é longe do inimigo, depois perto.',
    blm: 'Comece longe e entre logo depois do primeiro golpe.',
    callout: 'Fora, depois dentro.',
  },
  dodge: {
    label: 'Desviar', icon: '⚠️',
    what: 'Ataques marcados no chão: linhas, cones, círculos ou poças.',
    blm: 'Saia das áreas marcadas antes da magia terminar. Instantâneas deixam você andar sem perder dano.',
    callout: 'Desvie das áreas marcadas.',
  },
  adds: {
    label: 'Monstros extras', icon: '👾',
    what: 'Aparecem inimigos extras durante a luta.',
    blm: 'Se forem 3 ou mais, use sua rotação de área. Com menos, siga o alvo do tank.',
    callout: 'Adds. Ataque os extras.',
  },
  interrupt: {
    label: 'Interromper', icon: '✋',
    what: 'Magia que pode — e deve — ser interrompida.',
    blm: 'O Black Mage não tem interrupção: isso é com tanks e ranged físicos. Continue no seu ritmo.',
    callout: 'Interrupção. Tank ou ranged.',
  },
  sleep: {
    label: 'Dormir', icon: '💤',
    what: 'Um inimigo deve ser colocado para dormir.',
    blm: 'Você tem Sleep (role action): use no inimigo indicado se o grupo pedir.',
    callout: 'Use Sleep no inimigo.',
  },
  targeted: {
    label: 'Marcador em alguém', icon: '☄️',
    what: 'Ataque que segue um jogador marcado.',
    blm: 'Se o marcador estiver em você, leve o ataque para longe da party.',
    callout: 'Marcador. Leve para longe.',
  },
  stop: {
    label: 'Parar', icon: '⛔',
    what: 'Pune quem se mexer (ou agir) durante o efeito.',
    blm: 'Pare de andar — e de conjurar, se for o caso — até o efeito passar.',
    callout: 'Pare!',
  },
  move: {
    label: 'Continue andando', icon: '🚶',
    what: 'Pune quem fica parado.',
    blm: 'Continue se movendo; use instantâneas e Triplecast.',
    callout: 'Continue se movendo.',
  },
  chains: {
    label: 'Correntes', icon: '⛓️',
    what: 'Jogadores ligados por uma corrente.',
    blm: 'Afaste-se do jogador ligado a você até a corrente quebrar (ou fique perto, se indicado).',
    callout: 'Corrente. Afaste-se.',
  },
  towers: {
    label: 'Torres', icon: '🗼',
    what: 'Círculos no chão que precisam de jogadores dentro.',
    blm: 'Entre numa torre livre.',
    callout: 'Entre numa torre.',
  },
  custom: {
    label: 'Mecânica especial', icon: '❔',
    what: 'Mecânica específica deste chefe.',
    blm: 'Observe o chão e a barra de conjuração do chefe.',
    callout: 'Atenção à mecânica.',
  },
};

export const kindInfo = (kind: string): MechanicKind => MECHANIC_KINDS[kind] ?? MECHANIC_KINDS.custom;

/** Dicas gerais por tipo de conteúdo, para iniciantes de Black Mage. */
export const DUTY_TIPS: Record<'dungeon' | 'trial', string[]> = {
  dungeon: [
    'O tank puxa os grupos de inimigos. Espere ele juntar todos antes de atacar.',
    'Com 3 ou mais inimigos, use a rotação de área (Freeze, Flare, High Thunder II). Com 1–2, alvo único.',
    'Ley Lines vale a pena em puxadas grandes e nos chefes — quando os inimigos vão ficar parados.',
    'Entre os grupos, use Umbral Soul para chegar no próximo com MP cheio.',
    'Puxada grande (W2W)? Combine com o grupo o Limit Break de caster, que é em área.',
  ],
  trial: [
    'Um chefe só: use a rotação de alvo único o tempo todo.',
    'Coloque Ley Lines quando o chefe ficar parado e use instantâneas para as mecânicas de movimento.',
    'Nos ataques em todos (raidwides), Addle ajuda a party — combine com os outros DPS.',
    'Se morrer, volte com Blizzard III e continue o ciclo normal.',
  ],
};
