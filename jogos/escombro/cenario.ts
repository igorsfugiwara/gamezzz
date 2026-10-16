/**
 * Cenários em camadas de parallax, desenhados na resolução interna
 * (480×270, pixel inteiro): céu, longe, meio, chão e frente. Cada camada é
 * um canvas pré-desenhado que se repete na horizontal; clima (garoa,
 * relâmpago, poeira, luz de palco, partícula de vírus) é desenhado por quadro.
 *
 * Os pixos são os da cena: RECUA FASCISTA, ANTIFA, as três setas, NO GODS
 * NO MASTERS… sempre com contorno, para ler mesmo lá no fundo.
 */
import { PALETA as P } from '../compartilhado/paleta';
import type { Cenario } from './regras';

export const LARG = 480;
export const ALT = 270;

export interface Camada { canvas: HTMLCanvasElement; fator: number }
export interface Palco {
  ceu: HTMLCanvasElement;
  /** Céu clareado pelo relâmpago (só na garoa do centro). */
  ceuFlash?: HTMLCanvasElement;
  camadas: Camada[];
  frente: Camada | null;
}

function tela(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  return { c, g };
}

/** Sorteio determinístico (o cenário é sempre o mesmo). */
function semente(n: number) {
  let s = n >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function ret(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cor: string) {
  g.fillStyle = cor;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Faixas de cor com pontilhado entre elas (degradê de SNES, sem borrão). */
function faixas(g: CanvasRenderingContext2D, w: number, y0: number, y1: number, cores: string[]) {
  const n = cores.length;
  const alt = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    ret(g, 0, y0 + i * alt, w, alt + 1, cores[i]);
    if (i < n - 1) {
      const yb = Math.round(y0 + (i + 1) * alt) - 2;
      g.fillStyle = cores[i + 1];
      for (let y = yb; y < yb + 2; y++) for (let x = (y % 2); x < w; x += 2) g.fillRect(x, y, 1, 1);
    }
  }
}

/**
 * Texto em pixel duro: escreve com a fonte num rascunho e copia só os pixels
 * cheios, sem a borda borrada do antialias. `contorno` desenha borda de 1 px.
 */
export function textoPixel(g: CanvasRenderingContext2D, texto: string, x: number, y: number, tam: number, cor: string, fonte = 'bold', inclina = 0, contorno?: string) {
  const { c, g: r } = tela(Math.ceil(texto.length * tam * 0.9 + 8), Math.ceil(tam * 1.6));
  r.font = `${fonte} ${tam}px Impact, 'Arial Black', sans-serif`;
  r.textBaseline = 'top';
  r.fillStyle = '#fff';
  r.fillText(texto, 2, 2);
  const img = r.getImageData(0, 0, c.width, c.height).data;
  const cheio = (i: number, j: number) => i >= 0 && j >= 0 && i < c.width && j < c.height && img[(j * c.width + i) * 4 + 3] > 140;
  if (contorno) {
    g.fillStyle = contorno;
    for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) {
      if (!cheio(i, j) && (cheio(i - 1, j) || cheio(i + 1, j) || cheio(i, j - 1) || cheio(i, j + 1))) g.fillRect(x + i, y + j + Math.round(i * inclina), 1, 1);
    }
  }
  g.fillStyle = cor;
  for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) {
    if (cheio(i, j)) g.fillRect(x + i, y + j + Math.round(i * inclina), 1, 1);
  }
}

/** Pixo com escorrido e contorno preto. */
function pixo(g: CanvasRenderingContext2D, texto: string, x: number, y: number, tam: number, cor: string, rnd: () => number) {
  textoPixel(g, texto, x, y, tam, cor, 'bold', -0.03, P.preto);
  for (let i = 0; i < texto.length; i++) if (texto[i] !== ' ' && rnd() < 0.4) ret(g, x + i * tam * 0.62 + 3, y + tam + 1, 1, 3 + rnd() * 8, cor);
}

/**
 * As três setas antifascistas (Frente de Ferro): três setas paralelas
 * apontando para baixo-esquerda, com a ponta encostando no círculo.
 * Cada pixel é testado em coordenadas giradas: `u` ao longo da seta, `v`
 * de lado.
 */
export function tresSetas(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, cor: string) {
  const aro = Math.max(2, r * 0.13);
  const passo = r * 0.4; // distância entre as setas
  const haste = Math.max(1.2, r * 0.075); // meia largura da haste
  const cabeca = r * 0.2; // meia largura da ponta
  const baseCabeca = r * 0.3, ponta = r * 0.74;
  for (let y = -r - 2; y <= r + 2; y++) for (let x = -r - 2; x <= r + 2; x++) {
    const px = x + 0.5, py = y + 0.5;
    const d = Math.hypot(px, py);
    if (d > r + 1.5) continue;
    if (d > r) { ret(g, cx + x, cy + y, 1, 1, P.preto); continue; } // contorno de fora
    if (d > r - aro) { ret(g, cx + x, cy + y, 1, 1, cor); continue; } // aro
    // Direção da seta: baixo-esquerda (−1, 1)/√2; lado: (1, 1)/√2.
    const u = (-px + py) * Math.SQRT1_2, v = (px + py) * Math.SQRT1_2;
    let dentro = false;
    for (const k of [-1, 0, 1]) {
      const dv = Math.abs(v - k * passo);
      const limite = r - aro - 1.5;
      if (u < baseCabeca && dv <= haste && d < limite) dentro = true; // haste, cortada pelo aro
      if (u >= baseCabeca && u <= ponta && dv <= cabeca * (ponta - u) / (ponta - baseCabeca)) dentro = true; // ponta
    }
    ret(g, cx + x, cy + y, 1, 1, dentro ? cor : P.preto);
  }
}

/** Logo ANTIFA: estrela vermelha de ponta pra cima e ANTIFA em branco, contornado, por cima. */
export function antifa(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ret(g, cx - r - 3, cy - r - 3, r * 2 + 6, r * 2 + 6, P.preto);
  // Estrela de 5 pontas como polígono: pontas externas a partir de −90° (para cima).
  const pts: [number, number][] = [];
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 === 0 ? r : r * 0.4;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  const dentro = (x: number, y: number) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (dentro(x + 0.5, y + 0.5)) ret(g, cx + x, cy + y, 1, 1, P.vermelho);
  textoPixel(g, 'ANTIFA', cx - r - 1, cy - 4, Math.max(9, Math.round(r * 0.62)), P.branco, 'bold', 0, P.preto);
}

const FRASES = [
  'RECUA FASCISTA', 'NO GODS NO MASTERS', 'GOOD NIGHT RIGHT SIDE', 'MORTE AOS SENHORES',
  'REFUGEES WELCOME', 'NO BORDERS', 'HARDCORE POR UM', 'MUNDO MAIS DIGNO',
];
const CORES_PIXO = [P.neon_rosa, P.neon_verde, P.branco, P.amarelo, P.neon_ciano];

/** Muro de 960 px com tijolo, pixos e os dois símbolos. */
function muroDePixo(g: CanvasRenderingContext2D, y0: number, alt: number, rnd: () => number, cor = '#4a4664', desde = 0) {
  ret(g, 0, y0, 960, alt, cor);
  ret(g, 0, y0, 960, 3, '#5c5878');
  for (let j = y0 + 4; j < y0 + alt; j += 6) for (let i = ((j / 6) % 2) * 12; i < 960; i += 24) ret(g, i, j, 1, 5, '#3c3854');
  const lugares = [20, 250, 490, 720];
  lugares.forEach((x, k) => {
    const i = (k * 2 + desde) % FRASES.length;
    pixo(g, FRASES[i], x, y0 + 8 + rnd() * 4, 14, CORES_PIXO[(k + desde) % CORES_PIXO.length], rnd);
    pixo(g, FRASES[(i + 1) % FRASES.length], x + 8, y0 + 30 + rnd() * 4, 12, CORES_PIXO[(k + desde + 2) % CORES_PIXO.length], rnd);
  });
  tresSetas(g, 222, y0 + alt / 2, 14, P.branco);
  antifa(g, 692, y0 + alt / 2 - 2, 13);
}

// ─── Fase 1: centro de SP na garoa (Galeria do Rock, Largo do Paissandu) ───

function centro(): Palco {
  const rnd = semente(2016);
  const { c: ceu, g: gc } = tela(LARG, ALT);
  faixas(gc, LARG, 0, 170, ['#0b0f24', '#101634', '#16203f', '#1d2a4c', '#26375a']);
  const { c: ceuFlash, g: gf } = tela(LARG, ALT);
  faixas(gf, LARG, 0, 170, ['#6a7aa8', '#7f8fbd', '#97a6cf', '#b1bedf', '#cbd5ec']);

  // Longe: prédios do centro e o Copan, com as ondas deitadas.
  const { c: longe, g: gl } = tela(960, ALT);
  for (let x = 0; x < 960;) {
    const w = 26 + rnd() * 30, h = 60 + rnd() * 80;
    ret(gl, x, 160 - h, w, h + 10, rnd() < 0.5 ? '#232946' : '#2a3050');
    for (let j = 166 - h; j < 158; j += 7) for (let i = x + 3; i < x + w - 4; i += 6) if (rnd() < 0.3) ret(gl, i, j, 3, 3, rnd() < 0.7 ? P.amarelo : '#f7e3a1');
    x += w + 2;
  }
  for (let j = 0; j < 90; j += 4) for (let i = 0; i < 120; i++) ret(gl, 400 + i, 70 + j + Math.round(Math.sin(i / 18) * 3), 1, 2, j % 8 ? '#d9d4c7' : '#9c98a8');

  // Meio: Galeria do Rock, Igreja do Rosário (Largo do Paissandu), camelô e muro de pixo.
  const { c: meio, g: gm } = tela(960, ALT);
  muroDePixo(gm, 108, 64, rnd, '#4a4664', 0);
  ret(gm, 300, 20, 160, 152, '#5a6a8a');
  for (let j = 26; j < 160; j += 9) for (let i = 304; i < 456; i += 12) ret(gm, i, j, 9, 6, j < 90 ? '#8fb0d8' : '#3a4a6a');
  ret(gm, 300, 110, 160, 62, '#2b2838');
  ret(gm, 310, 94, 140, 18, P.preto);
  textoPixel(gm, 'GALERIA DO ROCK', 314, 95, 13, P.vermelho, 'bold', 0, P.branco);
  for (let i = 0; i < 5; i++) ret(gm, 312 + i * 28, 126, 20, 46, ['#d6353f', '#f6c443', '#3df0e6', '#ff4fa3', '#b6ff3d'][i]);
  ret(gm, 560, 50, 70, 122, '#e8d9b0'); ret(gm, 580, 20, 30, 34, '#e8d9b0'); ret(gm, 590, 8, 10, 14, '#c99a1c');
  ret(gm, 583, 26, 24, 4, P.chocolate); ret(gm, 585, 110, 20, 62, P.chocolate); ret(gm, 570, 70, 12, 18, '#5aa9e6'); ret(gm, 608, 70, 12, 18, '#5aa9e6');
  ret(gm, 840, 132, 70, 6, P.azul); ret(gm, 842, 138, 2, 34, P.cimento); ret(gm, 906, 138, 2, 34, P.cimento);
  for (let i = 0; i < 6; i++) ret(gm, 848 + i * 10, 150, 8, 8, [P.vermelho, P.amarelo, P.neon_verde][i % 3]);
  for (const px of [232, 488, 948]) {
    ret(gm, px, 50, 4, 122, P.concreto); ret(gm, px - 14, 50, 18, 3, P.concreto); ret(gm, px - 16, 53, 8, 3, P.amarelo);
    gm.fillStyle = 'rgba(246,196,67,0.10)';
    gm.beginPath(); gm.moveTo(px - 14, 56); gm.lineTo(px - 40, 172); gm.lineTo(px + 14, 172); gm.closePath(); gm.fill();
  }
  for (let i = 0; i < 9; i++) ret(gm, 30 + i * 100 + rnd() * 30, 46, 3, 2, P.neblina); // pombos no fio

  const { c: chao, g: gch } = tela(960, ALT);
  ret(gch, 0, 168, 960, 18, '#d9d4c7');
  for (let x = 0; x < 960; x++) for (let y = 168; y < 186; y++) if (Math.sin(x / 8 + Math.sin(y / 3) * 2) > 0.55) ret(gch, x, y, 1, 1, '#2b2838'); // pedra portuguesa
  ret(gch, 0, 184, 960, 4, '#8c88a0');
  ret(gch, 0, 188, 960, 82, '#1e1c2a');
  for (let i = 0; i < 260; i++) ret(gch, rnd() * 960, 190 + rnd() * 78, 1 + rnd() * 3, 1, rnd() < 0.5 ? '#2a2838' : '#15131f');
  for (let x = 30; x < 960; x += 120) ret(gch, x, 226, 40, 3, '#cfcabd');

  const { c: frente, g: gfr } = tela(960, ALT);
  for (let k = 0; k < 4; k++) for (let x = 0; x < 960; x++) ret(gfr, x, 18 + k * 7 + Math.sin(x / 120 + k) * 10 + ((x % 480) - 240) ** 2 / 4000, 1, 1, P.preto);
  ret(gfr, 300, 40, 1, 14, P.preto); ret(gfr, 297, 54, 6, 4, P.branco); ret(gfr, 297, 57, 6, 1, P.vermelho);

  return { ceu, ceuFlash, camadas: [{ canvas: longe, fator: 0.2 }, { canvas: meio, fator: 0.55 }, { canvas: chao, fator: 1 }], frente: { canvas: frente, fator: 1.25 } };
}

// ─── Fase 5: canteiro de demolição (o Mercado) ────────────

function canteiro(): Palco {
  const rnd = semente(2017);
  const { c: ceu, g: gc } = tela(LARG, ALT);
  faixas(gc, LARG, 0, 170, ['#3a1d2e', '#6b2a2e', '#a8442e', '#d9702e', '#f2a24a']);
  ret(gc, 360, 50, 22, 22, '#ffd27a');

  const { c: longe, g: gl } = tela(960, ALT);
  for (let x = 0; x < 960;) {
    const w = 24 + rnd() * 40, h = 50 + rnd() * 70;
    ret(gl, x, 165 - h, w, h, '#4a2a35');
    for (let j = 170 - h; j < 160; j += 9) for (let i = x + 3; i < x + w - 4; i += 8) if (rnd() < 0.2) ret(gl, i, j, 3, 4, '#7a3e3a');
    x += w + rnd() * 10;
  }
  for (const gx of [140, 620]) {
    ret(gl, gx, 30, 3, 135, '#2b1a24'); ret(gl, gx - 50, 30, 120, 3, '#2b1a24');
    for (let i = 0; i < 40; i += 4) ret(gl, gx - 50 + i * 3, 33, 1, 4, '#2b1a24');
  }

  const { c: meio, g: gm } = tela(960, ALT);
  for (let x = 0; x < 960; x += 480) {
    ret(gm, x + 20, 50, 150, 72, '#7a7486');
    for (let j = 56; j < 116; j += 18) for (let i = x + 30; i < x + 160; i += 22) ret(gm, i, j, 12, 10, '#2b2838');
    for (let i = 0; i < 14; i++) ret(gm, x + 20 + rnd() * 150, 42 + rnd() * 8, 1, 10, '#a8693a');
  }
  muroDePixo(gm, 120, 52, rnd, '#7a6a58', 3);
  for (let i = 0; i < 960; i += 12) { ret(gm, i, 120, 6, 4, P.amarelo); ret(gm, i + 6, 120, 6, 4, P.preto); }

  const { c: chao, g: gch } = tela(960, ALT);
  ret(gch, 0, 172, 960, 98, '#6b5240');
  for (let i = 0; i < 500; i++) ret(gch, rnd() * 960, 172 + rnd() * 96, 1 + rnd() * 5, 1 + rnd() * 3, ['#7d6250', '#5a4434', '#8a8496', '#a8a2b4'][Math.floor(rnd() * 4)]);

  const { c: frente, g: gfr } = tela(960, ALT);
  for (let x = 80; x < 960; x += 300) {
    gfr.fillStyle = '#4a3a30';
    gfr.beginPath(); gfr.moveTo(x, 270); gfr.lineTo(x + 30, 248); gfr.lineTo(x + 70, 256); gfr.lineTo(x + 90, 270); gfr.closePath(); gfr.fill();
    for (let i = 0; i < 4; i++) ret(gfr, x + 20 + i * 12, 250 + (i % 2) * 4, 1, 12, '#a8693a');
  }
  return { ceu, camadas: [{ canvas: longe, fator: 0.2 }, { canvas: meio, fator: 0.55 }, { canvas: chao, fator: 1 }], frente: { canvas: frente, fator: 1.25 } };
}

// ─── Fase 2: estrada, show em casa lotada ─────────────────

function show(): Palco {
  const rnd = semente(2018);
  const { c: ceu, g: gc } = tela(LARG, ALT);
  faixas(gc, LARG, 0, 270, ['#0d0b14', '#120f1c', '#17132a']);

  const { c: longe, g: gl } = tela(960, ALT);
  ret(gl, 0, 118, 960, 20, '#2b2838');
  for (let x = 0; x < 960; x += 34) { ret(gl, x + 4, 90, 28, 28, '#1b1726'); ret(gl, x + 6, 92, 24, 24, '#2b2838'); for (let j = 94; j < 114; j += 3) ret(gl, x + 7, j, 22, 1, '#1b1726'); }
  ret(gl, 0, 22, 960, 4, '#4a4657');
  for (let x = 10; x < 960; x += 40) { ret(gl, x, 26, 6, 6, '#6f6b7d'); ret(gl, x + 1, 32, 4, 2, [P.neon_rosa, P.neon_ciano, P.amarelo, P.neon_verde][(x / 40) % 4]); }
  ret(gl, 300, 34, 200, 46, '#d9d4c7'); textoPixel(gl, 'ESCOMBRO', 328, 40, 30, P.preto);
  textoPixel(gl, 'HC · SP', 372, 66, 10, P.vermelho);
  antifa(gl, 120, 60, 16);
  tresSetas(gl, 720, 60, 18, P.branco);

  const { c: meio, g: gm } = tela(960, ALT);
  for (let x = 0; x < 960; x += 9) {
    const h = 22 + rnd() * 14;
    const cor = rnd() < 0.5 ? '#231e33' : '#2a2440';
    gm.fillStyle = cor;
    gm.beginPath(); gm.arc(x + 4, 168 - h, 4, 0, Math.PI * 2); gm.fill();
    ret(gm, x, 168 - h + 3, 9, h, cor);
    if (rnd() < 0.15) ret(gm, x + 6, 168 - h - 12, 2, 10, cor);
  }
  for (let x = 0; x < 960; x += 6) ret(gm, x, 150, 1, 22, '#6f6b7d');
  ret(gm, 0, 150, 960, 2, '#9c98a8');
  pixo(gm, 'NO GODS NO MASTERS', 600, 116, 14, P.neon_verde, rnd);
  pixo(gm, 'RECUA FASCISTA', 90, 114, 15, P.neon_rosa, rnd);

  const { c: chao, g: gch } = tela(960, ALT);
  for (let j = 170; j < 270; j += 12) for (let i = ((j / 12) % 2) * 12; i < 960; i += 24) { ret(gch, i, j, 12, 12, '#2b2838'); ret(gch, i + 12, j, 12, 12, '#231f30'); }
  for (let i = 0; i < 80; i++) ret(gch, rnd() * 960, 172 + rnd() * 96, 2 + rnd() * 3, 1, rnd() < 0.5 ? '#c99a1c' : '#4a4657');

  const { c: frente, g: gfr } = tela(960, ALT);
  for (let x = 0; x < 960; x += 14) {
    if (rnd() < 0.55) continue;
    gfr.fillStyle = '#0d0b14';
    gfr.beginPath(); gfr.arc(x + 7, 268, 9, 0, Math.PI * 2); gfr.fill();
  }
  return { ceu, camadas: [{ canvas: longe, fator: 0.3 }, { canvas: meio, fator: 0.6 }, { canvas: chao, fator: 1 }], frente: { canvas: frente, fator: 1.2 } };
}

// ─── Fase 3a: União Underground Fest, show a céu aberto em Brasília ───

function festival(): Palco {
  const rnd = semente(2019);
  const { c: ceu, g: gc } = tela(LARG, ALT);
  faixas(gc, LARG, 0, 175, ['#2a1a4a', '#4a2a6a', '#8a3a6a', '#d8605a', '#f6a24a', '#ffd27a']); // céu enorme do planalto
  ret(gc, 380, 70, 3, 100, '#3a2440'); ret(gc, 372, 96, 19, 4, '#3a2440'); ret(gc, 376, 60, 11, 12, '#3a2440'); ret(gc, 381, 40, 1, 20, '#3a2440'); // torre de TV

  const { c: longe, g: gl } = tela(960, ALT);
  for (let x = 10; x < 960; x += 70 + rnd() * 50) { // cerrado: árvore torta e ipê
    const h = 20 + rnd() * 20;
    ret(gl, x, 168 - h, 2, h, '#3a2a28');
    gl.fillStyle = rnd() < 0.3 ? P.amarelo : '#4a6a3a';
    gl.beginPath(); gl.ellipse(x + 1, 168 - h, 12, 7, 0, 0, Math.PI * 2); gl.fill();
  }
  ret(gl, 0, 166, 960, 10, '#5a3a2a');

  const { c: meio, g: gm } = tela(960, ALT);
  for (let x = 0; x < 960; x += 480) {
    ret(gm, x + 60, 30, 360, 6, '#6f6b7d');
    for (const px of [60, 414]) { ret(gm, x + px, 30, 6, 120, '#6f6b7d'); for (let j = 34; j < 150; j += 8) ret(gm, x + px + 1, j, 4, 1, '#4a4657'); }
    ret(gm, x + 66, 36, 348, 80, '#1b1726');
    ret(gm, x + 96, 42, 288, 24, P.preto);
    textoPixel(gm, 'UNIÃO UNDERGROUND FEST', x + 104, 44, 14, P.amarelo, 'bold', 0, P.vermelho);
    for (let i = 0; i < 6; i++) { ret(gm, x + 80 + i * 56, 96, 30, 20, '#2b2838'); ret(gm, x + 82 + i * 56, 98, 26, 16, '#4a4657'); }
    ret(gm, x + 66, 116, 348, 14, '#3a2a28');
    tresSetas(gm, x + 34, 90, 14, P.branco);
  }
  for (let x = 0; x < 960; x += 8) { const h = 18 + rnd() * 12; ret(gm, x, 172 - h, 7, h, rnd() < 0.5 ? '#2a1830' : '#33203a'); }
  for (let x = 0; x < 960; x += 6) ret(gm, x, 150, 1, 22, '#9c98a8');
  ret(gm, 0, 150, 960, 2, '#d9d4c7');
  pixo(gm, 'NO BORDERS', 180, 132, 14, P.neon_verde, rnd);
  pixo(gm, 'REFUGEES WELCOME', 640, 130, 14, P.branco, rnd);

  const { c: chao, g: gch } = tela(960, ALT);
  ret(gch, 0, 170, 960, 100, '#8a3a24'); // terra vermelha
  for (let i = 0; i < 420; i++) ret(gch, rnd() * 960, 172 + rnd() * 96, 1 + rnd() * 3, 1, rnd() < 0.5 ? '#a8442e' : '#6a2a1a');
  for (let i = 0; i < 60; i++) { const x = rnd() * 960, y = 176 + rnd() * 90; ret(gch, x, y, 1, 3, P.folha); ret(gch, x + 2, y + 1, 1, 2, P.musgo); }

  const { c: frente, g: gfr } = tela(960, ALT);
  for (let x = 0; x < 960; x += 16) if (rnd() < 0.4) { gfr.fillStyle = '#1a0e14'; gfr.beginPath(); gfr.arc(x + 8, 270, 10, 0, Math.PI * 2); gfr.fill(); }
  return { ceu, camadas: [{ canvas: longe, fator: 0.2 }, { canvas: meio, fator: 0.6 }, { canvas: chao, fator: 1 }], frente: { canvas: frente, fator: 1.2 } };
}

// ─── Fase 3b: a delegacia (uma tela só) ───────────────────

function delegacia(): Palco {
  const rnd = semente(1903);
  const { c: ceu, g } = tela(LARG, ALT);
  ret(g, 0, 0, LARG, 172, '#a8c4a8');
  for (let j = 90; j < 172; j += 8) for (let i = ((j / 8) % 2) * 8; i < LARG; i += 16) { ret(g, i, j, 16, 8, '#c8dcc0'); ret(g, i, j, 16, 1, '#98b098'); } // azulejo verde
  ret(g, 0, 86, LARG, 4, '#6f8a6f');
  ret(g, 340, 30, 60, 4, '#e8e8e8'); ret(g, 340, 34, 60, 1, '#ffffff'); // lâmpada fluorescente
  ret(g, 40, 120, 170, 52, '#6b3f24'); ret(g, 40, 120, 170, 5, '#a8693a'); // balcão
  ret(g, 60, 70, 130, 20, P.preto); textoPixel(g, 'PLANTÃO', 88, 72, 14, P.branco);
  ret(g, 320, 40, 150, 132, '#4a4657'); // cela
  for (let x = 324; x < 470; x += 9) ret(g, x, 40, 3, 132, '#9c98a8');
  ret(g, 320, 40, 150, 4, '#6f6b7d'); ret(g, 320, 100, 150, 3, '#6f6b7d');
  ret(g, 230, 40, 70, 44, '#c99a1c'); for (let i = 0; i < 5; i++) ret(g, 236 + (i % 3) * 20, 46 + Math.floor(i / 3) * 18, 16, 14, P.papel);
  g.fillStyle = P.branco; g.beginPath(); g.arc(160, 40, 10, 0, Math.PI * 2); g.fill(); ret(g, 160, 32, 1, 8, P.preto); ret(g, 160, 40, 6, 1, P.preto);
  ret(g, 220, 150, 80, 6, '#6b3f24'); ret(g, 224, 156, 4, 16, '#4a2a18'); ret(g, 292, 156, 4, 16, '#4a2a18'); // banco
  ret(g, 0, 172, LARG, 98, '#9c98a8'); // granilite
  for (let i = 0; i < 500; i++) ret(g, rnd() * LARG, 172 + rnd() * 98, 1, 1, rnd() < 0.5 ? '#7a7686' : '#b8b4c4');
  return { ceu, camadas: [], frente: null };
}

// ─── Fase 4: pandemia, cidade vazia ───────────────────────

function pandemia(): Palco {
  const rnd = semente(2020);
  const { c: ceu, g: gc } = tela(LARG, ALT);
  faixas(gc, LARG, 0, 170, ['#081018', '#0c1a22', '#10242c', '#163036']);

  const { c: longe, g: gl } = tela(960, ALT);
  for (let x = 0; x < 960;) {
    const w = 30 + rnd() * 40, h = 70 + rnd() * 70;
    ret(gl, x, 165 - h, w, h, '#14222a');
    for (let j = 170 - h; j < 160; j += 8) for (let i = x + 4; i < x + w - 4; i += 7) if (rnd() < 0.08) ret(gl, i, j, 3, 4, '#d9d4a0');
    x += w + 3;
  }
  ret(gl, 600, 60, 90, 8, '#2b3a40'); ret(gl, 612, 50, 14, 10, '#d6353f'); textoPixel(gl, 'AO VIVO', 630, 46, 10, P.vermelho, 'bold', 0, P.preto); // show no telhado

  const { c: meio, g: gm } = tela(960, ALT);
  for (let x = 0; x < 960; x += 120) {
    ret(gm, x, 100, 116, 72, '#3a4650');
    ret(gm, x + 8, 112, 100, 60, '#5a6670');
    for (let j = 114; j < 172; j += 3) ret(gm, x + 8, j, 100, 1, '#4a5660'); // porta de enrolar
    textoPixel(gm, 'FECHADO', x + 26, 140, 12, P.vermelho, 'bold', 0, P.branco);
  }
  for (const x of [80, 440, 800]) { ret(gm, x, 104, 34, 44, P.papel); ret(gm, x + 3, 108, 28, 24, '#2b2838'); textoPixel(gm, 'CICATRIZES', x - 2, 134, 8, P.preto); } // lambe do lançamento
  pixo(gm, 'VACINA JÁ', 200, 100, 14, P.neon_verde, rnd);
  pixo(gm, 'HARDCORE POR UM MUNDO MAIS DIGNO', 500, 82, 12, P.amarelo, rnd);
  tresSetas(gm, 380, 90, 13, P.branco);

  const { c: chao, g: gch } = tela(960, ALT);
  ret(gch, 0, 172, 960, 98, '#1c2428');
  for (let i = 0; i < 200; i++) ret(gch, rnd() * 960, 174 + rnd() * 94, 1 + rnd() * 3, 1, '#28343a');
  for (let i = 0; i < 6; i++) { const x = rnd() * 940, y = 190 + rnd() * 70; ret(gch, x, y, 7, 4, P.pastel_azul); ret(gch, x - 2, y + 1, 2, 1, P.branco); } // máscara largada

  return { ceu, camadas: [{ canvas: longe, fator: 0.2 }, { canvas: meio, fator: 0.55 }, { canvas: chao, fator: 1 }], frente: null };
}

// ─── Fase 0: estúdio do Denão, Ipiranga, 4h da manhã ──────

function ensaio(): Palco {
  const rnd = semente(1);
  const { c: ceu, g } = tela(LARG, ALT);
  ret(g, 0, 0, LARG, 170, '#2b2838');
  for (let j = 10; j < 160; j += 8) for (let i = ((j / 8) % 2) * 8; i < LARG; i += 16) { ret(g, i, j, 8, 8, '#353148'); ret(g, i + 2, j + 2, 4, 4, '#3d3852'); } // espuma caixa de ovo
  ret(g, 16, 12, 214, 22, P.preto); textoPixel(g, 'ESTÚDIO DO DENÃO · IPIRANGA', 22, 15, 11, P.amarelo);
  ret(g, 408, 12, 58, 24, P.preto); textoPixel(g, '04:00', 414, 14, 15, P.vermelho);
  ret(g, 250, 14, 60, 40, '#0b0f24'); ret(g, 279, 14, 2, 40, '#4a4657'); ret(g, 250, 33, 60, 2, '#4a4657'); ret(g, 262, 20, 2, 2, P.amarelo); // ainda é noite
  for (const [x, cor] of [[40, P.vermelho], [130, P.amarelo]] as const) { ret(g, x, 46, 44, 54, '#d9d4c7'); ret(g, x + 4, 50, 36, 26, cor); textoPixel(g, 'HC', x + 10, 80, 14, P.preto); }
  antifa(g, 400, 76, 16);
  ret(g, 220, 90, 120, 80, '#1b1726'); // bateria ao fundo
  for (const [x, r] of [[240, 16], [280, 22], [320, 16]] as const) { g.fillStyle = '#4a4657'; g.beginPath(); g.arc(x, 140, r, 0, Math.PI * 2); g.fill(); g.fillStyle = P.papel; g.beginPath(); g.arc(x, 140, r - 3, 0, Math.PI * 2); g.fill(); }
  ret(g, 200, 96, 60, 2, P.amarelo); ret(g, 300, 92, 60, 2, P.amarelo);
  ret(g, 0, 168, LARG, 102, '#6b3f24');
  for (let j = 170; j < 270; j += 10) ret(g, 0, j, LARG, 1, '#5a331d');
  ret(g, 120, 190, 240, 60, '#8a1f36'); for (let i = 124; i < 356; i += 8) ret(g, i, 194, 4, 52, '#a8263f');
  for (let i = 0; i < 30; i++) ret(g, rnd() * LARG, 172 + rnd() * 90, 3, 1, '#4a2a18');
  return { ceu, camadas: [], frente: null };
}

export function montarPalco(c: Cenario): Palco {
  switch (c) {
    case 'centro': return centro();
    case 'canteiro': return canteiro();
    case 'show': return show();
    case 'festival': return festival();
    case 'delegacia': return delegacia();
    case 'pandemia': return pandemia();
    default: return ensaio();
  }
}

/** Desenha céu e camadas de fundo. */
export function desenharFundo(g: CanvasRenderingContext2D, p: Palco, camX: number, flash: number) {
  g.drawImage(flash > 0 && p.ceuFlash ? p.ceuFlash : p.ceu, 0, 0);
  for (const cam of p.camadas) desenharCamada(g, cam, camX);
}

export function desenharCamada(g: CanvasRenderingContext2D, cam: Camada, camX: number) {
  const w = cam.canvas.width;
  let x = -Math.round(camX * cam.fator) % w;
  if (x > 0) x -= w;
  for (; x < LARG; x += w) g.drawImage(cam.canvas, x, 0);
}

/** Clima por quadro: garoa no centro, poeira no canteiro, luz nos shows, partículas na pandemia. */
export function desenharClima(g: CanvasRenderingContext2D, c: Cenario, t: number, frente: boolean) {
  if (c === 'centro') {
    g.fillStyle = frente ? 'rgba(200,215,255,0.55)' : 'rgba(160,180,230,0.3)';
    const n = frente ? 60 : 90;
    for (let i = 0; i < n; i++) {
      const x = ((i * 97 + t * (frente ? 260 : 170)) % (LARG + 40)) - 20;
      const y = ((i * 53 + t * (frente ? 520 : 340)) % ALT);
      g.fillRect(Math.round(x), Math.round(y), 1, frente ? 6 : 4);
      g.fillRect(Math.round(x) - 1, Math.round(y) + (frente ? 6 : 4), 1, 2);
    }
  } else if (c === 'canteiro' && frente) {
    g.fillStyle = 'rgba(217,180,120,0.35)';
    for (let i = 0; i < 40; i++) g.fillRect(Math.round((i * 131 + t * 30) % LARG), Math.round((i * 71 + Math.sin(t + i) * 20) % ALT), 2, 1);
  } else if ((c === 'show' || c === 'festival') && !frente) {
    for (let k = 0; k < 3; k++) {
      const x = LARG / 2 + Math.sin(t * 0.8 + k * 2.1) * 200;
      g.fillStyle = ['rgba(255,79,163,0.10)', 'rgba(61,240,230,0.09)', 'rgba(246,196,67,0.08)'][k];
      g.beginPath(); g.moveTo(80 + k * 160, 28); g.lineTo(x - 30, 270); g.lineTo(x + 30, 270); g.closePath(); g.fill();
    }
  } else if (c === 'pandemia' && frente) {
    g.fillStyle = 'rgba(182,255,61,0.35)';
    for (let i = 0; i < 30; i++) g.fillRect(Math.round((i * 151 + t * 14) % LARG), Math.round((i * 89 + Math.sin(t * 0.7 + i) * 30) % ALT), 2, 2);
  }
}
