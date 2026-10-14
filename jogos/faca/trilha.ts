/**
 * Trilha do DIY: death metal na linha do Death (Chuck Schuldiner) e hardcore
 * metalizado na linha do Knocked Loose, sintetizados na hora, sem arquivo de
 * áudio. Com tempero brasileiro: alfaia de maracatu dobrando o bumbo nos
 * grooves e nos breakdowns, à la Roots do Sepultura.
 *
 * Guitarra em drop A, gravada "duas vezes" (esquerda e direita, cada uma com
 * a sua distorção); baixo distorcido com sub; bateria com sala.
 *
 * Climas:
 * - `estrada`: groove arrastado de hardcore, com chug e acorde dissonante;
 * - show morno: d-beat de hardcore;
 * - show quente: skank beat de death metal, palhetada tremolo cromática e
 *   solo harmonizado em terças;
 * - show pegando fogo: blast beat;
 * - `breakdown` (carta Breakdown): raspada de palheta, meio tempo, chug
 *   sincopado com china em cada pancada e o "pinch" agudo gritando.
 */
import { contextoDeAudio, estaMudo } from '../compartilhado/som';

type Clima = 'estrada' | 'show' | 'silencio';
type Padrao = 'estrada' | 'hardcore' | 'death' | 'blast' | 'breakdown';

/**
 * Uma linha de 16 semicolcheias:
 * - número = power chord aberto (casa em semitons acima da tônica);
 * - 'nK' = nota solta K, para palhetada tremolo;
 * - 'x' = chug abafado na corda solta;
 * - 'd' = acorde dissonante (tônica + segunda menor + trítono);
 * - 'q' = pinch harmonic, o guincho agudo;
 * - '~' = segura a nota anterior; '-' = pausa.
 */
type Passo = number | `n${number}` | 'x' | 'd' | 'q' | '~' | '-';

const TONICA = 55; // Lá grave (drop A)

// ─── Riffs ────────────────────────────────────────────────
const RIFFS: Record<Padrao, Passo[][]> = {
  // Groove de estrada: chug parado, pancada dissonante, descida cromática.
  estrada: [
    ['x', 'x', '-', 'x', 'x', '-', 'x', '-', 'd', '~', '~', '~', 'x', '-', 'x', 'x'],
    ['x', 'x', '-', 'x', 'x', '-', 'x', '-', 6, '~', 5, '~', 3, '~', 1, '~'],
    ['x', 'x', '-', 'x', 'x', '-', 'x', '-', 'd', '~', '~', '~', 'x', 'x', 'x', 'x'],
    ['x', '-', 'x', '-', 3, '~', 'x', '-', 1, '~', 'x', '-', 'q', '~', '~', '~'],
  ],
  // Hardcore: palhetada aberta e reta, fecha com chug.
  hardcore: [
    [0, 0, 'x', 0, 3, 3, 'x', 3, 1, 1, 'x', 1, 6, '~', 5, '~'],
    [0, 0, 'x', 0, 3, 3, 'x', 3, 'd', '~', '~', '~', 'x', 'x', 'x', 'x'],
  ],
  // Death: tremolo cromático e trítono, depois um galope.
  death: [
    ['n0', 'n0', 'n0', 'n0', 'n1', 'n1', 'n1', 'n1', 'n0', 'n0', 'n0', 'n0', 'n6', 'n6', 'n5', 'n5'],
    ['n0', 'n0', 'n0', 'n0', 'n1', 'n1', 'n1', 'n1', 'n3', 'n3', 'n2', 'n2', 'n1', 'n1', 'n0', 'n0'],
    ['n0', 'n0', 'n0', 'n0', 'n1', 'n1', 'n1', 'n1', 'n0', 'n0', 'n0', 'n0', 'n6', 'n6', 'n7', 'n7'],
    [0, 'x', 'x', 0, 'x', 'x', 0, 'x', 3, 'x', 'x', 3, 'x', 'x', 6, '~'],
  ],
  // Blast: tremolo que sobe e desce como sirene.
  blast: [
    ['n0', 'n0', 'n1', 'n1', 'n0', 'n0', 'n6', 'n6', 'n0', 'n0', 'n1', 'n1', 'n7', 'n7', 'n6', 'n6'],
    ['n0', 'n0', 'n1', 'n1', 'n0', 'n0', 'n6', 'n6', 'n8', 'n8', 'n7', 'n7', 'n6', 'n6', 'n5', 'n5'],
  ],
  // Breakdown: silêncio pesa tanto quanto a pancada.
  breakdown: [
    ['x', '-', '-', 'x', '-', '-', 'x', '-', '-', '-', 'x', '-', 'd', '~', '~', '~'],
    ['x', '-', 'x', '-', '-', 'x', '-', '-', 'q', '~', '~', '~', 'x', 'x', 'x', 'x'],
  ],
};

/**
 * Solo harmonizado (Chuck Schuldiner): duas guitarras em terças da escala
 * menor harmônica, duas oitavas acima. Número = grau em semitons; '~' segura.
 */
const SOLO: Passo[][] = [
  [12, '~', 11, '~', 8, '~', 7, '~', 8, '~', 7, '~', 5, '~', 3, '~'],
  [2, '~', '~', '~', 3, '~', 5, '~', 7, '~', '~', '~', '~', '~', '~', '~'],
  [12, '~', 14, '~', 15, '~', 14, '~', 12, '~', 11, '~', 12, '~', 8, '~'],
  [7, '~', 8, '~', 11, '~', '~', '~', 12, '~', '~', '~', '~', '~', '~', '~'],
];
const MENOR_HARMONICA = [0, 2, 3, 5, 7, 8, 11];

/** Terça acima dentro da menor harmônica (o que a segunda guitarra toca). */
function terca(semi: number): number {
  const oit = Math.floor(semi / 12);
  const grau = MENOR_HARMONICA.indexOf(((semi % 12) + 12) % 12);
  if (grau < 0) return semi + 3;
  const alvo = grau + 2;
  return oit * 12 + MENOR_HARMONICA[alvo % 7] + 12 * Math.floor(alvo / 7);
}

/**
 * Bateria: k = bumbo, s = caixa, h = chimbal, r = condução, c = prato,
 * y = china, f = alfaia/surdo. Uma string de 16 passos por instrumento, ou
 * uma por compasso (acompanhando o riff).
 */
type Linha = 'k' | 's' | 'h' | 'r' | 'c' | 'y' | 'f';
const BATERIAS: Record<Padrao, Partial<Record<Linha, string | string[]>>> = {
  estrada: {
    k: ['xx.xx.x.x...x.xx', 'xx.xx.x.x...x...', 'xx.xx.x.x...xxxx', 'x.x...x.....x...'],
    s: '....x.......x...',
    h: 'x.x.x.x.x.x.x.x.',
    f: 'x..x..x...x.x...',
    c: 'x...............',
    y: ['........x.......', '................', '........x.......', '............x...'],
  },
  hardcore: {
    k: 'x.x...x.x.x...x.',
    s: '..x...x...x...x.',
    h: 'xxxxxxxxxxxxxxxx',
    c: ['x.......x.......', 'x.......x...xxxx'],
  },
  // Skank beat: bumbo no tempo, caixa no contratempo.
  death: {
    k: ['x...x...x...x...', 'x...x...x...x...', 'x...x...x...x...', 'x..xx..xx..xx..x'],
    s: '..x...x...x...x.',
    r: 'x.x.x.x.x.x.x.x.',
    c: 'x...............',
  },
  blast: {
    k: 'xxxxxxxxxxxxxxxx',
    s: '.x.x.x.x.x.x.x.x',
    c: 'x.x.x.x.x.x.x.x.',
  },
  // Meio tempo: caixa só no 3, bumbo e alfaia colados no chug, china em cada pancada.
  breakdown: {
    k: ['x..x..x...x.x...', 'x.x..x......xxxx'],
    f: ['x..x..x...x.x...', 'x.x..x......x.x.'],
    s: '........x.......',
    y: ['x..x..x...x.x...', 'x.x..x..x...x...'],
  },
};

const BPM: Record<Padrao, number> = { estrada: 112, hardcore: 172, death: 196, blast: 224, breakdown: 150 };

// ─── Síntese ──────────────────────────────────────────────
let mestre: GainNode | null = null;
let bateriaBus: GainNode | null = null;
let soloBus: GainNode | null = null;
let ruidoBuf: AudioBuffer | null = null;
/** As duas guitarras base (esquerda e direita), cada uma na sua distorção. */
let guitarras: AudioNode[] = [];
let baixoBus: AudioNode | null = null;

function curvaDistorcao(ganho: number): Float32Array<ArrayBuffer> {
  const n = 2048;
  const curva = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / n) * 2 - 1;
    // Fuzz assimétrico: o lado positivo satura antes, como válvula.
    curva[i] = Math.tanh(x * ganho * (x > 0 ? 1.15 : 1)) * 0.9;
  }
  return curva;
}

/** Pedal + amp + gabinete: corta grave antes (aperta o chug), satura, esvazia o médio. */
function cadeiaGuitarra(c: AudioContext, pan: number, ganho: number): AudioNode {
  const aperto = c.createBiquadFilter();
  aperto.type = 'highpass';
  aperto.frequency.value = 80;
  const pre = c.createGain();
  pre.gain.value = 2.2;
  const dist = c.createWaveShaper();
  dist.curve = curvaDistorcao(ganho);
  dist.oversample = '4x';
  const grave = c.createBiquadFilter();
  grave.type = 'peaking';
  grave.frequency.value = 110;
  grave.Q.value = 0.9;
  grave.gain.value = 7; // o peso do gabinete 4x12
  const scoop = c.createBiquadFilter();
  scoop.type = 'peaking';
  scoop.frequency.value = 750;
  scoop.Q.value = 0.8;
  scoop.gain.value = -7;
  const presenca = c.createBiquadFilter();
  presenca.type = 'peaking';
  presenca.frequency.value = 2600;
  presenca.gain.value = 4;
  const gab = c.createBiquadFilter();
  gab.type = 'lowpass';
  gab.frequency.value = 5200;
  gab.Q.value = 0.5;
  const vol = c.createGain();
  vol.gain.value = 0.13;
  const lado = c.createStereoPanner();
  lado.pan.value = pan;
  aperto.connect(pre).connect(dist).connect(grave).connect(scoop).connect(presenca).connect(gab).connect(vol).connect(lado).connect(mestre!);
  return aperto;
}

/** Sala curta: ruído decaindo vira resposta de impulso. */
function sala(c: AudioContext, segundos: number): ConvolverNode {
  const conv = c.createConvolver();
  const len = Math.floor(c.sampleRate * segundos);
  const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  conv.buffer = ir;
  return conv;
}

function montar(c: AudioContext) {
  if (mestre) return;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 5;
  comp.attack.value = 0.004;
  comp.release.value = 0.12;
  mestre = c.createGain();
  mestre.gain.value = 0;
  mestre.connect(comp).connect(c.destination);

  guitarras = [cadeiaGuitarra(c, -0.75, 26), cadeiaGuitarra(c, 0.75, 24)];

  // Baixo: serra distorcida de leve + sub em seno, no centro.
  const bdist = c.createWaveShaper();
  bdist.curve = curvaDistorcao(4);
  const blp = c.createBiquadFilter();
  blp.type = 'lowpass';
  blp.frequency.value = 900;
  const bvol = c.createGain();
  bvol.gain.value = 0.2;
  bdist.connect(blp).connect(bvol).connect(mestre);
  baixoBus = bdist;

  // Bateria com um pouco de sala.
  bateriaBus = c.createGain();
  bateriaBus.gain.value = 1;
  bateriaBus.connect(mestre);
  const envio = c.createGain();
  envio.gain.value = 0.14;
  bateriaBus.connect(envio).connect(sala(c, 0.7)).connect(mestre);

  // Solo: menos ganho, eco e um tanto de sala.
  const sdist = c.createWaveShaper();
  sdist.curve = curvaDistorcao(10);
  const slp = c.createBiquadFilter();
  slp.type = 'lowpass';
  slp.frequency.value = 3800;
  const svol = c.createGain();
  svol.gain.value = 0.07;
  sdist.connect(slp).connect(svol).connect(mestre);
  const eco = c.createDelay(1);
  eco.delayTime.value = 0.23;
  const volta = c.createGain();
  volta.gain.value = 0.3;
  svol.connect(eco).connect(volta).connect(eco);
  volta.connect(mestre);
  soloBus = c.createGain();
  soloBus.connect(sdist);

  ruidoBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = ruidoBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

/** Envelope de palheta: ataque seco, sustenta e solta. */
function envelope(c: AudioContext, t: number, dur: number, pico: number, destino: AudioNode, abafar: number | null) {
  const env = c.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(pico, t + 0.004);
  env.gain.setTargetAtTime(pico * 0.7, t + 0.01, dur * 0.4);
  env.gain.setTargetAtTime(0, t + dur, 0.02);
  if (abafar !== null) {
    // Palm mute: a mão na ponte corta o agudo antes da distorção.
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(abafar, t);
    lp.frequency.exponentialRampToValueAtTime(abafar * 0.5, t + dur);
    env.connect(lp).connect(destino);
  } else {
    env.connect(destino);
  }
  return env;
}

function oscilador(c: AudioContext, t: number, dur: number, freq: number, cents: number, destino: AudioNode, tipo: OscillatorType = 'sawtooth') {
  const o = c.createOscillator();
  o.type = tipo;
  o.frequency.value = freq;
  o.detune.value = cents;
  o.connect(destino);
  o.start(t);
  o.stop(t + dur + 0.12);
  return o;
}

/** As duas guitarras base tocando a mesma coisa, levemente fora de tempo e de afinação. */
function guitarra(c: AudioContext, t: number, passo: Passo, dur: number) {
  if (!guitarras.length) return;
  let notas: number[];
  let abafar: number | null = null;
  let pico = 0.8;
  if (passo === 'x') { notas = [0, 7]; abafar = 520; dur = Math.min(dur, 0.11); pico = 1; }
  else if (passo === 'd') { notas = [0, 1, 6, 12]; pico = 0.7; }
  else if (typeof passo === 'string' && passo.startsWith('n')) { notas = [Number(passo.slice(1)) + 12]; abafar = 2400; pico = 0.9; }
  else notas = [Number(passo), Number(passo) + 7, Number(passo) + 12];
  guitarras.forEach((cadeia, lado) => {
    const tl = t + lado * 0.007; // a segunda passada nunca cai exatamente junto
    const env = envelope(c, tl, dur, pico / notas.length ** 0.5, cadeia, abafar);
    for (const semi of notas) oscilador(c, tl, dur, TONICA * 2 ** (semi / 12), lado ? 6 : -5, env);
  });
  // Baixo dobra a tônica do acorde uma oitava abaixo.
  if (baixoBus) {
    const raiz = typeof passo === 'number' ? passo : passo.startsWith('n') ? Number(passo.slice(1)) : 0;
    const f = (TONICA / 2) * 2 ** (raiz / 12);
    const env = envelope(c, t, dur, 0.9, baixoBus, null);
    oscilador(c, t, dur, f, 0, env);
    const sub = c.createGain();
    sub.gain.setValueAtTime(0.35, t);
    sub.gain.setTargetAtTime(0, t + dur, 0.03);
    sub.connect(mestre!);
    oscilador(c, t, dur, f, 0, sub, 'sine');
  }
}

/** Pinch harmonic: guincho agudo que sobe um tom e treme. */
function pinch(c: AudioContext, t: number, dur: number) {
  guitarras.forEach((cadeia, lado) => {
    const env = envelope(c, t, dur, 0.5, cadeia, null);
    const o = oscilador(c, t, dur, TONICA * 2 ** (31 / 12), lado ? 8 : -8, env);
    o.frequency.setValueAtTime(TONICA * 2 ** (31 / 12), t);
    o.frequency.exponentialRampToValueAtTime(TONICA * 2 ** (33 / 12), t + 0.12);
    const lfo = c.createOscillator();
    const prof = c.createGain();
    lfo.frequency.value = 6.5;
    prof.gain.value = 22;
    lfo.connect(prof).connect(o.frequency);
    lfo.start(t + 0.12);
    lfo.stop(t + dur + 0.1);
  });
}

/** Raspada de palheta descendo a corda grave: anuncia o breakdown. */
function raspada(c: AudioContext, t: number) {
  if (!ruidoBuf) return;
  for (const cadeia of guitarras) {
    const s = c.createBufferSource();
    s.buffer = ruidoBuf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 6;
    bp.frequency.setValueAtTime(3200, t);
    bp.frequency.exponentialRampToValueAtTime(180, t + 0.42);
    const g = c.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.linearRampToValueAtTime(0, t + 0.45);
    s.connect(bp).connect(g).connect(cadeia);
    s.start(t, Math.random() * 0.4);
    s.stop(t + 0.46);
  }
}

/** Uma voz do solo: vibrato quando a nota segura. */
function voz(c: AudioContext, t: number, semi: number, dur: number) {
  if (!soloBus) return;
  const env = envelope(c, t, dur, 0.6, soloBus, null);
  const o = oscilador(c, t, dur, TONICA * 8 * 2 ** (semi / 12), 0, env);
  if (dur > 0.25) {
    const lfo = c.createOscillator();
    const prof = c.createGain();
    lfo.frequency.value = 5.8;
    prof.gain.setValueAtTime(0, t);
    prof.gain.linearRampToValueAtTime(14, t + dur * 0.6);
    lfo.connect(prof).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.1);
  }
}

function ruidinho(c: AudioContext, t: number, dur: number, vol: number, tipo: BiquadFilterType, freq: number, q = 1) {
  if (!ruidoBuf) return;
  const s = c.createBufferSource();
  s.buffer = ruidoBuf;
  const f = c.createBiquadFilter();
  f.type = tipo;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(bateriaBus!);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

/** Bumbo de metal: corpo grave curto e o clique do pedal bem na cara. */
function bumbo(c: AudioContext, t: number, vol = 1) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.06);
  g.gain.setValueAtTime(0.95 * vol, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
  o.connect(g).connect(bateriaBus!);
  o.start(t);
  o.stop(t + 0.22);
  ruidinho(c, t, 0.012, 0.45 * vol, 'highpass', 2500); // clique
}

function caixa(c: AudioContext, t: number, vol = 1) {
  ruidinho(c, t, 0.18, 0.6 * vol, 'bandpass', 1900, 0.7);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(240, t);
  o.frequency.exponentialRampToValueAtTime(170, t + 0.05);
  g.gain.setValueAtTime(0.45 * vol, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
  o.connect(g).connect(bateriaBus!);
  o.start(t);
  o.stop(t + 0.12);
}

/** China: prato sujo e curto, a pancada do breakdown. */
function china(c: AudioContext, t: number) {
  ruidinho(c, t, 0.45, 0.32, 'bandpass', 4200, 0.6);
  ruidinho(c, t, 0.12, 0.25, 'bandpass', 900, 1.5);
}

/** Alfaia / surdo: tambor grave de pele, com pitch caindo e um tapa por cima. */
function surdo(c: AudioContext, t: number, forte: boolean) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(forte ? 95 : 120, t);
  o.frequency.exponentialRampToValueAtTime(forte ? 58 : 75, t + 0.25);
  g.gain.setValueAtTime(forte ? 0.6 : 0.38, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
  o.connect(g).connect(bateriaBus!);
  o.start(t);
  o.stop(t + 0.4);
  ruidinho(c, t, 0.03, 0.18, 'lowpass', 900);
}

// ─── Sequenciador ─────────────────────────────────────────
let clima: Clima = 'silencio';
let intensidade = 0;
let breakdownDe = 0;
let breakdownAte = 0;
let ultimo: Padrao | null = null;
let passo = 0;
let compasso = 0;
let proximo = 0;
let timer = 0;
let volumeAlvo = 0;

function padraoAtual(t: number): Padrao {
  if (clima === 'estrada') return 'estrada';
  if (t >= breakdownDe && t < breakdownAte) return 'breakdown';
  if (intensidade > 0.8) return 'blast';
  if (intensidade > 0.4) return 'death';
  return 'hardcore';
}

function linha(p: Partial<Record<Linha, string | string[]>>, l: Linha, comp: number): string | undefined {
  const v = p[l];
  return Array.isArray(v) ? v[comp % v.length] : v;
}

/** Quanto a nota do passo `i` dura, somando os '~' seguintes. */
function duracao(riff: Passo[], i: number, semi: number): number {
  let n = 1;
  while (i + n < riff.length && riff[i + n] === '~') n++;
  return semi * n * 0.95;
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
    const nome = padraoAtual(proximo);
    // Mudou de parte: a banda vira junto, do começo do compasso.
    if (nome !== ultimo) { passo = 0; compasso = 0; ultimo = nome; }
    const semi = 60 / BPM[nome] / 4;
    const riff = RIFFS[nome][compasso % RIFFS[nome].length];
    const nota = riff[passo];
    if (nota === 'q') pinch(c, proximo, duracao(riff, passo, semi));
    else if (nota !== '-' && nota !== '~') guitarra(c, proximo, nota, duracao(riff, passo, semi));

    // Solo harmonizado no death, a cada dois compassos de riff.
    if (nome === 'death' && compasso % 4 >= 2) {
      const frase = SOLO[((compasso >> 2) * 2 + (compasso & 1)) % SOLO.length];
      const s = frase[passo];
      if (typeof s === 'number') {
        const d = duracao(frase, passo, semi);
        voz(c, proximo, s, d);
        voz(c, proximo + 0.004, terca(s), d);
      }
    }

    const bat = BATERIAS[nome];
    const on = (l: Linha) => linha(bat, l, compasso)?.[passo] === 'x';
    if (on('k')) bumbo(c, proximo, nome === 'blast' ? 0.75 : 1);
    if (on('s')) caixa(c, proximo, nome === 'blast' ? 0.7 : 1);
    if (on('h')) ruidinho(c, proximo, 0.03, 0.1, 'highpass', 7500);
    if (on('r')) ruidinho(c, proximo, 0.2, 0.08, 'bandpass', 6500, 2);
    if (on('c')) ruidinho(c, proximo, nome === 'blast' ? 0.15 : 0.9, 0.2, 'highpass', 5000);
    if (on('y')) china(c, proximo);
    if (on('f')) surdo(c, proximo, passo % 4 === 0);
    proximo += semi;
    passo = (passo + 1) % 16;
    if (passo === 0) compasso++;
  }
}

export const trilha = {
  /** Troca o clima (mapa/evento = estrada, show = show). */
  tocar(novo: Clima, volume = novo === 'show' ? 0.5 : 0.3) {
    if (novo !== clima) ultimo = null;
    clima = novo;
    volumeAlvo = volume;
    if (!timer) timer = window.setInterval(agendar, 25);
    agendar();
  },
  /** Energia do público / alvo (0 = morno, 1+ = casa abaixo). */
  intensidade(x: number) { intensidade = x; },
  /** Raspada de palheta e dois compassos de breakdown. */
  breakdown() {
    const c = contextoDeAudio();
    if (!c) return;
    montar(c);
    const t = c.currentTime + 0.05;
    raspada(c, t);
    breakdownDe = t + 0.45;
    breakdownAte = breakdownDe + (60 / BPM.breakdown) * 8;
    proximo = breakdownDe;
  },
  parar() { clima = 'silencio'; agendar(); },
};
