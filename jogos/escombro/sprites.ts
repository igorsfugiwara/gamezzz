/**
 * Sprites do ESCOMBRO: A FITA, todos no motor de volume (compartilhado/figura):
 * a banda (a partir das fotos de divulgação), PM, GCM e tropa de choque, os
 * fantasmas do mercado, os chefões, o vira-lata caramelo, as comidas e o que
 * dá para quebrar.
 *
 * Tudo vira canvas uma vez só (emCache). Os lutadores são de perfil
 * (giro 1,05), virados para a direita; o jogo espelha para a esquerda.
 */
import { PALETA as P } from '../compartilhado/paleta';
import { bonecoHD, TONS, type Boneco, type Grade, type Pose, type Tom } from '../compartilhado/boneco';
import { Estudio, mat, rampa, rampaDe, type V3 } from '../compartilhado/figura';
import { emCache } from '../compartilhado/canvas';
import type { Quem, TipoInimigo, TipoItem, TipoQuebravel } from './regras';

export type Sprite = HTMLCanvasElement;
export const GIRO_LUTA = 1.05;

// ─── A banda ──────────────────────────────────────────────

const PRETO: Tom = [P.concreto, P.asfalto, P.noite];

/**
 * Visual de cada integrante, das fotos: camiseta preta, tatuagem, boné.
 * Altura, do maior para o menor: Jota, Pucci, Igor e, bem menor, Renato.
 */
export const VISUAL: Record<Quem, Boneco> = {
  // Igor (Lingão): careca, barba preta, alargador, gordo; bermuda com meia.
  igor: {
    pele: TONS.pele.morena, cabelo: TONS.cabelo.preto, roupa: PRETO, calca: PRETO, estilo: 'careca', barba: true, alargador: true,
    gordo: true, folgado: true, bermuda: true, tenis: true, meia: true,
  },
  // Pucci: cabelão preto, boné estampado colorido, bigode fino, braço fechado.
  pucci: {
    pele: TONS.pele.clara, cabelo: TONS.cabelo.preto, roupa: PRETO, calca: PRETO, estilo: 'bone', cobertura: PRETO, boneEstampado: true,
    bigode: true, tatuagem: true, tenis: true, magro: true, escala: 1.03,
  },
  // Renato: barba cheia grisalha, boné preto, braço tatuado; o mais baixo de todos.
  renato: {
    pele: TONS.pele.clara, cabelo: TONS.cabelo.grisalho, roupa: PRETO, calca: PRETO, estilo: 'boneCurto', cobertura: PRETO,
    barba: true, tatuagem: true, tenis: true, camisaPraFora: true, escala: 0.86,
  },
  // Jota: o maior, forte e gordo; boné preto, barba preta, braço e perna tatuados.
  vocal: {
    pele: TONS.pele.morena, cabelo: TONS.cabelo.preto, roupa: PRETO, calca: PRETO, estilo: 'boneCurto', cobertura: PRETO,
    barba: true, gordo: true, largo: true, tatuagem: true, tatuagemPerna: true, bermuda: true, tenis: true, camisaPraFora: true, escala: 1.08,
  },
  // Duxxo (secreto): careca, branco, da altura do Lingão e maior que o Renato.
  duxxo: {
    pele: TONS.pele.clara, cabelo: TONS.cabelo.castanho, roupa: PRETO, calca: PRETO, estilo: 'careca',
    tatuagem: true, tenis: true, camisaPraFora: true,
  },
  // Felipeles (secreto), antigo baterista: careca com tatuagem na cabeça, magro e bombado, braço fechado; regata e bermuda.
  felipeles: {
    pele: TONS.pele.clara, cabelo: TONS.cabelo.castanho, roupa: PRETO, calca: PRETO, estilo: 'careca',
    tatuagem: true, tatuagemCabeca: true, musculoso: true, regata: true, estampa: true, bermuda: true, tenis: true, meia: true,
    olhos: P.ceu, sobrancelhaCalma: true, camisaPraFora: true,
  },
};

/** O Denão, dono do estúdio no Ipiranga: cabeludo com entradas, bem gordo, bermuda e bota. */
export function spriteDenao(quadro: 0 | 1): Sprite {
  return emCache(`esc-denao-${quadro}`, () => bonecoHD({
    pele: TONS.pele.clara, cabelo: TONS.cabelo.castanho, roupa: PRETO, calca: PRETO, estilo: 'calvo', gordo: true,
    bermuda: true, estampa: true, giro: -0.6, respiro: quadro === 1, pose: 'parado',
  }));
}

/**
 * Golpes de roda punk (crowdkill): gancho, moinho de braço, chute giratório,
 * two-step para andar, pulo de pé alto e voadora; mais apanhar, especial e a
 * dança da vitória.
 */
export type PoseLuta = 'guarda' | 'twostep' | 'soco' | 'soco2' | 'moinho' | 'giro' | 'chute' | 'bicuda' | 'joelhada' | 'gancho' | 'voadora' | 'pulo' | 'apanha' | 'especial' | 'danca';

/** Jazz Bass sunburst no Igor, Telecaster butterscotch no Renato. */
const INSTRUMENTO: Partial<Record<Quem, Boneco['instrumento']>> = {
  igor: { tipo: 'jazzbass', cor: [P.amarelo, P.mostarda, P.ruga] },
  renato: { tipo: 'telecaster', cor: [P.pastel_creme, P.amarelo, P.mostarda] },
  duxxo: { tipo: 'telecaster', cor: [P.concreto, P.asfalto, P.noite] },
};

function poseDoEspecial(quem: Quem): Partial<Boneco> {
  if (quem === 'pucci' || quem === 'felipeles') return { pose: 'baqueta', grito: true };
  if (quem === 'vocal') return { pose: 'microfone', grito: true, quadro: 1 };
  return { instrumento: INSTRUMENTO[quem], pose: 'tocando', quadro: 2 };
}

/** Pose de luta → pose do boneco (para inimigos e chefes, que não dançam nem têm especial). */
const poseFigura = (p: PoseLuta): Pose => (p === 'danca' ? 'maos' : p === 'especial' ? 'guarda' : p === 'bicuda' ? 'chute' : p);
/** Pose de luta + quadro → campos do boneco (guarda quica na ginga, chute arma e estica...). */
function quadroDaPose(p: PoseLuta, f: 0 | 1 | 2 | 3): Partial<Boneco> {
  if (p === 'guarda') return { pose: 'guarda', ginga: f };
  if (p === 'chute') return { pose: 'chute', golpe: f === 0 ? 0 : 1 };
  if (p === 'bicuda') return { pose: 'chute', golpe: 2 };
  if (p === 'gancho') return { pose: 'gancho', golpe: f === 0 ? 0 : 1 };
  return { pose: poseFigura(p), passo: f, grito: p === 'apanha' };
}

/** Giro do corpo em cada quadro do chute giratório: de costas, de lado e o chute de frente. */
const GIRO_CHUTE = [Math.PI, Math.PI * 1.5, 0.25, 0];
/** Voadora giratória: a perna sobe num arco por cima e termina reta (0°), com o corpo girando. */
const VOADORA = [{ a: -30, g: Math.PI }, { a: 40, g: Math.PI * 1.5 }, { a: 80, g: 1.2 }, { a: 0, g: 0 }];

/** Integrante numa pose; `f` é o quadro (passo do two-step, fase do moinho, do giro, da dança). */
export function spriteIntegrante(quem: Quem, pose: PoseLuta, f: 0 | 1 | 2 | 3 = 0, respiro = false, mascara = false): Sprite {
  return emCache(`esc-${quem}-${pose}-${f}-${respiro}-${mascara}`, () => bonecoHD({
    ...VISUAL[quem], giro: GIRO_LUTA, respiro, mascara,
    ...(pose === 'especial' ? poseDoEspecial(quem)
      : pose === 'danca' ? { pose: 'maos', quadro: f, passo: f % 2 ? 1 : 3, grito: f % 2 === 1 }
        : pose === 'moinho' ? { pose, golpe: Math.min(2, f) as 0 | 1 | 2 }
          : pose === 'giro' ? { pose, giro: GIRO_LUTA + GIRO_CHUTE[f] }
            : pose === 'voadora' ? { pose, giro: GIRO_LUTA + VOADORA[f].g, anguloChute: VOADORA[f].a, grito: true }
              : quadroDaPose(pose, f)),
  }));
}

/**
 * Rosto para os ícones (seleção e HUD): o modelo quase de frente, cabeça
 * enquadrada no quadrado. `k` = 1 para o HUD (32 px), 2 para a seleção (64 px).
 */
export function rostoIntegrante(quem: Quem, k: 1 | 2 = 2, mascara = false): Sprite {
  return emCache(`esc-rosto-${quem}-${k}-${mascara}`, () => {
    const g = bonecoHD({ ...VISUAL[quem], escala: k, giro: 0.35, pose: 'parado', mascara });
    const lado = 32 * k, x0 = 13 * k, y0 = 9 * k;
    const cor = new Array(lado * lado).fill(null);
    for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) cor[y * lado + x] = g.cor[(y + y0) * g.w + x + x0] ?? null;
    return { w: lado, h: lado, cor };
  });
}

/** Retrato grande da seleção: três-quartos, segurando o instrumento. */
export function retratoIntegrante(quem: Quem): Sprite {
  return emCache(`esc-retrato-${quem}`, () => bonecoHD({
    ...VISUAL[quem], giro: 0.5,
    ...(quem === 'pucci' ? { pose: 'baqueta' } : quem === 'vocal' ? { pose: 'microfone' } : { instrumento: INSTRUMENTO[quem], pose: 'tocando' }),
  }));
}

// ─── Inimigos: PM, GCM, choque ────────────────────────────

function sorteio(semente: number) {
  let s = (semente * 2654435761 + 0x9e3779b9) >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let z = s; z = Math.imul(z ^ (z >>> 15), z | 1); z ^= z + Math.imul(z ^ (z >>> 7), z | 61); return ((z ^ (z >>> 14)) >>> 0) / 4294967296; };
}

const FARDA_PM: Tom = [P.neblina, P.cimento, P.concreto];
const FARDA_GCM: Tom = [P.azul, P.marinho, P.noite];

function visualInimigo(tipo: Exclude<TipoInimigo, 'fantasma' | 'virus'>, semente: number): Boneco {
  const r = sorteio(semente + tipo.length * 97);
  const de = <T>(l: readonly T[]) => l[Math.floor(r() * l.length)];
  const pele = de(Object.values(TONS.pele));
  switch (tipo) {
    case 'papelao':
      // Boneco de treino da sala de ensaio: papelão e fita crepe.
      return { pele: [P.caramelo_claro, P.caramelo, P.ruga], cabelo: TONS.cabelo.castanho, roupa: [P.pastel_creme, P.papel, P.neblina], calca: [P.caramelo, P.ruga, P.chocolate], estilo: 'capacete', cobertura: [P.caramelo_claro, P.caramelo, P.ruga], viseira: P.vermelho, tenis: true };
    case 'pm':
      // PM: farda cinza de manga comprida, colete à prova de bala, boné cinza, coturno, cassetete.
      return { pele, cabelo: TONS.cabelo.preto, roupa: FARDA_PM, calca: FARDA_PM, estilo: 'boneCurto', cobertura: FARDA_PM, colete: true, gravata: undefined, jaqueta: false, arma: 'cassetete', barba: r() < 0.35, oculos: r() < 0.3, largo: r() < 0.3, mangaLonga: true };
    case 'gcm':
      // GCM: farda azul-marinho, colete, boné azul-marinho.
      return { pele, cabelo: TONS.cabelo.preto, roupa: FARDA_GCM, calca: FARDA_GCM, estilo: 'boneCurto', cobertura: FARDA_GCM, colete: true, barba: r() < 0.3, mangaLonga: true };
    case 'choque':
      // Tropa de choque: capacete de viseira fumê, escudo, preto.
      return { pele, cabelo: TONS.cabelo.preto, roupa: PRETO, calca: PRETO, estilo: 'capacete', cobertura: PRETO, viseira: P.cimento, arma: 'escudo', largo: true, colete: true, mangaLonga: true };
  }
}

export function spriteInimigo(tipo: TipoInimigo, semente: number, pose: PoseLuta | 'tonto', passo: 0 | 1 | 2 | 3 = 0): Sprite {
  if (tipo === 'fantasma') return spriteFantasma(pose === 'soco' || pose === 'soco2' ? 1 : pose === 'apanha' || pose === 'tonto' ? 2 : 0);
  if (tipo === 'virus') return spriteVirus((passo % 2) as 0 | 1, 1, pose === 'apanha' || pose === 'tonto');
  const s = semente % 6;
  return emCache(`esc-ini-${tipo}-${s}-${pose}-${passo}`, () => bonecoHD({
    ...visualInimigo(tipo, s), giro: GIRO_LUTA,
    ...(pose === 'tonto' ? { pose: 'apanha', tonto: true } : quadroDaPose(pose, passo)),
  }));
}

/** Fantasma do mercado: lençol de terno e gravata. 0 flutua, 1 ataca, 2 apanha. */
export function spriteFantasma(q: 0 | 1 | 2): Sprite {
  return emCache(`esc-fantasma-${q}`, () => {
    const e = new Estudio(0.9, 56, 100, 28);
    const lencol = mat(rampa([P.branco, P.papel, P.neblina]), 0.6);
    const chao = 96;
    const inc = q === 1 ? 6 : q === 2 ? -4 : 0;
    e.bola([0, chao - 56, inc * 0.5], 15, 30, 13, lencol, 1, 2.2, (X, Y) => Y < chao - 30 || (Math.floor(Y) + Math.floor(X / 3)) % 3 !== 0);
    e.bola([0, chao - 74, inc], 12, 12, 11, lencol, 2);
    if (q === 1) for (const s of [-1, 1]) e.capsula([s * 10, chao - 58, 2], [s * 6, chao - 62, 18], 3, 2.4, lencol, 3); // bracinhos pra frente
    e.revelar();
    e.pintar((X, y, p, Z) => {
      if (p !== 2 || Z < 6) return null;
      const dy = y - (chao - 76);
      for (const s of [-1, 1]) if (Math.abs(X - s * 4) < 2 && dy >= 0 && dy <= 3) return P.preto;
      if (q === 1 && Math.abs(X) < 3 && dy >= 6 && dy <= 9) return P.preto; // boca aberta
      return null;
    });
    // Gravata vermelha de executivo.
    e.pintar((X, y, p, Z) => (p === 1 && Z > 6 && y > chao - 62 && y < chao - 44 && Math.abs(X) < 1.2 + (y - (chao - 62)) * 0.08 ? P.vermelho : null));
    return e.grade();
  });
}

// ─── Chefões ──────────────────────────────────────────────

/** Técnico de Som folgado: playboy de topete, polo rosa, fone no pescoço, 1,45×. */
export function spriteTecnico(pose: PoseLuta | 'tonto' | 'microfone', passo: 0 | 1 | 2 | 3, bravo: boolean): Sprite {
  return emCache(`esc-tec-${pose}-${passo}-${bravo}`, () => bonecoHD({
    pele: bravo ? [P.pessego, P.caramelo, P.vermelho] : TONS.pele.clara, cabelo: TONS.cabelo.loiro,
    roupa: bravo ? TONS.roupa.vermelha : [P.pastel_rosa, P.neon_rosa, P.vinho], calca: [P.pastel_creme, P.caramelo_claro, P.caramelo],
    estilo: 'topete', fones: true, oculos: !bravo, tenis: true, escala: 1.45, giro: GIRO_LUTA, grito: bravo,
    ...(pose === 'tonto' ? { pose: 'apanha', tonto: true } : pose === 'microfone' ? { pose: 'microfone', grito: true } : quadroDaPose(pose, passo)),
  }));
}

/**
 * A Síndrome do Pequeno Poder: PM vestido de soldadinho de chumbo, quepe alto
 * com penacho, joelheira, caneleira, cotoveleira e ombreira douradas como
 * armadura de cavaleiro. Baixinho; o jogo desenha o banquinho embaixo.
 */
export function spritePequenoPoder(pose: PoseLuta | 'tonto', passo: 0 | 1 | 2 | 3, bravo: boolean): Sprite {
  return emCache(`esc-pp-${pose}-${passo}-${bravo}`, () => bonecoHD({
    pele: bravo ? [P.pessego, P.caramelo, P.vermelho] : TONS.pele.clara, cabelo: TONS.cabelo.preto,
    roupa: [P.laranja, P.vermelho, P.vinho], calca: FARDA_GCM, estilo: 'quepe', cobertura: [P.concreto, P.asfalto, P.noite],
    protecoes: true, colete: false, mangaLonga: true, oculos: !bravo, grito: bravo, arma: 'cassetete', escala: 1.15, giro: GIRO_LUTA,
    ...(pose === 'tonto' ? { pose: 'apanha', tonto: true } : quadroDaPose(pose as PoseLuta, passo)),
  }));
}

/** Vírus: bola com espinhos e cara de bravo. `q` pulsa; `grande` é o chefão. */
export function spriteVirus(q: 0 | 1, escala = 1, ferido = false): Sprite {
  return emCache(`esc-virus-${q}-${escala}-${ferido}`, () => gradeVirus(q, escala, ferido));
}
export function gradeVirus(q: 0 | 1, escala = 1, ferido = false): Grade {
  const L = Math.ceil(56 * escala), A = Math.ceil(56 * escala);
  const e = new Estudio(0.4, L, A, L / 2, escala);
  const corpo = mat(rampa([P.neon_verde, P.folha, P.musgo]), 0.9);
  const ponta = mat(rampa([P.pastel_rosa, P.neon_rosa, P.vinho]), 1.2);
  const r = 14 + q;
  const c: V3 = [0, 28, 0];
  e.bola(c, r, r, r, corpo, 1);
  // Espinhos (proteína spike) em volta.
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, b = ((i * 7) % 5) / 5 - 0.5;
    const d: V3 = [Math.cos(a) * Math.cos(b), Math.sin(a) * Math.cos(b), Math.sin(b) + 0.2];
    e.capsula([c[0] + d[0] * r * 0.8, c[1] + d[1] * r * 0.8, c[2] + d[2] * r * 0.8], [c[0] + d[0] * (r + 7), c[1] + d[1] * (r + 7), c[2] + d[2] * (r + 7)], 1.3, 1, corpo, 2);
    e.bola([c[0] + d[0] * (r + 8), c[1] + d[1] * (r + 8), c[2] + d[2] * (r + 8)], 2.3, 2.3, 2.3, ponta, 3);
  }
  e.revelar();
  e.pintar((X, y, p, Z) => {
    if (p !== 1 || Z < 6) return null;
    const dy = y - 26;
    for (const s of [-1, 1]) {
      if (Math.abs(X - s * 5) < 2.2 && dy >= 0 && dy <= 3) return ferido ? P.amarelo : P.preto;
      if (Math.abs(dy - (-2 - s * (X - s * 5) * 0.5)) < 0.8 && Math.abs(X - s * 5) < 3.5) return P.preto;
    }
    if (Math.abs(X) < 4 && dy >= 7 && dy <= 8) return P.preto;
    return null;
  });
  return e.grade();
}

const METAL_AMARELO = mat(rampa([P.amarelo, P.mostarda, P.ruga]), 1.3);
const METAL_ESCURO = mat(rampa([P.cimento, P.concreto, P.asfalto]), 1.2);
const LARANJA = mat(rampa([P.pessego, P.laranja, P.vermelho]), 0.9);

/**
 * O Pato-Algoritmo (150×150): pato gigante biotech, placas de metal amarelo,
 * circuitos acesos, olho de LED, antena. `quadro`: 0 parado, 1 agachado,
 * 2 esticado no ar, 3 bico aberto (convoca ou dispara o laser).
 */
export function spritePato(quadro: 0 | 1 | 2 | 3): Sprite {
  return emCache(`esc-pato-${quadro}`, () => gradePato(quadro));
}

export function gradePato(quadro: 0 | 1 | 2 | 3): Grade {
  const e = new Estudio(0.95, 150, 150, 72);
  const sx = quadro === 1 ? 1.1 : quadro === 2 ? 0.92 : 1;
  const sy = quadro === 1 ? 0.86 : quadro === 2 ? 1.1 : 1;
  const chao = 146;
  const corpoY = chao - 34 * sy;
  e.bola([0, corpoY, -6], 44 * sx, 33 * sy, 40 * sx, METAL_AMARELO, 1, 2.3);
  e.bola([0, corpoY - 16 * sy, -44 * sx], 11, 16, 10, METAL_ESCURO, 2, 3); // rabo de aletas
  for (const s of [-1, 1]) e.bola([s * 38 * sx, corpoY - 2, 0], 9, 20 * sy, 22, METAL_ESCURO, 3 + (s > 0 ? 1 : 0), 3); // asas blindadas
  const cabY = corpoY - 46 * sy;
  e.capsula([0, corpoY - 14 * sy, 16], [0, cabY + 12, 22], 19, 17, METAL_ESCURO, 5); // pescoço de cabos
  e.bola([0, cabY, 24], 25, 25, 23, METAL_AMARELO, 6, 2.3);
  e.capsula([6, cabY - 22, 18], [10, cabY - 38, 14], 1.2, 0.8, METAL_ESCURO, 10); // antena
  e.bola([10, cabY - 39, 14], 2.6, 2.6, 2.6, mat(rampaDe(P.vermelho), 1.2), 11);
  const aberto = quadro === 3;
  e.bola([0, cabY + 6 - (aberto ? 3 : 0), 48], 13, 5, 13, LARANJA, 7, 2.6);
  e.bola([0, cabY + 12 + (aberto ? 4 : 0), 45], 11, 3.6, 11, LARANJA, 8, 2.6);
  if (aberto) e.bola([0, cabY + 10, 40], 9, 4, 6, mat(rampa([P.neon_ciano, P.azul, P.marinho]), 1), 9);
  // Placas: emendas da lataria.
  e.dobrar((X, y, p) => ((p === 1 || p === 6) && (Math.abs(X) % 14 < 0.9 || (y % 12 === 0)) ? 2 : 0));
  e.revelar();
  // Circuitos acesos na lataria e olho de LED.
  e.pintar((X, y, p, Z) => {
    if ((p === 1 || p === 6) && Z > 4) {
      const lx = Math.round(X), ly = y;
      if ((lx % 14 === 7 && ly % 6 < 4) || (ly % 12 === 6 && lx % 14 > 7)) return P.neon_ciano;
      if (lx % 14 === 7 && ly % 6 === 4) return P.branco; // nó do circuito
    }
    if (p === 5 && Math.round(X * 0.8 + y) % 4 === 0) return P.neon_ciano;
    if (p !== 6 || Z < 30) return null;
    const dy = y - (cabY - 4);
    for (const s of [-1, 1]) {
      const u = X - s * 8;
      if (Math.abs(u) < 5 && dy > -3 && dy < 6) return Math.abs(u - 1) < 1.8 && dy > -1 && dy < 4 ? P.neon_rosa : P.preto; // olho de LED
      if (Math.abs(dy - (-5 - (s * u) * 0.5)) < 1.2 && Math.abs(u) < 6) return P.asfalto; // sobrancelha de metal
    }
    return null;
  });
  return e.grade();
}

/**
 * A Mão Invisível do Mercado (150×120): luva branca translúcida com punho de
 * terno e abotoadura de cifrão. 0 aberta, 1 punho, 2 apontando.
 */
export function spriteMao(pose: 0 | 1 | 2 | 3 | 4): Sprite {
  return emCache(`esc-mao-${pose}`, () => gradeMao(pose));
}

export function gradeMao(pose: 0 | 1 | 2 | 3 | 4): Grade {
  const e = new Estudio(0.35, 150, 120, 70);
  const luva = mat(rampa([P.branco, P.pastel_azul, P.ceu]), 1.1);
  const terno = mat(rampa([P.concreto, P.asfalto, P.noite]), 0.5);
  const camisa = mat(rampa([P.branco, P.papel, P.neblina]), 0.3);
  const base = 104;
  // Punho do terno saindo pela direita, mão espalmada para baixo.
  e.capsula([44, base - 40, 0], [70, base - 54, -4], 15, 16, terno, 1);
  e.capsula([36, base - 37, 0], [42, base - 39, 0], 13.5, 13.5, camisa, 2);
  e.bola([10, base - 30, 0], 26, 14, 18, luva, 3, 2.3); // palma
  // 3 e 4: dedos de mago, mexendo como quem faz feitiço (alternam qual dedo sobe).
  const magia = pose >= 3;
  const dedos: [V3, V3][] = magia
    ? [[-14, base - 26, 12], [-14, base - 26, 4], [-14, base - 26, -4], [-14, base - 26, -12]].map((p, i) => {
      const sobe = (i + pose) % 2 === 0 ? -14 : 6;
      return [p as V3, [p[0] - [26, 32, 30, 22][i], p[1] + sobe, p[2] * 1.4] as V3];
    })
    : pose === 1
    ? [[-12, base - 26, 12], [-12, base - 26, 4], [-12, base - 26, -4], [-12, base - 26, -12]].map((p) => [p as V3, [p[0] - 4, p[1] + 8, p[2]] as V3])
    : pose === 2
      ? [[[-14, base - 30, 10], [-54, base - 34, 12]], ...[[-12, base - 26, 3], [-12, base - 26, -5], [-12, base - 26, -12]].map((p) => [p as V3, [p[0] - 4, p[1] + 8, p[2]] as V3] as [V3, V3])]
      : [[-14, base - 26, 12], [-14, base - 26, 4], [-14, base - 26, -4], [-14, base - 26, -12]].map((p, i) => [p as V3, [p[0] - [30, 36, 34, 26][i], p[1] + 10, p[2] * 1.15] as V3]);
  for (const [a, b] of dedos) e.capsula(a, b, 6, 5, luva, 4);
  e.capsula([18, base - 26, 18], [pose === 0 || magia ? -6 : 0, base - (pose === 4 ? 30 : 16), 26], 6.5, 5, luva, 5); // dedão
  e.revelar();
  // Costura da luva e abotoadura de cifrão.
  e.pintar((X, y, p) => (p === 3 && Math.abs(X - 22) < 0.8 && y < base - 20 ? P.ceu : null));
  e.pintar((X, y, p, Z) => {
    if (p !== 2 || Z < 6) return null;
    const dx = X - 40, dy = y - (base - 40);
    if (Math.abs(dx) < 3 && Math.abs(dy) < 4) return Math.abs(dx) < 0.6 || (Math.abs(dy) < 0.6 || Math.abs(Math.abs(dy) - 2.5) < 0.6) && Math.abs(dx) < 2 ? P.amarelo : P.mostarda;
    return null;
  });
  return e.grade();
}

// ─── Vira-lata caramelo ───────────────────────────────────

/**
 * Vira-lata caramelo de perfil, galope em 4 quadros (alcança, junta, cruza,
 * voa), orelha e rabo balançando; `morde` estica a cabeça com a boca aberta.
 */
export function spriteCaramelo(quadro: 0 | 1 | 2 | 3, morde = false): Sprite {
  return emCache(`esc-dog-${quadro}-${morde}`, () => {
    const e = new Estudio(1.45, 60, 44, 26);
    const pelo = mat(rampa([P.caramelo_claro, P.caramelo, P.ruga]), 0.35);
    const claro = mat(rampa([P.branco, P.pastel_creme, P.caramelo_claro]), 0.2);
    const escuro = mat(rampa([P.concreto, P.asfalto, P.preto]), 0.9);
    const chao = 42;
    const bob = quadro === 1 || quadro === 3 ? -1 : 0;
    const y = (v: number) => v + bob;
    // Tronco: peito fundo, cintura, anca.
    e.bola([0, y(chao - 18), 7], 5.6, 6.2, 5.2, pelo, 1);
    e.bola([0, y(chao - 18), 0], 5, 5.2, 7, pelo, 1);
    e.bola([0, y(chao - 19), -7.5], 5.2, 5.4, 4.8, pelo, 1);
    // Patas: [avanço do pé, quanto sobe] para dianteiras e traseiras em cada quadro do galope.
    const frente = [[9, -1], [2, -5], [-5, 0], [3, -6]][quadro];
    const tras = [[-9, 0], [-2, -5], [5, -1], [-3, -6]][quadro];
    for (const [s, z0, [dz, dy], fase] of [[-1, 7, frente, 0], [1, 7, frente, 1], [-1, -8, tras, 0], [1, -8, tras, 1]] as const) {
      const atraso = fase * 1.2;
      const joelho: V3 = [s * 2.6, y(chao - 10) + dy * 0.5, z0 + (dz - atraso) * 0.45];
      const pe: V3 = [s * 2.6, chao - 1.5 + dy, z0 + dz - atraso];
      e.capsula([s * 2.6, y(chao - 16), z0], joelho, 2.1, 1.7, pelo, 2);
      e.capsula(joelho, pe, 1.7, 1.4, pelo, 2);
      e.bola([pe[0], pe[1], pe[2] + 1], 1.8, 1.4, 2.2, claro, 3, 2.2); // patinha branca
    }
    // Pescoço e cabeça (na mordida a cabeça avança).
    const hz = morde ? 17 : 14;
    e.capsula([0, y(chao - 21), 9], [0, y(chao - 27), hz - 2], 3.8, 3.2, pelo, 4);
    e.bola([0, y(chao - 29), hz], 4.4, 4.2, 4.8, pelo, 5);
    e.capsula([0, y(chao - 28), hz + 3], [0, y(chao - 27), hz + 7.5], 2.6, 1.9, claro, 6);
    e.bola([0, y(chao - 27.5), hz + 8], 1.1, 1, 1.1, escuro, 7);
    if (morde) e.capsula([0, y(chao - 25), hz + 2], [0, y(chao - 23), hz + 7], 1.5, 1.2, mat(rampaDe(P.vinho), 0.3), 8); // boca aberta
    // Orelha caída que balança no galope; para trás na mordida.
    const flop = morde ? -3 : [0, 1, 0, -1][quadro];
    for (const s of [-1, 1]) e.capsula([s * 2.4, y(chao - 32), hz - 1], [s * 3.2, y(chao - 33) + 2 + flop, hz - 4], 1.6, 0.7, mat(rampa([P.caramelo, P.ruga, P.chocolate]), 0.3), 9);
    // Rabo enrolado pra cima, abanando.
    const abana = [0, 1.5, 0, -1.5][quadro];
    e.capsula([0, y(chao - 21), -11], [abana, y(chao - 26), -14], 1.8, 1.4, pelo, 10);
    e.capsula([abana, y(chao - 26), -14], [abana * 1.5, y(chao - 30), -12], 1.4, 0.8, pelo, 10);
    e.recolorir((_X, yy, p, Z) => ((p === 1 && yy > chao - 15 + bob && Z > -3) || (p === 1 && Z > 9) ? claro : null)); // peito e barriga claros
    e.revelar();
    e.pintar((X, yy, p, Z) => (p === 5 && Z > hz + 1 && Math.abs(yy - (chao - 30 + bob)) < 0.6 && X < 1 && X > -2.5 ? P.preto : null)); // olho
    return e.grade();
  });
}

// ─── Comida ───────────────────────────────────────────────

export function spriteItem(item: TipoItem): Sprite {
  if (item === 'caramelo') return spriteCaramelo(0);
  return emCache(`esc-item-${item}`, () => {
    const e = new Estudio(0.6, 28, 30, 14);
    const chao = 28;
    if (item === 'coxinha') {
      const massa = mat(rampa([P.amarelo, P.mostarda, P.ruga]), 0.5);
      e.bola([0, chao - 6, 0], 7, 6.5, 7, massa, 1);
      e.capsula([0, chao - 9, 0], [0, chao - 18, 0], 5.5, 1.5, massa, 1);
      e.dobrar((X, y) => ((Math.round(X * 2) + y) % 3 === 0 ? 1 : 0)); // farinha de rosca
    } else if (item === 'pastel') {
      const massa = mat(rampa([P.pastel_creme, P.amarelo, P.mostarda]), 0.6);
      e.bola([0, chao - 4, 0], 11, 4.5, 7, massa, 1, 2.4);
      e.dobrar((X, y) => (y === chao - 1 && Math.round(X) % 2 === 0 ? 1 : 0));
    } else if (item === 'caldo') {
      const copo = mat(rampa([P.branco, P.papel, P.neblina]), 0.8);
      e.capsula([0, chao - 3, 0], [0, chao - 15, 0], 4.5, 5.5, copo, 1);
      e.recolorir((_X, y) => (y < chao - 13 ? mat(rampa([P.pastel_verde, P.menta, P.folha]), 0.4) : null));
      e.capsula([2, chao - 16, 0], [4, chao - 22, 0], 0.7, 0.7, mat(rampaDe(P.vermelho)), 2);
    } else if (item === 'acai') {
      e.bola([0, chao - 4, 0], 8, 4.5, 8, mat(rampa([P.branco, P.papel, P.neblina]), 0.6), 1, 2.6);
      e.bola([0, chao - 9, 0], 7, 3, 7, mat(rampa([P.neon_roxo, '#5b2a7a', '#2a1238']), 0.6), 2);
      e.dobrar((X, y, p) => (p === 2 && (Math.round(X * 3) + y) % 4 === 0 ? -2 : 0)); // granola
    } else if (item === 'guarana') {
      const lata = mat(rampa([P.neon_verde, P.folha, P.musgo]), 1);
      e.capsula([0, chao - 3, 0], [0, chao - 17, 0], 4.5, 4.5, lata, 1);
      e.recolorir((_X, y) => (y >= chao - 12 && y <= chao - 9 ? mat(rampaDe(P.vermelho), 1) : null));
    } else if (item === 'coco') {
      // Coco verde de praia com canudinho.
      e.bola([0, chao - 9, 0], 9, 9, 9, mat(rampa([P.neon_verde, P.folha, P.musgo]), 0.7), 1);
      e.bola([0, chao - 17, 0], 3.5, 1.2, 3.5, mat(rampa([P.pastel_creme, P.papel, P.neblina]), 0.3), 2, 2);
      e.capsula([1, chao - 17, 0], [4, chao - 27, 0], 0.8, 0.8, mat(rampaDe(P.neon_rosa), 0.6), 3);
    } else if (item === 'cafe') {
      // Cafezinho na xícara, com pires.
      const louca = mat(rampa([P.branco, P.papel, P.neblina]), 1);
      e.bola([0, chao - 2, 0], 10, 1.4, 9, louca, 1, 2.4);
      e.capsula([0, chao - 4, 0], [0, chao - 11, 0], 4.2, 5.4, louca, 2);
      e.bola([0, chao - 11, 0], 4.8, 1, 4.8, mat(rampa([P.ruga, P.chocolate, P.noite]), 1), 3, 2);
      e.capsula([6, chao - 9, 0], [6.5, chao - 5, 0], 1.6, 1.4, louca, 4); // asa
    } else {
      // Energético: lata preta alta com risco verde-neon.
      const lata = mat(rampa([P.concreto, P.asfalto, P.preto]), 1.3);
      e.capsula([0, chao - 2, 0], [0, chao - 21, 0], 4.6, 4.6, lata, 1);
      e.recolorir((_X, y) => (y <= chao - 21 || y >= chao - 3 ? mat(rampa([P.branco, P.neblina, P.cimento]), 1.2) : null));
    }
    e.revelar();
    if (item === 'cafe') { e.pinta(13, chao - 15, P.papel); e.pinta(15, chao - 17, P.papel); e.pinta(14, chao - 19, P.neblina); e.pinta(16, chao - 21, P.neblina); }
    else if (item === 'energetico') e.pintar((X, y, p, Z) => (p === 1 && Z > 1 && y > chao - 19 && y < chao - 5 && Math.abs(X - Math.sin(y * 0.9) * 1.6) < 0.8 ? P.neon_verde : null));
    return e.grade();
  });
}

// ─── Quebráveis ───────────────────────────────────────────

export function spriteQuebravel(tipo: TipoQuebravel, rachado = false): Sprite {
  return emCache(`esc-queb-${tipo}-${rachado}`, () => {
    const grande = tipo === 'orelhao';
    const e = new Estudio(0.6, grande ? 96 : 64, grande ? 112 : 96, grande ? 48 : 32);
    const chao = grande ? 108 : 94;
    if (tipo === 'orelhao') {
      // Orelhão duplo de SP, na escala de gente: duas cúpulas laranja no mesmo poste.
      const ferro = mat(rampa([P.neblina, P.cimento, P.concreto]), 0.8);
      // Na altura de um integrante médio (≈104 px do chão ao topo da cúpula).
      e.capsula([0, chao, -4], [0, chao - 98, -4], 2.4, 2.4, ferro, 1);
      e.capsula([-21, chao - 98, -4], [21, chao - 98, -4], 2, 2, ferro, 1);
      // A cúpula é um ovo cortado embaixo e na frente; por dentro, escuro.
      const casca = (y: number, Z: number) => y > chao - 60 || (Z > 3 && y > chao - 84);
      for (const s of [-1, 1]) {
        e.bola([s * 21, chao - 80, 0], 19, 25, 17, mat(rampa([P.pessego, P.laranja, P.vermelho]), 0.9), 2 + (s > 0 ? 1 : 0), 2.3, (_X, y, Z) => !casca(y, Z));
        e.bola([s * 21, chao - 78, -3], 16.5, 22, 13, mat(rampa([P.vinho, P.noite, P.preto]), 0.2), 5, 2.3); // fundo
        e.bola([s * 21, chao - 74, 1.5], 4, 6.5, 2.5, mat(rampa(PRETO), 0.5), 4, 4); // aparelho
        e.capsula([s * 21 + 3, chao - 68, 2], [s * 21 + 4.5, chao - 62, 2], 0.8, 0.8, mat(rampa(PRETO), 0.3), 4); // fio
        e.capsula([s * 21 - 6, chao - 64, 0.5], [s * 21 + 6, chao - 64, 0.5], 1.3, 1.3, mat(rampa([P.cimento, P.concreto, P.asfalto]), 0.4), 4); // prateleira
      }
    } else if (tipo === 'lixeira') {
      // Lixeira verde cilíndrica, suspensa numa haste preta.
      const haste = mat(rampa([P.concreto, P.asfalto, P.preto]), 0.9);
      e.capsula([0, chao, -6], [0, chao - 64, -6], 1.8, 1.8, haste, 1);
      e.capsula([0, chao - 50, -6], [0, chao - 50, -2], 1.4, 1.4, haste, 1); // braçadeira
      e.capsula([0, chao - 34, 2], [0, chao - 60, 2], 9.5, 9.5, mat(rampa([P.menta, P.folha, P.musgo]), 0.6), 2);
      e.bola([0, chao - 61, 2], 10, 2.2, 10, haste, 3, 2.6);
      e.dobrar((_X, y, p) => (p === 2 && (y === chao - 40 || y === chao - 54) ? 1 : 0));
    } else if (tipo === 'banca') {
      e.bola([0, chao - 30, 0], 26, 30, 14, mat(rampa([P.menta, P.folha, P.musgo]), 0.5), 1, 6);
      e.recolorir((X, y, p, Z) => (p === 1 && Z > 8 && y > chao - 52 && y < chao - 20 ? mat(rampaDe([P.vermelho, P.amarelo, P.azul, P.neon_rosa][Math.abs(Math.floor(X / 6)) % 4]), 0.3) : null));
    } else if (tipo === 'amp') {
      e.bola([0, chao - 22, 0], 20, 22, 12, mat(rampa(PRETO), 0.5), 1, 6);
      e.recolorir((_X, y, p, Z) => (p === 1 && Z > 8 && y > chao - 36 && y < chao - 6 ? mat(rampa([P.cimento, P.concreto, P.asfalto]), 0.2) : null));
    } else if (tipo === 'cone') {
      e.capsula([0, chao - 2, 0], [0, chao - 30, 0], 9, 1.6, mat(rampa([P.pessego, P.laranja, P.vermelho]), 0.7), 1);
      e.recolorir((_X, y) => (y > chao - 20 && y < chao - 15 ? mat(rampa([P.branco, P.papel, P.neblina]), 0.7) : null));
      e.bola([0, chao - 1, 0], 12, 2, 12, mat(rampa(PRETO), 0.3), 2, 6);
    } else {
      e.bola([0, chao - 16, 0], 16, 16, 14, mat(rampa([P.caramelo_claro, P.caramelo, P.ruga]), 0.2), 1, 7);
      e.dobrar((X, y) => (Math.abs(X) % 8 < 0.8 || y % 8 === 0 ? 1 : 0));
    }
    if (rachado) e.dobrar((X, y) => (Math.abs(X - (y % 7) + 3) < 0.7 ? 2 : 0));
    e.revelar();
    return e.grade();
  });
}

/** Silhueta branca do sprite (piscada de dano). */
export function branco(s: Sprite): Sprite {
  const c = document.createElement('canvas');
  c.width = s.width;
  c.height = s.height;
  const g = c.getContext('2d')!;
  g.drawImage(s, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  return c;
}
const brancos = new WeakMap<Sprite, Sprite>();
export function piscada(s: Sprite): Sprite {
  let b = brancos.get(s);
  if (!b) { b = branco(s); brancos.set(s, b); }
  return b;
}
