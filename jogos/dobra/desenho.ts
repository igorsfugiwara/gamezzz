/**
 * Desenho do tabuleiro do Dobra no canvas: papel pastel, vincos, peças em
 * pixel art e o Shar Pei. Separado do main para o editor reaproveitar.
 */
import type { Estado, Peca } from './motor';
import { desenharSharPei, type Pose } from '../compartilhado/sharpei';
import { PALETA } from '../compartilhado/paleta';

export const COR = {
  papel: '#fbf3df',
  papelSombra: '#efe2c2',
  grade: '#e4d5b0',
  vinco: '#c9a26b',
  vincoBrilho: '#ff4fa3',
  borda: '#d8c49a',
};

/** Peça em pixel art, desenhada numa grade 8×8 dentro da casa. */
const SPRITES: Record<Peca, { cores: Record<string, string>; arte: string[] }> = {
  parede: {
    cores: { a: PALETA.chocolate, b: PALETA.ruga, c: PALETA.caramelo },
    arte: ['aaaaaaaa', 'abbbabbb', 'abbbabbb', 'aaaaaaaa', 'bbabbbab', 'bbabbbab', 'aaaaaaaa', 'cccccccc'],
  },
  almofada: {
    cores: { a: '#e88aa3', b: PALETA.pastel_rosa, c: '#c96582' },
    arte: ['........', '.abbbba.', 'abbbbbba', 'abbccbba', 'abbccbba', 'abbbbbba', '.abbbba.', '........'],
  },
  petisco: {
    cores: { a: PALETA.ruga, b: PALETA.caramelo_claro, c: PALETA.chocolate },
    arte: ['........', '..aaaa..', '.abbbba.', 'abcbbcba', 'abbbbbba', 'abbcbbba', '.abbbba.', '..aaaa..'],
  },
  osso: {
    cores: { a: PALETA.neblina, b: PALETA.branco },
    arte: ['........', 'bb....bb', 'bbb..bbb', '.bbbbbb.', '.bbbbbb.', 'bbb..bbb', 'bb....bb', '........'],
  },
  poca: {
    cores: { a: PALETA.ceu, b: PALETA.pastel_azul, c: PALETA.azul },
    arte: ['........', '..aaaa..', '.abbbaa.', 'aabbaaba', 'aaaaaaca', '.aacaaa.', '..aaaa..', '........'],
  },
  gato: {
    cores: { a: PALETA.cimento, b: PALETA.neblina, c: PALETA.preto, d: PALETA.amarelo },
    arte: ['a.....a.', 'aa...aa.', 'aaaaaaa.', 'adcadca.', 'aaabaaa.', '.aaaaa.a', '.aaaaa.a', '.a.a.aa.'],
  },
};

export function desenharPeca(ctx: CanvasRenderingContext2D, peca: Peca, x: number, y: number, tam: number): void {
  const s = SPRITES[peca];
  const px = tam / 8;
  s.arte.forEach((linha, r) => {
    for (let c = 0; c < 8; c++) {
      const cor = s.cores[linha[c]];
      if (!cor) continue;
      ctx.fillStyle = cor;
      ctx.fillRect(Math.floor(x + c * px), Math.floor(y + r * px), Math.ceil(px), Math.ceil(px));
    }
  });
}

export interface Layout { ox: number; oy: number; cel: number }

/** Maior casa que cabe, centralizada. */
export function calcularLayout(largura: number, altura: number, w: number, h: number, margem = 16): Layout {
  const cel = Math.floor(Math.min((w - margem * 2) / largura, (h - margem * 2) / altura, 88));
  return { cel, ox: Math.floor((w - cel * largura) / 2), oy: Math.floor((h - cel * altura) / 2) };
}

/** Papel: casas com leve textura (deterministica, sem flicker). */
export function desenharPapel(ctx: CanvasRenderingContext2D, e: Pick<Estado, 'largura' | 'altura'>, l: Layout): void {
  const { ox, oy, cel } = l;
  ctx.fillStyle = COR.papelSombra;
  ctx.fillRect(ox + 4, oy + 6, e.largura * cel, e.altura * cel);
  for (let y = 0; y < e.altura; y++) for (let x = 0; x < e.largura; x++) {
    ctx.fillStyle = (x + y) % 2 ? COR.papel : '#f8eed6';
    ctx.fillRect(ox + x * cel, oy + y * cel, cel, cel);
  }
  ctx.strokeStyle = COR.grade;
  ctx.lineWidth = 1;
  for (let x = 1; x < e.largura; x++) { ctx.beginPath(); ctx.moveTo(ox + x * cel + 0.5, oy); ctx.lineTo(ox + x * cel + 0.5, oy + e.altura * cel); ctx.stroke(); }
  for (let y = 1; y < e.altura; y++) { ctx.beginPath(); ctx.moveTo(ox, oy + y * cel + 0.5); ctx.lineTo(ox + e.largura * cel, oy + y * cel + 0.5); ctx.stroke(); }
  ctx.strokeStyle = COR.borda;
  ctx.lineWidth = 2;
  ctx.strokeRect(ox + 1, oy + 1, e.largura * cel - 2, e.altura * cel - 2);
}

export function desenharVincos(ctx: CanvasRenderingContext2D, e: Pick<Estado, 'largura' | 'altura' | 'vincosV' | 'vincosH'>, l: Layout, destaque?: { eixo: 'v' | 'h'; k: number } | null, pulso = 0): void {
  const { ox, oy, cel } = l;
  const linha = (x1: number, y1: number, x2: number, y2: number, brilho: boolean) => {
    ctx.save();
    ctx.setLineDash([Math.max(4, cel / 6), Math.max(3, cel / 9)]);
    ctx.lineWidth = brilho ? 4 : 3;
    ctx.strokeStyle = brilho ? COR.vincoBrilho : COR.vinco;
    if (brilho) { ctx.shadowColor = COR.vincoBrilho; ctx.shadowBlur = 10 + pulso * 6; }
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  };
  for (const k of e.vincosV) linha(ox + k * cel, oy - 6, ox + k * cel, oy + e.altura * cel + 6, destaque?.eixo === 'v' && destaque.k === k);
  for (const k of e.vincosH) linha(ox - 6, oy + k * cel, ox + e.largura * cel + 6, oy + k * cel, destaque?.eixo === 'h' && destaque.k === k);
}

export function desenharPecas(ctx: CanvasRenderingContext2D, e: Pick<Estado, 'largura' | 'altura' | 'celulas'>, l: Layout): void {
  const pad = Math.round(l.cel * 0.12);
  for (let y = 0; y < e.altura; y++) for (let x = 0; x < e.largura; x++) {
    const p = e.celulas[y][x];
    if (p) desenharPeca(ctx, p, l.ox + x * l.cel + pad, l.oy + y * l.cel + pad, l.cel - pad * 2);
  }
}

export function desenharCao(
  ctx: CanvasRenderingContext2D, px: number, py: number, cel: number,
  { pose = 'sentado' as Pose, espelhar = false, squash = 0, acessorios = [] as ('chapeu' | 'oculos')[] } = {},
): void {
  const escala = Math.max(1, Math.floor((cel * 0.86) / 16));
  const tam = escala * 16;
  desenharSharPei(ctx, px + (cel - tam) / 2, py + (cel - tam) / 2 - cel * 0.04, escala, { pose, espelhar, squash, acessorios });
}
