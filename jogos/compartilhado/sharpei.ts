/**
 * O Shar Pei do portal, em pixel art 16×16, olhando para a direita.
 * Aparece nos quatro jogos: parceiro no RODA, protagonista no Dobra,
 * figurinha no PIXO, mascote raro no Faça Você Mesmo.
 *
 * Cada pose é uma grade de caracteres; `CORES` diz a cor de cada um.
 * Acessórios (chapéu, óculos) são camadas por cima da pose.
 */
import { PALETA } from './paleta';

const CORES: Record<string, string> = {
  C: PALETA.caramelo,
  L: PALETA.caramelo_claro,
  R: PALETA.ruga,
  P: PALETA.chocolate,
  K: PALETA.preto,
  T: PALETA.neon_rosa,
  W: PALETA.branco,
  Y: PALETA.amarelo,
  B: PALETA.azul,
  V: PALETA.vermelho,
  N: PALETA.noite,
};

export const POSES = {
  sentado: [
    '................',
    '................',
    '........PC..CP..',
    '........CCCCCCC.',
    '.......CRRRRRCC.',
    '.......CCCCKCCC.',
    '.......CRRRRCLL.',
    '......CCCCCLLLLL',
    '......CRRRCLLLLK',
    '..CC..CCCCCRLLR.',
    '.C..C.CRRRRCCC..',
    '.C.CCCCCCCCCC...',
    '..CCRRRCCRRCC...',
    '..CCCCCCCCCCC...',
    '..CC.CCC..CCC...',
    '..PP.PPP..PPP...',
  ],
  feliz: [
    '................',
    '................',
    '........PC..CP..',
    '........CCCCCCC.',
    '.......CRRRRRCC.',
    '.......CCCKKCCC.',
    '.......CRRRRCLL.',
    '......CCCCCLLLLL',
    '......CRRRCLLLLK',
    '..CC..CCCCCRLTT.',
    '.C..C.CRRRRCTT..',
    '.C.CCCCCCCCCC...',
    '..CCRRRCCRRCC...',
    '..CCCCCCCCCCC...',
    '..CC.CCC..CCC...',
    '..PP.PPP..PPP...',
  ],
  susto: [
    '................',
    '........PC..CP..',
    '........CCCCCCC.',
    '.......CRRRRRCC.',
    '.......CCCWKCCC.',
    '.......CCCWWCLL.',
    '......CRRRRLLLLL',
    '......CCCCCLLLLK',
    '..CC..CRRRCLKKL.',
    '.C..C.CCCCCLKKL.',
    '.C.CCCRRRRCCCC..',
    '..CCCCCCCCCCC...',
    '..CCRRRCCRRCC...',
    '..CC.CC..CC.CC..',
    '..PP.PP..PP.PP..',
    '................',
  ],
  dormindo: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '.........PC..CP.',
    '.........CCCCCC.',
    '..CC....CRRRRRCC',
    '.C..C...CCRRCCCC',
    '.C.CCCCCCRRRCLLL',
    '..CCRRRCCCCCLLLK',
    '..CCCCCRRRRCRLL.',
    '..CCRRCCCCCCCC..',
    '..CCCCCCCCCCCCC.',
    '..PPPPPPPPPPPPP.',
    '................',
  ],
} as const;

export type Pose = keyof typeof POSES;

const ACESSORIOS = {
  chapeu: [
    '...........Y....',
    '..........VYV...',
    '.........VYVYV..',
  ],
  oculos: [
    '',
    '',
    '',
    '',
    '',
    '.........KKKKKK.',
    '..........KK.KK.',
  ],
} as const;

export type Acessorio = keyof typeof ACESSORIOS;

/**
 * Desenha o Shar Pei no canvas. `escala` é o tamanho de cada pixel; `espelhar`
 * vira para a esquerda; `x`/`y` são o canto em pixels de tela.
 */
export function desenharSharPei(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  escala: number,
  { pose = 'sentado' as Pose, espelhar = false, acessorios = [] as Acessorio[], squash = 0 } = {},
): void {
  const camadas: readonly (readonly string[])[] = [POSES[pose], ...acessorios.map((a) => ACESSORIOS[a])];
  // squash > 0 achata e alarga (rebolado/pulo); < 0 estica.
  const sx = escala * (1 + squash * 0.25);
  const sy = escala * (1 - squash * 0.25);
  const largura = 16 * sx;
  const baseY = y + 16 * escala;
  for (const camada of camadas) {
    camada.forEach((linha, r) => {
      for (let c = 0; c < linha.length; c++) {
        const ch = linha[c];
        if (ch === '.' || ch === ' ') continue;
        const cor = CORES[ch];
        if (!cor) continue;
        const col = espelhar ? 15 - c : c;
        ctx.fillStyle = cor;
        ctx.fillRect(
          Math.round(x + (16 * escala - largura) / 2 + col * sx),
          Math.round(baseY - (16 - r) * sy),
          Math.ceil(sx),
          Math.ceil(sy),
        );
      }
    });
  }
}

/** Canvas pronto com o Shar Pei, para usar em HTML (telas, cards). */
export function sharPeiCanvas(escala = 6, opcoes: Parameters<typeof desenharSharPei>[4] = {}): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 16 * escala;
  canvas.height = 16 * escala;
  canvas.className = 'pixel';
  const ctx = canvas.getContext('2d')!;
  desenharSharPei(ctx, 0, 0, escala, opcoes);
  return canvas;
}
