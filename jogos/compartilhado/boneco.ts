/**
 * Bonecos em pixel art com traço de desenho animado de metal: cabeça
 * alongada, olho fundo, cabelão escorrido, bota pesada, três tons de sombra
 * (luz vindo da esquerda) e contorno preto grosso em volta de tudo.
 *
 * Tudo aqui é dado puro (grade de cores), sem DOM: dá para testar, exportar
 * para as miniaturas e só no fim virar canvas (`gradeParaCanvas`).
 */
import { PALETA as P } from './paleta';

export type Cor = string | null;
/** [luz, base, sombra] */
export type Tom = readonly [string, string, string];

export interface Grade { w: number; h: number; cor: Cor[] }

export const TONS = {
  pele: {
    clara: [P.caramelo_claro, P.pessego, P.caramelo],
    morena: [P.pessego, P.caramelo, P.ruga],
    parda: [P.caramelo, P.ruga, P.chocolate],
    escura: [P.ruga, P.chocolate, P.noite],
  },
  cabelo: {
    preto: [P.concreto, P.asfalto, P.noite],
    castanho: [P.ruga, P.chocolate, P.noite],
    loiro: [P.amarelo, P.mostarda, P.ruga],
    ruivo: [P.laranja, P.vermelho, P.vinho],
    rosa: [P.pastel_rosa, P.neon_rosa, P.vinho],
    grisalho: [P.branco, P.neblina, P.cimento],
    verde: [P.neon_verde, P.folha, P.musgo],
  },
  roupa: {
    preta: [P.concreto, P.asfalto, P.noite],
    vinho: [P.vermelho, P.vinho, P.noite],
    marinho: [P.azul, P.marinho, P.noite],
    musgo: [P.folha, P.musgo, P.noite],
    cinza: [P.neblina, P.cimento, P.concreto],
    vermelha: [P.laranja, P.vermelho, P.vinho],
    branca: [P.branco, P.papel, P.neblina],
    laranja: [P.pessego, P.laranja, P.vermelho],
    amarela: [P.amarelo, P.mostarda, P.ruga],
  },
  calca: {
    jeans: [P.ceu, P.azul, P.marinho],
    preta: [P.concreto, P.asfalto, P.noite],
    cinza: [P.neblina, P.cimento, P.concreto],
  },
} as const satisfies Record<string, Record<string, Tom>>;

export type Estilo = 'cabelao' | 'moicano' | 'careca' | 'bone' | 'lenco' | 'capacete' | 'coque';
export type Pose = 'parado' | 'chifres' | 'maos' | 'microfone' | 'baqueta';

export interface Boneco {
  pele: Tom;
  cabelo: Tom;
  roupa: Tom;
  calca: Tom;
  estilo: Estilo;
  /** Cor do boné, lenço ou capacete. */
  cobertura?: Tom;
  /** Jaqueta de couro com tachas por cima da roupa. */
  jaqueta?: boolean;
  /** Logo de banda no peito. */
  estampa?: boolean;
  barba?: boolean;
  avental?: boolean;
  /** Baú/mochila térmica nas costas (motoboy, o Vocal). */
  bau?: Tom;
  /** Ombro largo (segurança). */
  largo?: boolean;
  oculos?: boolean;
  gravata?: string;
  pose?: Pose;
  /** 1 = quadro do headbang: cabeça desce e o cabelo cai na cara. */
  quadro?: 0 | 1;
  grito?: boolean;
  tonto?: boolean;
  /** Desenha por cima antes do contorno (instrumentos). */
  extra?: (g: Grade) => void;
}

export const BONECO_L = 28;
export const BONECO_A = 59;

// ─── Grade ────────────────────────────────────────────────

export function novaGrade(w: number, h: number): Grade {
  return { w, h, cor: new Array<Cor>(w * h).fill(null) };
}

export function px(g: Grade, x: number, y: number, cor: Cor) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= g.w || y >= g.h) return;
  g.cor[y * g.w + x] = cor;
}

export function ret(g: Grade, x: number, y: number, w: number, h: number, cor: Cor) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(g, x + i, y + j, cor);
}

export function ler(g: Grade, x: number, y: number): Cor {
  if (x < 0 || y < 0 || x >= g.w || y >= g.h) return null;
  return g.cor[y * g.w + x];
}

/** Contorno de 1 px por fora de tudo que não é transparente. */
export function contornar(g: Grade, cor: string = P.preto): Grade {
  const out = { ...g, cor: g.cor.slice() };
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (ler(g, x, y)) continue;
    if (ler(g, x - 1, y) || ler(g, x + 1, y) || ler(g, x, y - 1) || ler(g, x, y + 1)) out.cor[y * g.w + x] = cor;
  }
  return out;
}

export function espelhar(g: Grade): Grade {
  const out = novaGrade(g.w, g.h);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) out.cor[y * g.w + (g.w - 1 - x)] = g.cor[y * g.w + x];
  return out;
}

/** Arte em texto (uma letra por cor) para grade. */
export function deTexto(arte: readonly string[], cores: Record<string, string>): Grade {
  const g = novaGrade(Math.max(...arte.map((l) => l.length)), arte.length);
  arte.forEach((linha, y) => { for (let x = 0; x < linha.length; x++) px(g, x, y, cores[linha[x]] ?? null); });
  return g;
}

/**
 * Amplia `k`× uma arte simples e dá acabamento: luz na borda de
 * cima/esquerda, sombra embaixo/direita e contorno preto. Deixa cenário
 * antigo na mesma densidade de pixel dos bonecos.
 */
export function refinar(g: Grade, k = 2): Grade {
  const out = novaGrade(g.w * k + 2, g.h * k + 2);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const c = ler(g, x, y);
    if (!c) continue;
    const topo = !ler(g, x, y - 1), esq = !ler(g, x - 1, y), base = !ler(g, x, y + 1), dir = !ler(g, x + 1, y);
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) {
      let cor = c;
      if ((topo && j === 0) || (esq && i === 0)) cor = clarear(c);
      if ((base && j === k - 1) || (dir && i === k - 1)) cor = escurecer(c);
      px(out, 1 + x * k + i, 1 + y * k + j, cor);
    }
  }
  return contornar(out);
}

/** Tom mais claro/escuro dentro da paleta (para `refinar`). */
const ESCADA: string[][] = [
  [P.branco, P.papel, P.neblina, P.cimento, P.concreto, P.asfalto, P.noite, P.preto],
  [P.caramelo_claro, P.caramelo, P.ruga, P.chocolate],
  [P.amarelo, P.mostarda, P.ruga],
  [P.pessego, P.laranja, P.vermelho, P.vinho],
  [P.menta, P.folha, P.musgo],
  [P.pastel_azul, P.ceu, P.azul, P.marinho],
  [P.pastel_rosa, P.neon_rosa, P.vinho],
  [P.neon_ciano, P.ceu],
  [P.neon_verde, P.folha],
  [P.neon_roxo, P.marinho],
  [P.pastel_creme, P.papel],
  [P.pastel_verde, P.menta],
];
function vizinhoNaEscada(c: string, passo: number): string {
  for (const e of ESCADA) {
    const i = e.indexOf(c);
    if (i >= 0) return e[Math.max(0, Math.min(e.length - 1, i + passo))];
  }
  return c;
}
export const clarear = (c: string) => vizinhoNaEscada(c, -1);
export const escurecer = (c: string) => vizinhoNaEscada(c, 1);

// ─── O boneco ─────────────────────────────────────────────

const OY = 4; // folga em cima para mão erguida e moicano

/** Rosto 10×13: L luz, B base, S sombra, K preto (sobrancelha, olho, boca). */
const ROSTO = [
  '.LBBBBBSS.',
  'LLBBBBBSSS',
  'LBKKBBSKKS',
  'LSSKKSKKSS',
  'LSKKSSSKKS',
  'LBSSBSSSSS',
  'LBBBBSSBSS',
  'LLBBBSSSSS',
  'LBBSKKSSSS',
  '.LBBBBBSS.',
  '.LKKKKKKS.',
  '..LBBBSS..',
  '...SBBS...',
]
const GRITO = ['.LKKKKKKS.', '.LKVVVVKS.', '..LKKKKS..'];
/** Caveira da estampa (8×5). */
const CAVEIRA = ['..WWWW..', '.WWWWWW.', '.WKWWKW.', '..WWWW..', '..W.W.W.'];

/** Boneco de frente, 28×59: magrelo, pernudo, cabeça comprida, pés no fundo. */
export function boneco(b: Boneco): Grade {
  const g = novaGrade(BONECO_L, BONECO_A);
  const p = (x: number, y: number, c: Cor) => px(g, x, y + OY, c);
  const r = (x: number, y: number, w: number, h: number, c: Cor) => ret(g, x, y + OY, w, h, c);
  /** Volume: luz na esquerda, base no meio, sombra na direita. */
  const vol = (x: number, y: number, w: number, h: number, [l, m, s]: Tom, luz = 1, sombra = 1) => {
    r(x, y, w, h, m);
    r(x, y, luz, h, l);
    r(x + w - sombra, y, sombra, h, s);
  };
  const [pl, pb, ps] = b.pele;
  const [hl, hb, hs] = b.cabelo;
  const [rl, rb, rs] = b.roupa;
  const calca = b.calca;
  const bang = b.quadro === 1 ? 2 : 0;
  const pose = b.pose ?? 'parado';
  const ox = b.largo ? 2 : 0;

  // Baú / mochila térmica atrás do ombro.
  if (b.bau) {
    const [bl, bb, bs] = b.bau;
    vol(17, 17, 9, 17, b.bau, 1, 2);
    r(17, 17, 9, 1, bl); r(17, 21, 9, 1, bs);
    r(20, 25, 4, 3, bl); p(21, 26, bb); p(22, 26, bs);
  }

  // ── Botas: cano, cadarço, biqueira, solado grosso.
  for (const x0 of [8, 14]) {
    vol(x0, 47, 6, 5, [P.asfalto, P.noite, P.preto], 1, 1);
    p(x0 + 1, 47, P.concreto); p(x0 + 1, 50, P.concreto); p(x0 + 2, 51, P.concreto);
    p(x0 + 3, 48, P.neblina); p(x0 + 2, 49, P.neblina); p(x0 + 3, 50, P.cimento);
    r(x0 - (x0 === 8 ? 1 : 0), 52, 7, 2, P.preto);
    r(x0 - (x0 === 8 ? 1 : 0), 52, 7, 1, P.noite);
  }
  // ── Pernas: jeans com costura, rasgo no joelho.
  vol(9, 36, 4, 11, calca, 1, 1); vol(15, 36, 4, 11, calca, 1, 1);
  r(9, 36, 10, 2, calca[1]); r(9, 36, 1, 2, calca[0]);
  r(11, 38, 1, 9, calca[2]); r(17, 38, 1, 9, calca[2]); // costura
  r(10, 41, 2, 1, P.papel); p(10, 42, pb); // rasgo
  p(16, 44, calca[2]); p(15, 40, calca[0]);

  // ── Tronco.
  const t0 = 8 - ox, tw = 12 + ox * 2;
  vol(t0, 19, tw, 15, b.roupa, 1, 3);
  r(t0 + 1, 19, tw - 4, 1, rl);
  r(12, 19, 4, 1, rs); p(12, 20, rs); p(15, 20, rs); // gola
  p(t0 + 3, 30, rs); p(t0 + 4, 31, rs); p(t0 + tw - 5, 29, rs); p(t0 + tw - 6, 32, rs); // dobras
  if (b.gravata) {
    r(12, 19, 4, 5, P.branco); p(12, 19, P.papel);
    r(13, 20, 2, 11, b.gravata); p(14, 20, escurecer(b.gravata)); r(13, 31, 2, 1, escurecer(b.gravata));
  }
  if (b.estampa) {
    CAVEIRA.forEach((l, j) => { for (let i = 0; i < 8; i++) if (l[i] !== '.') p(10 + i, 22 + j, l[i] === 'W' ? P.papel : rb); });
    p(16, 23, P.neblina); p(16, 25, P.neblina);
  }
  if (b.jaqueta) {
    vol(t0, 19, 3, 15, [P.concreto, P.asfalto, P.noite]); vol(t0 + tw - 3, 19, 3, 15, [P.asfalto, P.noite, P.preto]);
    r(t0 + 2, 19, 1, 6, P.cimento); r(t0 + tw - 3, 19, 1, 6, P.asfalto); // lapela
    for (const y of [22, 25, 28, 31]) { p(t0 + 1, y, P.neblina); p(t0 + tw - 2, y, P.cimento); }
  }
  if (b.avental) {
    vol(10, 23, 8, 11, [P.branco, P.papel, P.neblina]);
    r(10, 19, 1, 4, P.papel); r(17, 19, 1, 4, P.neblina); // alças
    p(12, 26, P.vermelho); p(13, 27, P.vermelho); p(15, 29, P.vinho); // molho
  }
  // ── Cinto com tachas e fivela.
  r(t0, 34, tw, 2, P.preto);
  for (let x = t0 + 1; x < t0 + tw; x += 2) p(x, 34, P.cimento);
  r(13, 34, 2, 2, P.mostarda); p(13, 34, P.amarelo);

  // ── Braços (3 px), com mão desenhada.
  const be = 5 - ox, bd = 20 + ox;
  const manga = b.jaqueta ? 13 : 6;
  const tomBraco = (escuro: boolean): Tom => (escuro ? [pb, ps, ps] : [pl, pb, ps]);
  const tomManga = (escuro: boolean): Tom => (b.jaqueta ? [P.asfalto, P.noite, P.preto] : escuro ? [rb, rs, rs] : [rl, rb, rs]);
  const bracoBaixo = (x: number, escuro: boolean) => {
    vol(x, 20, 3, manga, tomManga(escuro));
    vol(x, 20 + manga, 3, 13 - manga, tomBraco(escuro));
    vol(x, 33, 3, 3, tomBraco(escuro)); p(x + 1, 35, ps); // mão fechada
    p(x, 33, pl);
  };
  const bracoErguido = (x: number, escuro: boolean, chifre: boolean) => {
    vol(x, 17, 3, 5, tomManga(escuro));
    vol(x, 8, 3, 9, tomBraco(escuro));
    vol(x, 5, 3, 3, tomBraco(escuro));
    if (chifre) { r(x, 2, 1, 3, pl); r(x + 2, 2, 1, 3, escuro ? ps : pb); p(x + 1, 5, ps); } // chifres: indicador e mindinho
    else r(x, 3, 3, 2, pl);
  };
  if (pose === 'maos') { bracoErguido(be, false, true); bracoErguido(bd, true, true); }
  else if (pose === 'chifres') { bracoBaixo(be, false); bracoErguido(bd, true, true); }
  else if (pose === 'microfone') {
    bracoBaixo(bd, true);
    vol(be, 20, 3, 6, tomManga(false));
  } else if (pose === 'baqueta') {
    bracoErguido(be, false, false); bracoErguido(bd, true, false);
    for (let i = 0; i < 5; i++) { p(be + 1 + i, 2 - i, P.amarelo); p(bd + 1 - i, 2 - i, P.mostarda); }
  } else { bracoBaixo(be, false); bracoBaixo(bd, true); }

  // ── Pescoço e cabeça.
  const hy = 4 + bang;
  vol(12, hy + 12, 4, 3, [pb, ps, ps]);
  const tons: Record<string, string> = { L: pl, B: pb, S: ps, K: P.preto, V: P.vinho };
  ROSTO.forEach((l, j) => { for (let i = 0; i < 10; i++) { const c = tons[l[i]]; if (c) p(9 + i, hy + j, c); } });
  if (b.grito) GRITO.forEach((l, j) => { for (let i = 0; i < 10; i++) { const c = tons[l[i]]; if (c) p(9 + i, hy + 9 + j, c); } });
  if (b.tonto) { r(11, hy + 4, 2, 1, P.amarelo); r(16, hy + 4, 2, 1, P.amarelo); }
  if (b.barba) {
    r(9, hy + 7, 10, 4, hb); r(10, hy + 11, 8, 2, hb); r(12, hy + 13, 4, 3, hs);
    r(9, hy + 7, 1, 4, hl); p(11, hy + 9, hl); p(14, hy + 12, hl);
    r(12, hy + 9, 4, 1, P.preto); r(13, hy + 10, 2, 1, P.vinho);
  }
  if (b.oculos) {
    r(9, hy + 3, 10, 1, P.preto); r(10, hy + 3, 3, 3, P.preto); r(15, hy + 3, 3, 3, P.preto);
    p(10, hy + 3, P.cimento); p(15, hy + 3, P.cimento); p(19, hy + 4, P.neblina);
  }

  // ── Cabelo e cobertura.
  const est = b.estilo;
  if (est === 'cabelao' || est === 'bone') {
    r(10, hy - 4, 8, 1, hb);
    r(8, hy - 3, 12, 3, hb);
    r(6, hy, 4, 22, hb); r(18, hy, 4, 22, hs);
    r(9, hy, 1, 11, hb); r(18, hy, 1, 11, hb);
    r(7, hy + 22, 3, 3, hb); r(18, hy + 22, 3, 3, hs);
    // Mechas: fios de luz à esquerda, sombra à direita.
    r(7, hy - 1, 1, 23, hl); r(9, hy - 2, 1, 6, hl); r(11, hy - 3, 1, 2, hl);
    r(20, hy, 1, 22, P.preto); r(19, hy + 2, 1, 18, hb); r(8, hy + 4, 1, 16, hs);
    r(13, hy - 4, 2, 3, hs); // risca do meio
    // Pontas desfiadas.
    p(6, hy + 22, hb); p(7, hy + 25, hb); p(9, hy + 24, hs); p(19, hy + 25, hs); p(21, hy + 22, hs); p(20, hy + 24, P.preto);
    if (bang) {
      // Headbang: o cabelo despenca na cara.
      r(9, hy, 10, 14, hb); r(10, hy + 14, 8, 4, hs);
      for (const x of [10, 13, 16]) r(x, hy + 1, 1, 15, hl);
      for (const x of [12, 15]) r(x, hy + 3, 1, 14, hs);
    } else {
      r(9, hy, 2, 2, hb); r(17, hy, 2, 2, hs); // franja nos cantos
    }
  }
  if (est === 'bone') {
    const c = b.cobertura ?? TONS.roupa.vermelha;
    vol(8, hy - 5, 12, 5, c, 2, 2);
    r(13, hy - 5, 1, 5, c[2]); p(11, hy - 3, P.branco); p(12, hy - 3, P.branco);
    r(4, hy, 15, 2, c[2]); r(4, hy, 15, 1, c[1]); // aba
  } else if (est === 'moicano') {
    r(10, hy - 1, 8, 2, ps); for (let x = 10; x < 18; x += 2) p(x, hy - 1, pb); // raspado
    const alturas = [3, 6, 8, 6, 4];
    alturas.forEach((h, i) => { r(12 + i, hy - h, 1, h, i < 2 ? hl : i === 2 ? hb : hs); });
    p(14, hy - 8, hl); p(12, hy - 3, hb);
  } else if (est === 'careca') {
    r(10, hy - 2, 8, 2, pb); r(11, hy - 2, 2, 1, pl); p(17, hy - 1, ps); p(10, hy - 1, pl);
    r(9, hy + 2, 1, 4, hs); r(18, hy + 2, 1, 4, hs); // costeleta
  } else if (est === 'coque') {
    vol(8, hy - 3, 12, 4, b.cabelo, 2, 2);
    vol(12, hy - 7, 4, 4, b.cabelo); p(13, hy - 7, hl);
    r(8, hy + 1, 2, 4, hb); r(18, hy + 1, 2, 4, hs);
  } else if (est === 'lenco') {
    const c = b.cobertura ?? TONS.roupa.vermelha;
    vol(7, hy - 4, 14, 7, c, 2, 2);
    for (const [x, y] of [[9, -3], [13, -2], [17, -3], [11, 0], [15, 1], [19, 0]]) p(x, hy + y, P.branco);
    vol(21, hy - 1, 3, 3, c); r(22, hy + 2, 2, 3, c[2]); // nó
  } else if (est === 'capacete') {
    const c = b.cobertura ?? TONS.roupa.vermelha;
    vol(7, hy - 4, 14, 12, c, 2, 2);
    r(9, hy + 2, 10, 4, P.marinho); r(9, hy + 2, 10, 2, P.neon_ciano); r(10, hy + 2, 3, 1, P.branco); // viseira
    r(9, hy + 8, 1, 4, P.preto); r(18, hy + 8, 1, 4, P.preto); // jugular
    r(10, hy - 4, 4, 1, c[0]);
  }
  if (pose === 'microfone') {
    // Mão e microfone por cima do cabelo, na frente da boca.
    vol(be + 1, 15 + bang, 3, 6, tomBraco(false));
    vol(be + 3, 13 + bang, 3, 3, tomBraco(false));
    r(be + 4, 10 + bang, 3, 3, P.neblina); p(be + 4, 10 + bang, P.branco); p(be + 6, 12 + bang, P.cimento); p(be + 5, 11 + bang, P.cimento);
    r(be + 5, 16 + bang, 1, 4, P.preto); // cabo
  }
  if (b.tonto) { p(6, 0, P.amarelo); p(7, 1, P.amarelo); p(21, 1, P.amarelo); p(14, 0, P.branco); }

  b.extra?.(g);
  return contornar(g);
}

/** Variação de povo a partir de uma semente (determinístico). */
export function bonecoDoPovo(semente: number, tipo: 'povo' | 'motoboy' | 'tia' = 'povo', extra: Partial<Boneco> = {}): Boneco {
  let s = (semente * 2654435761 + 0x9e3779b9) >>> 0;
  // mulberry32: sementes vizinhas dão bonecos bem diferentes.
  const r = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
  const de = <T>(l: readonly T[]) => l[Math.floor(r() * l.length)];
  const peles = Object.values(TONS.pele);
  const cabelos = [TONS.cabelo.preto, TONS.cabelo.preto, TONS.cabelo.castanho, TONS.cabelo.castanho, TONS.cabelo.loiro, TONS.cabelo.ruivo, TONS.cabelo.grisalho, TONS.cabelo.rosa];
  const roupas = [TONS.roupa.preta, TONS.roupa.preta, TONS.roupa.preta, TONS.roupa.vinho, TONS.roupa.marinho, TONS.roupa.musgo, TONS.roupa.cinza, TONS.roupa.vermelha];
  const calcas = [TONS.calca.jeans, TONS.calca.jeans, TONS.calca.preta, TONS.calca.cinza];
  const base: Boneco = {
    pele: de(peles), cabelo: de(cabelos), roupa: de(roupas), calca: de(calcas),
    estilo: de(['cabelao', 'cabelao', 'cabelao', 'moicano', 'careca', 'bone', 'coque'] as const),
  };
  if (base.estilo === 'moicano') base.cabelo = de([TONS.cabelo.verde, TONS.cabelo.rosa, TONS.cabelo.ruivo]);
  if (base.estilo === 'careca') base.barba = r() < 0.7;
  if (base.estilo === 'bone') base.cobertura = de([TONS.roupa.vermelha, TONS.roupa.marinho, TONS.roupa.amarela, TONS.roupa.preta]);
  base.jaqueta = r() < 0.25;
  base.estampa = !base.jaqueta && base.roupa === TONS.roupa.preta && r() < 0.8;
  if (tipo === 'motoboy') {
    Object.assign(base, { estilo: 'capacete', cobertura: de([TONS.roupa.vermelha, TONS.roupa.preta, TONS.roupa.amarela]), bau: TONS.roupa.musgo, jaqueta: false, roupa: TONS.roupa.preta, estampa: false });
  } else if (tipo === 'tia') {
    Object.assign(base, { estilo: 'lenco', cobertura: de([TONS.cabelo.rosa, TONS.roupa.amarela, TONS.roupa.musgo, TONS.roupa.laranja]), avental: true, jaqueta: false, estampa: false, barba: false, roupa: de([TONS.roupa.vinho, TONS.roupa.marinho, TONS.roupa.laranja]) });
  }
  return { ...base, ...extra };
}
