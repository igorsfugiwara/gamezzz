/**
 * Como cada integrante se parece (palco, HUD, tela da banda, zine) e os
 * instrumentos desenhados por cima do boneco antes do contorno.
 */
import { PALETA as P } from '../compartilhado/paleta';
import { boneco, bonecoHD, px, ret, TONS, type Boneco, type Grade, type Tom } from '../compartilhado/boneco';
import type { Integrante } from './motor';

const OY = 4; // mesma folga do boneco

/** Flying V (guitarra) ou baixo de corpo pontudo, atravessado no tronco. */
function instrumento(cor: Tom, baixo: boolean) {
  return (g: Grade) => {
    const y = (v: number) => v + OY;
    // Braço na diagonal até a cabeça, com trastes.
    const comp = baixo ? 13 : 11;
    for (let i = 0; i <= comp; i++) {
      px(g, 12 - i, y(37 - i), P.chocolate);
      px(g, 12 - i, y(38 - i), P.ruga);
      if (i % 3 === 1) px(g, 12 - i, y(37 - i), P.neblina);
    }
    ret(g, 12 - comp - 2, y(37 - comp - 3), 3, 3, P.preto);
    px(g, 12 - comp - 2, y(37 - comp - 3), P.cimento);
    // Corpo: duas asas em V saindo da junção.
    const [l, m, s] = cor;
    for (let i = 0; i < 9; i++) {
      ret(g, 12 + i, y(36 + Math.floor(i * 0.9)), 3, 2, m); // asa de baixo
      ret(g, 12 + i, y(36 - (baixo ? 0 : 1) + Math.floor(i * 0.35)), 3, 2, m); // asa de cima
      px(g, 12 + i, y(36 - (baixo ? 0 : 1) + Math.floor(i * 0.35)), l);
      px(g, 14 + i, y(37 + Math.floor(i * 0.9)), s);
    }
    ret(g, 12, y(36), 4, 4, m); px(g, 12, y(36), l);
    // Captadores e ponte.
    ret(g, 14, y(37), 2, 1, P.preto); ret(g, 17, y(38), 2, 1, P.preto);
    px(g, 19, y(39), P.neblina); px(g, 20, y(40), P.neblina);
  };
}

export const VISUAL: Record<Integrante, Boneco> = {
  vocal: { pele: TONS.pele.morena, cabelo: TONS.cabelo.rosa, roupa: TONS.roupa.preta, calca: TONS.calca.preta, estilo: 'cabelao', jaqueta: true },
  guitarra: { pele: TONS.pele.clara, cabelo: TONS.cabelo.castanho, roupa: TONS.roupa.preta, calca: TONS.calca.jeans, estilo: 'cabelao', estampa: true,
    extra: instrumento(TONS.roupa.vermelha, false), instrumento: { tipo: 'guitarra', cor: TONS.roupa.vermelha } },
  baixo: { pele: TONS.pele.escura, cabelo: TONS.cabelo.verde, roupa: TONS.roupa.vinho, calca: TONS.calca.preta, estilo: 'moicano', jaqueta: true,
    extra: instrumento([P.ceu, P.azul, P.marinho], true), instrumento: { tipo: 'baixo', cor: [P.ceu, P.azul, P.marinho] } },
  bateria: { pele: TONS.pele.parda, cabelo: TONS.cabelo.loiro, roupa: TONS.roupa.laranja, calca: TONS.calca.jeans, estilo: 'careca', barba: true, pose: 'baqueta' },
};

/** Boneco do integrante; `palco` liga a pose de show (microfone, grito, headbang). */
export function integrante(quem: Integrante, opcoes: Partial<Boneco> = {}): Grade {
  return boneco({ ...VISUAL[quem], ...opcoes });
}

/** Integrante HD (56×118), em volume. */
export function integranteHD(quem: Integrante, opcoes: Partial<Boneco> = {}): Grade {
  return bonecoHD({ ...VISUAL[quem], ...opcoes });
}
