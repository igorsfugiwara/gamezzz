/**
 * Bonecos HD no acabamento de luta de fliperama (Street Fighter II/III):
 * desenhados direto em 56×118, sem ampliar arte pequena, em pose de
 * três-quartos (corpo virado para a direita) como os lutadores.
 *
 * O corpo é montado em 3D com sólidos simples — elipsoides e caixas
 * arredondadas (superelipsoides) e cápsulas para membros — num esqueleto
 * que anda, bate cabeça e ergue o braço; depois gira no eixo vertical e é
 * projetado na tela. A luz vem de cima e da frente, e cada material tem uma
 * escada de 5 tons (brilho, luz, base, sombra, sombra funda) em faixas duras,
 * com a sombra puxando para o roxo e a luz para o amarelo (hue shift).
 *
 * Acabamento: sombra projetada de uma parte na outra, linha interna onde uma
 * parte passa na frente da outra, limpeza de pixel solto e contorno seletivo.
 * Rosto, estampa, cinto e costuras são pintados em coordenadas do corpo, então
 * acompanham o giro (o olho de lá fica mais estreito, a estampa curva no peito).
 *
 * Tudo dado puro (Grade), como o boneco.ts: dá para testar e exportar.
 */
import { PALETA as P } from './paleta';
import type { Boneco, Grade, Tom } from './boneco';

export const FIG_L = 56;
export const FIG_A = 118;
const W = FIG_L, H = FIG_A;
/** Eixo do corpo na tela (as costas ficam à esquerda, a cara à direita). */
const CX = 27;

// ─── Cor ──────────────────────────────────────────────────

type Rampa = readonly [string, string, string, string, string];

function rgb(c: string): [number, number, number] {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}
function mistura(a: string, b: string, t: number): string {
  const x = rgb(a), y = rgb(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

const QUENTE = '#fff1cf';
const FRIO = '#160f2a';
const SANGUE = '#4a1426';

/** Escada de 5 tons a partir do [luz, base, sombra] da paleta. */
function rampa([l, m, s]: Tom, funda = FRIO): Rampa {
  return [mistura(l, QUENTE, 0.5), l, m, s, mistura(s, funda, 0.5)];
}
/** Escada a partir de uma cor só (listra, gravata, chinelo). */
function rampaDe(c: string): Rampa {
  return [mistura(c, QUENTE, 0.55), mistura(c, QUENTE, 0.22), c, mistura(c, FRIO, 0.35), mistura(c, FRIO, 0.62)];
}

interface Material {
  rampa: Rampa;
  /** Força do reflexo especular (0 = fosco, 1 = couro/capacete). */
  brilho: number;
  /** Mechas de cabelo: listras de luz e sombra seguindo o fio. */
  fios?: boolean;
}
const mat = (r: Rampa, brilho = 0.15, fios = false): Material => ({ rampa: r, brilho, fios });

// ─── Luz (de cima, da frente, um pouco da direita) ────────

const norm = (v: number[]) => { const n = Math.hypot(...v); return v.map((x) => x / n); };
const L = norm([0.3, -0.72, 0.62]);
const MEIO = norm([L[0], L[1], L[2] + 1]);

function tonalizar(nx: number, ny: number, nz: number, m: Material, x: number, y: number): number {
  const n = Math.hypot(nx, ny, nz) || 1;
  nx /= n; ny /= n; nz /= n;
  const v = nx * L[0] + ny * L[1] + nz * L[2];
  let t = v > 0.74 ? 1 : v > 0.28 ? 2 : v > -0.2 ? 3 : 4;
  const esp = Math.max(0, nx * MEIO[0] + ny * MEIO[1] + nz * MEIO[2]) ** 16 * m.brilho;
  if (esp > 0.4) t = 0;
  if (m.fios) {
    // Fio: uma linha escura a cada 4 px, ondulando; mechas de luz no lado iluminado.
    const f = (((x * 2 + Math.round(Math.sin(y * 0.33) * 1.6)) % 8) + 8) % 8;
    if (f < 2) t = Math.min(4, t + 1);
    else if (f === 4 && v > 0.45) t = Math.max(0, t - 1);
  }
  return t;
}

// ─── O estúdio: z-buffer com material, tom e coordenada do corpo ───

const PARTE = {
  cabeca: 1, cabelo: 2, pescoco: 3, tronco: 4, bracoE: 5, bracoD: 6, maoE: 7, maoD: 8,
  pernaE: 9, pernaD: 10, peE: 11, peD: 12, quadril: 13, acessorio: 14, instrumento: 15,
  bau: 16, barba: 17, orelha: 18, dedos: 19, frente: 20, nariz: 21,
} as const;

type V3 = [number, number, number];
const lerp = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Região do corpo: X lateral, y da tela, parte, Z frente/trás e o material do pixel. */
type Regiao<T> = (X: number, y: number, parte: number, Z: number, m: Material) => T;

class Estudio {
  z = new Float32Array(W * H).fill(-1e9);
  tom = new Int8Array(W * H);
  mat: (Material | null)[] = new Array(W * H).fill(null);
  parte = new Int16Array(W * H);
  /** Coordenadas do corpo (antes do giro) do ponto visível em cada pixel. */
  lx = new Float32Array(W * H);
  lz = new Float32Array(W * H);
  final: (string | null)[] = new Array(W * H).fill(null);
  private c: number;
  private s: number;

  constructor(giro: number) {
    this.c = Math.cos(giro);
    this.s = Math.sin(giro);
  }

  /** Corpo → tela: gira em torno do eixo vertical. */
  pt([X, Y, Z]: V3): V3 {
    return [CX + X * this.c + Z * this.s, Y, -X * this.s + Z * this.c];
  }

  private escreve(x: number, y: number, z: number, nx: number, ny: number, nz: number, m: Material, parte: number) {
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return;
    const i = y * W + x;
    if (z <= this.z[i]) return;
    this.z[i] = z;
    this.mat[i] = m;
    this.parte[i] = parte;
    const dx = x + 0.5 - CX;
    this.lx[i] = dx * this.c - z * this.s;
    this.lz[i] = dx * this.s + z * this.c;
    this.tom[i] = tonalizar(nx, ny, nz, m, x, y);
  }

  /**
   * Superelipsoide no espaço do corpo (p = 2 elipsoide; p alto, caixa de
   * canto arredondado), girado junto: acha a superfície marchando no raio.
   * `corte` recebe o ponto em coordenadas do corpo.
   */
  bola(centro: V3, rx: number, ry: number, rz: number, m: Material, parte: number,
    p = 2, corte?: (X: number, Y: number, Z: number) => boolean) {
    const [wx, wy, wz] = this.pt(centro);
    const { c, s } = this;
    const R = Math.max(rx, rz) + 0.5;
    const passo = 0.4;
    for (let y = Math.floor(wy - ry); y <= Math.ceil(wy + ry); y++) {
      const dyN = (y + 0.5 - wy) / ry;
      const ay = Math.abs(dyN) ** p;
      if (ay >= 1) continue;
      for (let x = Math.floor(wx - R); x <= Math.ceil(wx + R); x++) {
        const dx = x + 0.5 - wx;
        const F = (dz: number) => Math.abs((dx * c - dz * s) / rx) ** p + ay + Math.abs((dx * s + dz * c) / rz) ** p;
        let dz = R;
        while (dz >= -R && F(dz) > 1) dz -= passo;
        if (dz < -R) continue;
        let lo = dz, hi = dz + passo;
        for (let k = 0; k < 5; k++) { const mid = (lo + hi) / 2; if (F(mid) <= 1) lo = mid; else hi = mid; }
        dz = lo;
        const LX = dx * c - dz * s, LZ = dx * s + dz * c;
        if (corte && !corte(centro[0] + LX, y + 0.5, centro[2] + LZ)) continue;
        const gx = Math.sign(LX) * Math.abs(LX / rx) ** (p - 1) / rx;
        const gy = Math.sign(dyN) * Math.abs(dyN) ** (p - 1) / ry;
        const gz = Math.sign(LZ) * Math.abs(LZ / rz) ** (p - 1) / rz;
        this.escreve(x, y, wz + dz, gx * c + gz * s, gy, -gx * s + gz * c, m, parte);
      }
    }
  }

  /** Cápsula entre dois pontos do corpo, raio afinando de ra a rb; `kz` < 1 achata. */
  capsula(aC: V3, bC: V3, ra: number, rb: number, m: Material, parte: number, kz = 1, corte?: (x: number, y: number) => boolean) {
    const a = this.pt(aC), b = this.pt(bC);
    const r = Math.max(ra, rb);
    const [ax, ay, az] = a, [bx, by, bz] = b;
    const ux = bx - ax, uy = by - ay;
    const uu = ux * ux + uy * uy || 1;
    for (let y = Math.floor(Math.min(ay, by) - r); y <= Math.ceil(Math.max(ay, by) + r); y++) {
      for (let x = Math.floor(Math.min(ax, bx) - r); x <= Math.ceil(Math.max(ax, bx) + r); x++) {
        if (corte && !corte(x, y)) continue;
        const px = x + 0.5, py = y + 0.5;
        const t = Math.max(0, Math.min(1, ((px - ax) * ux + (py - ay) * uy) / uu));
        const rr = ra + (rb - ra) * t;
        const dx = px - (ax + ux * t), dy = py - (ay + uy * t);
        const dd = dx * dx + dy * dy;
        if (dd >= rr * rr) continue;
        const h = Math.sqrt(rr * rr - dd);
        this.escreve(x, y, az + (bz - az) * t + h * kz, dx, dy, h / kz, m, parte);
      }
    }
  }

  /** Troca o material mantendo o tom, por região do corpo (estampa, listra, cinto). */
  recolorir(se: Regiao<Material | null | undefined>) {
    for (let i = 0; i < W * H; i++) {
      const m0 = this.mat[i];
      if (!m0) continue;
      const m = se(this.lx[i], Math.floor(i / W), this.parte[i], this.lz[i], m0);
      if (m) this.mat[i] = m;
    }
  }

  /** Escurece (+) ou clareia (−) o tom por região do corpo (dobra, costura). */
  dobrar(se: Regiao<number>) {
    for (let i = 0; i < W * H; i++) {
      const m0 = this.mat[i];
      if (!m0) continue;
      const d = se(this.lx[i], Math.floor(i / W), this.parte[i], this.lz[i], m0);
      if (d) this.tom[i] = Math.max(0, Math.min(4, this.tom[i] + d));
    }
  }

  /** Pinta por cima, por região do corpo (rosto, estampa); null deixa como está. */
  pintar(se: Regiao<string | null | undefined>) {
    for (let i = 0; i < W * H; i++) {
      const m0 = this.mat[i];
      if (!m0 || !this.final[i]) continue;
      const c = se(this.lx[i], Math.floor(i / W), this.parte[i], this.lz[i], m0);
      if (c) this.final[i] = c;
    }
  }

  /** Pinta um pixel da tela (estrelinha, nó dos dedos), opcionalmente só sobre uma parte. */
  pinta(x: number, y: number, cor: string, so?: number) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = y * W + x;
    if (so !== undefined && (!this.mat[i] || this.parte[i] !== so)) return;
    this.final[i] = cor;
  }

  /** Sombra projetada, limpeza de pixel solto e linha interna; depois a cor. */
  revelar() {
    const { z, tom, mat, parte } = this;
    const cheio = (i: number) => mat[i] !== null;
    // Sombra projetada: algo bem mais à frente entre o pixel e a luz (que vem de cima e da direita).
    const sombra = new Int8Array(W * H);
    for (let y = 4; y < H; y++) for (let x = 0; x < W - 3; x++) {
      const i = y * W + x;
      if (!cheio(i)) continue;
      for (const [ox, oy] of [[1, -2], [2, -4], [0, -2], [0, -3]]) {
        const j = (y + oy) * W + x + ox;
        if (cheio(j) && parte[j] !== parte[i] && z[j] > z[i] + 3) { sombra[i] = 1; break; }
      }
    }
    for (let i = 0; i < W * H; i++) if (sombra[i]) tom[i] = Math.min(4, tom[i] + 1);
    // Pixel solto: um tom isolado no meio de outro vira o vizinho.
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!cheio(i)) continue;
      const viz = [i - 1, i + 1, i - W, i + W];
      if (viz.some((j) => mat[j] !== mat[i])) continue;
      const t0 = tom[viz[0]];
      if (t0 !== tom[i] && viz.every((j) => tom[j] === t0)) tom[i] = t0;
    }
    // Linha interna: o pixel de trás, colado numa parte bem mais à frente, vira traço.
    const linha: (string | null)[] = new Array(W * H).fill(null);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!cheio(i)) continue;
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (cheio(j) && parte[j] !== parte[i] && z[j] > z[i] + 2.4) {
          linha[i] = mistura(mat[j]!.rampa[4], P.preto, 0.45);
          break;
        }
      }
    }
    for (let i = 0; i < W * H; i++) if (cheio(i)) this.final[i] = linha[i] ?? mat[i]!.rampa[tom[i]];
  }

  /** Contorno de fora: do lado da luz (cima/direita) um tom escuro da cor de dentro; do outro, preto. */
  grade(): Grade {
    const cor = this.final.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (this.final[i]) continue;
      const esq = x > 0 ? this.final[i - 1] : null;
      const baixo = y < H - 1 ? this.final[i + W] : null;
      const dir = x < W - 1 ? this.final[i + 1] : null;
      const cima = y > 0 ? this.final[i - W] : null;
      if (esq || baixo) cor[i] = mistura(esq ?? baixo!, P.preto, 0.72);
      if (dir || cima) cor[i] = P.preto;
    }
    return { w: W, h: H, cor };
  }
}

// ─── O boneco ─────────────────────────────────────────────

const COURO: Tom = [P.concreto, P.asfalto, P.noite];

/** Caveira da estampa (9×8): W osso, K buraco. */
const CAVEIRA = [
  '..WWWWW..',
  '.WWWWWWW.',
  'WWWWWWWWW',
  'WKKWWWKKW',
  'WKKWKWKKW',
  '.WWWKWWW.',
  '..WWWWW..',
  '..W.W.W..',
];

export function figura(b: Boneco): Grade {
  const e = new Estudio(b.giro ?? 0.55);
  const q = b.quadro ?? 0;
  const bang = [0, 2, 5, 2][q];
  const avanco = [0, 2.5, 5, 2.5][q]; // a cabeça vai para a frente no headbang
  const passo = b.passo ?? 0;
  const noAr = passo === 1 ? -1 : passo === 3 ? 1 : 0; // lado (X) da perna no ar
  const bob = noAr ? -1 : 0;
  const balanco = passo === 1 ? 1 : passo === 3 ? -1 : q === 1 ? 1 : q === 3 ? -1 : 0;
  const pose = b.pose ?? (b.instrumento ? 'tocando' : 'parado');
  const larg = b.largo ? 1.25 : 1;
  const soco = q % 2 === 1 ? 2 : 0;

  const pele = mat(rampa(b.pele, SANGUE), 0.35);
  const cabelo = mat(rampa(b.cabelo), 0.55, true);
  const roupa = mat(rampa(b.roupa), 0.1);
  const calca = mat(rampa(b.calca), 0.08);
  const couro = mat(rampa(COURO), 0.9);
  const bota = mat(rampa([P.asfalto, P.noite, P.preto]), 1);
  const metal = mat(rampa([P.branco, P.neblina, P.cimento]), 1);
  const corCobertura = b.cobertura ?? [P.laranja, P.vermelho, P.vinho];
  const cobertura = mat(rampa(corCobertura), 0.6);

  const hy = 24 + bob + bang;
  const hz = avanco;
  const ey = hy + (q === 1 || q === 3 ? 1 : 0);

  // ── Cabeça: crânio, mandíbula comprida (traço Metalocalypse), nariz, orelha.
  e.bola([0, hy - 0.5, hz], 6.9, 9.4, 7.3, pele, PARTE.cabeca, 2.15);
  e.capsula([0, hy + 4, hz + 1.4], [0, hy + 8.8, hz + 2], 5.4, 4, pele, PARTE.cabeca);
  e.capsula([0, ey + 0.6, hz + 6.2], [0.1, ey + 4.6, hz + 8.1], 0.9, 1.35, pele, PARTE.nariz);
  const cobreOrelha = b.estilo === 'cabelao' || b.estilo === 'bone' || b.estilo === 'capacete' || b.estilo === 'lenco';
  if (!cobreOrelha) for (const s of [-1, 1]) e.bola([s * 6.8, ey + 1.6, hz - 1], 1.7, 2.9, 2.2, pele, PARTE.orelha);
  e.capsula([0, hy + 8, hz * 0.4 - 1.5], [0, 41 + bob, -1], 3.3 * larg, 3.7 * larg, pele, PARTE.pescoco);

  // ── Tronco: peito, cintura, ombros e quadril.
  const tronco = b.jaqueta ? couro : roupa;
  e.bola([0, 47 + bob, 1], 11 * larg, 9, 7, tronco, PARTE.tronco, 2.5);
  e.capsula([0, 49 + bob, 0.8], [0, 62 + bob, 0], 7.6 * larg, 7 * (b.largo ? 1.15 : 1), tronco, PARTE.tronco);
  for (const s of [-1, 1]) e.bola([s * 10 * larg, 43 + bob, 1], 4.6, 4.4, 4.4, tronco, PARTE.tronco);
  e.bola([0, 67, 0], 8.2 * (b.largo ? 1.12 : 1), 4.8, 5.8, calca, PARTE.quadril, 2.4);

  // ── Caixa de entrega / mochila nas costas, com alças na frente.
  if (b.bau) {
    const bau = mat(rampa(b.bau), 0.45);
    e.bola([0, 45 + bob, -13.5], 10.5, 12.5, 7.5, bau, PARTE.bau, 7);
    const alca = mat(rampa([b.bau[1], b.bau[2], P.noite]), 0.2);
    for (const s of [-1, 1]) e.capsula([s * 6.2, 38.5 + bob, 3], [s * 7.2, 57 + bob, 7.2], 1.4, 1.4, alca, PARTE.acessorio);
  }

  // ── Pernas: base aberta, a de perto um passo à frente; na caminhada a do ar avança.
  for (const s of [-1, 1]) {
    const ar = noAr === s;
    const apoio = noAr === -s;
    const zBase = s < 0 ? 3.5 : -3;
    const quad: V3 = [s * 4.8, 68, 0];
    const joelho: V3 = ar ? [s * 5.6, 83.5, 8] : apoio ? [s * 6, 86.5, zBase - 0.5] : [s * 6.2, 86.5, zBase + 2.5];
    const tornozelo: V3 = ar ? [s * 6, 99.5, 5.5] : apoio ? [s * 6.5, 104, zBase - 4] : [s * 6.8, 104, zBase];
    const parte = s < 0 ? PARTE.pernaE : PARTE.pernaD;
    if (b.bermuda) {
      e.capsula(quad, lerp(quad, joelho, 0.95), 5.4, 4.6, calca, parte);
      e.capsula(lerp(quad, joelho, 0.9), tornozelo, 3.6, 2.7, pele, parte);
      e.bola(lerp(joelho, tornozelo, 0.3), 2.8, 3.6, 3.2, pele, parte); // panturrilha
    } else {
      e.capsula(quad, joelho, 4.8, 3.9, calca, parte);
      e.capsula(joelho, tornozelo, 3.9, 3.1, calca, parte);
    }
    const sobe = ar ? 4 : 0;
    const pe = s < 0 ? PARTE.peE : PARTE.peD;
    const tz = tornozelo[2];
    if (b.chinelo) {
      e.bola([tornozelo[0], 112.4 - sobe, tz + 2.2], 3, 2.4, 5, pele, pe, 2.3);
      e.bola([tornozelo[0], 115 - sobe, tz + 2], 3.6, 1.2, 6.2, mat(rampaDe(P.amarelo), 0.2), pe, 2.6);
    } else {
      e.capsula([tornozelo[0], tornozelo[1] - 3, tz], [tornozelo[0], 108.5 - sobe, tz + 0.6], 4, 4, bota, pe);
      e.bola([tornozelo[0], 112.2 - sobe, tz + 2.6], 4.3, 3.2, 6.6, bota, pe, 2.4);
    }
  }

  // ── Braços: ombro → cotovelo → pulso → mão, no espaço do corpo.
  type Braco = { o: V3; c: V3; p: V3; m: V3; aberta?: 'chifre' | 'baqueta' };
  const ombro = (s: number): V3 => [s * 10.8 * larg, 42 + bob, 0];
  const caido = (s: number): Braco => {
    const o = ombro(s);
    const frente = noAr === -s; // o braço vai junto com a perna do outro lado
    const tras = noAr === s;
    const c: V3 = [s * 13 * larg, 54 + bob, frente ? 1.5 : tras ? -4 : -2];
    const p: V3 = frente ? [s * 12.2 * larg, 61 + bob, 8] : tras ? [s * 13.2 * larg, 64 + bob, -6] : [s * 12.6 * larg, 64 + bob, 3.5];
    return { o, c, p, m: [p[0], p[1] + 3.2, p[2] + (frente ? 1.5 : 1)] };
  };
  const erguido = (s: number, aberta: Braco['aberta']): Braco => {
    const o = ombro(s);
    const c: V3 = [o[0] + s * 3.2, 31 + soco + bob, 2.5];
    const p: V3 = [o[0] + s * 1.4, 20 + soco + bob, 3.5];
    return { o, c, p, m: [p[0], p[1] - 3, 4], aberta };
  };
  const bracos: Record<number, Braco> = { [-1]: caido(-1), [1]: caido(1) };
  if (pose === 'maos') { bracos[-1] = erguido(-1, 'chifre'); bracos[1] = erguido(1, 'chifre'); }
  else if (pose === 'chifres') bracos[-1] = erguido(-1, 'chifre');
  else if (pose === 'baqueta') { bracos[-1] = erguido(-1, 'baqueta'); bracos[1] = erguido(1, 'baqueta'); }
  else if (pose === 'microfone') {
    const o = ombro(-1);
    bracos[-1] = { o, c: [o[0] + 0.5, 54 + bob, 5], p: [-2.5, ey + 13, hz + 9], m: [-1.6, ey + 13.5, hz + 10.5] };
  } else if (pose === 'tocando') {
    const oe = ombro(-1), od = ombro(1);
    bracos[-1] = { o: oe, c: [oe[0] - 2, 54 + bob, 4], p: [-12, 50.5 + bob, 9], m: [-13, 48.5 + bob, 10.5] };
    bracos[1] = { o: od, c: [od[0] + 2, 55 + bob, 2], p: [8.5, 62 + bob, 10], m: [7, 64 + bob, 11.5] };
  }
  for (const s of [-1, 1]) {
    const br = bracos[s];
    const parte = s < 0 ? PARTE.bracoE : PARTE.bracoD;
    const mao = s < 0 ? PARTE.maoE : PARTE.maoD;
    const g = b.largo ? 0.8 : 0;
    e.capsula(br.o, br.c, 3.6 + g, 3.1 + g, pele, parte);
    e.capsula(br.c, br.p, 3.1 + g, 2.6 + g, pele, parte);
    // Músculo: bíceps e antebraço saltados, para a luz desenhar o volume.
    const bi = lerp(br.o, br.c, 0.62), ante = lerp(br.c, br.p, 0.28);
    e.bola([bi[0], bi[1], bi[2] + 1], 3 + g, 3.4, 3, pele, parte);
    e.bola([ante[0], ante[1], ante[2] + 0.8], 2.7 + g, 3.2, 2.8, pele, parte);
    // Manga: curta na camiseta, inteira na jaqueta e no terno.
    const inteira = b.jaqueta || b.gravata;
    const manga = b.jaqueta ? couro : roupa;
    e.capsula(br.o, inteira ? br.c : lerp(br.o, br.c, 0.5), 4.3 + g, 3.9 + g, manga, parte);
    if (inteira) e.capsula(br.c, lerp(br.c, br.p, 0.85), 3.7 + g, 3.2 + g, manga, parte);
    e.bola(br.m, 3.4 + g * 0.5, 3.8 + g * 0.5, 3.5, pele, mao, 2.3);
    if (br.aberta === 'chifre') {
      // Chifrinho: indicador e mindinho para cima.
      for (const d of [-1, 1]) e.capsula([br.m[0] + d * 1.5, br.m[1] - 2, br.m[2] + 0.5], [br.m[0] + d * 2.3, br.m[1] - 7.5, br.m[2]], 1, 0.8, pele, PARTE.dedos);
    }
    if (br.aberta === 'baqueta') {
      e.capsula([br.m[0] - s * 1.5, br.m[1] + 2, br.m[2] + 2], [br.m[0] + s * 4.5, br.m[1] - 10, br.m[2] + 2], 0.8, 0.55, mat(rampaDe(s < 0 ? P.amarelo : P.mostarda), 0.4), PARTE.acessorio);
    }
  }

  // ── Microfone na frente da boca, com cabo.
  if (pose === 'microfone') {
    e.bola([0.5, ey + 9.4, hz + 11.5], 2.6, 2.6, 2.6, metal, PARTE.acessorio);
    e.capsula([-0.6, ey + 11.5, hz + 11], [-2.5, ey + 17, hz + 9.5], 1.3, 1.1, mat(rampa(COURO), 0.6), PARTE.acessorio);
    e.capsula([-2.5, ey + 17, hz + 9.5], [-6, 72 + bob, 5], 0.6, 0.6, mat(rampa(COURO), 0.2), PARTE.acessorio);
  }

  // ── Instrumento: Flying V ou baixo de bico, atravessado na frente.
  if (b.instrumento) {
    const baixo = b.instrumento.tipo === 'baixo';
    const madeira = mat(rampa([P.ruga, P.chocolate, P.noite]), 0.3);
    const corpo = mat(rampa(b.instrumento.cor), 0.9);
    const ponta: V3 = baixo ? [-18.5, 41 + bob, 8.5] : [-16, 45 + bob, 8.5];
    e.capsula([3, 63 + bob, 9], ponta, 1.3, 1.1, madeira, PARTE.instrumento, 0.6);
    e.bola([ponta[0] - 0.6, ponta[1] - 1, 8.8], 2.4, 2.2, 1, mat(rampa(COURO), 0.6), PARTE.instrumento, 3);
    e.capsula([3, 63.5 + bob, 9.5], [16.5, (baixo ? 57 : 55) + bob, 9], 3.6, 2.2, corpo, PARTE.instrumento, 0.3);
    e.capsula([3, 65.5 + bob, 9.5], [baixo ? 16 : 14, 75 + bob, 9], 3.6, 2.2, corpo, PARTE.instrumento, 0.3);
    e.bola([3.5, 64.5 + bob, 9.6], 4.2, 3.6, 1.2, corpo, PARTE.instrumento, 2.6);
  }

  // ── Cabelo e cobertura.
  const pontaRala = (yFim: number) => (x: number, y: number) => y < yFim - 3 || (x + y) % 3 !== 0;
  const temCabelao = b.estilo === 'cabelao' || b.estilo === 'bone';
  /** Linha do cabelo na testa: desce nos lados, cobre tudo atrás. */
  const linhaCabelo = (desce: number) => (X: number, Y: number, Z: number) =>
    Z < hz + 2 || Y < hy - 4.5 + Math.abs(X) * 0.45 || Math.abs(X) > desce;
  if (temCabelao) {
    e.bola([0, hy - 1.2, hz + 0.2], 7.8, 9.6, 7.9, cabelo, PARTE.cabelo, 2.1, linhaCabelo(5.6));
    // Massa de trás, descendo pelas costas.
    const fimTras = hy + 29 - bang;
    e.bola([0, hy + 12 - bang * 0.5, hz * 0.5 - 5.5], 11, 17, 4.5, cabelo, PARTE.cabelo, 2.2, (X, Y) => Y < fimTras - 3 || Math.round(X * 1.3 + Y) % 3 !== 0);
    // Cortinas da frente, caindo por cima dos ombros, balançando.
    const fecha = q === 1 || q === 3 ? 1.6 : 0;
    for (const s of [-1, 1]) {
      const fim = hy + 25;
      e.capsula([s * (6.3 - fecha), hy - 4, hz + 2.5 + fecha], [s * (8.2 - fecha) + balanco, fim, hz * 0.6 + 3.5 + fecha], 2.6, 3.6, cabelo, PARTE.cabelo, 1, pontaRala(fim + 3.6));
    }
    if (q === 2) {
      // Cabelo despencado na cara.
      const fim = hy + 20;
      e.bola([0, hy + 6, hz + 7.6], 7.8, 14, 1.8, cabelo, PARTE.frente, 2.2, (X, Y) => Y < fim - 3 || Math.round(X * 1.3 + Y) % 2 === 0);
    }
  } else if (b.estilo === 'moicano') {
    // Crista de espetos da testa até a nuca.
    for (let i = 0; i < 6; i++) {
      const zb = hz + 5 - i * 2.1;
      const alt = [7, 11, 13, 12, 9, 6][i];
      e.capsula([0, hy - 8 + Math.abs(i - 2) * 0.6, zb], [balanco * 0.5, hy - 8 - alt, zb - 2.5], 1.9, 0.45, cabelo, PARTE.cabelo);
    }
  } else if (b.estilo === 'coque') {
    e.bola([0, hy - 1.2, hz + 0.2], 7.7, 9.5, 7.8, cabelo, PARTE.cabelo, 2.1, linhaCabelo(6.5));
    e.bola([0, hy - 10.5, hz - 3.5], 3.8, 3.6, 3.8, cabelo, PARTE.cabelo);
  }
  if (b.estilo === 'bone') {
    e.bola([0, hy - 4.5, hz + 0.6], 8.2, 7, 8.2, cobertura, PARTE.acessorio, 2.2, (_X, Y) => Y < hy - 3.4);
    // Aba para a frente.
    e.bola([0, hy - 3.6, hz + 8.5], 6.2, 1.1, 4.5, cobertura, PARTE.acessorio, 2.4);
  } else if (b.estilo === 'lenco') {
    e.bola([0, hy - 2.5, hz + 0.4], 7.8, 8.4, 8, cobertura, PARTE.acessorio, 2.2, (X, Y, Z) => Z < hz || Y < hy - 2.5 + Math.abs(X) * 0.3);
    e.bola([0, hy - 1, hz - 8.2], 2.2, 2, 2, cobertura, PARTE.acessorio);
    e.capsula([0, hy, hz - 8.4], [balanco, hy + 7, hz - 10], 1.4, 0.9, cobertura, PARTE.acessorio);
  } else if (b.estilo === 'capacete') {
    e.bola([0, hy - 0.8, hz + 0.6], 8.6, 10.8, 9.2, mat(rampa(corCobertura), 1), PARTE.acessorio, 2.3);
  }
  if (b.barba) {
    e.bola([0, hy + 6.8, hz + 3.2], 6.6, 6.4, 5, cabelo, PARTE.barba, 2.2, (_X, Y) => Y > ey + 3);
    e.capsula([0, hy + 10, hz + 4.4], [0, hy + 15.5, hz + 4.6], 3.2, 1.8, cabelo, PARTE.barba, 1, pontaRala(hy + 17.3));
  }

  // ── Roupa por cima do volume (em coordenadas do corpo, acompanha o giro).
  const naFrente = (Z: number) => Z > 0;
  if (b.jaqueta) {
    // Jaqueta aberta: camiseta aparecendo no meio.
    e.recolorir((X, y, p, Z) => (p === PARTE.tronco && naFrente(Z) && Math.abs(X) < 3.4 + (y - 40) * 0.05 && y > 38 + bob ? roupa : null));
  }
  if (b.camisa === 'listrada') {
    const listra = mat(rampaDe(b.listra ?? P.preto), 0.1);
    e.recolorir((_X, y, _p, _Z, m) => (m === roupa && Math.floor((y - bob) / 3) % 2 === 1 ? listra : null));
  }
  if (b.gravata) {
    const camisa = mat(rampa([P.branco, P.papel, P.neblina]), 0.05);
    const gravata = mat(rampaDe(b.gravata), 0.3);
    e.recolorir((X, y, p, Z) => {
      if (p !== PARTE.tronco || !naFrente(Z)) return null;
      const d = Math.abs(X);
      const yy = y - bob;
      if (yy < 40 || yy > 61) return null;
      if (d < 1.2 + (yy - 40) * 0.05 && yy < 59 - Math.max(0, d - 0.5) * 2) return gravata;
      return d < 3.4 && yy < 52 ? camisa : null;
    });
  }
  if (b.avental) {
    const avental = mat(rampa([P.branco, P.papel, P.neblina]), 0.05);
    e.recolorir((X, y, p, Z) => {
      if (!naFrente(Z)) return null;
      const d = Math.abs(X);
      if ((p === PARTE.tronco || p === PARTE.quadril) && d < 7 && y > 50 + bob) return avental;
      if ((p === PARTE.pernaE || p === PARTE.pernaD) && d < 8 && y < 78) return avental;
      if (p === PARTE.tronco && d > 4.5 && d < 6 && y < 51 + bob) return avental; // alças
      return null;
    });
  }
  if (b.camisa === 'canarinho') {
    const verde = mat(rampa([P.menta, P.folha, P.musgo]), 0.1);
    e.recolorir((X, y, p, Z) => (p === PARTE.tronco && naFrente(Z) && y < 41 + bob && Math.abs(X) < 5 ? verde : null));
  }
  // Cinto de tacha com fivela.
  const cinto = mat(rampa(COURO), 0.7);
  const fivela = mat(rampaDe(P.amarelo), 1);
  e.recolorir((X, y, p, Z) => {
    if (p !== PARTE.quadril && p !== PARTE.tronco) return null;
    if (b.avental && naFrente(Z) && Math.abs(X) < 7) return null;
    if (y < 63 + bob || y > 64 + bob) return null;
    return naFrente(Z) && Math.abs(X) < 1.8 ? fivela : cinto;
  });
  // Faixa da caixa de entrega e a tampa.
  if (b.bau) {
    const faixa = mat(rampa([P.branco, P.papel, P.neblina]), 0.3);
    e.recolorir((_X, y, p) => (p === PARTE.bau && y >= 43 + bob && y <= 46 + bob ? faixa : null));
    e.dobrar((_X, y, p) => (p === PARTE.bau && (y === 36 + bob || y === 55 + bob) ? 2 : 0));
  }

  // Dobras: pano juntando na cintura, no joelho e na canela; costura do jeans.
  e.dobrar((X, y, p, Z, m) => {
    const d = Math.abs(X);
    if (p === PARTE.tronco && naFrente(Z)) {
      const yy = y - bob;
      if ((yy === 57 || yy === 58) && d > 3 && d < 7 && Math.round(d) % 2 === yy % 2) return 1;
      if (yy > 49 && yy < 53 && Math.abs(d - (60 - yy) * 0.8) < 0.6) return 1;
    }
    if ((p === PARTE.pernaE || p === PARTE.pernaD) && m === calca) {
      const s = p === PARTE.pernaE ? -1 : 1;
      const yy = y + (noAr === s ? 3.5 : 0);
      if ((yy === 86 || yy === 88) && Math.round(X * 2) % 3 === 0) return 1;
      if ((yy === 96 || yy === 99) && Math.round(X) % 2 === 0) return 1;
      if (Math.abs(X - s * 8.4) < 0.7 && yy > 70 && yy < 100) return 2;
    }
    return 0;
  });

  e.revelar();
  const rp = pele.rampa, rc = cabelo.rampa;
  const traco = mistura(rp[4], P.preto, 0.35);
  const sobrancelha = mistura(rc[3], P.preto, 0.5);

  // ── Acabamento à mão, em coordenadas do corpo.
  e.pintar((X, y, p, Z) => {
    const yy = y - bob;
    const d = Math.abs(X);
    // Tachas do cinto.
    if ((p === PARTE.quadril || p === PARTE.tronco) && yy === 63 && d > 2.5 && Math.round(X) % 2 === 0) return P.neblina;
    // Estampa de caveira no peito.
    if (p === PARTE.tronco && b.estampa && (b.camisa ?? 'lisa') === 'lisa' && naFrente(Z)) {
      const i = Math.floor(X + 4.5), j = yy - 45;
      if (i >= 0 && i < 9 && j >= 0 && j < 8) {
        const ch = CAVEIRA[j][i];
        if (ch === 'W') return X < 0 ? P.papel : P.branco;
        if (ch === 'K') return P.preto;
      }
    }
    // Escudinho da amarelinha.
    if (p === PARTE.tronco && b.camisa === 'canarinho' && naFrente(Z) && X > 3 && X < 5.2 && yy >= 45 && yy <= 46) return yy === 45 ? P.ceu : P.azul;
    // Tachas da jaqueta nos ombros.
    if (b.jaqueta && (p === PARTE.tronco || p === PARTE.bracoE || p === PARTE.bracoD) && yy >= 39 && yy <= 41 && d > 8 && d < 13 && Math.round(X * 0.8 + yy) % 2 === 0) return P.neblina;
    // Rasgo no joelho do jeans.
    if (p === PARTE.pernaE && b.calca[1] === P.azul && !b.bermuda && !noAr && yy >= 86 && yy <= 87 && X > -6.5 && X < -4) return yy === 86 ? P.branco : P.papel;
    // Bota: cadarço.
    if ((p === PARTE.peE || p === PARTE.peD) && !b.chinelo && Z > 1 && y >= 100 && y <= 108 && y % 2 === 0 && Math.abs(Math.abs(X) - 5.2) < 1.4) return P.cimento;
    // Chinelo: tira em V.
    if ((p === PARTE.peE || p === PARTE.peD) && b.chinelo && y >= 110 && y <= 112 && Math.abs(Math.abs(X) - 5.3) < 1.6 - (112 - y) * 0.3) return b.listra ?? P.azul;
    // Logo da caixa de entrega: listras na faixa.
    if (p === PARTE.bau && b.bau && yy >= 44 && yy <= 45 && Math.round(Z * 1.5) % 3 === 0) return b.bau[2];
    return null;
  });
  // Mãos: nó dos dedos.
  for (const s of [-1, 1]) {
    const br = bracos[s];
    const [mx, my] = e.pt(br.m);
    const yk = br.aberta ? my - 1 : my + 1;
    for (let i = -1; i <= 1; i++) e.pinta(mx + i, yk, rp[3], s < 0 ? PARTE.maoE : PARTE.maoD);
  }
  // Guitarra: captadores, ponte e trastes.
  if (b.instrumento) {
    for (const [X, Y, c] of [[4, 63, P.preto], [5, 63, P.preto], [7.5, 65, P.preto], [8.5, 65, P.preto], [11, 66.5, P.neblina]] as const) {
      const [x, y] = e.pt([X, Y + bob, 10]);
      e.pinta(x, y, c, PARTE.instrumento);
    }
    for (let i = 1; i < 6; i++) { const [x, y] = e.pt([3 - i * 3.3, 63 + bob - i * 3, 9]); e.pinta(x, y, P.papel, PARTE.instrumento); }
  }

  // ── Rosto, em coordenadas da cara (acompanha o giro e o headbang).
  e.pintar((X, y, p, Z) => {
    const cara = p === PARTE.cabeca;
    if (!cara && p !== PARTE.barba) return null;
    if (Z < hz + 2.2) {
      if (b.estilo === 'moicano' && cara && y < hy - 3 && (y + Math.round(Z)) % 2 === 0) return rc[3]; // raspado
      if (b.estilo === 'careca' && cara && y > ey - 3 && y < ey + 3 && Math.abs(X) > 5) return rc[3]; // costeleta
      return null;
    }
    const dy = y - ey;
    if (cara) {
      if (b.tonto) {
        for (const s of [-1, 1]) {
          const u = X - s * 3;
          if (Math.abs(dy) <= 1 && Math.abs(Math.abs(u) - Math.abs(dy)) < 0.7) return P.amarelo;
        }
      } else if (b.oculos) {
        if (dy >= -1 && dy <= 1 && Math.abs(X) < 5.6 && Math.abs(X) > 0.6) return dy === -1 && (X < -3 || (X > 1.5 && X < 2.5)) ? P.papel : P.preto;
        if (dy === -1 && Math.abs(X) <= 0.6) return P.preto;
      } else {
        for (const s of [-1, 1]) {
          const u = X - s * 3; // 0 no meio do olho
          if (Math.abs(u) <= 2.2 && dy >= -1 && dy <= 1) {
            if (dy === 0 && Math.abs(u) < 1.6) return u > -0.1 && u < 1.4 ? P.preto : P.papel; // pupila olhando para a frente
            return dy === -1 ? rp[4] : rp[3]; // órbita funda
          }
        }
      }
      // Sobrancelha brava em V.
      for (const s of [-1, 1]) {
        const u = X * s;
        if (u > 0.4 && u < 5.6 && Math.abs(dy - (-1.2 - u * 0.42)) < 0.6) return sobrancelha;
      }
      // Maçã do rosto marcada (traço de desenho de metal).
      if (X > 4 && X < 5.2 && dy >= 3 && dy <= 6) return rp[3];
      if (X < -4.2 && X > -5.4 && dy >= 4 && dy <= 5) return rp[3];
    }
    // Boca: careta ou grito.
    if (b.grito) {
      if (X > -2.8 && X < 2.6 && dy >= 7 && dy <= 11) {
        const borda = X < -2 || X > 1.8 || dy === 7 || dy === 11;
        return borda ? traco : dy === 8 ? P.branco : dy >= 10 && X > -1.2 && X < 0.8 ? P.vermelho : P.vinho;
      }
    } else {
      if (X > -2.8 && X < 2.4 && dy === 8) return traco;
      if (dy === 9 && ((X > -3.6 && X < -2.6) || (X > 2.2 && X < 3.2))) return traco;
      if (dy === 9 && X > -2 && X < 1.6 && cara) return rp[1];
    }
    return null;
  });
  // Narina; risca do cabelo; logo do boné; bolinhas do lenço; viseira do capacete.
  e.pintar((X, y, p, Z) => {
    if (p === PARTE.nariz && y >= ey + 5 && X < 0.6) return rp[4];
    if (p === PARTE.cabelo && temCabelao && q !== 2 && Math.abs(X) < 0.6 && y < hy - 4 && Z > hz) return rc[4];
    if (p === PARTE.acessorio && b.estilo === 'bone' && Z > hz + 5 && Math.abs(X) < 1.8 && y >= hy - 8 && y <= hy - 6) return y === hy - 8 ? P.branco : P.papel;
    if (p === PARTE.acessorio && b.estilo === 'lenco' && y < hy - 2 && (Math.round(X) + y) % 3 === 0 && Math.round(Z) % 3 === 0) return P.branco;
    if (p === PARTE.acessorio && b.estilo === 'capacete' && Z > hz + 4 && Math.abs(X) < 6.2) {
      const dy = y - ey;
      if (dy >= -3 && dy <= 3) {
        if (Math.abs(X) > 5.4) return P.preto;
        if (dy === -3) return P.branco;
        if (dy === -2 && X > 1.5 && X < 3.5) return P.branco;
        return dy < 0 ? P.neon_ciano : dy < 2 ? P.ceu : P.marinho;
      }
    }
    return null;
  });
  if (b.tonto) {
    const [x0, y0] = e.pt([0, hy - 13, hz]);
    for (const [x, y] of [[x0 - 9, y0 + 1], [x0 + 8, y0 + 2], [x0, y0 - 1]]) {
      e.pinta(x, y, P.amarelo); e.pinta(x - 1, y, P.mostarda); e.pinta(x + 1, y, P.mostarda); e.pinta(x, y - 1, P.amarelo); e.pinta(x, y + 1, P.mostarda);
    }
  }

  return e.grade();
}
