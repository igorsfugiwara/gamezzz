/**
 * Sprites do RODA, em pixel art com a paleta do portal. Cada sprite vira um
 * canvas pequeno uma vez só (cache): 300 recrutas na tela são 300 drawImage.
 */
import { PALETA as P } from '../compartilhado/paleta';

export type Sprite = HTMLCanvasElement;

export function arteParaSprite(arte: readonly string[], cores: Record<string, string>): Sprite {
  const h = arte.length;
  const w = Math.max(...arte.map((l) => l.length));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  arte.forEach((linha, y) => {
    for (let x = 0; x < linha.length; x++) {
      const cor = cores[linha[x]];
      if (!cor) continue;
      ctx.fillStyle = cor;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return c;
}

const PESSOA = [
  '..hhhh..',
  '.hhhhhh.',
  '..ssss..',
  '..sksk..',
  '..ssss..',
  '.cccccc.',
  'cccccccc',
  's.cccc.s',
  '..pppp..',
  '..p..p..',
  '..k..k..',
];

const PELES = [P.caramelo_claro, P.caramelo, P.ruga, P.chocolate, P.pessego];
const CABELOS = [P.preto, P.chocolate, P.ruga, P.amarelo, P.vinho, P.noite];
const ROUPAS = [P.azul, P.folha, P.vermelho, P.laranja, P.neon_roxo, P.ceu, P.mostarda, P.musgo, P.pastel_rosa, P.cimento];
const CALCAS = [P.marinho, P.asfalto, P.concreto, P.chocolate];

export type TipoPessoa = 'povo' | 'motoboy' | 'tia';

const cache = new Map<string, Sprite>();

/** Pessoa do povo; `semente` escolhe pele, cabelo e roupa. */
export function spritePessoa(tipo: TipoPessoa, semente: number): Sprite {
  const chave = `${tipo}-${semente % 97}`;
  const salvo = cache.get(chave);
  if (salvo) return salvo;
  const s = semente % 97;
  const cores: Record<string, string> = {
    h: CABELOS[s % CABELOS.length],
    s: PELES[(s * 3) % PELES.length],
    k: P.preto,
    c: ROUPAS[(s * 7) % ROUPAS.length],
    p: CALCAS[(s * 5) % CALCAS.length],
  };
  let arte: string[] = [...PESSOA];
  if (tipo === 'motoboy') {
    // Capacete e baú nas costas.
    arte = ['.hhhhhh.', 'hhhhhhhh', 'hvvvvvvh', '..ssss..', '..ssss..', 'bbcccccc', 'bbcccccc', 'bbcccc.s', '..pppp..', '..p..p..', '..k..k..'];
    cores.h = s % 2 ? P.vermelho : P.asfalto;
    cores.v = P.neon_ciano;
    cores.b = P.folha;
    cores.c = P.asfalto;
  } else if (tipo === 'tia') {
    // Lenço colorido e avental.
    arte = ['..LLLL..', '.LLLLLL.', '..ssss..', '..sksk..', '..ssss..', '.cccccc.', 'cwwwwwwc', 's.wwww.s', '..pppp..', '..p..p..', '..k..k..'];
    cores.L = [P.neon_rosa, P.amarelo, P.folha, P.laranja][s % 4];
    cores.w = P.branco;
  }
  const sp = arteParaSprite(arte, cores);
  cache.set(chave, sp);
  return sp;
}

export const SEGURANCA = arteParaSprite([
  '..hhhh..',
  '..ssss..',
  '..KKKK..',
  '..ssss..',
  '.TTTTTT.',
  'TTTWWTTT',
  'TTTWWTTT',
  's.TTTT.s',
  '..TTTT..',
  '..T..T..',
  '..K..K..',
], { h: P.preto, s: P.caramelo, K: P.preto, T: P.asfalto, W: P.branco });

export const SEGURANCA_TONTO = arteParaSprite([
  '.y.hhhh.',
  '..ssss.y',
  '..KKKK..',
  '..ssss..',
  '.TTTTTT.',
  'TTTWWTTT',
  'TTTWWTTT',
  's.TTTT.s',
  '..TTTT..',
  '..T..T..',
  '..K..K..',
], { h: P.preto, s: P.caramelo, K: P.preto, T: P.asfalto, W: P.branco, y: P.amarelo });

/** O Vocal: boné, moletom, mochila térmica laranja e microfone. */
export const VOCAL = arteParaSprite([
  '...BBBB...',
  '..BBBBBB..',
  '...ssss...',
  '...sksk...',
  'MM.ssss...',
  'MMRRRRRROO',
  '.RRRRRRROO',
  '.sRRRRRROO',
  '...PPPP.OO',
  '...P..P...',
  '...K..K...',
], { B: P.neon_verde, s: P.caramelo, k: P.preto, R: P.vermelho, O: P.laranja, P: P.marinho, K: P.preto, M: P.neblina });

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

/** O Proprietário: terno vinho, cartola, molho de chaves. */
export const PROPRIETARIO = arteParaSprite([
  '...KKKKKK...',
  '...KKKKKK...',
  '..KKKKKKKK..',
  '...ssssss...',
  '...sKssKs...',
  '...ssssss...',
  '...sWWWWs...',
  '..VVVWWVVV..',
  '.VVVVWWVVVV.',
  '.VVVVWWVVVVY',
  '.sVVVVVVVVYY',
  '..VVVVVVVV..',
  '..VVVVVVVV..',
  '..VVV..VVV..',
  '..KKK..KKK..',
], { K: P.preto, s: P.pessego, W: P.branco, V: P.vinho, Y: P.amarelo });

/** O Algoritmo: um celular flutuando com o ícone de carregando. */
export const ALGORITMO = arteParaSprite([
  '.KKKKKKKKKK.',
  'KNNNNNNNNNNK',
  'KNWWWWWWWWNK',
  'KNWWNNWWWWNK',
  'KNWNWWNWWWNK',
  'KNWNWWNWWWNK',
  'KNWWNNWWWWNK',
  'KNWWWWWWWWNK',
  'KNWVVVVVVWNK',
  'KNWWWWWWWWNK',
  'KNNNNNNNNNNK',
  'KNNNNKKNNNNK',
  '.KKKKKKKKKK.',
], { K: P.asfalto, N: P.noite, W: P.neon_ciano, V: P.neon_rosa });

export const ALGORITMO_COPIA = arteParaSprite([
  '.KKKKKKKKKK.',
  'KNNNNNNNNNNK',
  'KNWWWWWWWWNK',
  'KNWWWWWWWWNK',
  'KNWWWWWWWWNK',
  'KNWWWWWWWWNK',
  'KNWWWWWWWWNK',
  'KNWWWWWWWWNK',
  'KNWVVVVVVWNK',
  'KNWWWWWWWWNK',
  'KNNNNNNNNNNK',
  'KNNNNKKNNNNK',
  '.KKKKKKKKKK.',
], { K: P.asfalto, N: P.noite, W: P.neon_ciano, V: P.neon_rosa });

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
