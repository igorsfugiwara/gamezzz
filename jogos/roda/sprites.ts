/**
 * Sprites do RODA no traço metal do portal: bonecos HD de compartilhado/figura
 * (56×118, em volume, três-quartos) e cenário antigo ampliado 3× com luz,
 * sombra e contorno, depois 2× em Scale2x. Tudo em "pixel de arte": 6 por
 * unidade do mundo.
 * Cada sprite vira canvas uma vez só (cache).
 */
import { PALETA as P } from '../compartilhado/paleta';
import { bonecoDoPovo, bonecoHD, contornar, deTexto, hd, novaGrade, px, refinar, ret, TONS, type Boneco, type Grade } from '../compartilhado/boneco';
import { emCache, gradeParaCanvas } from '../compartilhado/canvas';

export type Sprite = HTMLCanvasElement;

/** Pixels de arte por unidade do mundo. */
export const ESC_ARTE = 6;

/** Arte antiga em texto → ampliada 3× com acabamento. */
export function arteParaSprite(arte: readonly string[], cores: Record<string, string>): Sprite {
  return gradeParaCanvas(hd(refinar(deTexto(arte, cores), 3)));
}

/** Desenha um sprite com o pé (base, centro) em (x, yPe), em unidades do mundo. */
export function desenharSprite(ctx: CanvasRenderingContext2D, s: Sprite, x: number, yPe: number, espelhar = false) {
  const w = s.width / ESC_ARTE;
  const h = s.height / ESC_ARTE;
  // Tela menor que a arte: reduzir sem suavizar some com pixel (olho, tacha,
  // contorno); suavizado, o detalhe vira meio-tom em vez de sumir.
  const reduz = ctx.getTransform().a / ESC_ARTE < 0.98;
  if (reduz) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; }
  if (espelhar) {
    ctx.save();
    ctx.translate(x, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(s, -w / 2, yPe - h, w, h);
    ctx.restore();
  } else ctx.drawImage(s, x - w / 2, yPe - h, w, h);
  if (reduz) ctx.imageSmoothingEnabled = false;
}

export type TipoPessoa = 'povo' | 'motoboy' | 'tia';

type Q = 0 | 1 | 2 | 3;

/** Gente do povo; `semente` escolhe o visual, `quadro` o headbang e `passo` a caminhada (4 quadros cada). */
export function spritePessoa(tipo: TipoPessoa, semente: number, quadro: Q = 0, passo: Q = 0): Sprite {
  const s = semente % 48;
  return emCache(`roda-${tipo}-${s}-${quadro}-${passo}`, () => bonecoHD(bonecoDoPovo(s + (tipo === 'povo' ? 0 : tipo === 'tia' ? 500 : 900), tipo, { quadro, passo })));
}

/** O Vocal: entregador de app e vocalista — boné neon, moletom vermelho, mochila térmica, microfone. */
export function spriteVocal(grito: boolean, quadro: Q, oculos: boolean, passo: Q = 0): Sprite {
  return emCache(`roda-vocal-${grito}-${quadro}-${oculos}-${passo}`, () => bonecoHD({
    pele: TONS.pele.morena, cabelo: TONS.cabelo.preto, roupa: TONS.roupa.vermelha, calca: TONS.calca.preta,
    estilo: 'bone', cobertura: TONS.cabelo.verde, bau: TONS.roupa.laranja, pose: 'microfone', grito, quadro, oculos, passo,
  }));
}

const segurancaBase: Boneco = { pele: TONS.pele.parda, cabelo: TONS.cabelo.preto, roupa: TONS.roupa.preta, calca: TONS.calca.preta, estilo: 'careca', largo: true, gravata: P.vermelho };
/** Segurança marchando (4 quadros); tonto fica parado com estrelinha. */
export function spriteSeguranca(passo: Q, tonto: boolean): Sprite {
  return emCache(`roda-seg-${tonto ? 't' : passo}`, () => bonecoHD(tonto ? { ...segurancaBase, tonto: true } : { ...segurancaBase, oculos: true, passo }));
}

export const PREDIO = arteParaSprite([
  '....nnnnnnnnnnnnnnnn....',
  '...nCCCCCCCCCCCCCCCCn...',
  '..nCAACCAACCAACCAACCCn..',
  '..nCAACCAACCAACCAACCCn..',
  '..nCCCCCCCCCCCCCCCCCCn..',
  '..nCAACCAACCAACCAACCCn..',
  '..nCAACCAACCAACCAACCCn..',
  '..nCCCCCCCCCCCCCCCCCCn..',
  '..nCAACCAACCAACCAACCCn..',
  '..nCAACCAACCAACCAACCCn..',
  '..nCCCCCCCCCCCCCCCCCCn..',
  '..nCAACCAACCAACCAACCCn..',
  '..nCAACCAACCAACCAACCCn..',
  '..nCCCCCCCCCCCCCCCCCCn..',
  '..nCAACCAACCAACCAACCCn..',
  '..nCAACCAACCAACCAACCCn..',
  '..nCCCCCCCCCCCCCCCCCCn..',
  '..nCAACCAACCAACCAACCCn..',
  '..nCAACCAACCAACCAACCCn..',
  '..nCCCCCCCDDDDCCCCCCCn..',
  '..nCCCCCCCDDDDCCCCCCCn..',
  '.nnnnnnnnnnnnnnnnnnnnnn.',
], { n: P.marinho, C: P.ceu, A: P.pastel_azul, D: P.asfalto });

export const CATRACA = arteParaSprite([
  'KKKKKK....',
  'KNKKVK....',
  'KKKKKKMMMM',
  'KKKKKK....',
  'KKKKKKMMMM',
  'KKKKKK....',
  'KKKKKKMMMM',
  'KKKKKK....',
  'KKKKKK....',
], { K: P.asfalto, N: P.neon_verde, V: P.vermelho, M: P.cimento });

export const VIATURA = arteParaSprite([
  '.....BR.........',
  '..WWWWWWWWWWW...',
  '.WWCCCWWCCCWWW..',
  '.WWCCCWWCCCWWWWW',
  'WWWWWWWWWWWWWWWW',
  'WVVVVVVVVVVVVVVW',
  'WWWWWWWWWWWWWWWW',
  '.KK........KK...',
], { B: P.azul, R: P.vermelho, W: P.neblina, C: P.marinho, V: P.vinho, K: P.preto });

export const PLACA = arteParaSprite([
  'YYYYYYYY',
  'YVVVVVVY',
  'YYYYYYYY',
  'YVVVVYYY',
  'YYYYYYYY',
  '...MM...',
  '...MM...',
], { Y: P.amarelo, V: P.vermelho, M: P.chocolate });

export const BOLETO = arteParaSprite([
  'WWWWWWW',
  'WKWKKWW',
  'WKWKKWW',
  'WWWWWWW',
  'WVVVVVW',
  'WWWWWWW',
], { W: P.branco, K: P.preto, V: P.vermelho });

/** O Proprietário: magro, cartola alta, sobrecasaca vinho, bengala e molho de chaves. */
function proprietario(): Grade {
  const g = novaGrade(60, 96);
  const r = (x: number, y: number, w: number, h: number, c: string) => ret(g, x, y, w, h, c);
  const p = (x: number, y: number, c: string) => px(g, x, y, c);
  // Cartola.
  r(22, 2, 16, 22, P.noite); r(22, 2, 2, 22, P.asfalto); r(36, 2, 2, 22, P.preto); r(24, 2, 12, 1, P.concreto);
  r(22, 18, 16, 4, P.vinho); r(28, 18, 4, 4, P.amarelo); p(29, 19, P.branco);
  r(14, 24, 32, 3, P.preto); r(14, 24, 32, 1, P.asfalto);
  // Rosto comprido e chupado.
  r(23, 27, 14, 18, P.pessego); r(23, 27, 3, 18, P.caramelo_claro); r(34, 27, 3, 18, P.caramelo);
  r(25, 31, 4, 1, P.preto); r(31, 31, 4, 1, P.preto); p(28, 30, P.preto); p(31, 30, P.preto); // sobrancelha em V
  r(25, 32, 4, 4, P.caramelo); r(31, 32, 4, 4, P.caramelo); // olheiras fundas
  r(26, 33, 2, 2, P.amarelo); r(32, 33, 2, 2, P.amarelo); p(27, 34, P.preto); p(33, 34, P.preto); // olho de cifrão
  r(29, 34, 2, 8, P.caramelo); p(29, 41, P.ruga); p(30, 41, P.ruga); r(28, 40, 1, 2, P.pessego); // nariz pontudo
  r(24, 37, 2, 4, P.caramelo); r(34, 37, 2, 4, P.ruga); // maçã chupada
  r(24, 42, 12, 1, P.preto); p(23, 41, P.preto); p(36, 41, P.preto); p(22, 40, P.preto); p(37, 40, P.preto); // bigode enrolado
  r(27, 44, 6, 1, P.vinho); p(32, 43, P.vinho); // sorriso torto
  r(26, 45, 8, 2, P.pessego); r(28, 47, 4, 2, P.caramelo); r(29, 49, 2, 1, P.caramelo); // queixo pontudo
  // Colarinho alto e gravata.
  r(24, 47, 3, 4, P.branco); r(33, 47, 3, 4, P.branco); r(28, 49, 4, 5, P.amarelo); p(29, 50, P.mostarda);
  // Sobrecasaca até o joelho.
  r(14, 51, 32, 31, P.vinho); r(12, 70, 36, 12, P.vinho);
  r(14, 51, 3, 31, P.vermelho); r(12, 70, 2, 12, P.vermelho); r(42, 51, 4, 31, P.noite); r(46, 70, 2, 12, P.noite);
  r(22, 51, 5, 16, P.preto); r(33, 51, 5, 16, P.preto); r(23, 51, 1, 14, P.asfalto); // lapelas
  r(27, 51, 6, 20, P.vinho); for (const y of [57, 62, 67]) { r(29, y, 2, 2, P.amarelo); }
  r(29, 72, 2, 10, P.noite); // abertura da cauda
  p(18, 60, P.vermelho); p(19, 63, P.vermelho); p(40, 58, P.noite); p(39, 66, P.noite); // dobras
  // Braço esquerdo com o molho de chaves.
  r(8, 52, 6, 22, P.vinho); r(8, 52, 2, 22, P.vermelho); r(8, 74, 6, 2, P.branco); r(8, 76, 6, 5, P.pessego); r(8, 76, 2, 5, P.caramelo_claro);
  for (let a = 0; a < 16; a++) p(Math.round(11 + Math.cos(a / 16 * Math.PI * 2) * 4), Math.round(85 + Math.sin(a / 16 * Math.PI * 2) * 3), P.amarelo);
  r(7, 87, 2, 5, P.mostarda); r(11, 88, 2, 6, P.amarelo); r(14, 87, 2, 4, P.mostarda); p(7, 92, P.mostarda); p(12, 94, P.amarelo);
  // Braço direito na bengala.
  r(46, 52, 6, 20, P.vinho); r(50, 52, 2, 20, P.noite); r(46, 72, 6, 2, P.branco); r(46, 74, 6, 5, P.caramelo);
  r(50, 58, 2, 37, P.chocolate); r(50, 58, 1, 37, P.ruga); r(48, 55, 6, 4, P.amarelo); p(49, 55, P.branco);
  // Calça e sapato de bico fino.
  r(22, 82, 6, 9, P.preto); r(32, 82, 6, 9, P.preto); r(22, 82, 1, 9, P.asfalto); r(32, 82, 1, 9, P.asfalto);
  r(18, 91, 10, 3, P.preto); r(32, 91, 10, 3, P.preto); r(20, 91, 4, 1, P.concreto); r(34, 91, 4, 1, P.concreto);
  return contornar(g);
}

/** O Algoritmo: celular com cara de poucos amigos e notificação piscando. */
function algoritmo(copia: boolean): Grade {
  const g = novaGrade(56, 84);
  const r = (x: number, y: number, w: number, h: number, c: string) => ret(g, x, y, w, h, c);
  // Carcaça com bisel.
  r(5, 6, 44, 74, P.asfalto); r(6, 5, 42, 76, P.asfalto);
  r(5, 6, 2, 74, P.concreto); r(6, 5, 42, 2, P.concreto); r(47, 6, 2, 74, P.preto); r(6, 79, 42, 2, P.preto);
  // Tela em degradê.
  const tons = copia ? [P.neblina, P.cimento, P.concreto] : [P.neon_ciano, P.ceu, P.azul, P.marinho];
  for (let y = 12; y < 68; y++) r(10, y, 34, 1, tons[Math.min(tons.length - 1, Math.floor(((y - 12) / 56) * tons.length))]);
  r(20, 8, 14, 3, P.preto); // notch
  r(10, 12, 34, 1, P.branco); // reflexo
  for (let i = 0; i < 10; i++) r(12 + i, 52 + i, 1, 1, P.branco); // reflexo diagonal
  if (!copia) {
    // Cara: sobrancelha de raiva, olho rosa, boca torta.
    for (let i = 0; i < 8; i++) { r(14 + i, 22 + Math.floor(i / 3), 1, 2, P.preto); r(39 - i, 22 + Math.floor(i / 3), 1, 2, P.preto); }
    r(15, 26, 7, 5, P.preto); r(32, 26, 7, 5, P.preto); r(17, 27, 3, 3, P.neon_rosa); r(34, 27, 3, 3, P.neon_rosa);
    r(18, 44, 18, 2, P.preto); r(16, 46, 2, 2, P.preto); r(36, 46, 2, 2, P.preto); r(20, 46, 3, 2, P.branco); r(31, 46, 3, 2, P.branco);
    // Notificação vermelha com "!".
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (x * x + y * y <= 36) px(g, 48 + x, 7 + y, P.vermelho);
    r(47, 3, 2, 5, P.branco); r(47, 9, 2, 2, P.branco);
  } else {
    r(15, 26, 7, 5, P.concreto); r(32, 26, 7, 5, P.concreto); r(18, 45, 18, 2, P.concreto);
  }
  r(22, 71, 10, 4, P.concreto); r(23, 72, 8, 2, P.cimento); // botão
  return contornar(g);
}

export const PROPRIETARIO = gradeParaCanvas(hd(proprietario()));
export const ALGORITMO = gradeParaCanvas(hd(algoritmo(false)));
export const ALGORITMO_COPIA = gradeParaCanvas(hd(algoritmo(true)));

/** Ocupação: o prédio caído remontado, com varal colorido. */
export const OCUPACAO = arteParaSprite([
  '........................',
  '...nnnnnnnnnnnnnnnnnn...',
  '..nCAACCAACCAACCAACCCn..',
  '..nRYGBRYGBRYGBRYGBRCn..',
  '..nCCCCCCCCCCCCCCCCCCn..',
  '..nCAACCAACCAACCAACCCn..',
  '..nGBRYGBRYGBRYGBRYGCn..',
  '..nCCCCCCCCCCCCCCCCCCn..',
  '..nCAACCAACCAACCAACCCn..',
  '..nCCCCCCCDDDDCCCCCCCn..',
  '.nnnnnnnnnnnnnnnnnnnnnn.',
], { n: P.chocolate, C: P.papel, A: P.amarelo, D: P.asfalto, R: P.vermelho, Y: P.amarelo, G: P.folha, B: P.azul });
