/**
 * Cenários em camadas de parallax, desenhados na resolução interna
 * (480×270, pixel inteiro): céu, longe, meio, chão e frente. Cada camada é
 * um canvas pré-desenhado que se repete na horizontal; clima (garoa,
 * relâmpago, poeira, luz de palco) é desenhado por quadro.
 */
import { PALETA as P } from '../compartilhado/paleta';
import type { Cenario } from './regras';

export const LARG = 480;
export const ALT = 270;

export interface Camada { canvas: HTMLCanvasElement; fator: number }
export interface Palco {
  ceu: HTMLCanvasElement;
  /** Céu clareado pelo relâmpago (só na garoa). */
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
 * cheios, sem a borda borrada do antialias.
 */
export function textoPixel(g: CanvasRenderingContext2D, texto: string, x: number, y: number, tam: number, cor: string, fonte = 'bold', inclina = 0) {
  const { c, g: r } = tela(Math.ceil(texto.length * tam * 0.9 + 8), Math.ceil(tam * 1.6));
  r.font = `${fonte} ${tam}px Impact, 'Arial Black', sans-serif`;
  r.textBaseline = 'top';
  r.fillStyle = '#fff';
  r.fillText(texto, 2, 2);
  const img = r.getImageData(0, 0, c.width, c.height).data;
  g.fillStyle = cor;
  for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) {
    if (img[(j * c.width + i) * 4 + 3] > 140) g.fillRect(x + i, y + j + Math.round(i * inclina), 1, 1);
  }
}

/** Pixo com escorrido. */
function pixo(g: CanvasRenderingContext2D, texto: string, x: number, y: number, tam: number, cor: string, rnd: () => number) {
  textoPixel(g, texto, x + 1, y + 1, tam, P.preto, 'bold', -0.04);
  textoPixel(g, texto, x, y, tam, cor, 'bold', -0.04);
  for (let i = 0; i < texto.length; i++) if (rnd() < 0.45) ret(g, x + i * tam * 0.6 + 3, y + tam, 1, 3 + rnd() * 8, cor);
}

// ─── Fase 1: periferia de SP na garoa ─────────────────────

function garoa(): Palco {
  const rnd = semente(2016);
  const { c: ceu, g: gc } = tela(LARG, ALT);
  faixas(gc, LARG, 0, 170, ['#0b0f24', '#101634', '#16203f', '#1d2a4c', '#26375a']);
  const { c: ceuFlash, g: gf } = tela(LARG, ALT);
  faixas(gf, LARG, 0, 170, ['#6a7aa8', '#7f8fbd', '#97a6cf', '#b1bedf', '#cbd5ec']);

  // Longe: morro de lajes com caixa d'água azul, janelas acesas e antenas.
  const { c: longe, g: gl } = tela(960, ALT);
  for (let x = 0; x < 960;) {
    const w = 18 + rnd() * 26;
    const h = 30 + rnd() * 50 + Math.sin(x / 140) * 18;
    const topo = 160 - h;
    ret(gl, x, topo, w, h + 20, rnd() < 0.5 ? '#1f2440' : '#252a49');
    ret(gl, x, topo, w, 2, '#2f3557');
    for (let j = topo + 6; j < 160; j += 8) for (let i = x + 3; i < x + w - 4; i += 7) if (rnd() < 0.25) ret(gl, i, j, 3, 3, rnd() < 0.7 ? P.amarelo : '#f7e3a1');
    if (rnd() < 0.6) { ret(gl, x + 3, topo - 7, 8, 7, '#2f5fbf'); ret(gl, x + 3, topo - 7, 8, 1, P.ceu); } // caixa d'água
    if (rnd() < 0.5) for (let i = 0; i < 3; i++) ret(gl, x + w - 4 - i * 3, topo - 5 - rnd() * 4, 1, 6, P.concreto); // vergalhão
    if (rnd() < 0.3) { ret(gl, x + w / 2, topo - 14, 1, 14, P.cimento); ret(gl, x + w / 2 - 4, topo - 12, 9, 1, P.cimento); } // antena
    x += w;
  }

  // Meio: muro com pixo, bar com mesa de plástico vermelha, poste de luz amarela.
  const { c: meio, g: gm } = tela(960, ALT);
  const frases = ['NÃO PASSARÃO', 'FORA FASCISTAS', 'NINGUÉM SOLTA A MÃO DE NINGUÉM', 'ESCOMBRO HC', 'LUTE'];
  for (let x = 0; x < 960; x += 240) {
    ret(gm, x, 108, 240, 64, '#3a3550');
    ret(gm, x, 108, 240, 3, '#4a4664');
    for (let j = 112; j < 172; j += 6) for (let i = x + ((j / 6) % 2) * 12; i < x + 240; i += 24) ret(gm, i, j, 1, 5, '#332f48'); // tijolo
  }
  for (let x = 0; x < 960; x += 240) {
    pixo(gm, frases[(x / 240) % frases.length], x + 12 + rnd() * 30, 122 + rnd() * 16, frases[(x / 240) % frases.length].length > 14 ? 11 : 15,
      [P.neon_rosa, P.neon_verde, P.branco, P.amarelo][(x / 240) % 4], rnd);
  }
  // Bar: porta de enrolar, luz, mesa e cadeira vermelhas.
  ret(gm, 600, 96, 90, 76, '#2b2838'); ret(gm, 604, 112, 82, 60, '#5a5468');
  for (let j = 114; j < 172; j += 3) ret(gm, 604, j, 82, 1, '#4a4657');
  ret(gm, 596, 92, 98, 14, P.vermelho); textoPixel(gm, 'BAR DO ZÉ', 612, 92, 11, P.amarelo);
  ret(gm, 612, 158, 22, 3, P.vermelho); ret(gm, 614, 161, 2, 11, P.vinho); ret(gm, 630, 161, 2, 11, P.vinho);
  ret(gm, 640, 150, 10, 3, P.vermelho); ret(gm, 640, 150, 2, 22, P.vinho);
  // Poste com luz.
  for (const px of [228, 468, 948]) {
    ret(gm, px, 50, 4, 122, P.concreto); ret(gm, px - 14, 50, 18, 3, P.concreto); ret(gm, px - 16, 53, 8, 3, P.amarelo);
    gm.fillStyle = 'rgba(246,196,67,0.10)';
    gm.beginPath(); gm.moveTo(px - 14, 56); gm.lineTo(px - 40, 172); gm.lineTo(px + 14, 172); gm.closePath(); gm.fill();
  }

  // Chão: calçada com meio-fio e asfalto molhado com reflexo.
  const { c: chao, g: gch } = tela(960, ALT);
  ret(gch, 0, 168, 960, 18, '#5a5668');
  for (let x = 0; x < 960; x += 16) ret(gch, x, 168, 1, 18, '#4a4657');
  ret(gch, 0, 184, 960, 4, '#8c88a0');
  ret(gch, 0, 188, 960, 82, '#1e1c2a');
  for (let i = 0; i < 260; i++) ret(gch, rnd() * 960, 190 + rnd() * 78, 1 + rnd() * 3, 1, rnd() < 0.5 ? '#2a2838' : '#15131f');
  for (let x = 30; x < 960; x += 120) ret(gch, x, 226, 40, 3, '#cfcabd'); // faixa
  for (const px of [120, 420, 780]) for (let j = 0; j < 30; j += 3) ret(gch, px - 3 + Math.sin(j) * 2, 192 + j * 2, 6, 1, 'rgba(246,196,67,0.35)'); // reflexo do poste

  // Frente: fios embolados e um tênis pendurado.
  const { c: frente, g: gfr } = tela(960, ALT);
  gfr.strokeStyle = P.preto;
  gfr.lineWidth = 1;
  for (let k = 0; k < 4; k++) {
    for (let x = 0; x < 960; x++) {
      const y = 18 + k * 7 + Math.sin(x / 120 + k) * 10 + ((x % 480) - 240) ** 2 / 4000;
      ret(gfr, x, y, 1, 1, P.preto);
    }
  }
  ret(gfr, 300, 40, 1, 14, P.preto); ret(gfr, 297, 54, 6, 4, P.branco); ret(gfr, 297, 57, 6, 1, P.vermelho);

  return {
    ceu, ceuFlash,
    camadas: [{ canvas: longe, fator: 0.2 }, { canvas: meio, fator: 0.55 }, { canvas: chao, fator: 1 }],
    frente: { canvas: frente, fator: 1.25 },
  };
}

// ─── Fase 2: canteiro de demolição ────────────────────────

function canteiro(): Palco {
  const rnd = semente(2017);
  const { c: ceu, g: gc } = tela(LARG, ALT);
  faixas(gc, LARG, 0, 170, ['#3a1d2e', '#6b2a2e', '#a8442e', '#d9702e', '#f2a24a']); // céu laranja de queimada
  ret(gc, 360, 50, 22, 22, '#ffd27a'); // sol vermelho no fumaceiro

  const { c: longe, g: gl } = tela(960, ALT);
  for (let x = 0; x < 960;) {
    const w = 24 + rnd() * 40;
    const h = 50 + rnd() * 70;
    ret(gl, x, 165 - h, w, h, '#4a2a35');
    for (let j = 170 - h; j < 160; j += 9) for (let i = x + 3; i < x + w - 4; i += 8) if (rnd() < 0.2) ret(gl, i, j, 3, 4, '#7a3e3a');
    x += w + rnd() * 10;
  }
  for (const gx of [140, 620]) { // guindastes
    ret(gl, gx, 30, 3, 135, '#2b1a24'); ret(gl, gx - 50, 30, 120, 3, '#2b1a24');
    for (let i = 0; i < 40; i += 4) ret(gl, gx - 50 + i * 3, 33, 1, 4, '#2b1a24');
    ret(gl, gx + 50, 33, 1, 30, '#2b1a24');
  }

  const { c: meio, g: gm } = tela(960, ALT);
  for (let x = 0; x < 960; x += 320) {
    // Prédio meio demolido com vergalhão exposto.
    ret(gm, x + 20, 60, 140, 112, '#7a7486');
    for (let j = 66; j < 160; j += 18) for (let i = x + 30; i < x + 150; i += 22) ret(gm, i, j, 12, 10, '#2b2838');
    for (let i = 0; i < 14; i++) { const vx = x + 20 + rnd() * 140; ret(gm, vx, 52 + rnd() * 8, 1, 10, '#a8693a'); }
    gm.fillStyle = '#3a3550';
    gm.beginPath(); gm.moveTo(x + 100, 60); gm.lineTo(x + 160, 60); gm.lineTo(x + 160, 120); gm.closePath(); gm.fill();
    // Tapume com listra de obra e pixo.
    ret(gm, x + 170, 128, 150, 44, '#c8c2b0');
    for (let i = x + 170; i < x + 320; i += 12) { ret(gm, i, 128, 6, 6, P.amarelo); ret(gm, i + 6, 128, 6, 6, P.preto); }
    pixo(gm, ['ESCOMBRO', 'REFORMA = ROUBO', 'NÃO PASSARÃO'][(x / 320) % 3], x + 180, 140, 14, [P.vermelho, P.preto, '#2f5fbf'][(x / 320) % 3], rnd);
  }

  const { c: chao, g: gch } = tela(960, ALT);
  ret(gch, 0, 168, 960, 102, '#6b5240');
  for (let i = 0; i < 500; i++) {
    const cor = ['#7d6250', '#5a4434', '#8a8496', '#a8a2b4'][Math.floor(rnd() * 4)];
    ret(gch, rnd() * 960, 168 + rnd() * 100, 1 + rnd() * 5, 1 + rnd() * 3, cor);
  }
  for (let i = 0; i < 6; i++) { const px = rnd() * 900; ret(gch, px, 200 + rnd() * 60, 30, 4, '#3a4a6a'); ret(gch, px + 4, 200, 10, 1, '#6a7a9a'); } // poça

  const { c: frente, g: gfr } = tela(960, ALT);
  for (let x = 80; x < 960; x += 300) { // monte de entulho na frente
    gfr.fillStyle = '#4a3a30';
    gfr.beginPath(); gfr.moveTo(x, 270); gfr.lineTo(x + 30, 248); gfr.lineTo(x + 70, 256); gfr.lineTo(x + 90, 270); gfr.closePath(); gfr.fill();
    for (let i = 0; i < 4; i++) ret(gfr, x + 20 + i * 12, 250 + (i % 2) * 4, 1, 12, '#a8693a');
  }

  return { ceu, camadas: [{ canvas: longe, fator: 0.2 }, { canvas: meio, fator: 0.55 }, { canvas: chao, fator: 1 }], frente: { canvas: frente, fator: 1.25 } };
}

// ─── Fase 3: casa de show lotada ──────────────────────────

function show(): Palco {
  const rnd = semente(2018);
  const { c: ceu, g: gc } = tela(LARG, ALT);
  faixas(gc, LARG, 0, 270, ['#0d0b14', '#120f1c', '#17132a']);

  const { c: longe, g: gl } = tela(960, ALT);
  // Palco ao fundo: amplificadores, treliça de luz, bandeirão.
  ret(gl, 0, 118, 960, 20, '#2b2838');
  for (let x = 0; x < 960; x += 34) { ret(gl, x + 4, 90, 28, 28, '#1b1726'); ret(gl, x + 6, 92, 24, 24, '#2b2838'); for (let j = 94; j < 114; j += 3) ret(gl, x + 7, j, 22, 1, '#1b1726'); }
  ret(gl, 0, 22, 960, 4, '#4a4657');
  for (let x = 10; x < 960; x += 40) { ret(gl, x, 26, 6, 6, '#6f6b7d'); ret(gl, x + 1, 32, 4, 2, [P.neon_rosa, P.neon_ciano, P.amarelo, P.neon_verde][(x / 40) % 4]); }
  ret(gl, 300, 34, 200, 46, '#d9d4c7'); textoPixel(gl, 'ESCOMBRO', 328, 40, 30, P.preto);
  textoPixel(gl, 'HC · SP', 372, 66, 10, P.vermelho);

  const { c: meio, g: gm } = tela(960, ALT);
  // Público ao fundo (silhuetas) e grade.
  for (let x = 0; x < 960; x += 9) {
    const h = 22 + rnd() * 14;
    gm.fillStyle = rnd() < 0.5 ? '#231e33' : '#2a2440';
    gm.beginPath(); gm.arc(x + 4, 168 - h, 4, 0, Math.PI * 2); gm.fill();
    ret(gm, x, 168 - h + 3, 9, h, gm.fillStyle as string);
    if (rnd() < 0.15) ret(gm, x + 6, 168 - h - 12, 2, 10, gm.fillStyle as string); // braço pro alto
  }
  for (let x = 0; x < 960; x += 6) ret(gm, x, 150, 1, 22, '#6f6b7d');
  ret(gm, 0, 150, 960, 2, '#9c98a8');
  pixo(gm, 'SEM RODA NÃO É SHOW', 620, 120, 12, P.neon_verde, rnd);
  pixo(gm, 'FORA FASCISTAS', 100, 118, 13, P.neon_rosa, rnd);

  const { c: chao, g: gch } = tela(960, ALT);
  for (let j = 170; j < 270; j += 12) for (let i = ((j / 12) % 2) * 12; i < 960; i += 24) { ret(gch, i, j, 12, 12, '#2b2838'); ret(gch, i + 12, j, 12, 12, '#231f30'); }
  for (let i = 0; i < 80; i++) ret(gch, rnd() * 960, 172 + rnd() * 96, 2 + rnd() * 3, 1, rnd() < 0.5 ? '#c99a1c' : '#4a4657'); // cerveja e papel

  const { c: frente, g: gfr } = tela(960, ALT);
  for (let x = 0; x < 960; x += 14) { // cabeças na frente da tela
    if (rnd() < 0.55) continue;
    gfr.fillStyle = '#0d0b14';
    gfr.beginPath(); gfr.arc(x + 7, 268, 9, 0, Math.PI * 2); gfr.fill();
  }

  return { ceu, camadas: [{ canvas: longe, fator: 0.3 }, { canvas: meio, fator: 0.6 }, { canvas: chao, fator: 1 }], frente: { canvas: frente, fator: 1.2 } };
}

// ─── Fase 0: sala de ensaio ───────────────────────────────

function ensaio(): Palco {
  const rnd = semente(1);
  const { c: ceu, g } = tela(LARG, ALT);
  ret(g, 0, 0, LARG, 170, '#2b2838');
  for (let j = 10; j < 160; j += 8) for (let i = ((j / 8) % 2) * 8; i < LARG; i += 16) { ret(g, i, j, 8, 8, '#353148'); ret(g, i + 2, j + 2, 4, 4, '#3d3852'); } // espuma caixa de ovo
  for (const [x, cor] of [[40, P.vermelho], [130, P.amarelo], [380, P.neon_verde]] as const) { ret(g, x, 40, 44, 60, '#d9d4c7'); ret(g, x + 4, 44, 36, 30, cor); textoPixel(g, 'HC', x + 10, 78, 14, P.preto); }
  ret(g, 220, 90, 120, 80, '#1b1726'); // bateria ao fundo
  for (const [x, r] of [[240, 16], [280, 22], [320, 16]] as const) { g.fillStyle = '#4a4657'; g.beginPath(); g.arc(x, 140, r, 0, Math.PI * 2); g.fill(); g.fillStyle = P.papel; g.beginPath(); g.arc(x, 140, r - 3, 0, Math.PI * 2); g.fill(); }
  ret(g, 200, 96, 60, 2, P.amarelo); ret(g, 300, 92, 60, 2, P.amarelo); // pratos
  ret(g, 0, 168, LARG, 102, '#6b3f24');
  for (let j = 170; j < 270; j += 10) ret(g, 0, j, LARG, 1, '#5a331d');
  ret(g, 120, 190, 240, 60, '#8a1f36'); for (let i = 124; i < 356; i += 8) ret(g, i, 194, 4, 52, '#a8263f'); // tapete
  for (let i = 0; i < 30; i++) ret(g, rnd() * LARG, 172 + rnd() * 90, 3, 1, '#4a2a18');
  return { ceu, camadas: [], frente: null };
}

export function montarPalco(c: Cenario): Palco {
  return c === 'garoa' ? garoa() : c === 'canteiro' ? canteiro() : c === 'show' ? show() : ensaio();
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

/** Clima por quadro: garoa com gotas inclinadas, poeira no canteiro, fumaça e luz no show. */
export function desenharClima(g: CanvasRenderingContext2D, c: Cenario, t: number, frente: boolean) {
  if (c === 'garoa') {
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
  } else if (c === 'show' && !frente) {
    // Canhões de luz varrendo.
    for (let k = 0; k < 3; k++) {
      const x = LARG / 2 + Math.sin(t * 0.8 + k * 2.1) * 200;
      g.fillStyle = ['rgba(255,79,163,0.10)', 'rgba(61,240,230,0.09)', 'rgba(246,196,67,0.08)'][k];
      g.beginPath(); g.moveTo(80 + k * 160, 28); g.lineTo(x - 30, 270); g.lineTo(x + 30, 270); g.closePath(); g.fill();
    }
  }
}
