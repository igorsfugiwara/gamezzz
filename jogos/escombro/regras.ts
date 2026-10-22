/**
 * Regras e dados do ESCOMBRO: A FITA, sem DOM: integrantes, inimigos, fases,
 * acerto de golpe e nota da fase. O main.ts só desenha e lê os controles.
 */
import type { Tri } from './i18n';

// ─── Integrantes ──────────────────────────────────────────

export type Quem = 'igor' | 'pucci' | 'renato' | 'vocal' | 'duxxo' | 'felipeles';
export type Especial = 'grave' | 'blast' | 'microfonia' | 'grito';

export interface Integrante {
  id: Quem;
  nome: string;
  instrumento: Tri;
  /** Multiplicadores (1 = médio). */
  forca: number;
  vel: number;
  alcance: number;
  especial: Especial;
  especialNome: Tri;
  especialTexto: Tri;
  /** Secreto: 'zerar' libera ao terminar o jogo; 'notaS' ao tirar S em qualquer fase. */
  secreto?: 'zerar' | 'notaS';
}

export const INTEGRANTES: Integrante[] = [
  {
    id: 'igor', nome: 'LINGÃO', instrumento: { pt: 'Baixo', en: 'Bass', de: 'Bass' },
    forca: 1.35, vel: 0.82, alcance: 0.9, especial: 'grave',
    especialNome: { pt: 'Onda de grave', en: 'Bass wave', de: 'Basswelle' },
    especialTexto: { pt: 'Derruba todos na tela.', en: 'Knocks down everyone on screen.', de: 'Wirft alle auf dem Bildschirm um.' },
  },
  {
    id: 'pucci', nome: 'PUCCI', instrumento: { pt: 'Bateria', en: 'Drums', de: 'Schlagzeug' },
    forca: 0.8, vel: 1.25, alcance: 0.95, especial: 'blast',
    especialNome: { pt: 'Blast beat', en: 'Blast beat', de: 'Blast Beat' },
    especialTexto: { pt: 'Rajada de baquetadas na frente.', en: 'A burst of stick hits in front.', de: 'Trommelfeuer nach vorne.' },
  },
  {
    id: 'renato', nome: 'TITCHO', instrumento: { pt: 'Guitarra', en: 'Guitar', de: 'Gitarre' },
    forca: 1, vel: 1, alcance: 1.05, especial: 'microfonia',
    especialNome: { pt: 'Microfonia', en: 'Feedback', de: 'Rückkopplung' },
    especialTexto: { pt: 'Projétil que atravessa a fila.', en: 'A shot that pierces the whole line.', de: 'Ein Schuss durch die ganze Reihe.' },
  },
  {
    id: 'vocal', nome: 'JOTA', instrumento: { pt: 'Voz', en: 'Vocals', de: 'Gesang' },
    forca: 1.1, vel: 1, alcance: 0.85, especial: 'grito',
    especialNome: { pt: 'Grito', en: 'Scream', de: 'Schrei' },
    especialTexto: { pt: 'Atordoa todos os inimigos.', en: 'Stuns every enemy.', de: 'Betäubt alle Gegner.' },
  },
  {
    id: 'duxxo', nome: 'DUXXO', instrumento: { pt: 'Guitarra', en: 'Guitar', de: 'Gitarre' },
    forca: 1.05, vel: 1.05, alcance: 1.05, especial: 'microfonia', secreto: 'zerar',
    especialNome: { pt: 'Microfonia', en: 'Feedback', de: 'Rückkopplung' },
    especialTexto: { pt: 'Projétil que atravessa a fila.', en: 'A shot that pierces the whole line.', de: 'Ein Schuss durch die ganze Reihe.' },
  },
];
INTEGRANTES.push({
  id: 'felipeles', nome: 'FELIPELES', instrumento: { pt: 'Bateria (antigo)', en: 'Drums (former)', de: 'Schlagzeug (früher)' },
  forca: 1.3, vel: 1.15, alcance: 0.95, especial: 'blast', secreto: 'notaS',
  especialNome: { pt: 'Blast beat', en: 'Blast beat', de: 'Blast Beat' },
  especialTexto: { pt: 'Rajada de baquetadas na frente.', en: 'A burst of stick hits in front.', de: 'Trommelfeuer nach vorne.' },
});
export const integrante = (id: Quem) => INTEGRANTES.find((i) => i.id === id)!;

// ─── Inimigos ─────────────────────────────────────────────

export type TipoInimigo = 'pm' | 'gcm' | 'choque' | 'fantasma' | 'virus' | 'papelao';

export interface FichaInimigo {
  vida: number;
  dano: number;
  /** px/s */
  vel: number;
  alcance: number;
  /** Tempo entre ataques (s). */
  recarga: number;
  /** Aviso antes do golpe (s): o jogador tem esse tempo para sair. */
  preparo: number;
  pontos: number;
}

export const INIMIGOS: Record<TipoInimigo, FichaInimigo> = {
  papelao: { vida: 14, dano: 0, vel: 0, alcance: 0, recarga: 99, preparo: 1, pontos: 20 },
  gcm: { vida: 24, dano: 6, vel: 64, alcance: 30, recarga: 1.4, preparo: 0.42, pontos: 100 },
  pm: { vida: 32, dano: 8, vel: 56, alcance: 36, recarga: 1.5, preparo: 0.46, pontos: 150 },
  choque: { vida: 52, dano: 12, vel: 42, alcance: 34, recarga: 1.9, preparo: 0.6, pontos: 250 },
  fantasma: { vida: 16, dano: 7, vel: 74, alcance: 26, recarga: 1.2, preparo: 0.35, pontos: 80 },
  virus: { vida: 10, dano: 6, vel: 50, alcance: 20, recarga: 0.9, preparo: 0.25, pontos: 60 },
};

// ─── Fases ────────────────────────────────────────────────

export type Cenario = 'ensaio' | 'centro' | 'show' | 'festival' | 'delegacia' | 'pandemia' | 'canteiro';
export type Chefe = 'algoritmo' | 'tecnico' | 'pequenoPoder' | 'virus' | 'mao';
export type TipoQuebravel = 'orelhao' | 'lixeira' | 'banca' | 'amp' | 'cone' | 'caixa';
export type TipoItem = 'coxinha' | 'pastel' | 'caldo' | 'acai' | 'guarana' | 'coco' | 'energetico' | 'cafe' | 'caramelo';

export interface Onda {
  /** Onde a câmera trava (borda esquerda da tela, em px do mundo). */
  x: number;
  inimigos: TipoInimigo[];
}

export interface Fase {
  n: number;
  ano: string;
  nome: Tri;
  cenario: Cenario;
  /** Comprimento do mundo em px. */
  comprimento: number;
  ondas: Onda[];
  quebraveis: { x: number; y: number; tipo: TipoQuebravel; item: TipoItem }[];
  chefe: Chefe | null;
  /** Tempo de referência para a nota (s). */
  par: number;
  fita: boolean;
  arquivo: { titulo: Tri; texto: Tri } | null;
  /** Cartão de abertura: onde e quando. */
  historia: Tri;
  /** Pandemia: ataque à distância com álcool em gel. */
  distancia?: boolean;
  /** O Jota não pode ser escolhido (está na delegacia). */
  semJota?: boolean;
  /** Segunda tela: depois das ondas, a luta com o chefe muda de lugar. */
  segundaTela?: { cenario: Cenario; texto: Tri };
}

export const FASES: Fase[] = [
  {
    n: 0, ano: '2016', nome: { pt: 'Estúdio do Denão', en: "Denão's studio", de: 'Denãos Studio' }, cenario: 'ensaio',
    comprimento: 480, ondas: [{ x: 0, inimigos: ['papelao', 'papelao'] }],
    quebraveis: [{ x: 380, y: 212, tipo: 'amp', item: 'cafe' }], chefe: null, par: 60, fita: false, arquivo: null,
    historia: {
      pt: 'Estúdio do Denão, Ipiranga. 4h da manhã: o único horário que o trabalho deixa.',
      en: "Denão's studio, Ipiranga, São Paulo. 4 a.m.: the only time work allows.",
      de: 'Denãos Studio, Ipiranga, São Paulo. 4 Uhr morgens: die einzige Zeit, die die Arbeit lässt.',
    },
  },
  {
    n: 1, ano: '2016', nome: { pt: 'Centro de SP', en: 'Downtown São Paulo', de: 'Zentrum von São Paulo' }, cenario: 'centro',
    comprimento: 2400,
    ondas: [
      { x: 0, inimigos: ['gcm', 'gcm', 'pm'] },
      { x: 520, inimigos: ['pm', 'gcm', 'pm', 'gcm'] },
      { x: 1040, inimigos: ['pm', 'pm', 'gcm', 'gcm'] },
      { x: 1520, inimigos: ['pm', 'gcm', 'pm', 'gcm', 'pm'] },
    ],
    quebraveis: [
      { x: 430, y: 186, tipo: 'orelhao', item: 'cafe' },
      { x: 980, y: 250, tipo: 'lixeira', item: 'caramelo' },
      { x: 1460, y: 190, tipo: 'banca', item: 'pastel' },
      { x: 1880, y: 240, tipo: 'lixeira', item: 'caldo' },
    ],
    chefe: 'algoritmo', par: 210, fita: true,
    arquivo: {
      titulo: { pt: 'A primeira formação', en: 'The first line-up', de: 'Die erste Besetzung' },
      texto: { pt: 'Foto da primeira formação e uma faixa de 2016.', en: 'A photo of the first line-up and a track from 2016.', de: 'Ein Foto der ersten Besetzung und ein Song von 2016.' },
    },
    historia: {
      pt: 'Centro de São Paulo: Galeria do Rock, Largo do Paissandu. O Algoritmo decide quem aparece.',
      en: 'Downtown São Paulo: Galeria do Rock, Largo do Paissandu. The Algorithm decides who gets seen.',
      de: 'Zentrum von São Paulo: Galeria do Rock, Largo do Paissandu. Der Algorithmus entscheidet, wer gesehen wird.',
    },
  },
  {
    n: 2, ano: '2017', nome: { pt: 'Estrada', en: 'On the road', de: 'Auf Tour' }, cenario: 'show',
    comprimento: 2500,
    ondas: [
      { x: 0, inimigos: ['gcm', 'pm', 'gcm'] },
      { x: 540, inimigos: ['pm', 'pm', 'gcm'] },
      { x: 1080, inimigos: ['choque', 'pm', 'gcm', 'pm'] },
      { x: 1620, inimigos: ['choque', 'pm', 'pm', 'gcm', 'gcm'] },
    ],
    quebraveis: [
      { x: 500, y: 240, tipo: 'caixa', item: 'guarana' },
      { x: 1110, y: 196, tipo: 'amp', item: 'cafe' },
      { x: 1700, y: 246, tipo: 'caixa', item: 'caramelo' },
      { x: 2000, y: 200, tipo: 'amp', item: 'energetico' },
    ],
    chefe: 'tecnico', par: 230, fita: true,
    arquivo: {
      titulo: { pt: 'Bastidor do disco homônimo', en: 'Behind the self-titled record', de: 'Hinter dem Debütalbum' },
      texto: { pt: 'Fotos e histórias da estrada e da gravação de Escombro (2017).', en: 'Photos and stories from the road and from recording Escombro (2017).', de: 'Fotos und Geschichten von der Tour und den Aufnahmen zu Escombro (2017).' },
    },
    historia: {
      pt: 'Estrada. Casa cheia, som atrasado e um técnico de som que não está nem aí.',
      en: "On the road. Packed house, late soundcheck and a sound guy who couldn't care less.",
      de: 'Auf Tour. Volles Haus, später Soundcheck und ein Tontechniker, dem alles egal ist.',
    },
  },
  {
    n: 3, ano: '2019', nome: { pt: 'União Underground Fest', en: 'União Underground Fest', de: 'União Underground Fest' }, cenario: 'festival',
    comprimento: 2300, semJota: true,
    ondas: [
      { x: 0, inimigos: ['pm', 'pm', 'gcm'] },
      { x: 520, inimigos: ['choque', 'pm', 'pm'] },
      { x: 1040, inimigos: ['choque', 'pm', 'choque', 'gcm'] },
      { x: 1500, inimigos: ['choque', 'choque', 'pm', 'pm', 'pm'] },
    ],
    quebraveis: [
      { x: 460, y: 238, tipo: 'caixa', item: 'coco' },
      { x: 1000, y: 194, tipo: 'cone', item: 'caramelo' },
      { x: 1600, y: 244, tipo: 'caixa', item: 'acai' },
    ],
    chefe: 'pequenoPoder', par: 260, fita: true,
    segundaTela: {
      cenario: 'delegacia',
      texto: {
        pt: 'Delegacia. Soltaram o Jota e ele veio junto. "Dê um banquinho pra um segurança e parabéns: você acabou de formar um policial militar."',
        en: 'Police station. Jota is out, and he is coming along. "Give a security guard a little stool and congratulations: you just made a military cop."',
        de: 'Polizeiwache. Jota ist frei und kommt mit. „Gib einem Security einen Hocker, und gratuliere: Du hast einen Militärpolizisten gemacht.“',
      },
    },
    arquivo: {
      titulo: { pt: 'Brasília, 2019', en: 'Brasília, 2019', de: 'Brasília, 2019' },
      texto: { pt: 'O dia em que a polícia levou o Jota no União Underground Fest.', en: 'The day the police took Jota away at União Underground Fest.', de: 'Der Tag, an dem die Polizei Jota beim União Underground Fest mitnahm.' },
    },
    historia: {
      pt: 'União Underground Fest, Brasília, 2019. Primeiro ano de governo de extrema direita. No meio do show, a polícia levou o Jota.',
      en: 'União Underground Fest, Brasília, 2019. First year of a far-right government. Mid-show, the police took Jota away.',
      de: 'União Underground Fest, Brasília, 2019. Erstes Jahr einer rechtsextremen Regierung. Mitten in der Show nahm die Polizei Jota mit.',
    },
  },
  {
    n: 4, ano: '2020', nome: { pt: 'Cicatrizes', en: 'Scars', de: 'Narben' }, cenario: 'pandemia',
    comprimento: 2200, distancia: true,
    ondas: [
      { x: 0, inimigos: ['virus', 'virus', 'virus', 'virus'] },
      { x: 480, inimigos: ['virus', 'virus', 'virus', 'virus', 'virus'] },
      { x: 960, inimigos: ['virus', 'virus', 'virus', 'virus', 'virus', 'virus'] },
      { x: 1400, inimigos: ['virus', 'virus', 'virus', 'virus', 'virus', 'virus', 'virus'] },
    ],
    quebraveis: [
      { x: 420, y: 240, tipo: 'lixeira', item: 'cafe' },
      { x: 1000, y: 192, tipo: 'caixa', item: 'coco' },
      { x: 1550, y: 244, tipo: 'lixeira', item: 'energetico' },
    ],
    chefe: 'virus', par: 220, fita: true,
    arquivo: {
      titulo: { pt: 'Cicatrizes (2020)', en: 'Cicatrizes (2020)', de: 'Cicatrizes (2020)' },
      texto: { pt: 'O lançamento da pandemia, gravado e lançado com a cidade fechada.', en: 'The pandemic release, recorded and put out with the city shut down.', de: 'Die Pandemie-Veröffentlichung, aufgenommen und veröffentlicht im Lockdown.' },
    },
    historia: {
      pt: '2020. Cidade vazia, show pela internet. Máscara no rosto e álcool em gel na mão: não deixe o vírus chegar perto.',
      en: '2020. Empty city, shows streamed online. Mask on, hand sanitizer in hand: keep the virus away.',
      de: '2020. Leere Stadt, Konzerte im Stream. Maske auf, Desinfektionsgel in der Hand: Halt das Virus fern.',
    },
  },
  {
    n: 5, ano: '2026', nome: { pt: 'O Mercado', en: 'The Market', de: 'Der Markt' }, cenario: 'canteiro',
    comprimento: 2600,
    ondas: [
      { x: 0, inimigos: ['pm', 'gcm', 'pm'] },
      { x: 560, inimigos: ['pm', 'pm', 'gcm', 'choque'] },
      { x: 1120, inimigos: ['choque', 'pm', 'gcm', 'pm'] },
      { x: 1680, inimigos: ['choque', 'pm', 'choque', 'gcm', 'pm'] },
    ],
    quebraveis: [
      { x: 470, y: 238, tipo: 'cone', item: 'cafe' },
      { x: 1050, y: 192, tipo: 'caixa', item: 'energetico' },
      { x: 1600, y: 244, tipo: 'cone', item: 'caramelo' },
      { x: 2080, y: 196, tipo: 'caixa', item: 'acai' },
    ],
    chefe: 'mao', par: 240, fita: true,
    arquivo: {
      titulo: { pt: 'O disco novo', en: 'The new record', de: 'Die neue Platte' },
      texto: { pt: 'A fita inteira: o disco novo da Escombro.', en: 'The whole tape: the new Escombro record.', de: 'Das ganze Tape: die neue Escombro-Platte.' },
    },
    historia: {
      pt: 'A Mão Invisível do Mercado e seus fantasmas: escala 6x1, salário mínimo, três horas de busão.',
      en: 'The Invisible Hand of the Market and its ghosts: six-day weeks, minimum wage, three hours on the bus.',
      de: 'Die unsichtbare Hand des Marktes und ihre Geister: Sechstagewoche, Mindestlohn, drei Stunden Bus.',
    },
  },
];

/** Quantos pedaços a fita tem (um por fase de rua). */
export const PEDACOS_DA_FITA = FASES.filter((f) => f.fita).length;

export const ITENS: Record<TipoItem, { vida: number; mosh: number }> = {
  coxinha: { vida: 25, mosh: 0 },
  pastel: { vida: 22, mosh: 0 },
  caldo: { vida: 30, mosh: 0 },
  acai: { vida: 40, mosh: 15 },
  guarana: { vida: 10, mosh: 40 },
  coco: { vida: 28, mosh: 5 },
  cafe: { vida: 18, mosh: 15 },
  energetico: { vida: 30, mosh: 35 },
  caramelo: { vida: 0, mosh: 0 },
};

/** Liberado? Duxxo ao zerar; Felipeles ao tirar S em qualquer fase. */
export function liberado(i: Integrante, p: Progresso): boolean {
  if (!i.secreto) return true;
  if (i.secreto === 'zerar') return p.zerou;
  return !!p.tirouS || Object.values(p.melhores).some((m) => m.nota === 'S');
}

// ─── Combate ──────────────────────────────────────────────

/** Faixa de chão (profundidade) onde dá para andar. */
export const CHAO = { topo: 172, base: 262 };

export interface Corpo { x: number; y: number; z: number; dir: 1 | -1 }

/**
 * O golpe pega? Na frente de quem bate, até `alcance` px, na mesma faixa de
 * profundidade (±14 px) e na mesma altura (pulo alto passa por cima).
 */
export function acerta(atk: Corpo, alvo: Corpo, alcance: number, faixa = 14): boolean {
  const dx = (alvo.x - atk.x) * atk.dir;
  return dx > -6 && dx < alcance && Math.abs(alvo.y - atk.y) <= faixa && Math.abs(alvo.z - atk.z) < 38;
}

/** Dano do golpe `n` do combo (0, 1, 2 = finalizador que derruba). */
export function danoDoGolpe(forca: number, n: number, noAr: boolean): number {
  if (noAr) return Math.round(12 * forca);
  return Math.round((n === 2 ? 13 : 7) * forca);
}

// ─── Combos: soco (S) e chute (C) ─────────────────────────

/** Botão de ataque: soco ou chute. */
export type Entrada = 'S' | 'C';

/**
 * Cada golpe do combo. Os dois primeiros saem do botão apertado; o terceiro
 * (finalizador, derruba) depende da sequência inteira.
 */
export type Golpe = 'jab' | 'direto' | 'chute' | 'joelhada' | 'moinho' | 'giratorio' | 'crowdkill' | 'sidetoside' | 'twostep';

export interface FichaGolpe {
  /** Duração em segundos (antes da velocidade de quem bate). */
  dur: number;
  /** Fração da duração em que o golpe pega. */
  ativo: readonly [number, number];
  /** Alcance extra além do braço (px). */
  alcance: number;
  /** Peso no dano: 1 = jab, 2 = finalizador. */
  peso: number;
  derruba: boolean;
  /** Quantos acertos dentro da janela (moinho, two step...); só o último derruba. */
  hits?: number;
  /** Avanço pra frente durante o golpe (px/s). */
  avanco?: number;
}

export const GOLPES: Record<Golpe, FichaGolpe> = {
  jab: { dur: 0.22, ativo: [0.35, 0.75], alcance: 4, peso: 1, derruba: false },
  direto: { dur: 0.26, ativo: [0.35, 0.75], alcance: 8, peso: 1.1, derruba: false },
  chute: { dur: 0.3, ativo: [0.4, 0.8], alcance: 14, peso: 1.15, derruba: false },
  joelhada: { dur: 0.28, ativo: [0.35, 0.75], alcance: 2, peso: 1.2, derruba: false },
  // Finalizadores, como na roda de verdade (vídeos de referência do Lingão):
  moinho: { dur: 0.62, ativo: [0.15, 0.95], alcance: 12, peso: 2.2, derruba: true, hits: 3, avanco: 30 }, // windmill: dobrado, braços em roda
  giratorio: { dur: 0.46, ativo: [0.62, 0.92], alcance: 18, peso: 1.9, derruba: true },
  crowdkill: { dur: 0.7, ativo: [0.42, 0.95], alcance: 20, peso: 2.3, derruba: true, hits: 2, avanco: 170 }, // arrancada, braçada e chute alto
  sidetoside: { dur: 0.8, ativo: [0.1, 0.95], alcance: 16, peso: 2.3, derruba: true, hits: 4, avanco: 55 }, // vai e vem varrendo, fecha com voadora
  twostep: { dur: 0.7, ativo: [0.08, 0.95], alcance: 10, peso: 2.2, derruba: true, hits: 5, avanco: 95 }, // chutinhos alternados avançando
};

/** Os combos com nome (aparecem na tela e na página de golpes da pausa). */
export const COMBOS: readonly { seq: string; golpe: Golpe; nome: Tri; texto: Tri }[] = [
  { seq: 'SSS', golpe: 'moinho', nome: { pt: 'Moinho', en: 'Windmill', de: 'Windmühle' }, texto: { pt: 'Jab, direto e o moinho: dobrado, os braços girando em roda.', en: 'Jab, cross and the windmill: bent over, arms spinning.', de: 'Jab, Gerade und die Windmühle: gebückt, Arme kreisen.' } },
  { seq: 'CCC', golpe: 'giratorio', nome: { pt: 'Giratório', en: 'Spin kick', de: 'Drehkick' }, texto: { pt: 'Chute, joelhada e chute giratório.', en: 'Kick, knee and spinning kick.', de: 'Kick, Knie und Drehkick.' } },
  { seq: 'SSC', golpe: 'crowdkill', nome: { pt: 'Crowd Kill', en: 'Crowd Kill', de: 'Crowd Kill' }, texto: { pt: 'Dois socos e a arrancada pra cima da galera: braçada e chute alto.', en: 'Two punches, then charge the crowd: haymaker and high kick.', de: 'Zwei Schläge, dann in die Menge: Schwinger und hoher Tritt.' } },
  { seq: 'SCC', golpe: 'sidetoside', nome: { pt: 'Side to Side', en: 'Side to Side', de: 'Side to Side' }, texto: { pt: 'Soco, chute e o vai e vem: base baixa varrendo os braços, fechando com voadora.', en: 'Punch, kick and the side to side: low stance, arms sweeping, then a flying kick.', de: 'Schlag, Tritt und hin und her: tief, Arme fegen, dann Flugkick.' } },
  { seq: 'CCS', golpe: 'twostep', nome: { pt: 'Two Step', en: 'Two Step', de: 'Two Step' }, texto: { pt: 'Dois chutes, soco e o passinho: chutinhos alternados avançando.', en: 'Two kicks, a punch and the two step: quick alternating kicks moving in.', de: 'Zwei Tritte, Schlag und der Two Step: schnelle Wechseltritte nach vorn.' } },
];

/** Golpe que sai de uma sequência (1 a 3 entradas). */
export function golpeDoCombo(seq: string): Golpe {
  const ultima = seq[seq.length - 1] as Entrada;
  if (seq.length === 1) return ultima === 'S' ? 'jab' : 'chute';
  if (seq.length === 2) return ultima === 'S' ? (seq[0] === 'S' ? 'direto' : 'jab') : (seq[0] === 'C' ? 'joelhada' : 'chute');
  const nomeado = COMBOS.find((c) => c.seq === seq);
  if (nomeado) return nomeado.golpe;
  // As misturas sem nome (SCS, CSC, CSS) fecham pelo último botão.
  return ultima === 'S' ? 'moinho' : 'crowdkill';
}

/** Combo com nome dessa sequência de três, se houver. */
export const comboNomeado = (seq: string) => COMBOS.find((c) => c.seq === seq) ?? null;

/** Dano de um golpe do combo, pela força de quem bate. */
export function danoDe(forca: number, g: Golpe): number {
  return Math.round(7 * GOLPES[g].peso * forca);
}

export const MOSH_POR_ACERTO = 6;
export const MOSH_POR_KO = 10;
export const VIDA_JOGADOR = 100;

// ─── Nota da fase ─────────────────────────────────────────

export type Nota = 'S' | 'A' | 'B' | 'C';

/** Nota de 0 a 100: perde por dano sofrido e por demorar, ganha por combo. */
export function pontuacaoDaFase(dano: number, tempo: number, par: number, comboMax: number, continues: number): number {
  const p = 100 - dano * 0.35 - Math.max(0, tempo - par) * 0.4 + Math.min(20, comboMax * 1.5) - continues * 15;
  return Math.max(0, Math.min(100, p));
}

export function nota(dano: number, tempo: number, par: number, comboMax: number, continues = 0): Nota {
  const p = pontuacaoDaFase(dano, tempo, par, comboMax, continues);
  return p >= 88 ? 'S' : p >= 72 ? 'A' : p >= 50 ? 'B' : 'C';
}

export function formatarTempo(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

// ─── Progresso salvo ──────────────────────────────────────

export interface Progresso {
  /** Maior fase liberada (0 = tutorial). */
  liberada: number;
  zerou: boolean;
  quem: Quem;
  melhores: Record<number, { nota: Nota; tempo: number; pontos: number }>;
  arquivo: number[];
  /** Já tirou S alguma vez (libera o Felipeles; sobrevive ao "novo jogo"). */
  tirouS?: boolean;
  /** Melhor medalha de quem zerou (sobrevive ao "novo jogo"). */
  medalha?: Medalha;
}

export type Medalha = 'bronze' | 'prata' | 'ouro';
const ORDEM_MEDALHA: Medalha[] = ['bronze', 'prata', 'ouro'];

/** Medalha pelas notas das fases de rua: ouro com S em todas, prata com A ou melhor, bronze por zerar. */
export function medalhaDe(p: Progresso): Medalha {
  const notas = FASES.filter((f) => f.n > 0).map((f) => p.melhores[f.n]?.nota ?? 'C');
  if (notas.every((n) => n === 'S')) return 'ouro';
  if (notas.every((n) => n === 'S' || n === 'A')) return 'prata';
  return 'bronze';
}
export const melhorMedalha = (a: Medalha | undefined, b: Medalha): Medalha => (a && ORDEM_MEDALHA.indexOf(a) > ORDEM_MEDALHA.indexOf(b) ? a : b);

export const PROGRESSO_INICIAL: Progresso = { liberada: 0, zerou: false, quem: 'igor', melhores: {}, arquivo: [] };

/** Fase concluída: libera a próxima, guarda o melhor resultado e o conteúdo do arquivo. */
export function concluirFase(p: Progresso, n: number, r: { nota: Nota; tempo: number; pontos: number }): Progresso {
  const ultima = FASES.length - 1;
  const antes = p.melhores[n];
  const melhor = !antes || r.pontos > antes.pontos ? r : antes;
  const novo: Progresso = {
    ...p,
    liberada: Math.max(p.liberada, Math.min(ultima, n + 1)),
    zerou: p.zerou || n === ultima,
    tirouS: !!p.tirouS || r.nota === 'S',
    melhores: { ...p.melhores, [n]: melhor },
    arquivo: FASES[n].arquivo && !p.arquivo.includes(n) ? [...p.arquivo, n] : p.arquivo,
  };
  // Zerou (passou da última): ganha a medalha das notas, guardando a melhor de todas as vezes.
  return n === ultima ? { ...novo, medalha: melhorMedalha(p.medalha, medalhaDe(novo)) } : novo;
}

/**
 * Novo jogo: as fases voltam a travar e as notas somem; o arquivo liberado e
 * os integrantes destravados (Duxxo, Felipeles) continuam.
 */
export function novoJogo(p: Progresso): Progresso {
  return {
    ...PROGRESSO_INICIAL,
    quem: p.quem,
    arquivo: [...p.arquivo],
    zerou: p.zerou,
    medalha: p.medalha,
    tirouS: !!p.tirouS || Object.values(p.melhores).some((m) => m.nota === 'S'),
  };
}

export const pedacosDaFita = (p: Progresso) => FASES.filter((f) => f.fita && p.melhores[f.n]).length;
