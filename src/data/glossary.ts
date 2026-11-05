/** Gírias e siglas comuns no chat de FFXIV, explicadas em português. */

export type GlossaryCategory = 'Chat' | 'Combate' | 'Conteúdo' | 'Grupo' | 'Mercado' | 'RP' | 'Black Mage';

export interface GlossaryEntry {
  term: string;
  aliases?: string[];
  meaning: string;
  category: GlossaryCategory;
}

export const GLOSSARY: GlossaryEntry[] = [
  // Chat
  { term: 'o/', aliases: ['\\o', 'o7'], meaning: 'Um bonequinho acenando: "oi" ou "tchau". o7 é uma continência.', category: 'Chat' },
  { term: 'gg', meaning: 'Good game — "bom jogo", dito ao terminar.', category: 'Chat' },
  { term: 'ty', aliases: ['tyvm', 'thx'], meaning: 'Thank you (very much) — obrigado.', category: 'Chat' },
  { term: 'tyfp', meaning: 'Thank you for the party — "obrigado pelo grupo". Despedida educada no fim da dungeon.', category: 'Chat' },
  { term: 'np', aliases: ['yw'], meaning: 'No problem / You\'re welcome — "de nada".', category: 'Chat' },
  { term: 'gl', aliases: ['gl hf'], meaning: 'Good luck (have fun) — boa sorte (divirta-se).', category: 'Chat' },
  { term: 'brb', meaning: 'Be right back — "já volto".', category: 'Chat' },
  { term: 'afk', meaning: 'Away from keyboard — longe do teclado.', category: 'Chat' },
  { term: 'omw', meaning: 'On my way — "estou indo".', category: 'Chat' },
  { term: 'mb', aliases: ['my bad'], meaning: '"Foi mal" — reconhecer um erro.', category: 'Chat' },
  { term: 'nvm', meaning: 'Never mind — "deixa pra lá".', category: 'Chat' },
  { term: 'rdy', meaning: 'Ready — "pronto".', category: 'Chat' },
  { term: 'idk', meaning: 'I don\'t know — "não sei".', category: 'Chat' },
  { term: 'sec', aliases: ['1 sec'], meaning: '"Um segundo", pedido para esperar.', category: 'Chat' },
  { term: 'sprout', aliases: ['sprouts'], meaning: 'Jogador novo (ícone de brotinho verde ao lado do nome). Seja gentil!', category: 'Chat' },
  { term: 'mentor', meaning: 'Jogador veterano com ícone de coroa que se ofereceu para ajudar novatos.', category: 'Chat' },
  { term: 'NN', aliases: ['Novice Network'], meaning: 'Canal de chat para novatos e mentores. Bom para tirar dúvidas.', category: 'Chat' },

  // Grupo
  { term: 'FT', aliases: ['first time', 'first timer'], meaning: 'Primeira vez na dungeon/luta. Avise o grupo: muitos explicam as mecânicas e há bônus de EXP.', category: 'Grupo' },
  { term: 'DF', aliases: ['Duty Finder'], meaning: 'Duty Finder: o sistema de fila automático de grupos.', category: 'Grupo' },
  { term: 'PF', aliases: ['Party Finder'], meaning: 'Party Finder: quadro onde jogadores anunciam grupos com objetivos específicos.', category: 'Grupo' },
  { term: 'LFG', aliases: ['LFM'], meaning: 'Looking for group / more — procurando grupo / mais jogadores.', category: 'Grupo' },
  { term: 'FC', aliases: ['Free Company'], meaning: 'Free Company: a "guilda" do FFXIV.', category: 'Grupo' },
  { term: 'LS', aliases: ['CWLS', 'linkshell'], meaning: 'Linkshell: canal de chat entre amigos (CWLS = entre servidores).', category: 'Grupo' },
  { term: 'MT', aliases: ['OT'], meaning: 'Main tank / Off tank — tank principal e tank secundário.', category: 'Grupo' },
  { term: 'LB', aliases: ['LB3', 'limit break'], meaning: 'Limit Break: ataque especial da party. No BLM (caster) o LB é em área — ótimo para grupos grandes de inimigos.', category: 'Grupo' },
  { term: 'rez', aliases: ['raise', 'res'], meaning: 'Ressuscitar alguém caído.', category: 'Grupo' },
  { term: 'wipe', meaning: 'Todo o grupo morreu. Respira e tenta de novo!', category: 'Grupo' },
  { term: 'pull', meaning: 'Puxar inimigos para começar a luta. Em dungeon, quem puxa é o tank.', category: 'Grupo' },
  { term: 'W2W', aliases: ['wall to wall', 'big pull'], meaning: 'O tank vai juntar todos os inimigos até a próxima "parede". Use seu AoE!', category: 'Grupo' },
  { term: 'mit', aliases: ['mitigation'], meaning: 'Mitigação: habilidades que reduzem dano (como o seu Addle).', category: 'Grupo' },
  { term: 'echo', meaning: 'Buff que o jogo dá depois de várias derrotas seguidas (aumenta dano e vida).', category: 'Grupo' },
  { term: 'clear', meaning: 'Vencer a luta/dungeon.', category: 'Grupo' },
  { term: 'prog', meaning: 'Progressão: grupo ainda aprendendo a luta.', category: 'Grupo' },
  { term: 'farm', meaning: 'Repetir uma luta já dominada para pegar recompensas.', category: 'Grupo' },
  { term: 'min ilvl', aliases: ['unsync'], meaning: 'Min ilvl: entrar com o mínimo de item level. Unsync: sem limite de nível (fica fácil).', category: 'Grupo' },

  // Combate
  { term: 'DPS', meaning: 'Damage per second — também é o nome do papel de quem causa dano (você!).', category: 'Combate' },
  { term: 'AoE', meaning: 'Area of Effect: ataque em área. Também a área marcada no chão que você deve evitar.', category: 'Combate' },
  { term: 'ST', aliases: ['single target'], meaning: 'Alvo único.', category: 'Combate' },
  { term: 'aggro', aliases: ['enmity', 'hate'], meaning: 'Para quem o inimigo está olhando. O tank deve ter o aggro.', category: 'Combate' },
  { term: 'add', aliases: ['adds'], meaning: 'Inimigos extras que aparecem durante a luta contra o chefe.', category: 'Combate' },
  { term: 'trash', meaning: 'Inimigos comuns entre os chefes.', category: 'Combate' },
  { term: 'mech', aliases: ['mechanic', 'mechs'], meaning: 'Mecânica: ataque especial do chefe que exige uma ação do grupo.', category: 'Combate' },
  { term: 'TB', aliases: ['tankbuster'], meaning: 'Golpe muito forte no tank. Fique longe dele.', category: 'Combate' },
  { term: 'raidwide', meaning: 'Dano em toda a party. Bom momento para Addle.', category: 'Combate' },
  { term: 'stack', meaning: 'Juntar-se ao marcador para dividir o dano.', category: 'Combate' },
  { term: 'spread', meaning: 'Espalhar-se: ficar longe dos outros jogadores.', category: 'Combate' },
  { term: 'KB', aliases: ['knockback'], meaning: 'Empurrão. Surecast anula.', category: 'Combate' },
  { term: 'enrage', meaning: 'Ataque que mata todos se a luta demorar demais (DPS insuficiente).', category: 'Combate' },
  { term: 'GCD', meaning: 'Global Cooldown: o "tique" de ~2,5 s entre suas magias principais.', category: 'Combate' },
  { term: 'oGCD', aliases: ['weave'], meaning: 'Habilidade fora do GCD, usada entre magias ("weave" = encaixar).', category: 'Combate' },
  { term: 'DoT', aliases: ['HoT'], meaning: 'Damage over time (dano contínuo, como o Thunder). HoT = cura contínua.', category: 'Combate' },
  { term: 'CD', aliases: ['cooldown', 'cds'], meaning: 'Tempo de recarga — ou as habilidades fortes que têm recarga longa.', category: 'Combate' },
  { term: 'burst', aliases: ['raid buffs', 'buffs'], meaning: 'Momento em que a party ativa buffs juntos (geralmente a cada 2 min). Gaste seu Polyglot aqui.', category: 'Combate' },
  { term: 'opener', meaning: 'Sequência fixa do começo da luta.', category: 'Combate' },
  { term: 'uptime', meaning: 'Tempo atacando o chefe. "ABC: Always Be Casting" — nunca pare de conjurar.', category: 'Combate' },
  { term: 'slidecast', meaning: 'Começar a andar no finalzinho da conjuração sem cancelar a magia.', category: 'Combate' },
  { term: 'pot', aliases: ['tincture', 'gemdraught'], meaning: 'Poção que aumenta o atributo principal (Intelligence) por 30 s.', category: 'Combate' },
  { term: 'parse', aliases: ['logs', 'ACT'], meaning: 'Medição de desempenho por programas de terceiros. Nunca comente o parse dos outros no jogo — é contra as regras.', category: 'Combate' },

  // Conteúdo
  { term: 'MSQ', meaning: 'Main Scenario Quest: a história principal.', category: 'Conteúdo' },
  { term: 'roulette', aliases: ['roulettes'], meaning: 'Fila aleatória diária com recompensa bônus.', category: 'Conteúdo' },
  { term: 'FATE', aliases: ['FATEs'], meaning: 'Eventos públicos que aparecem no mapa.', category: 'Conteúdo' },
  { term: 'hunt', aliases: ['train', 'S rank'], meaning: 'Monstros especiais; "train" é um grupo grande indo de um em um.', category: 'Conteúdo' },
  { term: 'EX', aliases: ['Extreme'], meaning: 'Versão difícil de um trial.', category: 'Conteúdo' },
  { term: 'Savage', aliases: ['sav'], meaning: 'Raid de alta dificuldade para 8 jogadores.', category: 'Conteúdo' },
  { term: 'Ult', aliases: ['Ultimate'], meaning: 'Conteúdo mais difícil do jogo.', category: 'Conteúdo' },
  { term: 'tomes', aliases: ['tomestones'], meaning: 'Moedas semanais para trocar por equipamento.', category: 'Conteúdo' },
  { term: 'PotD', aliases: ['HoH'], meaning: 'Palace of the Dead / Heaven-on-High: deep dungeons.', category: 'Conteúdo' },
  { term: 'ilvl', aliases: ['iLvl', 'item level'], meaning: 'Item level: o "poder" médio do seu equipamento.', category: 'Conteúdo' },
  { term: 'BiS', meaning: 'Best in Slot: o melhor equipamento possível.', category: 'Conteúdo' },
  { term: 'meld', aliases: ['overmeld'], meaning: 'Colocar Materia no equipamento. Overmeld = além dos espaços normais (arriscado e caro).', category: 'Conteúdo' },
  { term: 'glam', aliases: ['glamour'], meaning: 'Aparência do equipamento (transmog).', category: 'Conteúdo' },

  // Mercado
  { term: 'MB', aliases: ['market board'], meaning: 'Market Board: a casa de leilões.', category: 'Mercado' },
  { term: 'WTB', aliases: ['WTS'], meaning: 'Want to buy / Want to sell — quero comprar / quero vender.', category: 'Mercado' },
  { term: 'HQ', aliases: ['NQ'], meaning: 'High Quality / Normal Quality: itens HQ são um pouco melhores.', category: 'Mercado' },

  // RP
  { term: 'RP', meaning: 'Roleplay: interpretar seu personagem.', category: 'RP' },
  { term: 'IC', meaning: 'In character: falando como o personagem.', category: 'RP' },
  { term: 'OOC', aliases: ['(('], meaning: 'Out of character: falando como jogador. Costuma vir entre ((parênteses duplos)).', category: 'RP' },
  { term: 'walk-up', meaning: 'RP aberto: qualquer um pode chegar e participar.', category: 'RP' },
  { term: 'godmod', aliases: ['godmodding'], meaning: 'Decidir o que acontece com o personagem dos outros sem permissão. Evite!', category: 'RP' },
  { term: 'metagame', aliases: ['metagaming'], meaning: 'Usar no RP algo que só o jogador sabe (ex.: ler o nome sobre a cabeça). Evite!', category: 'RP' },

  // Black Mage
  { term: 'AF', aliases: ['AF3'], meaning: 'Astral Fire (fase de fogo).', category: 'Black Mage' },
  { term: 'UI', aliases: ['UI3'], meaning: 'Umbral Ice (fase de gelo).', category: 'Black Mage' },
  { term: 'F4', aliases: ['F3', 'B3', 'B4'], meaning: 'Fire IV, Fire III, Blizzard III, Blizzard IV.', category: 'Black Mage' },
  { term: 'Xeno', meaning: 'Xenoglossy.', category: 'Black Mage' },
  { term: 'LL', aliases: ['ley lines'], meaning: 'Ley Lines — o círculo de velocidade do BLM.', category: 'Black Mage' },
  { term: 'TC', aliases: ['triple'], meaning: 'Triplecast.', category: 'Black Mage' },
  { term: 'MF', meaning: 'Manafont.', category: 'Black Mage' },
  { term: 'FS', meaning: 'Flare Star.', category: 'Black Mage' },
  { term: 'AM', meaning: 'Aetherial Manipulation (teleporte até um aliado).', category: 'Black Mage' },
  { term: 'BtL', meaning: 'Between the Lines (volta para o Ley Lines).', category: 'Black Mage' },
];

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

interface CompiledTerm {
  entry: GlossaryEntry;
  regex: RegExp;
}

let compiled: CompiledTerm[] | null = null;

/**
 * Termos que também são palavras comuns em inglês e geram falso positivo
 * no chat ao vivo (continuam aparecendo no glossário da página).
 */
const CHAT_IGNORE = new Set(['sec', 'pull', 'add', 'adds', 'clear', 'farm', 'stack', 'spread', 'mentor', 'train', 'hunt', 'buffs', 'logs', 'raise', 'triple', 'am', 'ui', 'res']);

function compile(): CompiledTerm[] {
  if (compiled) return compiled;
  compiled = GLOSSARY.map((entry) => {
    const words = [entry.term, ...(entry.aliases ?? [])].filter((w) => !CHAT_IGNORE.has(w.toLowerCase()));
    if (words.length === 0) return null;
    // fronteira de palavra "manual" para aceitar termos com símbolos (o/, ((, \o)
    const alt = words.map(escapeRegex).join('|');
    return { entry, regex: new RegExp(`(^|[\\s.,!?:;"'])(${alt})(?=$|[\\s.,!?:;"'])`, 'i') };
  }).filter((x): x is CompiledTerm => x !== null);
  return compiled;
}

/** Encontra gírias do glossário dentro de uma mensagem de chat. */
export function findTerms(message: string): GlossaryEntry[] {
  return compile()
    .filter(({ regex }) => regex.test(message))
    .map(({ entry }) => entry);
}
