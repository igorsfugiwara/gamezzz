/**
 * Trilha do DIY: death metal e hardcore metalizado sintetizados na hora,
 * sem arquivo de áudio. Guitarra = duas serras desafinadas numa distorção
 * pesada; bateria = bumbo de seno caindo, caixa e pratos de ruído.
 *
 * Três climas: `estrada` (groove arrastado na van), `show` (d-beat que vira
 * blast beat conforme a energia do público) e `breakdown` (dois compassos
 * de chug lento quando entra a carta Breakdown).
 */
import { contextoDeAudio, estaMudo } from '../compartilhado/som';

type Clima = 'estrada' | 'show' | 'silencio';
/** Uma linha de 16 semicolcheias: número = casa (semitons acima da tônica), '-' = pausa, 'x' = abafado. */
type Riff = (number | '-' | 'x')[];

const TONICA = 73.42; // Ré grave (afinação drop D)

// ─── Riffs ────────────────────────────────────────────────
const RIFFS: Record<string, Riff[]> = {
  // Groove arrastado de estrada: sludge com respiro.
  estrada: [
    [0, 'x', 'x', 0, '-', 'x', 3, '-', 0, 'x', 'x', 0, 5, '-', 3, '-'],
    [0, 'x', 'x', 0, '-', 'x', 1, '-', 0, 'x', 0, 'x', 6, 5, 3, 1],
  ],
  // D-beat hardcore: palhetada aberta e direta.
  dbeat: [
    [0, 0, 'x', 0, 3, 3, 'x', 3, 5, 5, 'x', 5, 3, 3, 1, 1],
    [0, 0, 'x', 0, 3, 3, 'x', 3, 6, 6, 5, 5, 3, 3, 1, 0],
  ],
  // Death metal: palhetada alternada cromática.
  blast: [
    [0, 0, 1, 0, 0, 3, 0, 0, 4, 3, 1, 0, 6, 0, 5, 0],
    [0, 0, 1, 0, 0, 3, 0, 0, 7, 6, 5, 4, 3, 2, 1, 0],
  ],
  // Breakdown: chug com silêncio e uma nota aberta dissonante.
  breakdown: [
    [0, '-', '-', 'x', 0, '-', 'x', '-', 0, '-', '-', '-', 1, '-', '-', '-'],
    [0, '-', 'x', 'x', 0, '-', 'x', '-', 0, 0, '-', '-', 6, '-', 5, '-'],
  ],
};

/** Bateria por padrão: k = bumbo, s = caixa, h = chimbal, c = prato. Uma string por instrumento, 16 passos. */
const BATERIAS: Record<string, Record<'k' | 's' | 'h' | 'c', string>> = {
  estrada: { k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', c: 'x...............' },
  dbeat: { k: 'x.x.x.x.x.x.x.x.', s: '..x...x...x...x.', h: 'xxxxxxxxxxxxxxxx', c: 'x.......x.......' },
  blast: { k: 'xxxxxxxxxxxxxxxx', s: '.x.x.x.x.x.x.x.x', h: '................', c: 'x.x.x.x.x.x.x.x.' },
  breakdown: { k: 'x..xx..x..x.....', s: '........x.......', h: '................', c: 'x.......x.......' },
};

const BPM: Record<string, number> = { estrada: 96, dbeat: 168, blast: 196, breakdown: 140 };

// ─── Síntese ──────────────────────────────────────────────
let mestre: GainNode | null = null;
let distorcao: WaveShaperNode | null = null;
let ruidoBuf: AudioBuffer | null = null;

function montar(c: AudioContext) {
  if (mestre) return;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 6;
  mestre = c.createGain();
  mestre.gain.value = 0;
  mestre.connect(comp).connect(c.destination);
  // Curva de distorção pesada (fuzz assimétrico).
  distorcao = c.createWaveShaper();
  const n = 1024;
  const curva = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / n) * 2 - 1;
    curva[i] = Math.tanh(x * 18) * 0.8 + Math.tanh(x * 4) * 0.2;
  }
  distorcao.curve = curva;
  distorcao.oversample = '2x';
  // Gabinete: corta o chiado e dá peso no médio-grave.
  const gab = c.createBiquadFilter();
  gab.type = 'lowpass';
  gab.frequency.value = 3200;
  const medio = c.createBiquadFilter();
  medio.type = 'peaking';
  medio.frequency.value = 700;
  medio.gain.value = -6; // o "scoop" do death metal
  const ganhoGuitarra = c.createGain();
  ganhoGuitarra.gain.value = 0.16;
  distorcao.connect(gab).connect(medio).connect(ganhoGuitarra).connect(mestre);
  // Ruído branco reaproveitado pela bateria.
  ruidoBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = ruidoBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function guitarra(c: AudioContext, t: number, casa: number, abafado: boolean, dur: number) {
  if (!distorcao) return;
  const f = TONICA * 2 ** (casa / 12);
  const env = c.createGain();
  env.gain.setValueAtTime(0.9, t);
  env.gain.exponentialRampToValueAtTime(0.01, t + (abafado ? 0.07 : dur));
  env.connect(distorcao);
  // Quinta junto: power chord.
  for (const [mult, desafino] of [[1, -6], [1, 7], [1.5, 0], [2, 3]] as const) {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f * mult;
    o.detune.value = desafino;
    o.connect(env);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  // Baixo dobrando a tônica uma oitava abaixo.
  const b = c.createOscillator();
  b.type = 'sawtooth';
  b.frequency.value = f / 2;
  const fb = c.createBiquadFilter();
  fb.type = 'lowpass';
  fb.frequency.value = 380;
  const gb = c.createGain();
  gb.gain.setValueAtTime(0.22, t);
  gb.gain.exponentialRampToValueAtTime(0.01, t + dur);
  b.connect(fb).connect(gb).connect(mestre!);
  b.start(t);
  b.stop(t + dur + 0.05);
}

function bumbo(c: AudioContext, t: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.09);
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + 0.16);
  o.connect(g).connect(mestre!);
  o.start(t);
  o.stop(t + 0.18);
  ruidinho(c, t, 0.015, 0.3, 'highpass', 3000); // o clique do pedal
}

function ruidinho(c: AudioContext, t: number, dur: number, vol: number, tipo: BiquadFilterType, freq: number) {
  if (!ruidoBuf) return;
  const s = c.createBufferSource();
  s.buffer = ruidoBuf;
  const f = c.createBiquadFilter();
  f.type = tipo;
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(mestre!);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

function caixa(c: AudioContext, t: number) {
  ruidinho(c, t, 0.14, 0.55, 'bandpass', 1800);
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(210, t);
  g.gain.setValueAtTime(0.3, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
  o.connect(g).connect(mestre!);
  o.start(t);
  o.stop(t + 0.1);
}

// ─── Sequenciador ─────────────────────────────────────────
let clima: Clima = 'silencio';
let intensidade = 0;
let breakdownAte = 0;
let passo = 0;
let compasso = 0;
let proximo = 0;
let timer = 0;
let volumeAlvo = 0;

function padraoAtual(c: AudioContext): string {
  if (clima === 'estrada') return 'estrada';
  if (c.currentTime < breakdownAte) return 'breakdown';
  return intensidade > 0.55 ? 'blast' : 'dbeat';
}

function agendar() {
  const c = contextoDeAudio();
  if (!c) return;
  montar(c);
  const alvo = estaMudo() || clima === 'silencio' ? 0 : volumeAlvo;
  mestre!.gain.setTargetAtTime(alvo, c.currentTime, 0.3);
  if (clima === 'silencio') return;
  if (proximo < c.currentTime) proximo = c.currentTime + 0.05;
  while (proximo < c.currentTime + 0.12) {
    const nome = padraoAtual(c);
    const semi = 60 / BPM[nome] / 4;
    const riff = RIFFS[nome][compasso % RIFFS[nome].length];
    const nota = riff[passo];
    if (nota !== '-') {
      const abafado = nota === 'x';
      // Nota repetida no blast vira tremolo; no breakdown a nota aberta soa longa.
      const dur = nome === 'breakdown' && !abafado ? semi * 3.5 : semi * 0.95;
      guitarra(c, proximo, abafado ? 0 : nota, abafado, dur);
    }
    const bat = BATERIAS[nome];
    if (bat.k[passo] === 'x') bumbo(c, proximo);
    if (bat.s[passo] === 'x') caixa(c, proximo);
    if (bat.h[passo] === 'x') ruidinho(c, proximo, 0.03, 0.12, 'highpass', 7000);
    if (bat.c[passo] === 'x') ruidinho(c, proximo, nome === 'blast' ? 0.12 : 0.6, 0.18, 'highpass', 5000);
    proximo += semi;
    passo = (passo + 1) % 16;
    if (passo === 0) compasso++;
  }
}

export const trilha = {
  /** Troca o clima (mapa/evento = estrada, show = show). */
  tocar(novo: Clima, volume = novo === 'show' ? 0.5 : 0.28) {
    if (novo !== clima) { passo = 0; compasso = 0; }
    clima = novo;
    volumeAlvo = volume;
    if (!timer) timer = window.setInterval(agendar, 25);
    agendar();
  },
  /** Energia do público / alvo (0 = morno, 1+ = casa abaixo). */
  intensidade(x: number) { intensidade = x; },
  /** Dois compassos de breakdown, a partir do próximo tempo forte. */
  breakdown() {
    const c = contextoDeAudio();
    if (!c) return;
    breakdownAte = c.currentTime + (60 / BPM.breakdown) * 8;
    passo = 0;
  },
  parar() { clima = 'silencio'; agendar(); },
};
