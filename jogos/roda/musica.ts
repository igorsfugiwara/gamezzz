/**
 * Trilha chiptune hardcore em camadas (PRD 1, game feel): a música engrossa
 * com a multidão — coro aos 10 recrutas, segunda guitarra aos 30, bateria
 * dobrada aos 80. Sequenciador simples em WebAudio, sem arquivo de áudio.
 */
import { estaMudo } from '../compartilhado/som';

let ctx: AudioContext | null = null;
let mestre: GainNode | null = null;
let timer = 0;
let passo = 0;
let proximo = 0;
let camadas = 0;
let tocando = false;

const BPM = 168;
const SEMI = 60 / BPM / 4;

// Riff em mi menor (notas em Hz). 16 semicolcheias por compasso, 2 compassos.
const BAIXO = [82, 82, 0, 82, 98, 0, 82, 0, 110, 110, 0, 98, 82, 0, 73, 0, 82, 82, 0, 82, 98, 0, 117, 0, 110, 0, 98, 0, 82, 82, 73, 0];
const CORO = [330, 0, 0, 0, 392, 0, 0, 0, 440, 0, 0, 0, 392, 0, 0, 0];
const GUITARRA = [165, 0, 165, 0, 196, 0, 165, 0, 220, 0, 196, 0, 165, 165, 147, 0];

function osc(freq: number, t: number, dur: number, tipo: OscillatorType, vol: number) {
  if (!ctx || !mestre || !freq) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(mestre);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function ruido(t: number, dur: number, vol: number, corte: number) {
  if (!ctx || !mestre) return;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const f = ctx.createBufferSource();
  f.buffer = buf;
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'highpass';
  filtro.frequency.value = corte;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  f.connect(filtro).connect(g).connect(mestre);
  f.start(t);
}

function agendar() {
  if (!ctx) return;
  while (proximo < ctx.currentTime + 0.12) {
    const t = proximo;
    const p = passo % 32;
    osc(BAIXO[p], t, SEMI * 0.9, 'square', 0.05);
    // Bateria: bumbo, caixa, chimbal (dobrado com 80+).
    if (p % 8 === 0) osc(60, t, 0.12, 'sine', 0.22);
    if (p % 8 === 4) ruido(t, 0.09, 0.12, 1500);
    if (p % 2 === 0 || camadas >= 3) ruido(t, 0.03, camadas >= 3 ? 0.035 : 0.025, 7000);
    if (camadas >= 1) osc(CORO[p % 16], t, SEMI * 3.5, 'triangle', 0.035);
    if (camadas >= 2) osc(GUITARRA[p % 16], t, SEMI * 0.8, 'sawtooth', 0.025);
    proximo += SEMI;
    passo++;
  }
}

export function iniciarMusica(): void {
  if (tocando) return;
  const Classe = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Classe) return;
  ctx ??= new Classe();
  if (ctx.state === 'suspended') void ctx.resume();
  mestre = ctx.createGain();
  mestre.gain.value = estaMudo() ? 0 : 0.8;
  mestre.connect(ctx.destination);
  proximo = ctx.currentTime + 0.05;
  passo = 0;
  tocando = true;
  timer = window.setInterval(agendar, 25);
}

export function pararMusica(): void {
  tocando = false;
  clearInterval(timer);
  mestre?.disconnect();
  mestre = null;
}

/** Corte seco e volta no breakdown (a primeira roda fechada). */
export function cortarEVoltar(ms = 500): void {
  if (!mestre || !ctx) return;
  const g = mestre.gain;
  g.cancelScheduledValues(ctx.currentTime);
  g.setValueAtTime(0, ctx.currentTime);
  g.setValueAtTime(estaMudo() ? 0 : 0.8, ctx.currentTime + ms / 1000);
  passo = 0;
}

/** Camadas pela multidão: 0 base, 1 coro (10+), 2 guitarra (30+), 3 bateria dobrada (80+). */
export function ajustarCamadas(fila: number): void {
  camadas = fila >= 80 ? 3 : fila >= 30 ? 2 : fila >= 10 ? 1 : 0;
}

export function volumeMusica(mudo: boolean): void {
  if (mestre) mestre.gain.value = mudo ? 0 : 0.8;
}
