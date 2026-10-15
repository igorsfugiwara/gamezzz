/**
 * Regras e dados do ESCOMBRO: A FITA, sem DOM: integrantes, inimigos, fases,
 * acerto de golpe e nota da fase. O main.ts só desenha e lê os controles.
 */
import type { Tri } from './i18n';

// ─── Integrantes ──────────────────────────────────────────

export type Quem = 'igor' | 'pucci' | 'renato' | 'vocal' | 'duxxo';
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
  secreto?: boolean;
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
    id: 'renato', nome: 'RENATO', instrumento: { pt: 'Guitarra', en: 'Guitar', de: 'Gitarre' },
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
    forca: 1.05, vel: 1.05, alcance: 1.05, especial: 'microfonia', secreto: true,
    especialNome: { pt: 'Microfonia', en: 'Feedback', de: 'Rückkopplung' },
    especialTexto: { pt: 'Projétil que atravessa a fila.', en: 'A shot that pierces the whole line.', de: 'Ein Schuss durch die ganze Reihe.' },
  },
];
export const integrante = (id: Quem) => INTEGRANTES.find((i) => i.id === id)!;

// ─── Inimigos ─────────────────────────────────────────────

export type TipoInimigo = 'pm' | 'gcm' | 'choque' | 'fantasma' | 'papelao';

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
};

// ─── Fases ────────────────────────────────────────────────

export type Cenario = 'ensaio' | 'garoa' | 'canteiro' | 'show';
export type Chefe = 'pato' | 'mao' | 'tecnico';
export type TipoQuebravel = 'orelhao' | 'lixeira' | 'banca' | 'amp' | 'cone' | 'caixa';
export type TipoItem = 'cafe' | 'energetico' | 'caramelo';

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
}

export const FASES: Fase[] = [
  {
    n: 0, ano: '2016', nome: { pt: 'Sala de ensaio', en: 'Rehearsal room', de: 'Proberaum' }, cenario: 'ensaio',
    comprimento: 480, ondas: [{ x: 0, inimigos: ['papelao', 'papelao'] }],
    quebraveis: [{ x: 380, y: 212, tipo: 'amp', item: 'cafe' }], chefe: null, par: 60, fita: false, arquivo: null,
  },
  {
    n: 1, ano: '2016', nome: { pt: 'O Começo', en: 'The Beginning', de: 'Der Anfang' }, cenario: 'garoa',
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
      { x: 1460, y: 190, tipo: 'banca', item: 'cafe' },
      { x: 1880, y: 240, tipo: 'lixeira', item: 'energetico' },
    ],
    chefe: 'pato', par: 210, fita: true,
    arquivo: {
      titulo: { pt: 'A primeira formação', en: 'The first line-up', de: 'Die erste Besetzung' },
      texto: { pt: 'Foto da primeira formação e uma faixa de 2016.', en: 'A photo of the first line-up and a track from 2016.', de: 'Ein Foto der ersten Besetzung und ein Song von 2016.' },
    },
  },
  {
    n: 2, ano: '2017', nome: { pt: 'Escombro', en: 'Rubble', de: 'Trümmer' }, cenario: 'canteiro',
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
      { x: 2080, y: 196, tipo: 'caixa', item: 'energetico' },
    ],
    chefe: 'mao', par: 240, fita: true,
    arquivo: {
      titulo: { pt: 'Bastidor do disco homônimo', en: 'Behind the self-titled record', de: 'Hinter dem Debütalbum' },
      texto: { pt: 'Fotos e histórias da gravação de Escombro (2017).', en: 'Photos and stories from recording Escombro (2017).', de: 'Fotos und Geschichten von den Aufnahmen zu Escombro (2017).' },
    },
  },
  {
    n: 3, ano: '2018', nome: { pt: 'Palco Dividido', en: 'Split Stage', de: 'Geteilte Bühne' }, cenario: 'show',
    comprimento: 2500,
    ondas: [
      { x: 0, inimigos: ['gcm', 'pm', 'gcm'] },
      { x: 540, inimigos: ['choque', 'pm', 'gcm'] },
      { x: 1080, inimigos: ['choque', 'pm', 'choque', 'gcm'] },
      { x: 1620, inimigos: ['choque', 'choque', 'pm', 'pm', 'gcm'] },
    ],
    quebraveis: [
      { x: 500, y: 240, tipo: 'caixa', item: 'energetico' },
      { x: 1110, y: 196, tipo: 'amp', item: 'cafe' },
      { x: 1700, y: 246, tipo: 'caixa', item: 'caramelo' },
      { x: 2000, y: 200, tipo: 'amp', item: 'energetico' },
    ],
    chefe: 'tecnico', par: 240, fita: true,
    arquivo: {
      titulo: { pt: 'Flyers de show', en: 'Show flyers', de: 'Konzertflyer' },
      texto: { pt: 'Flyers reais dos shows de 2018.', en: 'Real flyers from the 2018 shows.', de: 'Echte Flyer der Shows von 2018.' },
    },
  },
];

export const ITENS: Record<TipoItem, { vida: number; mosh: number }> = {
  cafe: { vida: 22, mosh: 10 },
  energetico: { vida: 38, mosh: 35 },
  caramelo: { vida: 0, mosh: 0 },
};

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
}

export const PROGRESSO_INICIAL: Progresso = { liberada: 0, zerou: false, quem: 'igor', melhores: {}, arquivo: [] };

/** Fase concluída: libera a próxima, guarda o melhor resultado e o conteúdo do arquivo. */
export function concluirFase(p: Progresso, n: number, r: { nota: Nota; tempo: number; pontos: number }): Progresso {
  const ultima = FASES.length - 1;
  const antes = p.melhores[n];
  const melhor = !antes || r.pontos > antes.pontos ? r : antes;
  return {
    ...p,
    liberada: Math.max(p.liberada, Math.min(ultima, n + 1)),
    zerou: p.zerou || n === ultima,
    melhores: { ...p.melhores, [n]: melhor },
    arquivo: FASES[n].arquivo && !p.arquivo.includes(n) ? [...p.arquivo, n] : p.arquivo,
  };
}

export const pedacosDaFita = (p: Progresso) => FASES.filter((f) => f.fita && p.melhores[f.n]).length;
