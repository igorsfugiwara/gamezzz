/**
 * Trilha lo-fi: as músicas da Escombro passadas por um "sampler de
 * cartucho". Na carga, o áudio é decodificado a 22 kHz, mixado em mono,
 * com taxa de amostragem segurada (≈11 kHz) e bits esmagados (8 bits).
 * Na hora de tocar, passa por filtro de fita (graves e agudos cortados),
 * oscilação de rotação (wow) e um chiado baixinho de vinil.
 *
 * No chefão o filtro abre: a banda "entra de verdade".
 */
import { contextoDeAudio, estaMudo } from '../compartilhado/som';

export type Faixa = 'cicatrizes' | 'sofrer' | 'rasgando' | 'vidaVazia';

const ARQUIVOS: Record<Faixa, string> = {
  cicatrizes: new URL('./musicas/cicatrizes.mp3', import.meta.url).href,
  sofrer: new URL('./musicas/sofrer.mp3', import.meta.url).href,
  rasgando: new URL('./musicas/rasgando-o-verbo.mp3', import.meta.url).href,
  vidaVazia: new URL('./musicas/vida-vazia.mp3', import.meta.url).href,
};

const TAXA = 22050;
const SEGURA = 2; // 22 kHz → ≈11 kHz
const NIVEIS = 128; // 8 bits

const prontas = new Map<Faixa, AudioBuffer>();
const carregando = new Map<Faixa, Promise<AudioBuffer | null>>();

/** Baixa, decodifica e passa pelo lo-fi (uma vez por faixa). */
export function carregarFaixa(f: Faixa): Promise<AudioBuffer | null> {
  const pronta = prontas.get(f);
  if (pronta) return Promise.resolve(pronta);
  let p = carregando.get(f);
  if (p) return p;
  p = (async () => {
    try {
      const bytes = await (await fetch(ARQUIVOS[f])).arrayBuffer();
      const Offline = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
      if (!Offline) return null;
      const dec = await new Offline(1, 1, TAXA).decodeAudioData(bytes);
      const n = dec.length;
      const saida = new Offline(1, 1, TAXA).createBuffer(1, n, TAXA);
      const o = saida.getChannelData(0);
      const canais = Array.from({ length: dec.numberOfChannels }, (_, i) => dec.getChannelData(i));
      let segura = 0;
      for (let i = 0; i < n; i++) {
        if (i % SEGURA === 0) {
          let v = 0;
          for (const c of canais) v += c[i];
          v /= canais.length;
          segura = Math.round(v * NIVEIS) / NIVEIS;
        }
        o[i] = segura;
      }
      prontas.set(f, saida);
      // Guarda no máximo duas faixas prontas: a memória do celular agradece.
      if (prontas.size > 2) for (const k of prontas.keys()) if (k !== f && k !== tocandoAgora) { prontas.delete(k); break; }
      return saida;
    } catch {
      return null;
    } finally {
      carregando.delete(f);
    }
  })();
  carregando.set(f, p);
  return p;
}

// ─── Reprodução ───────────────────────────────────────────

let tocandoAgora: Faixa | null = null;
let fonte: AudioBufferSourceNode | null = null;
let ganho: GainNode | null = null;
let passaBaixa: BiquadFilterNode | null = null;
let chiado: AudioBufferSourceNode | null = null;
let wow: OscillatorNode | null = null;
let volumeAlvo = 0.55;

function montarCadeia(c: AudioContext) {
  ganho = c.createGain();
  ganho.gain.value = 0;
  const passaAlta = c.createBiquadFilter();
  passaAlta.type = 'highpass';
  passaAlta.frequency.value = 110;
  passaBaixa = c.createBiquadFilter();
  passaBaixa.type = 'lowpass';
  passaBaixa.frequency.value = 3600;
  passaBaixa.Q.value = 0.8;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.ratio.value = 4;
  passaAlta.connect(passaBaixa).connect(comp).connect(ganho).connect(c.destination);
  // Chiado de vinil: estalinhos esparsos num buffer que se repete.
  const ruido = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = ruido.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.012 + (Math.random() < 0.0004 ? (Math.random() - 0.5) * 0.5 : 0);
  chiado = c.createBufferSource();
  chiado.buffer = ruido;
  chiado.loop = true;
  const gChiado = c.createGain();
  gChiado.gain.value = 0.5;
  chiado.connect(gChiado).connect(ganho);
  chiado.start();
  return passaAlta;
}
let entrada: AudioNode | null = null;

/** Toca a faixa (com fade); `limpo` abre o filtro, para o chefão. */
export async function tocarFaixa(f: Faixa, limpo = false) {
  const c = contextoDeAudio();
  if (!c) return;
  if (!entrada) entrada = montarCadeia(c);
  abrirFiltro(limpo);
  if (tocandoAgora === f && fonte) { ajustarVolume(); return; }
  tocandoAgora = f;
  const buf = await carregarFaixa(f);
  if (!buf || tocandoAgora !== f) return;
  pararFonte();
  fonte = c.createBufferSource();
  fonte.buffer = buf;
  fonte.loop = true;
  // Wow da fita: a rotação oscila de leve.
  wow = c.createOscillator();
  wow.frequency.value = 0.55;
  const prof = c.createGain();
  prof.gain.value = 0.006;
  wow.connect(prof).connect(fonte.playbackRate);
  wow.start();
  fonte.connect(entrada);
  fonte.start();
  ajustarVolume();
}

export function abrirFiltro(limpo: boolean) {
  const c = contextoDeAudio();
  if (!c || !passaBaixa) return;
  passaBaixa.frequency.setTargetAtTime(limpo ? 9000 : 3600, c.currentTime, 0.4);
}

function pararFonte() {
  try { fonte?.stop(); } catch { /* já parada */ }
  try { wow?.stop(); } catch { /* idem */ }
  fonte?.disconnect();
  fonte = null;
  wow = null;
}

export function ajustarVolume(v = volumeAlvo) {
  volumeAlvo = v;
  const c = contextoDeAudio();
  if (!c || !ganho) return;
  ganho.gain.setTargetAtTime(estaMudo() ? 0 : v, c.currentTime, 0.3);
}

/** Abaixa (para o jingle de vitória) sem parar a fita. */
export function abaixar(ate = 0.12) { ajustarVolume(ate); }

export function pararFaixa() {
  tocandoAgora = null;
  const c = contextoDeAudio();
  if (c && ganho) ganho.gain.setTargetAtTime(0, c.currentTime, 0.25);
  setTimeout(() => { if (!tocandoAgora) pararFonte(); }, 900);
}
