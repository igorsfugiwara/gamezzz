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
