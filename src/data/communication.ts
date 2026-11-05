/** Frases prontas, comandos de chat, etiqueta e guia de RP. */

export interface Phrase {
  en: string;
  pt: string;
}

export const PHRASE_GROUPS: { title: string; phrases: Phrase[] }[] = [
  {
    title: 'Chegando no grupo',
    phrases: [
      { en: 'Hi everyone! o/', pt: 'Oi pessoal!' },
      { en: "Hi! It's my first time here, any tips?", pt: 'Oi! É minha primeira vez aqui, alguma dica?' },
      { en: "I'm still learning Black Mage, sorry in advance!", pt: 'Ainda estou aprendendo Black Mage, desculpa desde já!' },
      { en: 'Can we take it a bit slower? First time.', pt: 'Podemos ir um pouco mais devagar? Primeira vez.' },
    ],
  },
  {
    title: 'Durante a dungeon',
    phrases: [
      { en: 'brb, 1 min', pt: 'Já volto, 1 minuto.' },
      { en: 'Ready!', pt: 'Pronto!' },
      { en: 'Sorry, my bad!', pt: 'Foi mal!' },
      { en: 'Could someone explain this mechanic?', pt: 'Alguém pode explicar essa mecânica?' },
      { en: 'Need a rez please', pt: 'Preciso de ressurreição, por favor.' },
      { en: 'Caster LB on this pull?', pt: 'LB de caster nesse grupo de inimigos?' },
    ],
  },
  {
    title: 'Encerrando',
    phrases: [
      { en: 'gg, tyfp!', pt: 'Bom jogo, obrigado pelo grupo!' },
      { en: 'Thanks for the patience and the explanations!', pt: 'Obrigado pela paciência e pelas explicações!' },
      { en: 'That was fun, good luck everyone o/', pt: 'Foi divertido, boa sorte a todos!' },
    ],
  },
  {
    title: 'Roleplay',
    phrases: [
      { en: '(( Hi! Mind if I join the scene? ))', pt: '(( Oi! Posso entrar na cena? ))' },
      { en: '(( Sorry, I need to go soon. Can we pause here? ))', pt: '(( Desculpa, preciso sair logo. Podemos pausar aqui? ))' },
      { en: '(( Are you open to walk-up RP? ))', pt: '(( Você está aberto a RP com quem chega? ))' },
    ],
  },
];

export const CHAT_COMMANDS: { cmd: string; what: string }[] = [
  { cmd: '/p', what: 'Fala com a party.' },
  { cmd: '/s', what: 'Say: quem está perto de você lê.' },
  { cmd: '/y', what: 'Yell: alcance maior que o say.' },
  { cmd: '/sh', what: 'Shout: toda a área lê. Use com moderação.' },
  { cmd: '/t Nome Sobrenome@Servidor', what: 'Mensagem privada (tell).' },
  { cmd: '/r', what: 'Responde o último tell recebido.' },
  { cmd: '/fc', what: 'Chat da Free Company.' },
  { cmd: '/l1 … /l8', what: 'Chat das Linkshells.' },
  { cmd: '/em texto', what: 'Emote livre: "/em ajeita o chapéu" vira "Fulano ajeita o chapéu".' },
  { cmd: '/readycheck', what: 'Pergunta para a party se todos estão prontos.' },
  { cmd: '/countdown 10', what: 'Contagem regressiva para começar a luta.' },
];

export const ETIQUETTE: { title: string; text: string }[] = [
  { title: 'Cumprimente', text: 'Um "o/" ao entrar já quebra o gelo. Ninguém espera conversa longa.' },
  { title: 'Avise que é a primeira vez', text: 'A maioria dos jogadores gosta de ajudar e você ganha bônus de EXP para o grupo.' },
  { title: 'Deixe o tank puxar', text: 'Em dungeon, não ataque grupos de inimigos que o tank ainda não puxou.' },
  { title: 'Sem críticas de desempenho', text: 'Comentar o DPS dos outros ou citar parses é mal visto e contra as regras.' },
  { title: 'Commendation', text: 'No fim da dungeon dê sua "commendation" para quem ajudou ou foi gentil.' },
  { title: 'Auto-translate', text: 'Aperte Tab enquanto digita para usar frases do dicionário automático: cada jogador as vê no próprio idioma.' },
];

export const RP_GUIDE: { title: string; text: string }[] = [
  { title: 'IC e OOC', text: 'Tudo que você escreve no /say durante uma cena é do personagem (IC). Para falar como jogador, use ((parênteses duplos)) ou mande um /tell.' },
  { title: 'Emotes', text: 'Use /em para descrever ações. Evite descrever o resultado sobre o personagem dos outros ("/em acerta Fulano") — prefira "/em tenta acertar Fulano".' },
  { title: 'Sinalize que está aberto', text: 'Coloque o status "Role-playing" no Online Status e escreva no Search Info o tipo de RP que procura.' },
  { title: 'Pontos de encontro', text: 'Taverns, praças das cidades e housings de comunidades. Na América do Norte, o servidor Balmung (Data Center Crystal) é conhecido pela comunidade de RP.' },
  { title: 'Consentimento', text: 'Antes de cenas de combate, ferimentos ou temas pesados, combine OOC com os outros jogadores.' },
  { title: 'Sem metagame', text: 'Seu personagem não sabe o nome do outro só porque ele aparece na tela. Apresentem-se!' },
];

export const BLM_MACROS: { title: string; lines: string[]; note: string }[] = [
  {
    title: 'Aetherial Manipulation com mouseover',
    lines: ['/micon "Aetherial Manipulation"', '/ac "Aetherial Manipulation" <mo>'],
    note: 'Passe o mouse sobre o aliado (na tela ou na lista da party) e aperte a macro: você se teleporta até ele.',
  },
  {
    title: 'Aviso de primeira vez',
    lines: ['/p Hi! First time here, I might need a quick explanation o/'],
    note: 'Uma macro para colar no começo de conteúdos novos.',
  },
];
