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
    gordo: true, bermuda: true, tenis: true, meia: true,
  },
  // Pucci: cabelão preto, boné estampado colorido, bigode fino, braço fechado.
  pucci: {
    pele: TONS.pele.clara, cabelo: TONS.cabelo.preto, roupa: PRETO, calca: PRETO, estilo: 'bone', cobertura: PRETO, boneEstampado: true,
    bigode: true, tatuagem: true, tenis: true, escala: 1.03,
  },
  // Renato: barba cheia grisalha, boné preto, braço tatuado; o mais baixo de todos.
  renato: {
    pele: TONS.pele.clara, cabelo: TONS.cabelo.grisalho, roupa: PRETO, calca: PRETO, estilo: 'boneCurto', cobertura: PRETO,
    barba: true, tatuagem: true, tenis: true, escala: 0.86,
  },
  // Jota: o maior, forte e gordo; boné preto, barba preta, braço e perna tatuados.
  vocal: {
    pele: TONS.pele.morena, cabelo: TONS.cabelo.preto, roupa: PRETO, calca: PRETO, estilo: 'boneCurto', cobertura: PRETO,
    barba: true, gordo: true, largo: true, tatuagem: true, tatuagemPerna: true, bermuda: true, tenis: true, escala: 1.08,
  },
  // Duxxo (secreto): careca, branco, da altura do Lingão e maior que o Renato.
  duxxo: {
    pele: TONS.pele.clara, cabelo: TONS.cabelo.castanho, roupa: PRETO, calca: PRETO, estilo: 'careca',
    tatuagem: true, tenis: true,
  },
};

/**
 * Golpes de roda punk (crowdkill): gancho, moinho de braço, chute giratório,
 * two-step para andar, pulo de pé alto e voadora; mais apanhar, especial e a
 * dança da vitória.
 */
export type PoseLuta = 'guarda' | 'twostep' | 'soco' | 'soco2' | 'moinho' | 'giro' | 'chute' | 'pulo' | 'apanha' | 'especial' | 'danca';

/** Jazz Bass sunburst no Igor, Telecaster butterscotch no Renato. */
const INSTRUMENTO: Partial<Record<Quem, Boneco['instrumento']>> = {
  igor: { tipo: 'jazzbass', cor: [P.amarelo, P.mostarda, P.ruga] },
  renato: { tipo: 'telecaster', cor: [P.pastel_creme, P.amarelo, P.mostarda] },
  duxxo: { tipo: 'telecaster', cor: [P.concreto, P.asfalto, P.noite] },
};

function poseDoEspecial(quem: Quem): Partial<Boneco> {
  if (quem === 'pucci') return { pose: 'baqueta', grito: true };
  if (quem === 'vocal') return { pose: 'microfone', grito: true, quadro: 1 };
  return { instrumento: INSTRUMENTO[quem], pose: 'tocando', quadro: 2 };
}

/** Pose de luta → pose do boneco (para inimigos e chefes, que não dançam nem têm especial). */
const poseFigura = (p: PoseLuta): Pose => (p === 'danca' ? 'maos' : p === 'especial' ? 'guarda' : p);

/** Giro do corpo em cada quadro do chute giratório: de costas, de lado e o chute de frente. */
const GIRO_CHUTE = [Math.PI, Math.PI * 1.5, 0];

/** Integrante numa pose; `f` é o quadro (passo do two-step, fase do moinho, do giro, da dança). */
export function spriteIntegrante(quem: Quem, pose: PoseLuta, f: 0 | 1 | 2 | 3 = 0, respiro = false): Sprite {
  return emCache(`esc-${quem}-${pose}-${f}-${respiro}`, () => bonecoHD({
    ...VISUAL[quem], giro: GIRO_LUTA, respiro,
    ...(pose === 'especial' ? poseDoEspecial(quem)
      : pose === 'danca' ? { pose: 'maos', quadro: f, passo: f % 2 ? 1 : 3, grito: f % 2 === 1 }
        : pose === 'moinho' ? { pose, golpe: Math.min(2, f) as 0 | 1 | 2 }
          : pose === 'giro' ? { pose, giro: GIRO_LUTA + GIRO_CHUTE[Math.min(2, f)] }
            : { pose, passo: f, grito: pose === 'apanha' }),
  }));
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

function visualInimigo(tipo: Exclude<TipoInimigo, 'fantasma'>, semente: number): Boneco {
  const r = sorteio(semente + tipo.length * 97);
  const de = <T>(l: readonly T[]) => l[Math.floor(r() * l.length)];
  const pele = de(Object.values(TONS.pele));
  switch (tipo) {
    case 'papelao':
      // Boneco de treino da sala de ensaio: papelão e fita crepe.
      return { pele: [P.caramelo_claro, P.caramelo, P.ruga], cabelo: TONS.cabelo.castanho, roupa: [P.pastel_creme, P.papel, P.neblina], calca: [P.caramelo, P.ruga, P.chocolate], estilo: 'capacete', cobertura: [P.caramelo_claro, P.caramelo, P.ruga], viseira: P.vermelho, tenis: true };
    case 'pm':
      // Policial militar: farda cinza, boné, colete, cassetete.
      return { pele, cabelo: TONS.cabelo.preto, roupa: FARDA_PM, calca: FARDA_PM, estilo: 'boneCurto', cobertura: PRETO, jaqueta: true, arma: 'cassetete', barba: r() < 0.35, oculos: r() < 0.3, largo: r() < 0.3 };
    case 'gcm':
      // Guarda civil: azul-marinho, boné, colete.
      return { pele, cabelo: TONS.cabelo.preto, roupa: FARDA_GCM, calca: FARDA_GCM, estilo: 'boneCurto', cobertura: FARDA_GCM, jaqueta: true, barba: r() < 0.3 };
    case 'choque':
      // Tropa de choque: capacete de viseira fumê, escudo, preto.
      return { pele, cabelo: TONS.cabelo.preto, roupa: PRETO, calca: PRETO, estilo: 'capacete', cobertura: PRETO, viseira: P.cimento, arma: 'escudo', largo: true, jaqueta: true };
  }
}

export function spriteInimigo(tipo: TipoInimigo, semente: number, pose: PoseLuta | 'tonto', passo: 0 | 1 | 2 | 3 = 0): Sprite {
  if (tipo === 'fantasma') return spriteFantasma(pose === 'soco' || pose === 'soco2' ? 1 : pose === 'apanha' || pose === 'tonto' ? 2 : 0);
  const s = semente % 6;
  return emCache(`esc-ini-${tipo}-${s}-${pose}-${passo}`, () => bonecoHD({
    ...visualInimigo(tipo, s), giro: GIRO_LUTA,
    ...(pose === 'tonto' ? { pose: 'apanha', tonto: true } : { pose: poseFigura(pose), passo }),
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
    ...(pose === 'tonto' ? { pose: 'apanha', tonto: true } : pose === 'microfone' ? { pose: 'microfone', grito: true } : { pose: poseFigura(pose), passo }),
  }));
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
export function spriteMao(pose: 0 | 1 | 2): Sprite {
  return emCache(`esc-mao-${pose}`, () => gradeMao(pose));
}

export function gradeMao(pose: 0 | 1 | 2): Grade {
  const e = new Estudio(0.35, 150, 120, 70);
  const luva = mat(rampa([P.branco, P.pastel_azul, P.ceu]), 1.1);
  const terno = mat(rampa([P.concreto, P.asfalto, P.noite]), 0.5);
  const camisa = mat(rampa([P.branco, P.papel, P.neblina]), 0.3);
  const base = 104;
  // Punho do terno saindo pela direita, mão espalmada para baixo.
  e.capsula([44, base - 40, 0], [70, base - 54, -4], 15, 16, terno, 1);
  e.capsula([36, base - 37, 0], [42, base - 39, 0], 13.5, 13.5, camisa, 2);
  e.bola([10, base - 30, 0], 26, 14, 18, luva, 3, 2.3); // palma
  const dedos: [V3, V3][] = pose === 1
    ? [[-12, base - 26, 12], [-12, base - 26, 4], [-12, base - 26, -4], [-12, base - 26, -12]].map((p) => [p as V3, [p[0] - 4, p[1] + 8, p[2]] as V3])
    : pose === 2
      ? [[[-14, base - 30, 10], [-54, base - 34, 12]], ...[[-12, base - 26, 3], [-12, base - 26, -5], [-12, base - 26, -12]].map((p) => [p as V3, [p[0] - 4, p[1] + 8, p[2]] as V3] as [V3, V3])]
      : [[-14, base - 26, 12], [-14, base - 26, 4], [-14, base - 26, -4], [-14, base - 26, -12]].map((p, i) => [p as V3, [p[0] - [30, 36, 34, 26][i], p[1] + 10, p[2] * 1.15] as V3]);
  for (const [a, b] of dedos) e.capsula(a, b, 6, 5, luva, 4);
  e.capsula([18, base - 26, 18], [pose === 0 ? -6 : 0, base - 16, 26], 6.5, 5, luva, 5); // dedão
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

export function spriteCaramelo(quadro: 0 | 1 | 2 | 3, morde = false): Sprite {
  return emCache(`esc-dog-${quadro}-${morde}`, () => {
    const e = new Estudio(1.35, 52, 40, 24);
    const pelo = mat(rampa([P.caramelo_claro, P.caramelo, P.ruga]), 0.3, true);
    const claro = mat(rampa([P.pastel_creme, P.caramelo_claro, P.caramelo]), 0.2);
    const chao = 38;
    e.capsula([0, chao - 16, -9], [0, chao - 17, 7], 7, 7.5, pelo, 1);
    const passo = [0, 3, 0, -3][quadro];
    for (const [s, z, fase] of [[-1, 6, 1], [1, 6, -1], [-1, -7, -1], [1, -7, 1]] as const) {
      e.capsula([s * 3.5, chao - 13, z], [s * 3.5, chao - 1, z + passo * fase], 2, 1.7, pelo, 2);
    }
    const cz = morde ? 17 : 13;
    e.bola([0, chao - 25, cz], 6.5, 6.5, 6.5, pelo, 3);
    e.bola([0, chao - 22, cz + 6], 3.6, 3, 4.5, claro, 4, 2.2);
    for (const s of [-1, 1]) e.bola([s * 4.5, chao - 31, cz - 2], 2, 3.5, 2, pelo, 5); // orelha
    e.capsula([0, chao - 20, -10], [0, chao - 30 + (quadro % 2) * 2, -15], 1.7, 1.2, pelo, 6); // rabo pra cima
    e.recolorir((_X, y, p) => (p === 1 && y > chao - 13 ? claro : null)); // barriga clara
    e.revelar();
    e.pintar((X, y, p, Z) => (p === 3 && Z > cz + 2 && y === chao - 27 && Math.abs(Math.abs(X) - 2.5) < 1 ? P.preto : null));
    e.pintar((_X, y, p, Z) => (p === 4 && Z > cz + 9 && y <= chao - 23 ? P.preto : null));
    if (morde) e.pintar((_X, y, p, Z) => (p === 4 && Z > cz + 6 && y === chao - 20 ? P.branco : null));
    return e.grade();
  });
}

// ─── Comida ───────────────────────────────────────────────

export function spriteItem(item: TipoItem): Sprite {
  if (item === 'caramelo') return spriteCaramelo(0);
  return emCache(`esc-item-${item}`, () => {
    const e = new Estudio(0.6, 26, 30, 13);
    const chao = 28;
    if (item === 'cafe') {
      // Cafezinho de padaria: copinho de plástico branco, café preto e fumaça.
      const copo = mat(rampa([P.branco, P.papel, P.neblina]), 0.8);
      e.capsula([0, chao - 2, 0], [0, chao - 11, 0], 3.6, 4.6, copo, 1);
      e.bola([0, chao - 11, 0], 4.3, 1, 4.3, mat(rampa([P.ruga, P.chocolate, P.noite]), 0.9), 2, 2);
      e.dobrar((_X, y, p) => (p === 1 && y % 3 === 0 ? 1 : 0)); // frisos do copinho
    } else {
      // Energético: lata preta alta com risco verde-neon.
      const lata = mat(rampa([P.concreto, P.asfalto, P.preto]), 1.3);
      e.capsula([0, chao - 2, 0], [0, chao - 21, 0], 4.6, 4.6, lata, 1);
      e.recolorir((_X, y) => (y <= chao - 21 || y >= chao - 3 ? mat(rampa([P.branco, P.neblina, P.cimento]), 1.2) : null));
    }
    e.revelar();
    if (item === 'cafe') { e.pinta(11, chao - 16, P.papel); e.pinta(13, chao - 18, P.papel); e.pinta(12, chao - 20, P.neblina); e.pinta(14, chao - 22, P.neblina); }
    else e.pintar((X, y, p, Z) => (p === 1 && Z > 1 && y > chao - 19 && y < chao - 5 && Math.abs(X - Math.sin(y * 0.9) * 1.6) < 0.8 ? P.neon_verde : null));
    return e.grade();
  });
}

// ─── Quebráveis ───────────────────────────────────────────

export function spriteQuebravel(tipo: TipoQuebravel, rachado = false): Sprite {
  return emCache(`esc-queb-${tipo}-${rachado}`, () => {
    const e = new Estudio(0.6, 64, 96, 32);
    const chao = 94;
    if (tipo === 'orelhao') {
      // Orelhão de SP: cúpula laranja aberta para a frente, no poste, telefone dentro.
      e.capsula([0, chao, -3], [0, chao - 44, -3], 2, 2, mat(rampa([P.neblina, P.cimento, P.concreto]), 0.8), 1);
      e.bola([0, chao - 62, 0], 15, 22, 13, mat(rampa([P.pessego, P.laranja, P.vermelho]), 0.9), 2, 2.2, (_X, Y, Z) => Z < 3 || Y < chao - 74);
      e.bola([0, chao - 58, -4], 4, 8, 3, mat(rampa(PRETO), 0.5), 3, 4);
    } else if (tipo === 'lixeira') {
      e.capsula([0, chao, 0], [0, chao - 26, 0], 1.6, 1.6, mat(rampa([P.neblina, P.cimento, P.concreto]), 0.8), 1);
      e.capsula([0, chao - 30, 0], [0, chao - 48, 0], 9, 10, mat(rampa([P.pessego, P.laranja, P.vermelho]), 0.6), 2);
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
