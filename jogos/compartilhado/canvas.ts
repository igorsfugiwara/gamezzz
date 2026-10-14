/**
 * Ponte entre as grades de pixel (boneco.ts, dado puro) e o canvas, com
 * cache: o mesmo boneco vira canvas uma vez só.
 */
import type { Grade } from './boneco';

export function gradeParaCanvas(g: Grade): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = g.w;
  c.height = g.h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(g.w, g.h);
  for (let i = 0; i < g.cor.length; i++) {
    const cor = g.cor[i];
    if (!cor) continue;
    img.data[i * 4] = parseInt(cor.slice(1, 3), 16);
    img.data[i * 4 + 1] = parseInt(cor.slice(3, 5), 16);
    img.data[i * 4 + 2] = parseInt(cor.slice(5, 7), 16);
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

const cache = new Map<string, HTMLCanvasElement>();

/** Canvas em cache pela chave; `fazer` só roda na primeira vez. */
export function emCache(chave: string, fazer: () => Grade): HTMLCanvasElement {
  let c = cache.get(chave);
  if (!c) {
    c = gradeParaCanvas(fazer());
    cache.set(chave, c);
  }
  return c;
}

export function limparCache(prefixo: string) {
  for (const k of cache.keys()) if (k.startsWith(prefixo)) cache.delete(k);
}

/**
 * Scale2x (EPX) num canvas inteiro: usado em cenário estático (fundo do
 * palco, paisagens), desenhado uma vez na resolução base e ampliado.
 */
export function ampliarCanvas(origem: HTMLCanvasElement): HTMLCanvasElement {
  const w = origem.width, h = origem.height;
  const src = new Uint32Array(origem.getContext('2d')!.getImageData(0, 0, w, h).data.buffer);
  const destino = document.createElement('canvas');
  destino.width = w * 2;
  destino.height = h * 2;
  const ctx = destino.getContext('2d')!;
  const img = ctx.createImageData(w * 2, h * 2);
  const dst = new Uint32Array(img.data.buffer);
  const em = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P0 = src[y * w + x];
    const A = em(x, y - 1), B = em(x + 1, y), C = em(x - 1, y), D = em(x, y + 1);
    let e1 = P0, e2 = P0, e3 = P0, e4 = P0;
    if (C === A && C !== D && A !== B) e1 = A;
    if (A === B && A !== C && B !== D) e2 = B;
    if (D === C && D !== B && C !== A) e3 = C;
    if (B === D && B !== A && D !== C) e4 = D;
    const i = y * 2 * w * 2 + x * 2;
    dst[i] = e1; dst[i + 1] = e2; dst[i + w * 2] = e3; dst[i + w * 2 + 1] = e4;
  }
  ctx.putImageData(img, 0, 0);
  return destino;
}

/** Desenha um sprite HD (2×) em coordenadas da resolução base. */
export function desenharHD(ctx: CanvasRenderingContext2D, s: HTMLCanvasElement, x: number, y: number) {
  ctx.drawImage(s, Math.round(x * 2) / 2, Math.round(y * 2) / 2, s.width / 2, s.height / 2);
}
