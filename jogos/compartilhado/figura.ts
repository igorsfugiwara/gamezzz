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

export type Rampa = readonly [string, string, string, string, string];

function rgb(c: string): [number, number, number] {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}
export function mistura(a: string, b: string, t: number): string {
  const x = rgb(a), y = rgb(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

const QUENTE = '#fff1cf';
const FRIO = '#160f2a';
const SANGUE = '#4a1426';

/** Escada de 5 tons a partir do [luz, base, sombra] da paleta. */
export function rampa([l, m, s]: Tom, funda = FRIO): Rampa {
  return [mistura(l, QUENTE, 0.5), l, m, s, mistura(s, funda, 0.5)];
}
/** Escada a partir de uma cor só (listra, gravata, chinelo). */
export function rampaDe(c: string): Rampa {
  return [mistura(c, QUENTE, 0.55), mistura(c, QUENTE, 0.22), c, mistura(c, FRIO, 0.35), mistura(c, FRIO, 0.62)];
}

export interface Material {
  rampa: Rampa;
  /** Força do reflexo especular (0 = fosco, 1 = couro/capacete). */
  brilho: number;
  /** Mechas de cabelo: listras de luz e sombra seguindo o fio. */
  fios?: boolean;
}
export const mat = (r: Rampa, brilho = 0.15, fios = false): Material => ({ rampa: r, brilho, fios });

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
  bau: 16, barba: 17, orelha: 18, dedos: 19, frente: 20, nariz: 21, braco: 22, mao_inst: 23,
} as const;

export type V3 = [number, number, number];
export const lerp = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Região do corpo: X lateral, y da tela, parte, Z frente/trás e o material do pixel. */
type Regiao<T> = (X: number, y: number, parte: number, Z: number, m: Material) => T;

export class Estudio {
  readonly w: number;
  readonly h: number;
  z: Float32Array;
  tom: Int8Array;
  mat: (Material | null)[];
  parte: Int16Array;
  /** Coordenadas do corpo (antes do giro) do ponto visível em cada pixel. */
  lx: Float32Array;
  lz: Float32Array;
  final: (string | null)[];
  private c: number;
  private s: number;
  private cx: number;
  /** Pixels de tela por unidade do corpo (chefão grande = 1,6). */
  readonly k: number;

  constructor(giro: number, w = W, h = H, cx = CX, k = 1) {
    this.w = w;
    this.h = h;
    this.cx = cx;
    this.k = k;
    this.c = Math.cos(giro);
    this.s = Math.sin(giro);
    const n = w * h;
    this.z = new Float32Array(n).fill(-1e9);
    this.tom = new Int8Array(n);
    this.mat = new Array(n).fill(null);
    this.parte = new Int16Array(n);
    this.lx = new Float32Array(n);
    this.lz = new Float32Array(n);
    this.final = new Array(n).fill(null);
  }

  /** Corpo → tela: gira em torno do eixo vertical. */
  pt([X, Y, Z]: V3): V3 {
    const k = this.k;
    return [this.cx + (X * this.c + Z * this.s) * k, Y * k, (-X * this.s + Z * this.c) * k];
  }

  private escreve(x: number, y: number, z: number, nx: number, ny: number, nz: number, m: Material, parte: number) {
    if (x < 1 || y < 1 || x >= this.w - 1 || y >= this.h - 1) return;
    const i = y * this.w + x;
    if (z <= this.z[i]) return;
    this.z[i] = z;
    this.mat[i] = m;
    this.parte[i] = parte;
    const dx = x + 0.5 - this.cx;
    this.lx[i] = (dx * this.c - z * this.s) / this.k;
    this.lz[i] = (dx * this.s + z * this.c) / this.k;
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
    const { c, s, k: kk } = this;
    rx *= kk; ry *= kk; rz *= kk;
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
        if (corte && !corte(centro[0] + LX / kk, (y + 0.5) / kk, centro[2] + LZ / kk)) continue;
        const gx = Math.sign(LX) * Math.abs(LX / rx) ** (p - 1) / rx;
        const gy = Math.sign(dyN) * Math.abs(dyN) ** (p - 1) / ry;
        const gz = Math.sign(LZ) * Math.abs(LZ / rz) ** (p - 1) / rz;
        this.escreve(x, y, wz + dz, gx * c + gz * s, gy, -gx * s + gz * c, m, parte);
      }
    }
  }

  /**
   * Decalque: uma figura 2D (função cor(u, v)) colada num plano do corpo, com
   * origem `o` e eixos `eu`, `ev`. Cada cor vira um material plano: sai na tela
   * exatamente como foi desenhada (pixel art), com contorno e linha interna.
   */
  plano(o: V3, eu: V3, ev: V3, u0: number, u1: number, v0: number, v1: number, cor: (u: number, v: number) => string | null, parte: number) {
    const passo = 0.35 / this.k;
    for (let u = u0; u <= u1; u += passo) for (let v = v0; v <= v1; v += passo) {
      const c = cor(u, v);
      if (!c) continue;
      const [x, y, z] = this.pt([o[0] + u * eu[0] + v * ev[0], o[1] + u * eu[1] + v * ev[1], o[2] + u * eu[2] + v * ev[2]]);
      const xi = Math.floor(x), yi = Math.floor(y);
      if (xi < 1 || yi < 1 || xi >= this.w - 1 || yi >= this.h - 1) continue;
      const i = yi * this.w + xi;
      if (z <= this.z[i]) continue;
      let m = Estudio.chapas.get(c);
      if (!m) { m = mat([c, c, c, c, mistura(c, FRIO, 0.4)], 0); Estudio.chapas.set(c, m); }
      this.z[i] = z; this.mat[i] = m; this.parte[i] = parte; this.tom[i] = 2;
      const dx = x - this.cx;
      this.lx[i] = (dx * this.c - z * this.s) / this.k;
      this.lz[i] = (dx * this.s + z * this.c) / this.k;
    }
  }
  private static chapas = new Map<string, Material>();

  /** Cápsula entre dois pontos do corpo, raio afinando de ra a rb; `kz` < 1 achata. */
  capsula(aC: V3, bC: V3, ra: number, rb: number, m: Material, parte: number, kz = 1, corte?: (x: number, y: number) => boolean) {
    const a = this.pt(aC), b = this.pt(bC);
    ra *= this.k; rb *= this.k;
    const r = Math.max(ra, rb);
    const [ax, ay, az] = a, [bx, by, bz] = b;
    const ux = bx - ax, uy = by - ay;
    const uu = ux * ux + uy * uy || 1;
    for (let y = Math.floor(Math.min(ay, by) - r); y <= Math.ceil(Math.max(ay, by) + r); y++) {
      for (let x = Math.floor(Math.min(ax, bx) - r); x <= Math.ceil(Math.max(ax, bx) + r); x++) {
        if (corte && !corte(Math.floor(x / this.k), Math.floor(y / this.k))) continue;
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
    for (let i = 0; i < this.w * this.h; i++) {
      const m0 = this.mat[i];
      if (!m0) continue;
      const m = se(this.lx[i], Math.floor(Math.floor(i / this.w) / this.k), this.parte[i], this.lz[i], m0);
      if (m) this.mat[i] = m;
    }
  }

  /** Escurece (+) ou clareia (−) o tom por região do corpo (dobra, costura). */
  dobrar(se: Regiao<number>) {
    for (let i = 0; i < this.w * this.h; i++) {
      const m0 = this.mat[i];
      if (!m0) continue;
      const d = se(this.lx[i], Math.floor(Math.floor(i / this.w) / this.k), this.parte[i], this.lz[i], m0);
      if (d) this.tom[i] = Math.max(0, Math.min(4, this.tom[i] + d));
    }
  }

  /** Pinta por cima, por região do corpo (rosto, estampa); null deixa como está. */
  pintar(se: Regiao<string | null | undefined>) {
    for (let i = 0; i < this.w * this.h; i++) {
      const m0 = this.mat[i];
      if (!m0 || !this.final[i]) continue;
      const c = se(this.lx[i], Math.floor(Math.floor(i / this.w) / this.k), this.parte[i], this.lz[i], m0);
      if (c) this.final[i] = c;
    }
  }

  /** Pinta um pixel da tela (estrelinha, nó dos dedos), opcionalmente só sobre uma parte. */
  pinta(x: number, y: number, cor: string, so?: number) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    if (so !== undefined && (!this.mat[i] || this.parte[i] !== so)) return;
    this.final[i] = cor;
  }

  /** Sombra projetada, limpeza de pixel solto e linha interna; depois a cor. */
  revelar() {
    const { z, tom, mat, parte } = this;
    const cheio = (i: number) => mat[i] !== null;
    // Sombra projetada: algo bem mais à frente entre o pixel e a luz (que vem de cima e da direita).
    const sombra = new Int8Array(this.w * this.h);
    for (let y = 4; y < this.h; y++) for (let x = 0; x < this.w - 3; x++) {
      const i = y * this.w + x;
      if (!cheio(i)) continue;
      for (const [ox, oy] of [[1, -2], [2, -4], [0, -2], [0, -3]]) {
        const j = (y + oy) * this.w + x + ox;
        if (cheio(j) && parte[j] !== parte[i] && z[j] > z[i] + 3 * this.k) { sombra[i] = 1; break; }
      }
    }
    for (let i = 0; i < this.w * this.h; i++) if (sombra[i]) tom[i] = Math.min(4, tom[i] + 1);
    // Contraluz: a borda de trás (esquerda), no escuro, ganha um fio de luz que destaca o volume.
    for (let y = 1; y < this.h - 1; y++) for (let x = 1; x < this.w - 1; x++) {
      const i = y * this.w + x;
      if (cheio(i) && !cheio(i - 1) && cheio(i + 1) && tom[i] >= 3 && mat[i]!.rampa[0] !== mat[i]!.rampa[2]) tom[i] -= 1;
    }
    // Pixel solto: um tom isolado no meio de outro vira o vizinho.
    for (let y = 1; y < this.h - 1; y++) for (let x = 1; x < this.w - 1; x++) {
      const i = y * this.w + x;
      if (!cheio(i)) continue;
      const viz = [i - 1, i + 1, i - this.w, i + this.w];
      if (viz.some((j) => mat[j] !== mat[i])) continue;
      const t0 = tom[viz[0]];
      if (t0 !== tom[i] && viz.every((j) => tom[j] === t0)) tom[i] = t0;
    }
    // Linha interna: o pixel de trás, colado numa parte bem mais à frente, vira traço.
    const linha: (string | null)[] = new Array(this.w * this.h).fill(null);
    for (let y = 1; y < this.h - 1; y++) for (let x = 1; x < this.w - 1; x++) {
      const i = y * this.w + x;
      if (!cheio(i)) continue;
      for (const j of [i - 1, i + 1, i - this.w, i + this.w]) {
        if (cheio(j) && parte[j] !== parte[i] && z[j] > z[i] + 2.4 * this.k) {
          linha[i] = mistura(mat[j]!.rampa[4], P.preto, 0.45);
          break;
        }
      }
    }
    for (let i = 0; i < this.w * this.h; i++) if (cheio(i)) this.final[i] = linha[i] ?? mat[i]!.rampa[tom[i]];
  }

  /** Contorno de fora: do lado da luz (cima/direita) um tom escuro da cor de dentro; do outro, preto. */
  grade(): Grade {
    const cor = this.final.slice();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = y * this.w + x;
      if (this.final[i]) continue;
      const esq = x > 0 ? this.final[i - 1] : null;
      const baixo = y < this.h - 1 ? this.final[i + this.w] : null;
      const dir = x < this.w - 1 ? this.final[i + 1] : null;
      const cima = y > 0 ? this.final[i - this.w] : null;
      if (esq || baixo) cor[i] = mistura(esq ?? baixo!, P.preto, 0.72);
      if (dir || cima) cor[i] = P.preto;
    }
    return { w: this.w, h: this.h, cor };
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
  const k = b.escala ?? 1;
  // Com Telecaster/Jazz Bass, o braço do instrumento passa da largura do boneco: a tela cresce para a direita.
  const golpeLongo = b.pose === 'soco' || b.pose === 'soco2' || b.pose === 'chute' || b.pose === 'giro' || b.pose === 'voadora' || b.pose === 'joelhada' || b.pose === 'gancho'
    || b.pose === 'moinho' || b.pose === 'investida' || b.pose === 'lado' || b.pose === 'passinho';
  const extra = b.instrumento?.tipo === 'telecaster' || b.instrumento?.tipo === 'jazzbass' ? 46 : b.pose === 'lado' ? 26 : golpeLongo ? 18 : 0;
  const e = new Estudio(b.giro ?? 0.55, Math.ceil((W + extra) * k), Math.ceil(H * k), CX * k, k);
  const q = b.quadro ?? 0;
  const bang = [0, 2, 5, 2][q];
  const avanco = [0, 2.5, 5, 2.5][q]; // a cabeça vai para a frente no headbang
  const passo = b.passo ?? 0;
  const noAr = b.pose === 'twostep' ? 0 : passo === 1 ? -1 : passo === 3 ? 1 : 0; // lado (X) da perna no ar
  const fg = b.golpe ?? 0;
  /** Agachar (ginga da guarda, gancho armando): o quadril desce e os joelhos dobram. */
  const agacha = b.pose === 'guarda' ? [0, 1, 2, 1][b.ginga ?? 0] : b.pose === 'gancho' ? (fg === 0 ? 3 : -1)
    : b.pose === 'moinho' ? 3 : b.pose === 'lado' ? 4 : b.pose === 'investida' ? 1 : 0;
  const bob = (noAr || (b.pose === 'twostep' && passo % 2 === 1) ? -1 : b.respiro ? 1 : 0) + agacha;
  const balanco = passo === 1 ? 1 : passo === 3 ? -1 : q === 1 ? 1 : q === 3 ? -1 : 0;
  const pose = b.pose ?? (b.instrumento ? 'tocando' : 'parado');
  const larg = b.largo ? 1.25 : 1;
  /** Corpo grande: barriga, braço e perna grossos, cara redonda. */
  const gor = b.gordo ? 1 : 0;
  const soco = q % 2 === 1 ? 2 : 0;
  /** Instrumento clássico (Telecaster, Jazz Bass) em vez do Flying V do DIY. */
  const classico = b.instrumento?.tipo === 'telecaster' || b.instrumento?.tipo === 'jazzbass';
  /** Profundidade do instrumento: na frente da barriga de quem é grande. */
  const zi = 11.5 + gor * 4.5 + (b.largo ? 1.5 : 0);

  const pele = mat(rampa(b.pele, SANGUE), 0.35);
  const cabelo = mat(rampa(b.cabelo), 0.55, true);
  const roupa = mat(rampa(b.roupa), 0.1);
  const calca = mat(rampa(b.calca), 0.08);
  const couro = mat(rampa(COURO), 0.9);
  const bota = b.tenis ? mat(rampa([P.concreto, P.asfalto, P.noite]), 0.35) : mat(rampa([P.asfalto, P.noite, P.preto]), 1);
  const metal = mat(rampa([P.branco, P.neblina, P.cimento]), 1);
  const corCobertura = b.cobertura ?? [P.laranja, P.vermelho, P.vinho];
  const cobertura = mat(rampa(corCobertura), 0.6);

  const apanha = pose === 'apanha';
  // No pulo de show a cabeça vai pra frente e pra baixo.
  const pulo = pose === 'pulo';
  /**
   * Desvio de tronco: [inclinação pra frente, torção (+ = ombro da frente
   * avança), cabeça pra frente, cabeça pra baixo]. Quem bate joga o corpo
   * no golpe; quem chuta tomba pra trás; quem apanha recua.
   */
  const desvio: [number, number, number, number] =
    pulo ? [5, 0, 8, 6]
      : pose === 'soco' ? [4.5, 4, 7, 1.5]
        : pose === 'soco2' ? [5.5, -5.5, 8, 2]
          : pose === 'chute' ? (fg === 2 ? [-5, -2, -4.5, 1.5] : fg === 1 ? [-3, -1, -2.5, 0.5] : [-2, 0, -1.5, 0])
            : pose === 'voadora' ? [-2, 0, 0, 0]
              : pose === 'joelhada' ? [4, 1, 5.5, 1.5]
                : pose === 'gancho' ? (fg === 0 ? [3.5, 3, 4.5, 1.5] : [-2, -4.5, 0, -1.5])
                  : pose === 'moinho' ? [0, 0, 2, 2]
                    : pose === 'investida' ? [2, 2.5, 3, 1]
                      : pose === 'lado' ? [1, fg === 0 ? -3 : 3, 2, 1]
                        : pose === 'passinho' ? [-3.5, fg === 0 ? 1.5 : -1.5, -3, 0]
                    : apanha ? [-3, 0, -3.5, 1]
                      : pose === 'twostep' ? [1.5, 0, 1.5, 0]
                        : pose === 'guarda' ? [1, 0, 1, 0]
                          : [0, 0, 0, 0];
  const [incl, torce, cabZ, cabY] = desvio;
  /**
   * Dobra de verdade: o tronco gira pra frente em torno do quadril (moinho
   * com a cara no chão, arrancada do crowdkill). A cabeça vai junto, em pé.
   */
  const dobra = pose === 'moinho' ? 0.95 : pose === 'investida' ? 0.45 : pose === 'lado' ? 0.3 : 0;
  const piv = 66 + agacha;
  const cd = Math.cos(dobra), sd = Math.sin(dobra);
  const T = (p: V3): V3 => {
    if (!dobra) return p;
    const dy = p[1] - piv;
    return [p[0], piv + dy * cd + p[2] * sd, p[2] * cd - dy * sd];
  };
  /** Raios (vertical, profundidade) de uma peça do tronco depois da dobra. */
  const raios = (ry: number, rz: number): [number, number] => (dobra ? [Math.hypot(ry * cd, rz * sd), Math.hypot(ry * sd, rz * cd)] : [ry, rz]);
  const cabeca = T([0, 24 + bob + bang + cabY, avanco + cabZ]);
  const hy = cabeca[1];
  const hz = cabeca[2];
  const mus = b.musculoso ? 1 : b.magro ? -0.8 : 0;
  const folga = b.folgado ? 1 : 0;
  const ey = hy + (q === 1 || q === 3 ? 1 : 0) + (pulo ? 2 : 0); // no pulo, olhando pra baixo

  // ── Cabeça: crânio, mandíbula comprida (traço Metalocalypse), nariz, orelha.
  e.bola([0, hy - 0.5, hz], 6.9 + gor * 0.7, 9.4, 7.3 + gor * 0.5, pele, PARTE.cabeca, 2.15);
  e.capsula([0, hy + 4, hz + 1.4], [0, hy + 8.8, hz + 2], 5.4 + gor * 1.1, 4 + gor * 1.4, pele, PARTE.cabeca);
  e.capsula([0, ey + 0.6, hz + 6.2], [0.1, ey + 4.6, hz + 8.1], 0.9, 1.35, pele, PARTE.nariz);
  const cobreOrelha = b.estilo === 'cabelao' || b.estilo === 'bone' || b.estilo === 'capacete' || b.estilo === 'lenco' || b.estilo === 'calvo';
  // Alargador na orelha.
  if (b.alargador && !cobreOrelha) for (const s of [-1, 1]) e.bola([s * 7.2, ey + 3.8, hz - 1], 1.1, 1.1, 1.1, mat(rampa([P.concreto, P.asfalto, P.preto]), 0.9), PARTE.acessorio);
  if (!cobreOrelha) for (const s of [-1, 1]) e.bola([s * 6.8, ey + 1.6, hz - 1], 1.7, 2.9, 2.2, pele, PARTE.orelha);
  e.capsula(dobra ? [0, hy + 6, hz - 3.5] : [0, hy + 8, hz * 0.4 - 1.5], T([0, 41 + bob, -1 + incl * 0.8]), 3.3 * larg + gor * 1.4, 3.7 * larg + gor * 1.6, pele, PARTE.pescoco);

  // ── Tronco: peito, cintura, ombros e quadril.
  const tronco = b.jaqueta ? couro : roupa;
  const [ryPeito, rzPeito] = raios(9 + mus * 0.6, 7 + gor * 1.6 + folga);
  e.bola(T([0, 47 + bob, 1 + incl]), 11 * larg + gor * 2.2 + mus * 1.4 + folga * 1.2, ryPeito, rzPeito, tronco, PARTE.tronco, 2.5);
  e.capsula(T([0, 49 + bob, 0.8 + incl * 0.6]), T([0, (folga || b.camisaPraFora ? 69 : 62) + bob, 0]), 7.6 * larg + gor * 3 - mus * 0.8 + folga * 1.4, 7 * (b.largo ? 1.15 : 1) + gor * 3.2 - mus * 0.8 + folga * 1.6, tronco, PARTE.tronco);
  if (gor) e.bola(T([0, 57 + bob, 4 + incl * 0.4]), 10, ...raios(8.5, 7.5), tronco, PARTE.tronco, 2.2); // barriga
  for (const s of [-1, 1]) e.bola(T([s * (10 * larg + gor * 1.6 + mus), 43 + bob, 1 + incl - s * torce]), 4.6 + gor + mus * 1.3, 4.4 + gor * 0.6 + mus, 4.4 + gor + mus, b.regata ? pele : tronco, b.regata ? (s < 0 ? PARTE.bracoE : PARTE.bracoD) : PARTE.tronco);
  e.bola([0, 67 + agacha, 0], 8.2 * (b.largo ? 1.12 : 1) + gor * 2.6, 4.8, 5.8 + gor * 2, calca, PARTE.quadril, 2.4);

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
    const quad: V3 = [s * (4.8 + gor * 1.2), 68 + agacha, 0];
    // Agachado, o joelho desce um pouco e vai pra frente (o pé fica no chão).
    let joelho: V3 = ar ? [s * 5.6, 83.5, 8] : apoio ? [s * 6, 86.5, zBase - 0.5] : [s * 6.2, 86.5 + agacha * 0.5, zBase + 2.5 + agacha * 1.2];
    let tornozelo: V3 = ar ? [s * 6, 99.5, 5.5] : apoio ? [s * 6.5, 104, zBase - 4] : [s * 6.8, 104, zBase];
    /** Pé fora do chão (chute, pulo): o centro da bota. */
    let noAlto: V3 | null = null;
    const chuta = pose === 'chute' || pose === 'giro';
    const armado = pose === 'chute' && (b.golpe ?? 1) === 0;
    const alto = pose === 'chute' && fg === 2;
    if (alto && s < 0) { joelho = [s * 5, 61, 12.5]; tornozelo = [s * 5, 47, 25]; noAlto = [s * 5, 45, 29]; } // bicuda: o pé na altura da cara
    else if (chuta && s < 0 && armado) { joelho = [s * 5, 70, 12]; tornozelo = [s * 5, 84, 10]; noAlto = [s * 5, 86.5, 13.5]; } // perna armada
    else if (chuta && s < 0) { joelho = [s * 5, 69, 13.5]; tornozelo = [s * 5, 66, 27]; noAlto = [s * 5, 65.5, 30.5]; } // perna toda esticada
    else if (chuta) { joelho = [s * 6, 86.5, -3.5]; tornozelo = [s * 6.5, 104, -8]; }
    else if (pose === 'voadora') {
      // Voadora giratória: a perna de perto varre um arco (ângulo em graus, 0 = reta pra frente).
      const a = ((b.anguloChute ?? 0) * Math.PI) / 180;
      const d: V3 = [0, -Math.sin(a), Math.cos(a)];
      const q0: V3 = [s * 5, 67, 0];
      // No alto do arco a perna abre para o lado (senão some atrás do corpo).
      const lado = Math.max(0, Math.sin(a)) * 10;
      if (s < 0) { joelho = [q0[0] - lado * 0.5, q0[1] + d[1] * 15, d[2] * 15 + lado * 0.3]; tornozelo = [q0[0] - lado, q0[1] + d[1] * 29, d[2] * 29 + lado * 0.6]; noAlto = [q0[0] - lado, q0[1] + d[1] * 32.5, d[2] * 32.5 + lado * 0.6]; }
      else { joelho = [s * 5.5, 76, 9]; tornozelo = [s * 5.8, 84, -2]; noAlto = [s * 5.8, 82, -5.5]; } // a outra encolhida
    } else if (pose === 'pulo') {
      // Pulo de show de hardcore: joelhos lá na frente e os pés também à frente
      // (menos que as mãos); o de perto vai mais, o de lá fica encolhido.
      if (s < 0) { joelho = [s * 5.5, 71, 19]; tornozelo = [s * 5.8, 85, 17]; noAlto = [s * 5.8, 87.5, 20.5]; }
      else { joelho = [s * 5.5, 70, 15]; tornozelo = [s * 5.8, 82, 9]; noAlto = [s * 5.8, 82.5, 12.5]; }
    } else if (pose === 'moinho') {
      // Windmill: passada larga (um pé bem na frente, outro bem atrás) e joelhos dobrados.
      const z = s < 0 ? 11 : -10;
      joelho = [s * 7, 85 + agacha * 0.5, z + (s < 0 ? 5 : 2)]; tornozelo = [s * 8, 104, z];
    } else if (pose === 'lado') {
      // Side to side: base bem aberta pros lados e agachada (visto mais de frente).
      joelho = [s * 11, 86.5 + agacha * 0.5, zBase + 3 + agacha * 0.6]; tornozelo = [s * 13, 104, zBase];
    } else if (pose === 'investida') {
      // Arrancada: joelho da frente lá em cima, a de trás estica empurrando o chão.
      if (s < 0) { joelho = [s * 5.5, 78, 15]; tornozelo = [s * 5.8, 92, 11]; noAlto = [s * 5.8, 94, 14.5]; }
      else { joelho = [s * 6, 86, -6]; tornozelo = [s * 6.5, 102, -15]; }
    } else if (pose === 'passinho') {
      // Two step: uma perna chuta baixo pra frente, a outra quica dobrada.
      const chuta = fg === 0 ? s < 0 : s > 0;
      if (chuta) { joelho = [s * 5, 83, 9]; tornozelo = [s * 5.2, 97, 18]; noAlto = [s * 5.2, 98.5, 22]; }
      else { joelho = [s * 6, 87.5, zBase + 2]; tornozelo = [s * 6.5, 104, zBase - 3]; }
    } else if (pose === 'joelhada' && s < 0) {
      // Joelhada no clinch: o joelho sobe na altura da barriga, canela pendurada.
      joelho = [s * 5, 66, 17]; tornozelo = [s * 5.2, 82, 13]; noAlto = [s * 5.2, 84.5, 16.5];
    } else if ((pose === 'soco' || pose === 'soco2' || pose === 'joelhada' || (pose === 'gancho' && fg === 1)) && s > 0) {
      // Perna de trás empurra o golpe: estica pra trás.
      const fundo = pose === 'soco2' || pose === 'gancho' ? 13 : 11;
      joelho = [s * 6, 86.5, -5]; tornozelo = [s * 6.5, 104, -fundo];
    } else if ((pose === 'soco' || pose === 'soco2') && s < 0) {
      joelho = [s * 6.2, 87, 10]; tornozelo = [s * 6.8, 104, 7]; // a da frente dobra, recebendo o peso
    } else if (pose === 'twostep' && ((passo === 1 && s < 0) || (passo === 3 && s > 0))) {
      // Passo: a perna da vez vai quase esticada pra frente, pé pouco acima do chão.
      joelho = [s * 5, 85.5, 5]; tornozelo = [s * 5.2, 102.5, 9.5]; noAlto = [s * 5.2, 104.5, 13];
    } else if (pose === 'twostep' && passo % 2 === 1) {
      // A de apoio fica pra trás: a passada aparece inteira.
      joelho = [s * 6, 86.5, zBase - 1.5]; tornozelo = [s * 6.5, 104, zBase - 4.5];
    }
    const parte = s < 0 ? PARTE.pernaE : PARTE.pernaD;
    if (b.bermuda) {
      // Bermuda folgada: larga e passando do joelho.
      e.capsula(quad, lerp(quad, joelho, folga ? 1.12 : 0.95), 5.4 + gor * 1.4 + folga * 2.2, 4.6 + gor * 1.2 + folga * 2.4, calca, parte);
      e.capsula(lerp(quad, joelho, 0.9), tornozelo, 3.6 + gor, 2.7 + gor * 0.6, pele, parte);
      e.bola(lerp(joelho, tornozelo, 0.3), 2.8 + gor, 3.6, 3.2 + gor, pele, parte); // panturrilha
    } else {
      e.capsula(quad, joelho, 4.8 + gor * 1.4, 3.9 + gor, calca, parte);
      e.capsula(joelho, tornozelo, 3.9 + gor, 3.1 + gor * 0.6, calca, parte);
    }
    if (b.protecoes) {
      const armadura = mat(rampa([P.branco, P.amarelo, P.mostarda]), 1.5);
      e.bola([joelho[0], joelho[1], joelho[2] + 3], 3.8, 3.8, 3, armadura, PARTE.acessorio, 2.4);
      e.capsula(lerp(joelho, tornozelo, 0.25), lerp(joelho, tornozelo, 0.85), 3.6, 3.2, armadura, PARTE.acessorio, 0.7);
    }
    const sobe = ar ? 4 : 0;
    const pe = s < 0 ? PARTE.peE : PARTE.peD;
    const tz = tornozelo[2];
    if (noAlto) {
      if (b.chinelo) e.bola(noAlto, 3, 2.6, 5, pele, pe, 2.3);
      else {
        e.capsula(tornozelo, lerp(tornozelo, noAlto, 0.5), 3.9, 3.9, bota, pe);
        e.bola(noAlto, 4.6, pose === 'chute' ? 4.4 : 3.5, 6, bota, pe, 2.4);
      }
    } else if (b.chinelo) {
      e.bola([tornozelo[0], 112.4 - sobe, tz + 2.2], 3, 2.4, 5, pele, pe, 2.3);
      e.bola([tornozelo[0], 115 - sobe, tz + 2], 3.6, 1.2, 6.2, mat(rampaDe(P.amarelo), 0.2), pe, 2.6);
    } else {
      if (!b.tenis) e.capsula([tornozelo[0], tornozelo[1] - 3, tz], [tornozelo[0], 108.5 - sobe, tz + 0.6], 4, 4, bota, pe);
      else e.capsula([tornozelo[0], 107 - sobe, tz], [tornozelo[0], 109.5 - sobe, tz + 0.6], 3.8, 3.8, bota, pe);
      e.bola([tornozelo[0], 112.2 - sobe, tz + 2.8], 4.7, 3.5, 7.1, bota, pe, 2.4); // coturno parrudo
    }
  }

  // ── Braços: ombro → cotovelo → pulso → mão, no espaço do corpo.
  type Braco = { o: V3; c: V3; p: V3; m: V3; aberta?: 'chifre' | 'baqueta' };
  const ombro = (s: number): V3 => T([s * (10.8 * larg + gor * 1.8), 42 + bob, incl - s * torce]);
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
  /**
   * Guarda alta: punhos colados no rosto (o da frente na frente do queixo,
   * o de trás na bochecha), cotovelos fechados protegendo as costelas.
   */
  const guarda = (s: number, dz = 0): Braco => {
    const o = ombro(s);
    const f = s < 0;
    const z = incl + dz;
    return f
      ? { o, c: [o[0] * 0.92, 51 + bob, 5 + z], p: [s * 3.6, 38.5 + bob, 11 + z], m: [s * 2.8, 35.5 + bob, 13.5 + z] }
      : { o, c: [o[0] * 0.88, 51 + bob, 1 + z], p: [s * 4.6, 37.5 + bob, 7 + z], m: [s * 4, 34.5 + bob, 9.5 + z] };
  };
  /** Braço esticado no soco: o ombro vai junto (torção), o punho passa bem da cara. */
  const estica = (s: number): Braco => {
    const o = ombro(s);
    return { o, c: [o[0] * 0.5, 42.5 + bob, o[2] + 9], p: [s * 2, 42 + bob, o[2] + 18], m: [s * 1.5, 42 + bob, o[2] + 22.5] };
  };
  const bracos: Record<number, Braco> = { [-1]: caido(-1), [1]: caido(1) };
  if (pose === 'moinho') {
    // Windmill: dobrado, os dois braços rodam esticados em círculo vertical,
    // um lá em cima e o outro raspando no chão (opostos), girando pra frente.
    const R = 21;
    const ang = [Math.PI, Math.PI / 2, 0, -Math.PI / 2][fg];
    for (const s of [-1, 1]) {
      const o = ombro(s);
      const a = s < 0 ? ang : ang + Math.PI;
      const m: V3 = [o[0] + s * 3, o[1] + Math.cos(a) * R, o[2] + Math.sin(a) * R];
      const c = lerp(o, m, 0.5);
      bracos[s] = { o, c: [c[0] + s * 2, c[1], c[2]], p: lerp(o, m, 0.86), m };
    }
  } else if (pose === 'investida') {
    // Crowdkill: o braço de trás armado lá atrás pra braçada; o da frente abre caminho.
    const od = ombro(1), oe = ombro(-1);
    bracos[1] = { o: od, c: [13, od[1] - 2, od[2] - 8], p: [12, od[1] - 9, od[2] - 14], m: [11, od[1] - 11, od[2] - 16.5] };
    bracos[-1] = { o: oe, c: [oe[0] * 0.7, oe[1] + 6, oe[2] + 9], p: [-4, oe[1] + 8, oe[2] + 16], m: [-3.5, oe[1] + 8, oe[2] + 19.5] };
  } else if (pose === 'lado') {
    // Side to side: os dois braços varrem na altura do peito pro mesmo lado.
    const lado = fg === 0 ? 1 : -1;
    for (const s of [-1, 1]) {
      const o = ombro(s);
      const fora = s === lado; // o braço desse lado vai aberto; o outro cruza o peito
      // (o lado esquerdo da tela é a âncora do sprite: o braço de lá abre um pouco menos)
      const m: V3 = fora ? [s < 0 ? -22 : 29, o[1] + 1, o[2] + 3] : [lado * 10, o[1] + 6, o[2] + 13];
      const c: V3 = fora ? [s * 20, o[1] + 1, o[2] + 1] : [s * 3, o[1] + 8, o[2] + 10];
      bracos[s] = { o, c, p: lerp(c, m, 0.8), m };
    }
  } else if (pose === 'passinho') {
    // Two step: braços balançam ao contrário das pernas, como corrida no lugar.
    for (const s of [-1, 1]) {
      const o = ombro(s);
      const frente = fg === 0 ? s > 0 : s < 0;
      bracos[s] = frente
        ? { o, c: [s * 11, o[1] + 9, o[2] + 7], p: [s * 6, o[1] + 4, o[2] + 15], m: [s * 5, o[1] + 2, o[2] + 18] }
        : { o, c: [s * 13, o[1] + 11, o[2] - 5], p: [s * 13, o[1] + 18, o[2] - 9], m: [s * 13, o[1] + 21, o[2] - 9.5] };
    }
  } else if (pose === 'giro' || pose === 'voadora') {
    // Chute giratório: braços abertos pra dar o giro.
    for (const s of [-1, 1]) { const o = ombro(s); bracos[s] = { o, c: [s * 15, 44 + bob, 0], p: [s * 19, 43 + bob, 1], m: [s * 21.5, 43 + bob, 1] }; }
  } else if (pose === 'pulo') {
    // Mãos pra frente, na altura dos joelhos, junto com eles.
    for (const s of [-1, 1]) { const o = ombro(s); const z = s < 0 ? 0 : -2; bracos[s] = { o, c: [o[0] * 0.85, 43 + bob, 12 + z + incl], p: [s * 6, 42 + bob, 24 + z], m: [s * 5.5, 42 + bob, 27.5 + z] }; }
  }
  else if (pose === 'twostep') {
    // Anda de guarda alta: os punhos só balançam um tico com o passo.
    for (const s of [-1, 1]) {
      const frente = (passo === 1 && s > 0) || (passo === 3 && s < 0);
      const tras = (passo === 1 && s < 0) || (passo === 3 && s > 0);
      bracos[s] = guarda(s, frente ? 1.5 : tras ? -1 : 0);
    }
  } else if (pose === 'chute' && fg === 2) {
    // Bicuda: o braço da frente desce pra trás pra equilibrar, o outro guarda.
    const o = ombro(-1);
    bracos[-1] = { o, c: [-13, 52 + bob, o[2] - 3], p: [-13.5, 60 + bob, o[2] - 6], m: [-13.5, 63.5 + bob, o[2] - 6.5] };
    bracos[1] = guarda(1);
  } else if (pose === 'joelhada') {
    // Clinch: as duas mãos puxam a cabeça do outro pra baixo, contra o joelho.
    for (const s of [-1, 1]) { const o = ombro(s); bracos[s] = { o, c: [o[0] * 0.8, 47 + bob, o[2] + 7], p: [s * 4, 45 + bob, o[2] + 15], m: [s * 3.5, 47 + bob, o[2] + 18.5] }; }
  } else if (pose === 'gancho') {
    // Gancho de baixo pra cima com a mão de trás: arma lá embaixo e explode até o queixo do outro.
    const o = ombro(1);
    bracos[1] = fg === 0
      ? { o, c: [12, 56 + bob, o[2] + 2], p: [7, 60 + bob, o[2] + 8], m: [6, 60.5 + bob, o[2] + 10.5] }
      : { o, c: [6, 40 + bob, o[2] + 12], p: [3, 28 + bob, o[2] + 17], m: [2.5, 23.5 + bob, o[2] + 18.5] };
    // O outro braço puxa pra baixo, junto do corpo, pra dar o tranco.
    bracos[-1] = fg === 0 ? guarda(-1) : { o: ombro(-1), c: [-12, 53 + bob, incl - 1], p: [-8, 50 + bob, incl + 6], m: [-7, 48 + bob, incl + 8] };
  } else if (pose === 'guarda' || pose === 'chute') { bracos[-1] = guarda(-1); bracos[1] = guarda(1); }
  else if (pose === 'soco') { bracos[-1] = estica(-1); bracos[1] = guarda(1); }
  else if (pose === 'soco2') { bracos[-1] = guarda(-1); bracos[1] = estica(1); }
  else if (apanha) {
    for (const s of [-1, 1]) { const o = ombro(s); bracos[s] = { o, c: [s * 13, 50 + bob, -5], p: [s * 12.5, 57 + bob, -10], m: [s * 12.5, 60 + bob, -11.5] }; }
  } else if (pose === 'maos') { bracos[-1] = erguido(-1, 'chifre'); bracos[1] = erguido(1, 'chifre'); }
  else if (pose === 'chifres') bracos[-1] = erguido(-1, 'chifre');
  else if (pose === 'baqueta') { bracos[-1] = erguido(-1, 'baqueta'); bracos[1] = erguido(1, 'baqueta'); }
  else if (pose === 'microfone') {
    const o = ombro(-1);
    bracos[-1] = { o, c: [o[0] + 0.5, 54 + bob, 5], p: [-2.5, ey + 13, hz + 9], m: [-1.6, ey + 13.5, hz + 10.5] };
  } else if (pose === 'tocando' && classico) {
    // Telecaster/Jazz Bass: mão no braço lá na frente, a outra palhetando no corpo.
    const oe = ombro(-1), od = ombro(1);
    // Palhetada entre os captadores (não em cima do corpo todo); mão esquerda no meio do braço.
    bracos[-1] = { o: oe, c: [oe[0] - 3, 56 + bob, zi - 5], p: [-3.5, 62 + bob, zi + 1.5], m: [-0.5, 64.5 + bob, zi + 2.5] };
    bracos[1] = { o: od, c: [od[0] + 2, 57 + bob, zi - 4], p: [20, 56 + bob, zi + 1], m: [24, 53.5 + bob, zi + 2] };
  } else if (pose === 'tocando') {
    const oe = ombro(-1), od = ombro(1);
    bracos[-1] = { o: oe, c: [oe[0] - 2, 54 + bob, 4], p: [-12, 50.5 + bob, 9], m: [-13, 48.5 + bob, 10.5] };
    bracos[1] = { o: od, c: [od[0] + 2, 55 + bob, 2], p: [8.5, 62 + bob, 10], m: [7, 64 + bob, 11.5] };
  }
  for (const s of [-1, 1]) {
    const br = bracos[s];
    const parte = s < 0 ? PARTE.bracoE : PARTE.bracoD;
    const mao = s < 0 ? PARTE.maoE : PARTE.maoD;
    const g = (b.largo ? 0.8 : 0) + gor * 0.9 + mus * 0.7;
    e.capsula(br.o, br.c, 3.6 + g, 3.1 + g, pele, parte);
    e.capsula(br.c, br.p, 3.1 + g, 2.6 + g, pele, parte);
    // Músculo: bíceps e antebraço saltados, para a luz desenhar o volume.
    const bi = lerp(br.o, br.c, 0.62), ante = lerp(br.c, br.p, 0.28);
    e.bola([bi[0], bi[1], bi[2] + 1], 3 + g + mus * 1.2, 3.4 + mus, 3 + mus, pele, parte);
    e.bola([ante[0], ante[1], ante[2] + 0.8], 2.7 + g + mus * 0.6, 3.2 + mus * 0.5, 2.8 + mus * 0.5, pele, parte);
    // Manga: curta na camiseta (larga e comprida se folgada), inteira na jaqueta e no terno.
    const inteira = b.jaqueta || b.gravata || b.mangaLonga;
    const manga = b.jaqueta ? couro : roupa;
    if (!b.regata) e.capsula(br.o, inteira ? br.c : lerp(br.o, br.c, folga ? 0.85 : 0.5), 4.3 + g + folga * 1.6, 3.9 + g + folga * 2, manga, parte);
    if (b.protecoes) {
      const armadura = mat(rampa([P.branco, P.amarelo, P.mostarda]), 1.5);
      e.bola([br.c[0], br.c[1], br.c[2] - 1.5], 3.4, 3.4, 3, armadura, PARTE.acessorio, 2.4); // cotoveleira
      e.bola([br.o[0] * 1.05, br.o[1] - 1.5, br.o[2]], 5.4, 4, 5, armadura, PARTE.acessorio, 2.6); // ombreira de cavaleiro
    }
    if (inteira) e.capsula(br.c, lerp(br.c, br.p, 0.85), 3.7 + g, 3.2 + g, manga, parte);
    e.bola(br.m, 3.9 + g * 0.5, 4.2 + g * 0.5, 3.9, pele, mao, 2.3); // mão de fliperama: grande e quadrada
    if (br.aberta === 'chifre') {
      // Chifrinho: indicador e mindinho para cima.
      for (const d of [-1, 1]) e.capsula([br.m[0] + d * 1.5, br.m[1] - 2, br.m[2] + 0.5], [br.m[0] + d * 2.3, br.m[1] - 7.5, br.m[2]], 1, 0.8, pele, PARTE.dedos);
    }
    if (br.aberta === 'baqueta') {
      e.capsula([br.m[0] - s * 1.5, br.m[1] + 2, br.m[2] + 2], [br.m[0] + s * 4.5, br.m[1] - 10, br.m[2] + 2], 0.8, 0.55, mat(rampaDe(s < 0 ? P.amarelo : P.mostarda), 0.4), PARTE.acessorio);
    }
  }

  // ── Fone de ouvido no pescoço (técnico de som).
  if (b.fones) {
    const fone = mat(rampa([P.concreto, P.asfalto, P.preto]), 0.9);
    e.capsula([-5, hy + 12, hz * 0.4 + 1], [5, hy + 12, hz * 0.4 + 1], 0.9, 0.9, fone, PARTE.acessorio);
    for (const s of [-1, 1]) e.bola([s * 5.2, hy + 13, hz * 0.4 + 2], 2.6, 2.6, 1.8, fone, PARTE.acessorio);
  }
  // ── Cassetete na mão de perto, ou escudo de choque no braço.
  if (b.arma === 'cassetete') {
    const m = bracos[-1].m;
    e.capsula([m[0], m[1] + 1, m[2] + 1], [m[0] - 1, m[1] - 3, m[2] + 12], 1, 0.9, mat(rampa([P.concreto, P.asfalto, P.preto]), 0.8), PARTE.acessorio);
  } else if (b.arma === 'escudo') {
    e.bola([-6, 60 + bob, 14], 8.5, 17, 1.5, mat(rampa([P.branco, P.neblina, P.cimento]), 1.2), PARTE.acessorio, 3);
  }

  // ── Microfone na frente da boca, com cabo.
  if (pose === 'microfone') {
    e.bola([0.5, ey + 9.4, hz + 11.5], 2.6, 2.6, 2.6, metal, PARTE.acessorio);
    e.capsula([-0.6, ey + 11.5, hz + 11], [-2.5, ey + 17, hz + 9.5], 1.3, 1.1, mat(rampa(COURO), 0.6), PARTE.acessorio);
    e.capsula([-2.5, ey + 17, hz + 9.5], [-6, 72 + bob, 5], 0.6, 0.6, mat(rampa(COURO), 0.2), PARTE.acessorio);
  }

  // ── Instrumento clássico de destro, desenhado como pixel art e colado no plano
  // da frente do corpo: Telecaster ou Jazz Bass, braço subindo uns 22° para o
  // lado esquerdo de quem toca (+X). `u` corre do fundo do corpo até a mão.
  if (b.instrumento && classico) {
    const jazz = b.instrumento.tipo === 'jazzbass';
    const th = (22 * Math.PI) / 180;
    const eu: V3 = [Math.cos(th), -Math.sin(th), 0];
    const ev: V3 = [Math.sin(th), Math.cos(th), 0];
    const o: V3 = [-7.5, 66.5 + bob, zi];
    const [cl, cm, cs] = b.instrumento.cor;
    const elipse = (u: number, v: number, cu: number, cv: number, ru: number, rv: number) => ((u - cu) / ru) ** 2 + ((v - cv) / rv) ** 2 <= 1;
    const corpo = (u: number, v: number) => jazz
      ? (elipse(u, v, -1.5, 0.4, 9.6, 9.2) || elipse(u, v, 8.5, -0.3, 7.6, 7) || elipse(u, v, 14.6, -4.6, 3.6, 2.4) || elipse(u, v, 13.2, 5, 2.8, 2.1))
        && !elipse(u, v, 4.5, -10.3, 3.6, 3.2) && !elipse(u, v, 4.5, 10.6, 3.6, 3.2)
      : (elipse(u, v, -1.5, 0.3, 9.2, 8.6) || (u > -2 && u < 12.5 && v > -7.6 && v < 6.6 && !(u > 8 && v > 2.4 - (u - 8) * 0.25)) || elipse(u, v, 12.6, -4.6, 2.6, 2.8))
        && !elipse(u, v, 13.4, 4.2, 4.2, 3.4);
    const NECK0 = jazz ? 14 : 11.5, NECK1 = jazz ? 43 : 37;
    const braco = (u: number, v: number) => u >= NECK0 && u <= NECK1 && Math.abs(v) <= 1.5 + (NECK1 - u) * 0.012;
    const cabeca = (u: number, v: number) => jazz
      ? u > NECK1 && u < NECK1 + 9 && v > -1.9 && v < 2.6 + (u - NECK1) * 0.05
      : u > NECK1 && u < NECK1 + 7.2 && v > -1.5 && v < 2.6;
    // Tamanho real: Jazz Bass ≈ 2/3 da altura de quem toca, Tele um pouco menor.
    const S = 1.22;
    e.plano(o, eu, ev, -12 * S, (NECK1 + 10) * S, -12 * S, 12 * S, (uu, vv) => {
      const u = uu / S, v = vv / S;
      if (cabeca(u, v)) {
        const borda = v > (jazz ? 2.1 : 2.1);
        if (borda && (Math.round((u - NECK1) * 1.1) % (jazz ? 2 : 1) === 0)) return P.neblina; // tarraxas
        return jazz ? P.chocolate : P.pastel_creme;
      }
      if (braco(u, v)) {
        if (Math.abs(v) > 1.25) return jazz ? P.ruga : P.caramelo;
        if (Math.round((u - NECK0) * 0.9) % 3 === 0) return P.neblina; // trastes
        if (Math.abs(v) < 0.45 && [3, 5, 7, 9].some((n) => Math.abs(u - NECK0 - n * 2.8) < 0.5)) return P.branco; // marcação
        return jazz ? P.chocolate : P.pastel_creme; // jacarandá no baixo, maple na Tele
      }
      if (!corpo(u, v)) return null;
      if (jazz) {
        if (u > 3 && u < 13 && v > -6.5 && v < -1.6) return P.ruga; // escudo tartaruga
        if (Math.abs(v) < 2.6 && ((u > 1 && u < 2.6) || (u > 7.6 && u < 9.2))) return P.preto; // captadores
        if (u > -7 && u < -4.6 && Math.abs(v) < 3) return u < -6.4 ? P.branco : P.neblina; // ponte
        const d = Math.hypot(u - 1.5, v * 1.1);
        return d > 8.5 ? P.noite : d > 6.8 ? P.chocolate : d > 4.8 ? P.vermelho : d > 3 ? P.laranja : P.amarelo; // sunburst
      }
      if (u > 1.5 && u < 11 && v > -5.6 && v < 3.6 && !(u > 8 && v > 1.8)) { // escudo preto
        if (u > 7.6 && u < 9.4 && Math.abs(v) < 2) return P.branco; // captador do braço
        return P.preto;
      }
      if (u > -7.5 && u < -2.5 && Math.abs(v) < 3.6) return u > -4.6 && u < -3.4 ? P.preto : P.neblina; // ponte de chapa
      if (u > -1 && u < 5 && v > 4.2 && v < 5.8) return Math.round(u) % 3 === 0 ? P.preto : P.branco; // placa de controle
      const dBorda = Math.min(Math.abs(v + 7.4), Math.abs(v - 6.4));
      return dBorda < 1 ? cs : v < -3 ? cl : cm; // butterscotch com luz em cima
    }, PARTE.instrumento);
    e.capsula([-3, 58.5 + bob, zi - 1], [-6, 41 + bob, 5], 0.8, 0.8, mat(rampa(COURO), 0.4), PARTE.acessorio); // correia
  } else if (b.instrumento) {
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
  } else if (b.estilo === 'topete') {
    // Cabelinho arrumado de playboy: risca do lado e topete pra cima.
    e.bola([0, hy - 1.4, hz + 0.3], 7.6, 9.3, 7.7, cabelo, PARTE.cabelo, 2.1, linhaCabelo(6.2));
    e.capsula([-1, hy - 8.5, hz + 3.5], [0.5, hy - 11.5, hz + 7.5], 3.6, 2.6, cabelo, PARTE.cabelo);
  } else if (b.estilo === 'calvo') {
    // Cabeludo com entradas: cabelão atrás e dos lados, alto da cabeça careca.
    e.bola([0, hy - 1.2, hz + 0.2], 7.8, 9.6, 7.9, cabelo, PARTE.cabelo, 2.1, (X, Y, Z) => Z < hz - 1.5 || (Math.abs(X) > 5.8 && Y > hy - 5));
    const fimTras = hy + 27 - bang;
    e.bola([0, hy + 11 - bang * 0.5, hz * 0.5 - 5.5], 11, 16, 4.5, cabelo, PARTE.cabelo, 2.2, (X, Y) => Y < fimTras - 3 || Math.round(X * 1.3 + Y) % 3 !== 0);
    for (const s of [-1, 1]) {
      const fim = hy + 22;
      e.capsula([s * 6.8, hy - 1, hz + 1.5], [s * 8.4 + balanco, fim, hz * 0.6 + 2.5], 2.4, 3.2, cabelo, PARTE.cabelo, 1, pontaRala(fim + 3.2));
    }
  } else if (b.estilo === 'quepe') {
    // Quepe de soldadinho de chumbo: alto, com pala e penacho.
    e.capsula([0, hy - 6.5, hz], [0, hy - 21, hz - 0.5], 7.6, 8.2, cobertura, PARTE.acessorio);
    e.bola([0, hy - 22, hz - 0.5], 8.2, 1.6, 8.2, mat(rampa([P.amarelo, P.mostarda, P.ruga]), 1.2), PARTE.acessorio, 2.6);
    e.bola([0, hy - 5.6, hz + 7.5], 6.5, 1.2, 4, mat(rampa([P.concreto, P.asfalto, P.preto]), 1.3), PARTE.acessorio, 2.4);
    e.capsula([0, hy - 23, hz + 1], [0.5, hy - 31, hz + 3], 2.2, 1.2, mat(rampaDe(P.branco), 0.3), PARTE.acessorio);
  } else if (b.estilo === 'boneCurto') {
    e.bola([0, hy - 1.2, hz + 0.2], 7.5 + gor * 0.7, 9.3, 7.6, cabelo, PARTE.cabelo, 2.1, linhaCabelo(6.4));
  } else if (b.estilo === 'coque') {
    e.bola([0, hy - 1.2, hz + 0.2], 7.7, 9.5, 7.8, cabelo, PARTE.cabelo, 2.1, linhaCabelo(6.5));
    e.bola([0, hy - 10.5, hz - 3.5], 3.8, 3.6, 3.8, cabelo, PARTE.cabelo);
  }
  if (b.estilo === 'bone' || b.estilo === 'boneCurto') {
    e.bola([0, hy - 4.5, hz + 0.6], 8.2 + gor * 0.7, 7, 8.2, cobertura, PARTE.acessorio, 2.2, (_X, Y) => Y < hy - 3.4);
    // Aba para a frente.
    e.bola([0, hy - 3.6, hz + 8.5], 6.2, 1.1, 4.5, cobertura, PARTE.acessorio, 2.4);
  } else if (b.estilo === 'lenco') {
    e.bola([0, hy - 2.5, hz + 0.4], 7.8, 8.4, 8, cobertura, PARTE.acessorio, 2.2, (X, Y, Z) => Z < hz || Y < hy - 2.5 + Math.abs(X) * 0.3);
    e.bola([0, hy - 1, hz - 8.2], 2.2, 2, 2, cobertura, PARTE.acessorio);
    e.capsula([0, hy, hz - 8.4], [balanco, hy + 7, hz - 10], 1.4, 0.9, cobertura, PARTE.acessorio);
  } else if (b.estilo === 'obra') {
    // Capacete de obra: casco com aba em volta, cara de fora.
    e.bola([0, hy - 5.6, hz + 0.5], 8.4, 6.2, 8.6, mat(rampa(corCobertura), 0.8), PARTE.acessorio, 2.2, (_X, Y) => Y < hy - 3.4);
    e.bola([0, hy - 3.8, hz + 1], 9.8, 1.1, 10.2, mat(rampa(corCobertura), 0.5), PARTE.acessorio, 2.4);
  } else if (b.estilo === 'capacete') {
    e.bola([0, hy - 0.8, hz + 0.6], 8.6, 10.8, 9.2, mat(rampa(corCobertura), 1), PARTE.acessorio, 2.3);
  }
  if (b.barba) {
    e.bola([0, hy + 6.8, hz + 3.2], 6.6 + gor * 1.2, 6.4 + gor * 0.6, 5 + gor * 0.8, cabelo, PARTE.barba, 2.2, (_X, Y) => Y > ey + 3);
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
  // Colete à prova de bala: placa preta no peito e nas costas, alça no ombro.
  if (b.colete) {
    const colete = mat(rampa([P.concreto, P.asfalto, P.preto]), 0.35);
    e.recolorir((X, y, p) => (p === PARTE.tronco && y >= 39 + bob && y <= 62 + bob && Math.abs(X) < 10.5 ? colete : null));
    e.dobrar((X, y, p, Z) => {
      if (p !== PARTE.tronco || Z < 2) return 0;
      const yy = y - bob;
      if ((yy === 50 || yy === 56) && Math.abs(X) < 8) return 1; // bolsos
      if (Math.abs(Math.abs(X) - 3.5) < 0.5 && yy > 40 && yy < 62) return 1; // velcro
      return 0;
    });
  }
  // Cinto de tacha com fivela (quem usa a camiseta pra fora não mostra cinto).
  const cinto = mat(rampa(COURO), 0.7);
  const fivela = mat(rampaDe(P.amarelo), 1);
  const temCinto = !b.camisaPraFora && !folga;
  e.recolorir((X, y, p, Z) => {
    if (!temCinto || (p !== PARTE.quadril && p !== PARTE.tronco)) return null;
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
    if (temCinto && (p === PARTE.quadril || p === PARTE.tronco) && yy === 63 && d > 2.5 && Math.round(X) % 2 === 0) return P.neblina;
    // Estampa de caveira no peito.
    if (p === PARTE.tronco && b.estampa && (b.camisa ?? 'lisa') === 'lisa' && naFrente(Z)) {
      const i = Math.floor(X + 4.5), j = yy - 45;
      if (i >= 0 && i < 9 && j >= 0 && j < 8) {
        const ch = CAVEIRA[j][i];
        if (ch === 'W') return X < 0 ? P.papel : P.branco;
        if (ch === 'K') return P.preto;
      }
    }
    // Crachá pendurado no peito.
    if (p === PARTE.tronco && b.cracha && naFrente(Z) && X > -6.5 && X < -3 && yy >= 47 && yy <= 51) return yy === 47 ? P.azul : (yy === 49 && X > -5.5 && X < -4) ? P.cimento : P.branco;
    if (p === PARTE.tronco && b.cracha && naFrente(Z) && yy > 40 && yy < 47 && Math.abs(X + 4.8 - (47 - yy) * 0.55) < 0.6) return P.vermelho;
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
  if (b.instrumento && classico) {
    // (detalhes já vêm no desenho do decalque)
  } else if (b.instrumento) {
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
            if (dy === 0 && Math.abs(u) < 1.6) return u > -0.1 && u < 1.4 ? (b.olhos ?? P.preto) : P.papel; // pupila olhando para a frente
            return dy === -1 ? rp[4] : rp[3]; // órbita funda
          }
        }
      }
      // Sobrancelha: brava em V (padrão) ou reta e tranquila.
      for (const s of [-1, 1]) {
        const u = X * s;
        const alvo = b.sobrancelhaCalma ? -2.4 : -1.2 - u * 0.42;
        if (u > (b.sobrancelhaCalma ? 1.2 : 0.4) && u < 5.6 && Math.abs(dy - alvo) < 0.6) return sobrancelha;
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
  // Tatuagem fechada: braço (e perna de fora, na bermuda) em tinta.
  if (b.tatuagem) {
    const tinta = mistura(rp[3], '#14203a', 0.6);
    const tinta2 = mistura(rp[2], '#2a3550', 0.45);
    e.pintar((X, y, p, Z, m) => {
      if (m !== pele) return null;
      const braco = p === PARTE.bracoE || p === PARTE.bracoD;
      const perna = (p === PARTE.pernaE || p === PARTE.pernaD) && b.tatuagemPerna;
      if (!braco && !perna) return null;
      const v = Math.sin(y * 0.9 + Z * 1.3 + X * 0.4) * Math.cos(y * 0.37 - Z * 0.8 + X * 1.1);
      if (v > 0.32) return tinta;
      if (v > 0.12) return tinta2;
      if (v < -0.55 && (y + Math.round(Z)) % 3 === 0) return P.vermelho; // um toque de cor
      return null;
    });
  }
  // Meia na canela (bermuda + tênis).
  if (b.meia && b.bermuda) e.pintar((_X, y, p, _Z, m) => ((p === PARTE.pernaE || p === PARTE.pernaD) && m === pele && y >= 101 ? (y === 103 ? P.concreto : P.papel) : null));
  // Boné estampado.
  if (b.boneEstampado) e.pintar((X, y, p, Z) => (p === PARTE.acessorio && y < hy - 3 && (Math.round(X * 1.3) + y + Math.round(Z)) % 4 === 0 ? [P.neon_verde, P.vermelho, P.amarelo, P.neon_rosa][Math.abs(Math.round(X + Z)) % 4] : null));
  // Máscara cirúrgica com elástico até a orelha.
  if (b.mascara) e.pintar((X, y, p, Z) => {
    if (p !== PARTE.cabeca && p !== PARTE.nariz && p !== PARTE.barba) return null;
    const dy = y - ey;
    if (Z > hz + 2 && dy >= 3 && dy <= 11 && Math.abs(X) < 5.8) return dy === 3 || dy === 11 ? P.ceu : (Math.round(X) + dy) % 4 === 0 ? P.pastel_azul : P.branco;
    if (Z > hz - 1 && Math.abs(Math.abs(X) - 6) < 0.8 && dy >= 1 && dy <= 5) return P.branco;
    return null;
  });
  // Tatuagem na careca.
  if (b.tatuagemCabeca) e.pintar((X, y, p, Z) => {
    // Um carimbinho de cada lado da cabeça, acima da orelha: losango com ponto no meio.
    if (p !== PARTE.cabeca || Math.abs(X) < 4.5) return null;
    const du = Z - (hz - 0.5), dv = y - (hy - 3);
    const r = Math.abs(du) + Math.abs(dv);
    if (r < 3.2 && r > 1.8) return mistura(rp[3], '#14203a', 0.65);
    if (r < 0.9) return mistura(rp[3], '#14203a', 0.65);
    return null;
  });
  // Bigode fino e cavanhaque.
  if (b.bigode) e.pintar((X, y, p, Z) => {
    if (p !== PARTE.cabeca || Z < hz + 2.2) return null;
    const dy = y - ey;
    if (dy === 7 && X > -2.6 && X < 2.4) return rc[3];
    if (dy >= 10 && dy <= 11 && Math.abs(X + 0.2) < 1) return rc[3];
    return null;
  });
  // Narina; risca do cabelo; logo do boné; bolinhas do lenço; viseira do capacete.
  e.pintar((X, y, p, Z) => {
    if (p === PARTE.nariz && y >= ey + 5 && X < 0.6) return rp[4];
    if (p === PARTE.cabelo && temCabelao && q !== 2 && Math.abs(X) < 0.6 && y < hy - 4 && Z > hz) return rc[4];
    if (p === PARTE.acessorio && b.estilo === 'bone' && !b.boneEstampado && Z > hz + 5 && Math.abs(X) < 1.8 && y >= hy - 8 && y <= hy - 6) return y === hy - 8 ? P.branco : P.papel;
    if (p === PARTE.acessorio && b.estilo === 'lenco' && y < hy - 2 && (Math.round(X) + y) % 3 === 0 && Math.round(Z) % 3 === 0) return P.branco;
    if (p === PARTE.acessorio && b.estilo === 'capacete' && Z > hz + 4 && Math.abs(X) < 6.2) {
      const dy = y - ey;
      if (dy >= -3 && dy <= 3) {
        if (Math.abs(X) > 5.4) return P.preto;
        if (dy === -3) return P.branco;
        if (dy === -2 && X > 1.5 && X < 3.5) return P.branco;
        if (b.viseira) {
          const v = rampaDe(b.viseira);
          // Robô: dois olhos acesos no meio da viseira.
          if (dy === 0 && (Math.abs(X - 2.4) < 0.9 || Math.abs(X + 1.6) < 0.9)) return v[0];
          return dy < 0 ? v[2] : dy < 2 ? v[3] : v[4];
        }
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
