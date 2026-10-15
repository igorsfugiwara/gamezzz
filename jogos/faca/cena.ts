/**
 * Cena lateral do show em pixel art detalhado: palco com paredão de
 * amplificador, bateria, banner com o nome da banda e a banda tocando;
 * público na frente reagindo à energia (headbang, chifres, mãos pro alto,
 * mosh). Coordenadas em 480×240; tudo é desenhado em 960×480 (sprites HD,
 * fundo ampliado com Scale2x) e então ampliado para caber.
 */
import { PALETA as P } from '../compartilhado/paleta';
import { bonecoDoPovo, bonecoHD, BONECO_L, BONECO_A } from '../compartilhado/boneco';
import { emCache, ampliarCanvas, desenharHD } from '../compartilhado/canvas';
import { desenharSharPei } from '../compartilhado/sharpei';
import { integranteHD } from './visual';
import type { Integrante } from './motor';

export const LARGURA = 480;
export const ALTURA = 240;
const PALCO_Y = 150; // topo do tablado
const CHAO_Y = 172;

type Quadro = 0 | 1 | 2 | 3;

/** Integrante no palco: headbang em 4 quadros; o vocal grita no microfone. */
function spriteBanda(quem: Integrante, quadro: Quadro, grito: boolean): HTMLCanvasElement {
  return emCache(`banda-${quem}-${quadro}-${grito}`, () =>
    integranteHD(quem, quem === 'vocal' ? { pose: 'microfone', grito, quadro } : { quadro }));
}

type Reacao = 'parado' | 'bang' | 'chifres' | 'maos';
function spritePublico(semente: number, reacao: Reacao, quadro: Quadro): HTMLCanvasElement {
  const q = reacao === 'parado' ? 0 : quadro;
  return emCache(`povo-${semente}-${reacao}-${q}`, () => bonecoHD(bonecoDoPovo(semente, 'povo', {
    quadro: reacao === 'bang' ? q : ((q % 2) as Quadro),
    pose: reacao === 'chifres' ? 'chifres' : reacao === 'maos' ? 'maos' : 'parado',
    grito: reacao === 'maos',
    giro: -0.55, // de frente para o palco
  })));
}

/** Bandeirinha de festa junina: triângulo pendurado no barbante. */
function bandeirinhas(b: CanvasRenderingContext2D, t: number, y0: number, curva: number, forte: number) {
  const cores = [P.vermelho, P.amarelo, P.folha, P.azul, P.neon_rosa, P.laranja, P.branco];
  b.strokeStyle = P.papel;
  b.lineWidth = 0.5;
  b.beginPath();
  for (let x = 0; x <= LARGURA; x += 4) {
    const y = y0 + Math.sin((x / LARGURA) * Math.PI) * curva;
    if (x === 0) b.moveTo(x, y); else b.lineTo(x, y);
  }
  b.stroke();
  for (let i = 0, x = 6; x < LARGURA; x += 11, i++) {
    const y = y0 + Math.sin((x / LARGURA) * Math.PI) * curva;
    const vento = Math.sin(t * 3 + i) * forte;
    b.fillStyle = cores[i % cores.length];
    b.beginPath(); b.moveTo(x - 3.5, y); b.lineTo(x + 3.5, y); b.lineTo(x + vento, y + 8); b.closePath(); b.fill();
    b.fillStyle = 'rgba(0,0,0,0.25)';
    b.beginPath(); b.moveTo(x + 1, y); b.lineTo(x + 3.5, y); b.lineTo(x + vento, y + 8); b.closePath(); b.fill();
  }
}

/** Iniciais da banda para o bumbo. */
export function sigla(nome: string): string {
  return (nome || 'DIY').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
}

/** Fundo fixo (parede de tijolo, lambe-lambe, banner, paredão): uma vez por show. */
function desenharFundo(b: CanvasRenderingContext2D) {
  b.fillStyle = P.noite;
  b.fillRect(0, 0, LARGURA, CHAO_Y);
  for (let y = 0; y < CHAO_Y; y += 6) {
    const desloc = (y / 6) % 2 ? 7 : 0;
    for (let x = -desloc; x < LARGURA; x += 14) {
      b.fillStyle = (x * 7 + y * 3) % 5 === 0 ? '#251f33' : '#211b2e';
      b.fillRect(x + 1, y + 1, 12, 4);
    }
  }
  // Barrado de azulejo português na parede do público.
  for (let x = 270; x < LARGURA; x += 8) for (let y = 128; y < CHAO_Y; y += 8) {
    b.fillStyle = P.branco; b.fillRect(x, y, 8, 8);
    b.fillStyle = P.azul; b.fillRect(x + 1, y + 1, 6, 6);
    b.fillStyle = P.branco; b.fillRect(x + 3, y + 1, 2, 6); b.fillRect(x + 1, y + 3, 6, 2);
    b.fillStyle = P.ceu; b.fillRect(x + 3, y + 3, 2, 2);
  }
  b.fillStyle = P.marinho; b.fillRect(270, 126, LARGURA - 270, 2);
  // Plaquinha pintada à mão.
  b.fillStyle = P.preto; b.fillRect(392, 66, 76, 22);
  b.fillStyle = P.amarelo; b.fillRect(393, 67, 74, 20);
  // Lambe-lambe na parede do público.
  const cartazes: [number, number, string, string][] = [[284, 34, P.pastel_rosa, P.preto], [312, 26, P.amarelo, P.vinho], [342, 38, P.papel, P.preto], [370, 30, P.neon_verde, P.preto], [402, 98, P.pastel_azul, P.marinho], [436, 96, P.laranja, P.preto]];
  for (const [x, y, fundo, tinta] of cartazes) {
    b.fillStyle = 'rgba(0,0,0,0.35)'; b.fillRect(x + 2, y + 2, 24, 32);
    b.fillStyle = fundo; b.fillRect(x, y, 24, 32);
    b.fillStyle = tinta;
    b.fillRect(x + 3, y + 4, 18, 4); b.fillRect(x + 6, y + 11, 12, 10); b.fillRect(x + 3, y + 24, 14, 2); b.fillRect(x + 3, y + 28, 10, 1);
    b.fillStyle = fundo; b.fillRect(x + 9, y + 14, 2, 2); b.fillRect(x + 13, y + 14, 2, 2);
  }
  // Banner com o nome da banda no fundo do palco.
  b.fillStyle = P.preto; b.fillRect(36, 18, 220, 38);
  b.fillStyle = P.vinho; b.fillRect(38, 20, 216, 34);
  b.fillStyle = P.preto; b.fillRect(42, 24, 208, 26);
  b.fillStyle = P.neblina; b.fillRect(40, 14, 2, 6); b.fillRect(250, 14, 2, 6);

  // Paredão de amplificador (esquerda).
  for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) {
    const x = 4 + i * 26, y = PALCO_Y - 78 + j * 26;
    b.fillStyle = P.preto; b.fillRect(x, y, 25, 25);
    b.fillStyle = P.asfalto; b.fillRect(x + 1, y + 1, 23, 23);
    b.fillStyle = P.noite;
    for (let gy = 3; gy < 22; gy += 2) for (let gx = 3; gx < 22; gx += 2) b.fillRect(x + gx, y + gy, 1, 1);
    b.fillStyle = P.cimento; b.fillRect(x + 1, y + 1, 23, 1);
  }
  b.fillStyle = P.preto; b.fillRect(4, PALCO_Y - 92, 51, 14);
  b.fillStyle = P.concreto; b.fillRect(5, PALCO_Y - 91, 49, 12);
  for (let k = 0; k < 6; k++) { b.fillStyle = P.preto; b.fillRect(9 + k * 7, PALCO_Y - 87, 3, 3); b.fillStyle = P.neblina; b.fillRect(10 + k * 7, PALCO_Y - 87, 1, 1); }
  b.fillStyle = P.amarelo; b.fillRect(8, PALCO_Y - 90, 10, 2);
}

/** Letras do fundo: desenhadas depois do Scale2x, que deformaria a fonte. */
function textosDoFundo(b: CanvasRenderingContext2D, nomeBanda: string) {
  b.font = '12px "Press Start 2P", monospace';
  b.textAlign = 'center';
  b.textBaseline = 'middle';
  const nome = nomeBanda.toUpperCase();
  const esc = Math.min(1, 196 / Math.max(1, b.measureText(nome).width));
  b.save(); b.translate(146, 38); b.scale(esc, 1);
  b.fillStyle = P.vermelho; b.fillText(nome, 1, 1);
  b.fillStyle = P.branco; b.fillText(nome, 0, 0);
  b.restore();
  b.font = '7px "Press Start 2P", monospace';
  b.fillStyle = P.vermelho; b.fillText('SEM RODA', 430, 73);
  b.fillStyle = P.preto; b.fillText('NO BAR!', 430, 81);
}

/** Tablado (inclina quando desaba) e retornos na beira. */
function desenharPalco(b: CanvasRenderingContext2D, queda: number) {
  for (let x = 0; x < 270; x++) {
    const cai = Math.round(queda * (x / 270) * 14);
    b.fillStyle = x % 18 === 0 ? P.chocolate : P.ruga;
    b.fillRect(x, PALCO_Y + cai, 1, 4);
    b.fillStyle = x % 18 === 0 ? P.noite : P.chocolate;
    b.fillRect(x, PALCO_Y + 4 + cai, 1, CHAO_Y - PALCO_Y - 4);
  }
  b.fillStyle = P.caramelo; b.fillRect(0, PALCO_Y, 270 - Math.round(queda * 6), 1);
  for (const x of [96, 176]) {
    const cai = Math.round(queda * (x / 270) * 14);
    b.fillStyle = P.preto; b.fillRect(x, PALCO_Y - 9 + cai, 24, 10);
    b.fillStyle = P.asfalto; b.fillRect(x + 1, PALCO_Y - 8 + cai, 22, 8);
    b.fillStyle = P.noite; b.fillRect(x + 4, PALCO_Y - 6 + cai, 16, 4);
  }
}

/** Bateria: bumbo com as iniciais da banda, tons, caixa, chimbal e pratos. */
function desenharBateria(b: CanvasRenderingContext2D, x: number, y: number, t: number, vel: number, letras: string) {
  const bate = Math.sin(t * vel * 2) > 0.3 ? 1 : 0;
  b.fillStyle = P.mostarda; b.fillRect(x - 18, y - 30 + bate, 22, 2); b.fillStyle = P.amarelo; b.fillRect(x - 16, y - 31 + bate, 16, 1);
  b.fillStyle = P.mostarda; b.fillRect(x + 40, y - 34, 22, 2); b.fillStyle = P.amarelo; b.fillRect(x + 42, y - 35, 14, 1);
  b.fillStyle = P.cimento; b.fillRect(x - 8, y - 28, 1, 28); b.fillRect(x + 50, y - 32, 1, 32);
  for (const [tx, ty] of [[x + 6, y - 22], [x + 24, y - 22]]) {
    b.fillStyle = P.preto; b.fillRect(tx - 1, ty - 1, 15, 11);
    b.fillStyle = P.vinho; b.fillRect(tx, ty, 13, 9);
    b.fillStyle = P.papel; b.fillRect(tx, ty, 13, 2);
    b.fillStyle = P.vermelho; b.fillRect(tx, ty + 2, 3, 7);
  }
  b.fillStyle = P.preto; b.fillRect(x + 2, y - 12, 34, 32);
  b.fillStyle = P.vinho; b.fillRect(x + 3, y - 11, 32, 30);
  b.fillStyle = P.papel; b.fillRect(x + 6, y - 8, 26, 24);
  b.fillStyle = P.branco; b.fillRect(x + 7, y - 7, 10, 22);
  b.fillStyle = P.preto;
  b.font = '9px "Press Start 2P", monospace'; b.textAlign = 'center'; b.textBaseline = 'middle';
  b.fillText(letras, x + 19, y + 4);
  b.fillStyle = P.cimento; for (const dx of [4, 32]) b.fillRect(x + dx, y - 10, 1, 28);
  b.fillStyle = P.preto; b.fillRect(x + 37, y - 4, 16, 9);
  b.fillStyle = P.neblina; b.fillRect(x + 38, y - 3, 14, 7);
  b.fillStyle = P.branco; b.fillRect(x + 38, y - 3, 14, 2);
  b.fillStyle = P.mostarda; b.fillRect(x - 22, y - 8 - bate, 16, 2); b.fillRect(x - 22, y - 5, 16, 2);
  b.fillStyle = P.cimento; b.fillRect(x - 14, y - 6, 1, 26);
}

interface Pessoa { x: number; y: number; semente: number; fase: number; palco: number; gosto: number }

export class Cena {
  private ctx: CanvasRenderingContext2D;
  private buffer = document.createElement('canvas');
  private b: CanvasRenderingContext2D;
  private fundo: HTMLCanvasElement = document.createElement('canvas');
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
  nomeBanda = '';

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.buffer.width = LARGURA * 2; this.buffer.height = ALTURA * 2;
    this.b = this.buffer.getContext('2d')!;
  }

  /** Prepara um show novo: público proporcional ao hype. */
  preparar(tamanho: number, semente: number) {
    let s = semente || 1;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const n = Math.max(8, Math.min(40, tamanho));
    this.publico = Array.from({ length: n }, (_, i) => ({
      x: 246 + r() * 222,
      y: CHAO_Y + 14 + (i % 4) * 14 + r() * 6,
      semente: Math.floor(r() * 4000),
      fase: r() * 6.28,
      palco: 0,
      gosto: r(),
    })).sort((a, b) => a.y - b.y);
    this.razao = 0;
    this.desabou = false;
    this.quedaPalco = 0;
    this.moshAte = 0;
    this.poeira = [];
    // Fundo desenhado na resolução base e ampliado uma vez com Scale2x.
    const base = document.createElement('canvas');
    base.width = LARGURA; base.height = ALTURA;
    desenharFundo(base.getContext('2d')!);
    this.fundo = ampliarCanvas(base);
    const f = this.fundo.getContext('2d')!;
    f.setTransform(2, 0, 0, 2, 0, 0);
    textosDoFundo(f, this.nomeBanda || 'DIY');
  }

  momento(tipo: string) {
    if (tipo === 'mosh' || tipo === 'pit') {
      this.moshAte = this.tempo + (tipo === 'mosh' ? 2.4 : 1.8);
      this.tremor = 3;
      this.publico.slice(-(tipo === 'mosh' ? 5 : 2)).forEach((p) => (p.palco = 1.6));
    } else if (tipo === 'desabou') {
      this.desabou = true;
      this.tremor = 6;
      for (let i = 0; i < 70; i++) this.poeira.push({ x: Math.random() * 270, y: PALCO_Y + Math.random() * 16, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 60, vida: 1.4 });
    } else if (tipo === 'parede') {
      this.tremor = 2; this.flash = 0.25; this.corFlash = P.neon_ciano;
    } else if (tipo === 'machucou') {
      this.tremor = 2;
    } else if (tipo === 'erro') {
      this.flash = 0.18; this.corFlash = P.vermelho;
    } else {
      this.tremor = Math.max(this.tremor, 1); this.flash = 0.1; this.corFlash = P.amarelo;
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
    for (const p of this.poeira) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 80 * dt; p.vida -= dt; }
    this.poeira = this.poeira.filter((p) => p.vida > 0);
    for (const p of this.publico) p.palco = Math.max(0, p.palco - dt * 0.7);
  }

  desenhar() {
    const b = this.b;
    const t = this.tempo;
    const r = this.razao;
    b.save();
    b.setTransform(2, 0, 0, 2, 0, 0);
    b.imageSmoothingEnabled = false;
    b.clearRect(0, 0, LARGURA, ALTURA);
    if (this.tremor > 0) b.translate(Math.round((Math.random() - 0.5) * this.tremor * 3), Math.round((Math.random() - 0.5) * this.tremor * 3));
    b.drawImage(this.fundo, 0, 0, LARGURA, ALTURA);

    // Bandeirinhas de festa junina balançando (mais vento com mais energia).
    bandeirinhas(b, t, 4, 10, 1 + r * 2);
    bandeirinhas(b, t + 1.7, 62, 6, 0.6 + r * 1.5);
    // Canhões de luz: os fachos abrem com a energia.
    if (r > 0.3) {
      b.globalAlpha = Math.min(0.22, (r - 0.3) * 0.3);
      for (const [x0, cor] of [[60, P.neon_rosa], [150, P.amarelo], [230, P.neon_ciano]] as const) {
        b.fillStyle = cor;
        const balanco = Math.sin(t * 1.5 + x0) * 30;
        b.beginPath(); b.moveTo(x0, 0); b.lineTo(x0 - 40 + balanco, PALCO_Y); b.lineTo(x0 + 40 + balanco, PALCO_Y); b.closePath(); b.fill();
      }
      b.globalAlpha = 1;
    }

    b.fillStyle = P.asfalto; b.fillRect(0, CHAO_Y, LARGURA, ALTURA - CHAO_Y);
    b.fillStyle = P.noite; for (let x = 0; x < LARGURA; x += 24) b.fillRect(x, CHAO_Y, 1, ALTURA - CHAO_Y);

    const q = this.quedaPalco;
    const queda = (x: number) => Math.round(q * (x / 270) * 14);
    const vel = 3 + r * 8;
    const batida = Math.floor(t * vel) % 2 === 1;

    // Baterista num praticável atrás do kit.
    // Ciclo de 4 quadros no ritmo da música (mais rápido com mais energia).
    const ciclo = (desloc: number): Quadro => (r > 0.3 ? (Math.floor(t * vel + desloc) % 4) as Quadro : 0);
    if (this.banda.includes('bateria')) {
      desenharHD(b, spriteBanda('bateria', ciclo(0.5), false), 92, PALCO_Y - BONECO_A + 4 - 22 + queda(92));
    }
    desenharBateria(b, 84, PALCO_Y - 20 + queda(84), t, vel, sigla(this.nomeBanda));
    if (this.mascote) desenharSharPei(b, 140, PALCO_Y - 34 + queda(140), 2, { pose: r > 0.7 ? 'feliz' : 'sentado' });

    desenharPalco(b, q);
    const frente: [Integrante, number][] = [['guitarra', 58], ['vocal', 150], ['baixo', 214]];
    for (const [quem, x] of frente) {
      if (!this.banda.includes(quem)) continue;
      const pulando = r > 1 && Math.sin(t * 5 + x) > 0.7 ? -6 : 0;
      const quadro = quem === 'vocal' ? (r > 0.8 ? ciclo(1) : 0) : ciclo(x / 40);
      desenharHD(b, spriteBanda(quem, quadro, quem === 'vocal' && r > 0.25 && batida), x, PALCO_Y - BONECO_A + 4 + pulando + queda(x));
    }

    // Público.
    const mosh = this.tempo < this.moshAte;
    const cx = 330, cy = CHAO_Y + 36;
    for (const p of this.publico) {
      let x = p.x, y = p.y;
      if (mosh) {
        const a = Math.atan2((y - cy) * 3, x - cx) + (this.moshAte - this.tempo) * 2.6;
        const raio = Math.hypot(x - cx, (y - cy) * 3);
        x = cx + Math.cos(a) * raio;
        y = cy + Math.sin(a) * raio / 3;
      }
      if (p.palco > 0) {
        const k = Math.min(1, p.palco);
        x += (200 - x) * k;
        y = y - Math.sin(k * Math.PI) * 30 - (y - PALCO_Y) * k;
      }
      let reacao: Reacao = 'parado';
      if (mosh || r > 1.1) reacao = p.gosto > 0.5 ? 'maos' : 'chifres';
      else if (r > 0.7) reacao = p.gosto > 0.6 ? 'chifres' : Math.sin(t * vel + p.fase) > 0 ? 'bang' : 'parado';
      else if (r > 0.35) reacao = Math.sin(t * vel + p.fase) > 0.3 ? 'bang' : 'parado';
      const pulo = r > 0.8 ? Math.max(0, Math.sin(t * (4 + r * 4) + p.fase)) * 4 : 0;
      desenharHD(b, spritePublico(p.semente % 64, reacao, (Math.floor(t * vel * 0.8 + p.fase) % 4) as Quadro), x - BONECO_L / 2, y - BONECO_A - pulo);
    }

    for (const d of this.poeira) {
      b.fillStyle = P.papel;
      b.globalAlpha = Math.max(0, d.vida / 1.4);
      b.fillRect(Math.round(d.x), Math.round(d.y), 3, 3);
    }
    b.globalAlpha = 1;
    b.restore();

    if (this.flash > 0) {
      b.fillStyle = this.corFlash;
      b.globalAlpha = this.flash * 1.2;
      b.fillRect(0, 0, this.buffer.width, this.buffer.height);
      b.globalAlpha = 1;
    }

    // Amplia para caber (inteiro quando dá; senão, o maior possível).
    const c = this.canvas;
    const w = Math.round(c.clientWidth * devicePixelRatio);
    const h = Math.round(c.clientHeight * devicePixelRatio);
    if (!w || !h) return;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const bw = this.buffer.width, bh = this.buffer.height;
    const exato = Math.min(w / bw, h / bh);
    const k = exato >= 2 ? Math.floor(exato) : exato;
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = P.preto;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(this.buffer, Math.floor((w - bw * k) / 2), Math.floor(h - bh * k), Math.round(bw * k), Math.round(bh * k));
  }
}
