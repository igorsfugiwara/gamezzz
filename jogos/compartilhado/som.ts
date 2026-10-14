/**
 * Sons sintetizados com WebAudio — nenhum arquivo para baixar, o que ajuda
 * a meta de carregamento. O áudio só pode começar depois de um toque: o
 * primeiro gesto destrava o contexto.
 */
let contexto: AudioContext | null = null;
let mudo = false;

function ctx(): AudioContext | null {
  if (mudo) return null;
  if (!contexto) {
    const Classe = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Classe) return null;
    contexto = new Classe();
  }
  if (contexto.state === 'suspended') void contexto.resume();
  return contexto;
}

export function destravarAudio(): void {
  const destravar = () => { ctx(); window.removeEventListener('pointerdown', destravar); window.removeEventListener('keydown', destravar); };
  window.addEventListener('pointerdown', destravar);
  window.addEventListener('keydown', destravar);
}

/** Contexto de áudio para quem monta o próprio grafo (trilhas). null se mudo ou sem WebAudio. */
export function contextoDeAudio(): AudioContext | null { return ctx(); }

export function setMudo(valor: boolean): void { mudo = valor; }
export function estaMudo(): boolean { return mudo; }

/** Uma nota curta. `freq` em Hz. */
export function nota(freq: number, duracao = 0.12, tipo: OscillatorType = 'square', volume = 0.06, atraso = 0): void {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime + atraso;
  const osc = c.createOscillator();
  const ganho = c.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, t);
  ganho.gain.setValueAtTime(volume, t);
  ganho.gain.exponentialRampToValueAtTime(0.0001, t + duracao);
  osc.connect(ganho).connect(c.destination);
  osc.start(t);
  osc.stop(t + duracao + 0.02);
}

/** Acorde (frequências tocadas juntas). */
export function acorde(freqs: number[], duracao = 0.5, tipo: OscillatorType = 'triangle', volume = 0.05): void {
  freqs.forEach((f) => nota(f, duracao, tipo, volume));
}

/** Arpejo: notas em sequência. */
export function arpejo(freqs: number[], passo = 0.07, tipo: OscillatorType = 'square', volume = 0.05): void {
  freqs.forEach((f, i) => nota(f, passo * 1.6, tipo, volume, i * passo));
}

/** Ruído curto (papel, impacto). */
export function ruido(duracao = 0.15, volume = 0.08, corte = 2000): void {
  const c = ctx();
  if (!c) return;
  const amostras = Math.floor(c.sampleRate * duracao);
  const buffer = c.createBuffer(1, amostras, c.sampleRate);
  const dados = buffer.getChannelData(0);
  for (let i = 0; i < amostras; i++) dados[i] = (Math.random() * 2 - 1) * (1 - i / amostras);
  const fonte = c.createBufferSource();
  fonte.buffer = buffer;
  const filtro = c.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = corte;
  const ganho = c.createGain();
  ganho.gain.value = volume;
  fonte.connect(filtro).connect(ganho).connect(c.destination);
  fonte.start();
}

/** Escala pentatônica de dó — qualquer sequência soa bem. */
export const PENTATONICA = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880, 1047, 1175];

export function vibrar(ms = 12): void {
  try { navigator.vibrate?.(ms); } catch { /* sem vibração */ }
}
