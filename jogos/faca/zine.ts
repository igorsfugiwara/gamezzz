/**
 * Zine do fim da turnê: imagem 540×960 (formato de stories) com cara de
 * xerox — foto da banda pontilhada em preto e branco, manchetes dos causos
 * e o carimbo do resultado.
 */
import { PALETA as P } from '../compartilhado/paleta';
import { desenharSharPei } from '../compartilhado/sharpei';
import { emCache } from '../compartilhado/canvas';
import { BONECO_A } from '../compartilhado/boneco';
import { integrante } from './visual';
import { desenharVan } from './paisagem';
import { manchetes, ORDEM_BANDA, type Turne } from './motor';
import { t as tr } from './i18n';

export const ZINE_L = 540;
export const ZINE_A = 960;

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function aleatorioDe(seed: string) {
  let s = 7;
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) % 2147483647;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Foto da banda: desenha colorido em baixa resolução e pontilha em P&B. */
function foto(t: Turne): HTMLCanvasElement {
  const L = 170;
  const A = 90;
  const c = document.createElement('canvas');
  c.width = L;
  c.height = A;
  const ctx = c.getContext('2d')!;
  // Parede clara, chão escuro e a van atrás da banda: contraste bom para o pontilhado.
  ctx.fillStyle = P.branco;
  ctx.fillRect(0, 0, L, A);
  ctx.fillStyle = P.cimento;
  ctx.fillRect(0, 74, L, 16);
  desenharVan(ctx, 46, 30, t.nomeBanda, false);
  let x = 6;
  for (const quem of ORDEM_BANDA) {
    if (t.banda.includes(quem)) {
      ctx.drawImage(emCache(`zine-${quem}`, () => integrante(quem, quem === 'bateria' ? { pose: 'chifres' } : {})), x, A - BONECO_A - 2);
    }
    x += 30;
  }
  if (t.flags.mascote) desenharSharPei(ctx, x, A - 36, 2, { pose: 'feliz' });
  const img = ctx.getImageData(0, 0, L, A);
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) {
      const i = (y * L + x) * 4;
      const lum = (img.data[i] * 0.3 + img.data[i + 1] * 0.59 + img.data[i + 2] * 0.11) / 255;
      const v = lum * 1.15 > (BAYER[y % 4][x % 4] + 0.5) / 16 ? 233 : 22;
      img.data[i] = v;
      img.data[i + 1] = v - 4;
      img.data[i + 2] = v - 14;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const linhas: string[] = [];
  let atual = '';
  for (const p of texto.split(' ')) {
    const teste = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(teste).width > largura && atual) {
      linhas.push(atual);
      atual = p;
    } else atual = teste;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

export async function desenharZine(canvas: HTMLCanvasElement, t: Turne): Promise<void> {
  try { await document.fonts.load('20px "Press Start 2P"'); } catch { /* segue com a fonte reserva */ }
  canvas.width = ZINE_L;
  canvas.height = ZINE_A;
  const ctx = canvas.getContext('2d')!;
  const r = aleatorioDe(t.seed);
  const tinta = '#16140f';
  const papel = '#e9e3d3';
  const pixel = '"Press Start 2P", monospace';
  const texto = '"Arial Narrow", "Roboto Condensed", Arial, sans-serif';

  ctx.fillStyle = papel;
  ctx.fillRect(0, 0, ZINE_L, ZINE_A);

  // Cabeçalho.
  ctx.fillStyle = tinta;
  ctx.fillRect(0, 0, ZINE_L, 118);
  ctx.fillStyle = papel;
  ctx.font = `30px ${pixel}`;
  ctx.textBaseline = 'top';
  ctx.font = `44px ${pixel}`;
  ctx.fillText('DIY', 24, 18);
  ctx.font = `13px ${pixel}`;
  ctx.fillText(t.nomeBanda.toUpperCase().slice(0, 18), 24, 80);
  ctx.font = `bold 15px ${texto}`;
  ctx.textAlign = 'right';
  ctx.fillText(tr('zine.titulo', { seed: t.seed }), ZINE_L - 24, 24);
  ctx.fillText(tr('zine.edicao'), ZINE_L - 24, 44);
  ctx.fillText(tr('zine.noites', { n: t.noite }), ZINE_L - 24, 64);
  ctx.textAlign = 'left';

  // Foto.
  const f = foto(t);
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(ZINE_L / 2, 270);
  ctx.rotate(-0.025);
  ctx.fillStyle = tinta;
  ctx.fillRect(-250, -128, 500, 268);
  ctx.drawImage(f, -244, -122, 488, 256);
  ctx.restore();
  ctx.font = `italic 14px ${texto}`;
  ctx.fillStyle = tinta;
  const integrantes = t.banda.length === 4 ? tr('zine.foto.inteira') : tr('zine.foto.sobraram', { n: t.banda.length });
  ctx.fillText(tr('zine.foto', { quem: integrantes + (t.flags.mascote ? tr('zine.foto.mascote') : '') }), 32, 420);

  // Manchetes.
  ctx.fillStyle = tinta;
  ctx.fillRect(24, 448, ZINE_L - 48, 4);
  ctx.font = `14px ${pixel}`;
  ctx.fillText(tr('zine.manchetes'), 24, 466);
  let y = 500;
  const lista = manchetes(t, 4);
  if (!lista.length) lista.push({ noite: Math.max(1, t.noite), chave: 'zine.vazio', p: {}, peso: 0 });
  // As mais pesadas primeiro; para quando não couber mais nada acima dos números.
  const limite = ZINE_A - 200;
  const cabem: { noite: number; linhas: string[] }[] = [];
  let altura = 0;
  ctx.font = `bold 22px ${texto}`;
  for (const m of [...lista].sort((a, b) => b.peso - a.peso)) {
    const linhas = quebrar(ctx, tr(m.chave, m.p).toUpperCase(), ZINE_L - 48);
    const h = 20 + linhas.length * 24 + 16;
    if (y + altura + h > limite) continue;
    altura += h;
    cabem.push({ noite: m.noite, linhas });
  }
  for (const m of cabem.sort((a, b) => a.noite - b.noite)) {
    ctx.font = `bold 13px ${texto}`;
    ctx.fillText(tr('zine.noite', { n: m.noite }), 24, y);
    y += 20;
    ctx.font = `bold 22px ${texto}`;
    for (const linha of m.linhas) {
      ctx.fillText(linha, 24, y);
      y += 24;
    }
    y += 16;
  }

  // Números.
  const s = t.stats;
  const numeros = [
    tr('zine.shows', { n: s.shows }),
    tr('zine.sucessos', { n: s.sucessos }),
    tr('zine.publico', { n: s.publico }),
    tr('zine.cache', { n: s.cache }),
    t.saidas.length > 1 ? tr('zine.saidas', { n: t.saidas.length }) : t.saidas.length ? tr('zine.saida1') : tr('zine.ninguem'),
  ];
  ctx.fillStyle = tinta;
  ctx.fillRect(24, ZINE_A - 190, ZINE_L - 48, 2);
  ctx.font = `bold 16px ${texto}`;
  ctx.fillText(numeros.join(' · '), 24, ZINE_A - 176, ZINE_L - 48);

  // Carimbo do resultado.
  const completa = t.fim === 'completa';
  ctx.save();
  ctx.translate(ZINE_L - 150, ZINE_A - 110);
  ctx.rotate(-0.18);
  ctx.strokeStyle = completa ? '#b3262f' : tinta;
  ctx.fillStyle = completa ? '#b3262f' : tinta;
  ctx.lineWidth = 4;
  ctx.strokeRect(-118, -30, 236, 60);
  ctx.font = `15px ${pixel}`;
  ctx.textAlign = 'center';
  ctx.fillText(tr(completa ? 'zine.completa1' : 'zine.acabou1'), 0, -18);
  ctx.fillText(tr(completa ? 'zine.completa2' : 'zine.acabou2'), 0, 4);
  ctx.restore();
  ctx.textAlign = 'left';

  // Carimbo da banda no canto (o mesmo integrante da capa, em tinta).
  const cara = emCache('zine-carimbo', () => integrante('vocal', { pose: 'chifres', grito: true }));
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.drawImage(cara, 24, ZINE_A - 158, cara.width * 1.6, cara.height * 1.6);
  ctx.restore();

  ctx.fillStyle = tinta;
  ctx.font = `bold 14px ${texto}`;
  ctx.fillText(tr('zine.rodape', { seed: t.seed }), 24, ZINE_A - 52);
  ctx.font = `13px ${texto}`;
  ctx.fillText('gamezzz · DIY - Faça você mesmo', 24, ZINE_A - 32);

  // Textura de xerox: pontinhos e faixas de toner.
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = r() < 0.7 ? 'rgba(22,20,15,0.35)' : 'rgba(233,227,211,0.6)';
    ctx.fillRect(Math.floor(r() * ZINE_L), Math.floor(r() * ZINE_A), r() < 0.9 ? 1 : 2, 1);
  }
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = 'rgba(22,20,15,0.05)';
    ctx.fillRect(0, Math.floor(r() * ZINE_A), ZINE_L, 6 + Math.floor(r() * 20));
  }
}

/** Salva/compartilha a imagem do zine. */
export async function exportarZine(canvas: HTMLCanvasElement, t: Turne): Promise<'compartilhado' | 'baixado' | 'falhou'> {
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
  if (!blob) return 'falhou';
  const nome = `zine-turne-${t.seed}.png`;
  const arquivo = new File([blob], nome, { type: 'image/png' });
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], text: `DIY · ${t.nomeBanda} · ${t.seed}` });
      return 'compartilhado';
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return 'compartilhado';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'baixado';
}
