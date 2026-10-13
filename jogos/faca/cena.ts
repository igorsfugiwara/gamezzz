/**
 * Cena lateral do show em pixel art: palco com a banda à esquerda, público à
 * direita reagindo à energia. Desenha numa tela interna de 200×100 e amplia
 * por fator inteiro — fica nítido e leve até em Android simples.
 */
import { PALETA as P } from '../compartilhado/paleta';
import { desenharSharPei } from '../compartilhado/sharpei';
import type { Integrante } from './motor';

export const LARGURA = 200;
export const ALTURA = 100;
const PALCO_Y = 58;
const CHAO_Y = 70;

type Arte = readonly string[];

const CORPO_BASE: Record<string, string> = { s: P.caramelo_claro, k: P.preto, p: P.azul, c: P.preto, w: P.branco };

const SPRITES: Record<Integrante, { arte: Arte; cores: Record<string, string> }> = {
  vocal: {
    arte: [
      '...hhhh.....',
      '..hhhhhh....',
      '..hsssshh...',
      '...kssk.h...',
      '...ssss.....',
      '....ss...M..',
      '..cccccc.M..',
      '.cccwwcccs..',
      '.s.cccc.....',
      '...cccc.....',
      '...pppp.....',
      '...p..p.....',
      '...p..p.....',
      '..kk..kk....',
    ],
    cores: { ...CORPO_BASE, h: P.neon_rosa, M: P.neblina },
  },
  guitarra: {
    arte: [
      '...hhhh.....',
      '..hhhhhh....',
      '..hsssshh...',
      '...kssk.....',
      '...ssss.....',
      '....ss......',
      '..cccccc....',
      '.cccccccc..n',
      '.sGGccc..nn.',
      '.GGGGc.nn...',
      '.GGGGnn.....',
      '..GGpp......',
      '...p..p.....',
      '..kk..kk....',
    ],
    cores: { ...CORPO_BASE, h: P.chocolate, c: P.vinho, G: P.vermelho, n: P.ruga },
  },
  baixo: {
    arte: [
      '..bbbb......',
      '.bbbbbbb....',
      '..hssss.....',
      '...kssk.....',
      '...ssss.....',
      '....ss......',
      '..cccccc....',
      '.cccccccc.nn',
      '.sBBccc.nn..',
      '.BBBBcnn....',
      '.BBBBnn.....',
      '..BBpp......',
      '...p..p.....',
      '..kk..kk....',
    ],
    cores: { ...CORPO_BASE, b: P.folha, h: P.preto, c: P.asfalto, B: P.azul, n: P.ruga, s: P.ruga },
  },
  bateria: {
    arte: [
      '...hhhh.....',
      '..hhhhhh....',
      '..hssssh....',
      '...kssk.....',
      '...ssss.....',
      '....ss......',
      '.scccccc.s..',
      '..cccccc....',
    ],
    cores: { ...CORPO_BASE, h: P.mostarda, c: P.laranja, s: P.chocolate },
  },
};

function pintar(ctx: CanvasRenderingContext2D, arte: Arte, cores: Record<string, string>, x: number, y: number, espelhar = false) {
  const w = Math.max(...arte.map((l) => l.length));
  arte.forEach((linha, r) => {
    for (let c = 0; c < linha.length; c++) {
      const cor = cores[linha[c]];
      if (!cor) continue;
      ctx.fillStyle = cor;
      ctx.fillRect(Math.round(x + (espelhar ? w - 1 - c : c)), Math.round(y + r), 1, 1);
    }
  });
}

/** Um integrante sozinho (retrato do HUD). */
export function desenharIntegrante(ctx: CanvasRenderingContext2D, quem: Integrante, x: number, y: number) {
  const sp = SPRITES[quem];
  pintar(ctx, sp.arte, sp.cores, x, y);
}

/** Banda em fila, de pé — título, zine e mapa. `t` anima o balanço. */
export function desenharBanda(ctx: CanvasRenderingContext2D, x: number, y: number, banda: readonly Integrante[], mascote: boolean, t = 0) {
  const ordem: Integrante[] = ['guitarra', 'vocal', 'baixo', 'bateria'];
  let cx = x;
  for (const quem of ordem) {
    if (banda.includes(quem)) {
      const bob = Math.round(Math.sin(t * 3 + cx) * 0.6);
      if (quem === 'bateria') {
        pintar(ctx, SPRITES.bateria.arte, SPRITES.bateria.cores, cx, y + bob);
        pintar(ctx, ['...pppp.....', '...p..p.....', '...p..p.....', '..kk..kk....'], { p: P.marinho, k: P.preto }, cx, y + 8);
        ctx.fillStyle = P.amarelo; // baquetas
        ctx.fillRect(cx, y + 5 + bob, 1, 3);
        ctx.fillRect(cx + 10, y + 5 - bob, 1, 3);
      } else {
        pintar(ctx, SPRITES[quem].arte, SPRITES[quem].cores, cx, y + bob);
      }
    }
    cx += 13;
  }
  if (mascote) desenharSharPei(ctx, cx - 2, y - 2, 1, { pose: 'feliz' });
}

// ─── Público ──────────────────────────────────────────────

interface Pessoa { x: number; y: number; cabelo: string; roupa: string; pele: string; fase: number; palco: number }

const ROUPAS = [P.vermelho, P.preto, P.azul, P.folha, P.laranja, P.neon_roxo, P.mostarda, P.cimento, P.vinho, P.branco];
const CABELOS = [P.preto, P.chocolate, P.amarelo, P.neon_rosa, P.ruga, P.neon_verde];
const PELES = [P.caramelo_claro, P.caramelo, P.ruga, P.chocolate, P.pessego];

export class Cena {
  private ctx: CanvasRenderingContext2D;
  private buffer = document.createElement('canvas');
  private b: CanvasRenderingContext2D;
  private publico: Pessoa[] = [];
  private tempo = 0;
  private tremor = 0;
  private moshAte = 0;
  private desabou = false;
  private quedaPalco = 0;
  private poeira: { x: number; y: number; vx: number; vy: number; vida: number }[] = [];
  private flash = 0;
  private corFlash: string = P.amarelo;
  private rodando = false;
  private ultimo = 0;
  /** Energia / alvo (0 = parado, 1 = alvo batido). */
  razao = 0;
  banda: Integrante[] = [];
  mascote = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.buffer.width = LARGURA;
    this.buffer.height = ALTURA;
    this.b = this.buffer.getContext('2d')!;
  }

  /** Prepara um show novo: público proporcional ao hype. */
  preparar(tamanho: number, semente: number) {
    let s = semente || 1;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const n = Math.max(6, Math.min(34, tamanho));
    this.publico = Array.from({ length: n }, (_, i) => ({
      x: 104 + r() * 86,
      y: CHAO_Y + 4 + (i % 3) * 7 + r() * 3,
      cabelo: CABELOS[Math.floor(r() * CABELOS.length)],
      roupa: ROUPAS[Math.floor(r() * ROUPAS.length)],
      pele: PELES[Math.floor(r() * PELES.length)],
      fase: r() * 6.28,
      palco: 0,
    })).sort((a, b) => a.y - b.y);
    this.razao = 0;
    this.desabou = false;
    this.quedaPalco = 0;
    this.moshAte = 0;
    this.poeira = [];
  }

  momento(tipo: string) {
    if (tipo === 'mosh' || tipo === 'pit') {
      this.moshAte = this.tempo + (tipo === 'mosh' ? 2.2 : 1.6);
      this.tremor = 3;
      // Gente sobe no palco.
      this.publico.slice(0, tipo === 'mosh' ? 4 : 2).forEach((p) => (p.palco = 1.6));
    } else if (tipo === 'desabou') {
      this.desabou = true;
      this.tremor = 5;
      for (let i = 0; i < 40; i++) this.poeira.push({ x: Math.random() * 96, y: PALCO_Y + Math.random() * 10, vx: (Math.random() - 0.5) * 30, vy: -Math.random() * 30, vida: 1.2 });
    } else if (tipo === 'parede') {
      this.tremor = 2;
      this.flash = 0.25;
      this.corFlash = P.neon_ciano;
    } else if (tipo === 'machucou') {
      this.tremor = 2;
    } else if (tipo === 'erro') {
      this.flash = 0.18;
      this.corFlash = P.vermelho;
    } else {
      this.tremor = Math.max(this.tremor, 1);
      this.flash = 0.12;
      this.corFlash = P.amarelo;
    }
  }

  iniciar() {
    if (this.rodando) return;
    this.rodando = true;
    this.ultimo = performance.now();
    const passo = (agora: number) => {
      if (!this.rodando) return;
      const dt = Math.min(0.05, (agora - this.ultimo) / 1000);
      this.ultimo = agora;
      this.atualizar(dt);
      this.desenhar();
      requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  parar() { this.rodando = false; }

  private atualizar(dt: number) {
    this.tempo += dt;
    this.tremor = Math.max(0, this.tremor - dt * 4);
    this.flash = Math.max(0, this.flash - dt);
    if (this.desabou) this.quedaPalco = Math.min(1, this.quedaPalco + dt * 3);
    for (const p of this.poeira) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 40 * dt; p.vida -= dt; }
    this.poeira = this.poeira.filter((p) => p.vida > 0);
    for (const p of this.publico) p.palco = Math.max(0, p.palco - dt * 0.8);
  }

  desenhar() {
    const b = this.b;
    const t = this.tempo;
    const r = this.razao;
    b.save();
    b.fillStyle = P.noite;
    b.fillRect(0, 0, LARGURA, ALTURA);
    if (this.tremor > 0) b.translate(Math.round((Math.random() - 0.5) * this.tremor * 2), Math.round((Math.random() - 0.5) * this.tremor * 2));

    // Parede com lambe-lambe e varal de luz.
    const cartazes = [[110, 14, P.pastel_rosa], [128, 10, P.amarelo], [150, 16, P.pastel_azul], [172, 12, P.papel], [186, 18, P.neon_verde]] as const;
    for (const [x, y, cor] of cartazes) {
      b.fillStyle = cor;
      b.fillRect(x, y, 12, 16);
      b.fillStyle = P.preto;
      b.fillRect(x + 2, y + 3, 8, 2);
      b.fillRect(x + 2, y + 8, 5, 1);
      b.fillRect(x + 2, y + 10, 7, 1);
    }
    for (let x = 2; x < LARGURA; x += 8) {
      const aceso = (Math.floor(t * 4 + x / 8) % 3 !== 0) || r > 0.8;
      b.fillStyle = aceso ? [P.neon_rosa, P.amarelo, P.neon_ciano][(x / 8) % 3 | 0] : P.concreto;
      b.fillRect(x, 4 + Math.round(Math.sin(x / 20) * 2), 2, 2);
    }

    // Chão.
    b.fillStyle = P.asfalto;
    b.fillRect(0, CHAO_Y, LARGURA, ALTURA - CHAO_Y);

    // Palco (inclina quando desaba).
    const q = this.quedaPalco;
    for (let x = 0; x < 98; x++) {
      const caiu = Math.round(q * (x / 98) * 9);
      b.fillStyle = x % 12 === 0 ? P.ruga : P.chocolate;
      b.fillRect(x, PALCO_Y + caiu, 1, CHAO_Y - PALCO_Y);
    }
    b.fillStyle = P.ruga;
    b.fillRect(0, PALCO_Y, 98, 1);

    // Amplificadores.
    b.fillStyle = P.preto;
    b.fillRect(2, PALCO_Y - 22, 16, 22);
    b.fillStyle = P.concreto;
    for (let i = 0; i < 4; i++) b.fillRect(4 + (i % 2) * 7, PALCO_Y - 20 + Math.floor(i / 2) * 10, 5, 8);
    const pulso = r > 0.3 ? Math.round(Math.sin(t * 20) * 0.6) : 0;
    b.fillStyle = P.cimento;
    b.fillRect(5 + pulso, PALCO_Y - 18, 3, 3);

    // Bateria (kit atrás).
    const queda = (x: number) => Math.round(q * (x / 98) * 9);
    const vel = 2 + r * 8;
    if (this.banda.includes('bateria')) {
      const bx = 40;
      const by = PALCO_Y - 20 + queda(bx);
      const bob = Math.round(Math.abs(Math.sin(t * vel)) * (r > 0.2 ? 1 : 0));
      pintar(b, SPRITES.bateria.arte, SPRITES.bateria.cores, bx, by + bob);
      b.fillStyle = P.amarelo;
      const golpe = Math.sin(t * vel * 2) > 0 ? 0 : 2;
      b.fillRect(bx - 1, by + 4 + golpe, 1, 4);
      b.fillRect(bx + 10, by + 6 - golpe, 1, 4);
    }
    // Bumbo, caixa e prato.
    const kx = 36;
    const ky = PALCO_Y - 12 + queda(kx);
    b.fillStyle = P.branco;
    b.fillRect(kx + 2, ky, 14, 12);
    b.fillStyle = P.vermelho;
    b.fillRect(kx + 4, ky + 2, 10, 8);
    b.fillStyle = P.preto;
    b.fillRect(kx + 6, ky + 4, 6, 4);
    b.fillStyle = P.amarelo;
    b.fillRect(kx - 4, ky - 6 + (Math.sin(t * vel * 2) > 0.6 ? 1 : 0), 9, 1);
    b.fillRect(kx + 14, ky - 4, 8, 1);

    if (this.mascote) desenharSharPei(b, 54, PALCO_Y - 16 + queda(54), 1, { pose: r > 0.7 ? 'feliz' : 'sentado' });

    // Frente do palco: guitarra, vocal, baixo.
    const posicoes: [Integrante, number][] = [['guitarra', 20], ['vocal', 66], ['baixo', 82]];
    for (const [quem, x] of posicoes) {
      if (!this.banda.includes(quem)) continue;
      const headbang = r > 0.3 ? Math.round(Math.abs(Math.sin(t * vel + x)) * (r > 0.9 ? 2 : 1)) : 0;
      const pulo = r > 1 && Math.sin(t * 5 + x) > 0.7 ? -3 : 0;
      pintar(b, SPRITES[quem].arte, SPRITES[quem].cores, x, PALCO_Y - 14 + headbang + pulo + queda(x), quem === 'baixo');
    }

    // Público.
    const mosh = this.tempo < this.moshAte;
    const cx = 148;
    const cy = CHAO_Y + 12;
    for (const p of this.publico) {
      let x = p.x;
      let y = p.y;
      if (mosh) {
        // Redemoinho: todo mundo gira em volta do centro.
        const a = Math.atan2((y - cy) * 3, x - cx) + (this.moshAte - this.tempo) * 2.4;
        const raio = Math.hypot(x - cx, (y - cy) * 3);
        x = cx + Math.cos(a) * raio;
        y = cy + Math.sin(a) * raio / 3;
      }
      if (p.palco > 0) {
        // Sobe no palco e pula de volta (stage dive).
        const k = Math.min(1, p.palco);
        x = x + (70 - x) * k;
        y = y - Math.sin(k * Math.PI) * 18 - (PALCO_Y - CHAO_Y) * k;
      }
      const amp = r < 0.2 ? 0.3 : r < 0.6 ? 1 : r < 1 ? 2 : 3;
      const pulo = Math.max(0, Math.sin(t * (3 + r * 6) + p.fase)) * amp;
      this.desenharPessoa(b, Math.round(x), Math.round(y - 12 - pulo), p, r > 0.6 || mosh);
    }

    for (const d of this.poeira) {
      b.fillStyle = P.papel;
      b.globalAlpha = Math.max(0, d.vida);
      b.fillRect(Math.round(d.x), Math.round(d.y), 2, 2);
    }
    b.globalAlpha = 1;
    b.restore();

    if (this.flash > 0) {
      b.fillStyle = this.corFlash;
      b.globalAlpha = this.flash * 1.5;
      b.fillRect(0, 0, LARGURA, ALTURA);
      b.globalAlpha = 1;
    }

    // Amplia por fator inteiro, centralizado.
    const c = this.canvas;
    const w = c.clientWidth * devicePixelRatio;
    const h = c.clientHeight * devicePixelRatio;
    if (c.width !== Math.round(w) || c.height !== Math.round(h)) { c.width = Math.round(w); c.height = Math.round(h); }
    const k = Math.max(1, Math.floor(Math.min(c.width / LARGURA, c.height / ALTURA)));
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = P.preto;
    ctx.fillRect(0, 0, c.width, c.height);
    // Encostada embaixo, perto do VU: o palco "senta" no medidor.
    ctx.drawImage(this.buffer, Math.floor((c.width - LARGURA * k) / 2), c.height - ALTURA * k, LARGURA * k, ALTURA * k);
  }

  private desenharPessoa(b: CanvasRenderingContext2D, x: number, y: number, p: Pessoa, maos: boolean) {
    b.fillStyle = p.cabelo;
    b.fillRect(x + 1, y, 4, 2);
    b.fillStyle = p.pele;
    b.fillRect(x + 1, y + 2, 4, 3);
    b.fillStyle = p.roupa;
    b.fillRect(x, y + 5, 6, 5);
    b.fillStyle = P.marinho;
    b.fillRect(x + 1, y + 10, 4, 3);
    b.fillStyle = p.pele;
    if (maos) {
      b.fillRect(x - 1, y - 1, 1, 6);
      b.fillRect(x + 6, y - 1, 1, 6);
    } else {
      b.fillRect(x - 1, y + 5, 1, 4);
      b.fillRect(x + 6, y + 5, 1, 4);
    }
  }
}
