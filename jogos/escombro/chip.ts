/**
 * Som de cartucho: hardcore em chip de 16 bits, sintetizado na hora (pulso,
 * triângulo e ruído, como os canais de um console da época), e os efeitos
 * de soco, pancada, item e especial. Nada de arquivo de áudio.
 */
import { contextoDeAudio, estaMudo, saidaDeAudio } from '../compartilhado/som';

type Musica = 'titulo' | 'ensaio' | 'garoa' | 'canteiro' | 'show' | 'chefe' | 'vitoria' | 'silencio';

/** Nota por semicolcheia: número = semitom acima do Lá 110 Hz; '.' pausa; '-' segura. */
interface Faixa { bpm: number; baixo: string[][]; lead: string[][]; bat: { k: string; s: string; h: string } }

const N = (s: string) => s.split(' ');
const FAIXAS: Record<Exclude<Musica, 'silencio'>, Faixa> = {
  titulo: {
    bpm: 150,
    baixo: [N('0 0 . 0 3 . 5 . 0 0 . 0 7 . 5 3')],
    lead: [N('12 - - - 15 - 12 - 17 - 15 - 12 - 10 -'), N('12 - - - 15 - 17 - 19 - - - 17 - 15 -')],
    bat: { k: 'x...x...x.x.x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  },
  ensaio: {
    bpm: 120,
    baixo: [N('0 . 0 . 3 . 0 . 5 . 3 . 0 . . .')],
    lead: [N('. . . . . . . . . . . . . . . .'), N('12 . 15 . 12 . 10 . 12 - - - . . . .')],
    bat: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  },
  garoa: {
    bpm: 172,
    baixo: [N('0 0 0 0 3 3 3 3 1 1 1 1 6 6 5 5'), N('0 0 0 0 3 3 3 3 8 8 7 7 6 6 5 3')],
    lead: [N('12 - 15 - 13 - 12 - 18 - 17 - 15 - 13 -'), N('12 - 15 - 17 - 18 - 20 - - - 18 17 15 13')],
    bat: { k: 'x.x...x.x.x...x.', s: '..x...x...x...x.', h: 'xxxxxxxxxxxxxxxx' },
  },
  canteiro: {
    bpm: 160,
    baixo: [N('0 . 0 0 . 0 1 . 0 . 0 0 . 6 5 3'), N('0 . 0 0 . 0 1 . 3 . 3 3 . 8 7 6')],
    lead: [N('12 - - 13 - - 12 - 18 - - 17 - - 15 -'), N('12 - - 13 - - 15 - 17 - 18 - 20 - 18 -')],
    bat: { k: 'x..x..x.x..x..x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  },
  show: {
    bpm: 186,
    baixo: [N('0 0 12 0 0 12 0 0 3 3 15 3 1 1 13 1')],
    lead: [N('24 - 22 - 20 - 19 - 20 - 19 - 17 - 15 -'), N('24 - 27 - 25 - 24 - 22 - 24 - 20 - 19 -')],
    bat: { k: 'xxxxxxxxxxxxxxxx', s: '.x.x.x.x.x.x.x.x', h: 'x...x...x...x...' },
  },
  chefe: {
    bpm: 140,
    baixo: [N('0 . . 0 . . 0 . . . 0 . 1 . . .'), N('0 . 0 . . 0 . . 6 . . . 5 . 3 .')],
    lead: [N('12 - - - - - 13 - - - - - 18 - - -'), N('12 - - - 15 - - - 18 - 17 - 13 - - -')],
    bat: { k: 'x..x..x...x.x...', s: '........x.......', h: 'x...x...x...x...' },
  },
  vitoria: {
    bpm: 160,
    baixo: [N('0 . 4 . 7 . 12 - - - - - . . . .')],
    lead: [N('24 . 28 . 31 . 36 - - - - - . . . .')],
    bat: { k: 'x...x...x.......', s: '....x...x.......', h: 'x.x.x.x.........' },
  },
};

let mestre: GainNode | null = null;
let ruido: AudioBuffer | null = null;
let atual: Musica = 'silencio';
let proximo = 0;
let passo = 0;
let compasso = 0;
let timer = 0;

function montar(c: AudioContext) {
  if (mestre) return;
  mestre = c.createGain();
  mestre.gain.value = 0;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -14;
  mestre.connect(comp).connect(saidaDeAudio(c));
  ruido = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = ruido.getChannelData(0);
  // Ruído "de chip": amostra repetida em degraus, mais áspero que o branco.
  let v = 0;
  for (let i = 0; i < d.length; i++) { if (i % 6 === 0) v = Math.random() * 2 - 1; d[i] = v; }
}

const freq = (semi: number) => 110 * 2 ** (semi / 12);

function tom(c: AudioContext, t: number, f: number, dur: number, tipo: OscillatorType, vol: number, destino: AudioNode, vibrato = false) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f, t);
  if (vibrato && dur > 0.2) {
    const lfo = c.createOscillator();
    const pf = c.createGain();
    lfo.frequency.value = 6;
    pf.gain.setValueAtTime(0, t);
    pf.gain.linearRampToValueAtTime(f * 0.012, t + dur);
    lfo.connect(pf).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  }
  g.gain.setValueAtTime(vol, t);
  g.gain.setValueAtTime(vol * 0.7, t + dur * 0.6);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(destino);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function batida(c: AudioContext, t: number, tipo: 'k' | 's' | 'h', destino: AudioNode) {
  if (tipo === 'k') {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.08);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    o.connect(g).connect(destino);
    o.start(t);
    o.stop(t + 0.13);
    return;
  }
  const s = c.createBufferSource();
  s.buffer = ruido;
  const f = c.createBiquadFilter();
  f.type = tipo === 's' ? 'bandpass' : 'highpass';
  f.frequency.value = tipo === 's' ? 1600 : 7000;
  const g = c.createGain();
  g.gain.setValueAtTime(tipo === 's' ? 0.45 : 0.12, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + (tipo === 's' ? 0.12 : 0.03));
  s.connect(f).connect(g).connect(destino);
  s.start(t, Math.random() * 0.5);
  s.stop(t + 0.14);
}

function duracao(linha: string[], i: number, semi: number) {
  let n = 1;
  while (i + n < linha.length && linha[i + n] === '-') n++;
  return semi * n * 0.92;
}

function agendar() {
  const c = contextoDeAudio();
  if (!c) return;
  montar(c);
  mestre!.gain.setTargetAtTime(estaMudo() || atual === 'silencio' ? 0 : 0.32, c.currentTime, 0.2);
  if (atual === 'silencio') return;
  const f = FAIXAS[atual];
  if (proximo < c.currentTime) proximo = c.currentTime + 0.05;
  while (proximo < c.currentTime + 0.12) {
    const semi = 60 / f.bpm / 4;
    const baixo = f.baixo[compasso % f.baixo.length];
    const lead = f.lead[compasso % f.lead.length];
    const b = baixo[passo], l = lead[passo];
    if (b !== '.' && b !== '-') tom(c, proximo, freq(Number(b) - 12), duracao(baixo, passo, semi), 'triangle', 0.5, mestre!);
    if (b !== '.' && b !== '-') tom(c, proximo, freq(Number(b)), Math.min(semi * 0.9, duracao(baixo, passo, semi)), 'square', 0.07, mestre!);
    if (l !== '.' && l !== '-') tom(c, proximo, freq(Number(l)), duracao(lead, passo, semi), 'square', 0.09, mestre!, true);
    for (const k of ['k', 's', 'h'] as const) if (f.bat[k][passo] === 'x') batida(c, proximo, k, mestre!);
    proximo += semi;
    passo = (passo + 1) % 16;
    if (passo === 0) compasso++;
    if (atual === 'vitoria' && compasso > 0) { atual = 'silencio'; break; }
  }
}

export const chip = {
  tocar(m: Musica) {
    if (m !== atual) { passo = 0; compasso = 0; }
    atual = m;
    if (!timer) timer = window.setInterval(agendar, 25);
    agendar();
  },
  parar() { atual = 'silencio'; agendar(); },
};

// ─── Efeitos ──────────────────────────────────────────────

function efeito(fn: (c: AudioContext, t: number, d: AudioNode) => void) {
  const c = contextoDeAudio();
  if (!c || estaMudo()) return;
  montar(c);
  const g = c.createGain();
  g.gain.value = 0.9;
  g.connect(saidaDeAudio(c));
  fn(c, c.currentTime, g);
}

function estalo(c: AudioContext, t: number, d: AudioNode, corte: number, dur: number, vol: number) {
  const s = c.createBufferSource();
  s.buffer = ruido;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(corte, t);
  f.frequency.exponentialRampToValueAtTime(200, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + dur);
  s.connect(f).connect(g).connect(d);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

function varrida(c: AudioContext, t: number, d: AudioNode, f0: number, f1: number, dur: number, tipo: OscillatorType, vol: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + dur);
  o.connect(g).connect(d);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  golpe: () => efeito((c, t, d) => varrida(c, t, d, 900, 300, 0.06, 'square', 0.05)),
  acerto: (forte = false) => efeito((c, t, d) => { estalo(c, t, d, forte ? 2400 : 1600, forte ? 0.18 : 0.1, forte ? 0.6 : 0.4); varrida(c, t, d, forte ? 180 : 240, 60, 0.1, 'square', 0.2); }),
  dano: () => efeito((c, t, d) => { estalo(c, t, d, 1200, 0.2, 0.5); varrida(c, t, d, 300, 80, 0.2, 'sawtooth', 0.12); }),
  pulo: () => efeito((c, t, d) => varrida(c, t, d, 200, 600, 0.12, 'square', 0.06)),
  item: () => efeito((c, t, d) => { for (const [i, f] of [660, 880, 1320].entries()) varrida(c, t + i * 0.06, d, f, f, 0.08, 'square', 0.07); }),
  quebra: () => efeito((c, t, d) => { estalo(c, t, d, 3200, 0.35, 0.6); estalo(c, t + 0.05, d, 1600, 0.3, 0.4); }),
  ko: () => efeito((c, t, d) => { estalo(c, t, d, 2000, 0.5, 0.6); varrida(c, t, d, 400, 50, 0.5, 'square', 0.18); }),
  especial: () => efeito((c, t, d) => { varrida(c, t, d, 60, 30, 0.8, 'sawtooth', 0.4); estalo(c, t, d, 800, 0.9, 0.7); for (let i = 0; i < 6; i++) varrida(c, t + i * 0.05, d, 1600 - i * 200, 200, 0.1, 'square', 0.05); }),
  cachorro: () => efeito((c, t, d) => { for (const k of [0, 0.16]) { varrida(c, t + k, d, 700, 380, 0.09, 'square', 0.1); estalo(c, t + k, d, 2600, 0.06, 0.2); } }),
  menu: () => efeito((c, t, d) => varrida(c, t, d, 880, 880, 0.05, 'square', 0.06)),
  confirma: () => efeito((c, t, d) => { varrida(c, t, d, 523, 523, 0.07, 'square', 0.08); varrida(c, t + 0.07, d, 784, 784, 0.12, 'square', 0.08); }),
  pato: () => efeito((c, t, d) => { for (const k of [0, 0.18]) varrida(c, t + k, d, 520, 300, 0.14, 'sawtooth', 0.16); }),
  motor: () => efeito((c, t, d) => { for (let i = 0; i < 6; i++) varrida(c, t + i * 0.07, d, 70, 55, 0.07, 'sawtooth', 0.18); }),
};
