import '../compartilhado/base.css';
import './estilo.css';
import { detectarRoda, pontoNoPoligono, dist2, type Ponto } from './geometria';
import { FASES_RODA, VIDA_ALVO, type FaseRoda, type TipoAlvo } from './fases';
import {
  spritePessoa, spriteVocal, spriteSeguranca, desenharSprite, ESC_ARTE, PREDIO, CATRACA, VIATURA, PLACA, BOLETO,
  PROPRIETARIO, ALGORITMO, ALGORITMO_COPIA, OCUPACAO, arteParaSprite, type Sprite, type TipoPessoa,
} from './sprites';
import { nomeDoRecruta } from './nomes';
import { iniciarMusica, pararMusica, cortarEVoltar, ajustarCamadas, volumeMusica } from './musica';
import { PALETA as P } from '../compartilhado/paleta';
import { ler, gravar } from '../compartilhado/salvar';
import { compartilhar } from '../compartilhado/compartilhar';
import { evento } from '../compartilhado/eventos';
import { Tutorial, ponto } from '../compartilhado/tutorial';
import { nota, arpejo, acorde, ruido, vibrar, destravarAudio, setMudo, estaMudo } from '../compartilhado/som';

const JOGO = 'roda';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// ─── Constantes de jogo ───────────────────────────────────
const VELOCIDADE = 62;       // unidades por segundo
const GIRO = 5.2;            // rad/s
const AMOSTRA = 2;           // distância entre pontos do rastro
const ESPACO = 4;            // pontos de rastro entre um recruta e o próximo
const AREA_MINIMA = 160;     // roda menor que isso é tremida
const GRITO_RECARGA = 20;    // s (PRD)
const GRITO_RAIO = 52;

setMudo(ler<boolean>(JOGO, 'mudo', false));
destravarAudio();

// ─── Tipos ────────────────────────────────────────────────
interface Pessoa { x: number; y: number; vx: number; vy: number; tipo: TipoPessoa; semente: number; troca: number; pombo?: boolean }
interface Recruta { tipo: TipoPessoa | 'pombo'; semente: number; nome: string }
interface Seguranca { x: number; y: number; tonto: number; ox: number; oy: number; grupo: number }
interface Alvo { tipo: TipoAlvo; x: number; y: number; vida: number; max: number; caido: number; sprite: Sprite }
interface Particula { x: number; y: number; vx: number; vy: number; cor: string; vida: number; tam: number }
interface Texto { x: number; y: number; t: string; vida: number; cor: string }

// ─── Estado ───────────────────────────────────────────────
let fase: FaseRoda;
let numeroFase = 0;
let modo: 'titulo' | 'jogando' | 'pausa' | 'resultado' | 'creditos' = 'titulo';
let jogador = { x: 0, y: 0, ang: 0 };
let alvoAng: number | null = null;
let rastro: Ponto[] = [];
let rastroDesde = 0;
let acumulado = 0;
let fila: Recruta[] = [];
let povo: Pessoa[] = [];
let segurancas: Seguranca[] = [];
let alvos: Alvo[] = [];
let particulas: Particula[] = [];
let textos: Texto[] = [];
let greve = 0;
let invulneravel = 0;
let lento = 0;
let invertido = 0;
let pausaImpacto = 0;
let camera = { x: 0, y: 0, zoom: 1 };
/** Centro e zoom do último quadro desenhado (para achar coisas na tela). */
let vista = { cx: 0, cy: 0, z: 1 };
let inicioTutorial = { x: 0, y: 0 };
let tremor = 0;
let tempo = 0;
let maiorRoda = 0;
let rodasFechadas = 0;
let primeiraRoda = true;
let gritoPronto = 0;
let gritoAnim = 0;
/** Zerou o jogo: o Vocal anda de óculos escuros. */
let oculosDoVocal = ler<boolean>(JOGO, 'oculos', false);
let contadorGrupo = 0;
let limites = { x0: 0, y0: 0, x1: 0, y1: 0 };
let recrutados: string[] = [];
let pomboPassadas = 0;
let pomboEspera = 0;
let ultimaNotaRecruta = 0;

// Chefe
let chefe: {
  ativo: boolean; x: number; y: number; vida: number; max: number; fase: number; vx: number; vy: number;
  timer: number; timer2: number; caindo: number; copias: { x: number; y: number; real: boolean }[];
} | null = null;
let placas: { x: number; y: number }[] = [];
let boletos: { x: number; y: number; vx: number; vy: number }[] = [];
let viaturaChefe: { x: number; y: number; vx: number; vy: number; aviso: number } | null = null;
let zonasDemanda: { x: number; y: number; w: number; h: number }[] = [];

// ─── Canvas na resolução da tela; o mundo mostra a mesma janela de sempre ──
const tela = $('tela') as HTMLCanvasElement;
const ctx = tela.getContext('2d')!;
/** Janela do mundo em unidades (o que cabe na tela no zoom 1). */
let W = 320, H = 180;
/** Pixels do canvas por unidade do mundo no zoom 1. */
let ESC = 1;

function ajustarTela() {
  const r = tela.getBoundingClientRect();
  const retrato = r.height > r.width;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  tela.width = Math.max(1, Math.round(r.width * dpr));
  tela.height = Math.max(1, Math.round(r.height * dpr));
  // Mesmo pedaço de mundo de antes (180×320 em pé, 320×180 deitado), agora com
  // os bonecos em 3 pixels de arte por unidade: dá para ver o detalhe.
  ESC = Math.max(1, Math.min(tela.width / (retrato ? 180 : 320), tela.height / (retrato ? 320 : 180)));
  W = tela.width / ESC;
  H = tela.height / ESC;
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', ajustarTela);

// ─── Chão pré-desenhado por fase ──────────────────────────
let chao: HTMLCanvasElement | null = null;

/** Escala do chão pré-desenhado (pixels por unidade): mais detalhe na calçada. */
const ESC_CHAO = 3;

function desenharChao(f: FaseRoda) {
  const L = f.arena.w + 80, A = f.arena.h + 80;
  const c = document.createElement('canvas');
  c.width = L * ESC_CHAO; c.height = A * ESC_CHAO;
  const g = c.getContext('2d')!;
  g.scale(ESC_CHAO, ESC_CHAO);
  const fino = 1 / ESC_CHAO;
  let semente = f.numero * 977;
  const r = () => ((semente = (semente * 16807) % 2147483647) / 2147483647);

  // Calçada de pedra portuguesa: ondas pretas no fundo branco (Copacabana, centro de SP).
  g.fillStyle = P.papel; g.fillRect(0, 0, L, A);
  g.fillStyle = P.asfalto;
  for (let y = 0; y < A; y += 10) for (let x = 0; x < L; x += fino * 2) {
    const yy = y + Math.sin((x + y) / 7) * 2.5;
    g.fillRect(x, yy, fino * 2, 1.4);
  }
  // Pedrinhas (textura).
  g.fillStyle = 'rgba(0,0,0,0.08)';
  for (let i = 0; i < L * A / 6; i++) g.fillRect(r() * L, r() * A, fino, fino);

  // Prédios no entorno, com pichação no térreo e janelas acesas.
  for (let x = 0; x < L; x += 26) {
    const h = 20 + ((x * 37) % 23);
    for (const y of [0, A - h]) {
      g.fillStyle = [P.noite, P.marinho, P.asfalto, P.vinho][(x / 26) % 4 | 0]; g.fillRect(x, y, 24, h);
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x, y, 1, h);
      for (let j = 3; j < h - 5; j += 6) for (let i = 3; i < 21; i += 6) {
        g.fillStyle = (x + i + j) % 5 === 0 ? P.amarelo : P.preto;
        g.fillRect(x + i, y + j, 3, 3);
        g.fillStyle = P.cimento; g.fillRect(x + i + 1, y + j, fino, 3); // grade
      }
      // Pichação: assinatura serrilhada de rua.
      g.strokeStyle = [P.preto, P.vermelho, P.neon_verde][(x / 26) % 3 | 0]; g.lineWidth = fino * 2;
      const py = y === 0 ? h - 4 : y + 3;
      g.beginPath(); g.moveTo(x + 2, py);
      for (let k = 1; k < 7; k++) g.lineTo(x + 2 + k * 3, py + (k % 2 ? -2.5 : 0));
      g.stroke();
    }
  }

  // Asfalto da arena: remendos, bueiros e faixa de pedestre.
  g.fillStyle = f.cores.asfalto;
  g.fillRect(40, 40, f.arena.w, f.arena.h);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  for (let i = 0; i < 26; i++) g.fillRect(40 + r() * (f.arena.w - 20), 40 + r() * (f.arena.h - 14), 8 + r() * 14, 5 + r() * 6);
  g.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 400; i++) g.fillRect(40 + r() * f.arena.w, 40 + r() * f.arena.h, fino, fino);
  g.fillStyle = f.cores.faixa;
  for (let x = 50; x < f.arena.w + 30; x += 24) g.fillRect(x, 40 + f.arena.h / 2 - 1, 12, 2);
  for (let y = 60; y < f.arena.h + 20; y += 60) for (let x = 0; x < 6; x++) g.fillRect(40 + f.arena.w / 3 + x * 5, y, 3, 18);
  for (let i = 0; i < 8; i++) {
    const bx = 40 + r() * (f.arena.w - 10), by = 40 + r() * (f.arena.h - 6);
    g.fillStyle = P.preto; g.fillRect(bx, by, 6, 3);
    g.fillStyle = P.concreto; for (let k = 0; k < 6; k += 1.5) g.fillRect(bx + k, by, fino, 3);
  }

  // Calçada lateral: ipês amarelos, orelhões e banca de jornal.
  const ipe = (x: number, y: number) => {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 2, y + 2, 13, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = P.chocolate; g.fillRect(x - 1, y - 6, 2, 8);
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2, d = r() * 11;
      g.fillStyle = r() < 0.65 ? P.amarelo : r() < 0.5 ? P.mostarda : P.laranja;
      g.fillRect(x + Math.cos(a) * d, y - 12 + Math.sin(a) * d * 0.7, fino * 3, fino * 3);
    }
  };
  const orelhao = (x: number, y: number) => {
    g.fillStyle = P.cimento; g.fillRect(x - 0.5, y - 10, 1, 10);
    g.fillStyle = P.preto; g.beginPath(); g.ellipse(x, y - 11, 5, 6, 0, Math.PI, 0); g.fill();
    g.fillStyle = P.azul; g.beginPath(); g.ellipse(x, y - 11, 4.4, 5.4, 0, Math.PI, 0); g.fill();
    g.fillStyle = P.ceu; g.fillRect(x - 3, y - 14, 1, 3);
    g.fillStyle = P.neblina; g.fillRect(x - 1.5, y - 11, 3, 4);
  };
  const banca = (x: number, y: number) => {
    g.fillStyle = P.preto; g.fillRect(x - 9, y - 12, 18, 13);
    g.fillStyle = P.musgo; g.fillRect(x - 8, y - 11, 16, 11);
    g.fillStyle = P.folha; g.fillRect(x - 9, y - 13, 18, 2);
    for (let i = 0; i < 5; i++) { g.fillStyle = [P.vermelho, P.amarelo, P.branco, P.ceu, P.neon_rosa][i]; g.fillRect(x - 7 + i * 3, y - 9, 2, 3); }
    g.fillStyle = P.papel; g.fillRect(x - 7, y - 5, 14, 3);
  };
  for (let y = 70; y < A - 50; y += 70) { ipe(14, y); ipe(L - 16, y + 30); }
  orelhao(28, 60); orelhao(L - 26, A - 64);
  banca(24, A - 52); banca(L - 22, 70);

  // Neon de bar nas bordas da arena.
  g.fillStyle = f.cores.neon;
  g.fillRect(40, 40, f.arena.w, 1);
  g.fillRect(40, 40 + f.arena.h - 1, f.arena.w, 1);
  chao = c;
}

// ─── Início de fase ───────────────────────────────────────

const aleatorio = (a: number, b: number) => a + Math.random() * (b - a);

function novaPessoa(): Pessoa {
  const r = Math.random();
  const tipo: TipoPessoa = r < 0.18 ? 'motoboy' : r < 0.36 ? 'tia' : 'povo';
  const semente = Math.floor(Math.random() * 1000);
  return {
    x: aleatorio(limites.x0 + 10, limites.x1 - 10), y: aleatorio(limites.y0 + 10, limites.y1 - 10),
    vx: aleatorio(-10, 10), vy: aleatorio(-10, 10), tipo, semente, troca: aleatorio(1, 4),
  };
}

const POMBO = arteParaSprite(['.GG.....', 'GKGG....', 'GGGGGGG.', '.GVGGGGG', '..GGGG..', '..O..O..'], { G: P.cimento, K: P.preto, V: P.neon_roxo, O: P.laranja });

function iniciarFase(i: number) {
  numeroFase = i;
  fase = FASES_RODA[i];
  limites = { x0: 40, y0: 40, x1: 40 + fase.arena.w, y1: 40 + fase.arena.h };
  desenharChao(fase);
  jogador = { x: limites.x0 + 40, y: (limites.y0 + limites.y1) / 2, ang: 0 };
  rastro = [{ x: jogador.x, y: jogador.y }];
  rastroDesde = 0; acumulado = 0;
  fila = []; recrutados = [];
  povo = Array.from({ length: fase.povo }, novaPessoa);
  // O pombo secreto: passe por ele três vezes e ele entra na roda valendo por dez.
  povo.push({ x: (limites.x0 + limites.x1) / 2 + 60, y: limites.y0 + 30, vx: 0, vy: 0, tipo: 'povo', semente: -1, troca: 99, pombo: true });
  pomboPassadas = 0; pomboEspera = 0;
  segurancas = [];
  alvos = fase.alvos.map((a) => ({ ...a, vida: VIDA_ALVO[a.tipo], max: VIDA_ALVO[a.tipo], caido: 0, sprite: a.tipo === 'predio' ? PREDIO : a.tipo === 'catraca' ? CATRACA : VIATURA }));
  particulas = []; textos = [];
  greve = 0; invulneravel = 0; lento = 0; invertido = 0; pausaImpacto = 0;
  tempo = 0; maiorRoda = 0; rodasFechadas = 0; gritoPronto = 0; contadorGrupo = 0;
  chefe = null; placas = []; boletos = []; viaturaChefe = null; zonasDemanda = [];
  camera = { x: jogador.x, y: jogador.y, zoom: 1 };
  modo = 'jogando';
  mostrar('hud');
  esconder('titulo', 'pausa', 'resultado', 'creditos');
  $('barra-chefe').hidden = true;
  atualizarHud();
  iniciarMusica();
  aviso(`Fase ${fase.numero} · ${fase.bairro}`, 1800);
  evento(JOGO, 'fase_inicio', { fase: fase.numero });
  inicioTutorial = { x: jogador.x, y: jogador.y };
  if (i === 0) tutorial.iniciar();
}

// ─── Tutorial jogado (fase 1) ─────────────────────────────
/** Ponto do mundo na janela, pela câmera do último quadro. */
function naTela(p: Ponto, raio = 14) {
  const r = tela.getBoundingClientRect();
  const k = r.width / W;
  return ponto(r.left + ((p.x - vista.cx) * vista.z + W / 2) * k, r.top + ((p.y - vista.cy) * vista.z + H / 2) * k, raio);
}
function maisPerto<T extends Ponto>(lista: T[]): T | null {
  let melhor: T | null = null;
  let d = Infinity;
  for (const it of lista) { const dd = dist2(it, jogador); if (dd < d) { d = dd; melhor = it; } }
  return melhor;
}
const jogando = () => modo === 'jogando';
const tutorial = new Tutorial(JOGO, [
  { id: 'mover', texto: 'Arraste o dedo pela tela (ou use as setas) para guiar o Vocal.', gesto: 'arrastar', lugar: 'topo', quando: jogando,
    alvo: () => naTela(jogador), ok: () => Math.hypot(jogador.x - inicioTutorial.x, jogador.y - inicioTutorial.y) > 90 },
  { id: 'recrutar', texto: 'Passe encostado nas pessoas: elas entram na sua fila.', lugar: 'topo', quando: jogando,
    alvo: () => { const p = maisPerto(povo.filter((q) => !q.pombo)); return p && naTela(p); }, ok: () => fila.length >= 6 },
  { id: 'roda', texto: 'Agora dê uma volta e cruze o seu rastro: a roda fecha!', gesto: 'circulo', lugar: 'topo', quando: jogando,
    alvo: () => naTela(jogador, 4), ok: () => rodasFechadas > 0 },
  { id: 'alvo', texto: 'Feche a roda em volta da catraca para derrubar. Mais gente, mais dano.', gesto: 'circulo', lugar: 'topo', quando: jogando,
    alvo: () => { const a = maisPerto(alvos.filter((x) => !x.caido)); return a && naTela(a, 4); }, ok: () => alvos.some((a) => a.vida < a.max) },
  { id: 'seguranca', texto: 'Segurança corta sua fila! Fuja dele ou cerque numa roda.', lugar: 'topo',
    quando: () => jogando() && segurancas.length > 0, alvo: () => { const g = maisPerto(segurancas); return g && naTela(g); }, segundos: 5 },
  { id: 'latido', texto: 'Grite! O berro do Vocal atordoa quem estiver perto.', luz: true,
    quando: () => jogando() && gritoPronto === 0 && segurancas.some((g) => !g.tonto && dist2(g, jogador) < 90 ** 2),
    alvo: () => $('btn-latido'), ok: () => gritoAnim > 0, segundos: 8 },
]);

// ─── Entrada ──────────────────────────────────────────────
const teclas = new Set<string>();
window.addEventListener('keydown', (e) => {
  teclas.add(e.key.toLowerCase());
  if (e.key.startsWith('Arrow')) e.preventDefault();
  if (e.key === ' ' || e.key.toLowerCase() === 'e') { e.preventDefault(); gritar(); }
  if (e.key === 'Escape' || e.key.toLowerCase() === 'p') alternarPausa();
});
window.addEventListener('keyup', (e) => teclas.delete(e.key.toLowerCase()));

let toque: { id: number; x0: number; y0: number; x: number; y: number } | null = null;
tela.addEventListener('pointerdown', (e) => {
  toque = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
});
window.addEventListener('pointermove', (e) => {
  if (!toque || e.pointerId !== toque.id) return;
  toque.x = e.clientX; toque.y = e.clientY;
  // O ponto de partida acompanha o dedo de longe: dá para virar sem levantar.
  const dx = toque.x - toque.x0, dy = toque.y - toque.y0;
  const d = Math.hypot(dx, dy);
  if (d > 60) { toque.x0 = toque.x - (dx / d) * 60; toque.y0 = toque.y - (dy / d) * 60; }
});
window.addEventListener('pointerup', (e) => { if (toque?.id === e.pointerId) toque = null; });
window.addEventListener('pointercancel', () => { toque = null; });

function lerDirecao(): number | null {
  let dx = 0, dy = 0;
  if (teclas.has('arrowleft') || teclas.has('a')) dx -= 1;
  if (teclas.has('arrowright') || teclas.has('d')) dx += 1;
  if (teclas.has('arrowup') || teclas.has('w')) dy -= 1;
  if (teclas.has('arrowdown') || teclas.has('s')) dy += 1;
  if (toque) {
    const tx = toque.x - toque.x0, ty = toque.y - toque.y0;
    if (Math.hypot(tx, ty) > 10) { dx = tx; dy = ty; }
  }
  if (!dx && !dy) return null;
  if (invertido > 0) { dx = -dx; dy = -dy; }
  return Math.atan2(dy, dx);
}

// ─── Atualização ──────────────────────────────────────────

function atualizar(dt: number) {
  if (pausaImpacto > 0) { pausaImpacto -= dt; return; }
  tempo += dt;
  invulneravel = Math.max(0, invulneravel - dt);
  lento = Math.max(0, lento - dt);
  invertido = Math.max(0, invertido - dt);
  gritoPronto = Math.max(0, gritoPronto - dt);
  gritoAnim = Math.max(0, gritoAnim - dt);
  tremor = Math.max(0, tremor - dt * 8);

  // Direção e velocidade
  const desejo = lerDirecao();
  if (desejo !== null) alvoAng = desejo;
  if (alvoAng !== null) {
    let diff = alvoAng - jogador.ang;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const giro = GIRO * dt * (naZonaDeDemanda() ? 0.45 : 1);
    jogador.ang += Math.max(-giro, Math.min(giro, diff));
  }
  const motoboys = fila.filter((r) => r.tipo === 'motoboy').length;
  let vel = VELOCIDADE * (1 + Math.min(0.3, motoboys * 0.02));
  if (lento > 0) vel *= 0.55;
  if (naZonaDeDemanda()) vel *= 1.75;
  const nx = jogador.x + Math.cos(jogador.ang) * vel * dt;
  const ny = jogador.y + Math.sin(jogador.ang) * vel * dt;
  jogador.x = Math.max(limites.x0 + 4, Math.min(limites.x1 - 4, nx));
  jogador.y = Math.max(limites.y0 + 6, Math.min(limites.y1 - 4, ny));
  // Na parede, desliza e vira junto — nada de ficar "colado".
  if (jogador.x !== nx || jogador.y !== ny) alvoAng = alvoAng ?? jogador.ang;

  // Rastro
  const ult = rastro[rastro.length - 1];
  acumulado += Math.hypot(jogador.x - ult.x, jogador.y - ult.y);
  if (acumulado >= AMOSTRA) {
    acumulado = 0;
    rastro.push({ x: jogador.x, y: jogador.y });
    const maximo = (fila.length + 3) * ESPACO + 40;
    if (rastro.length > maximo) {
      const cortar = rastro.length - maximo;
      rastro.splice(0, cortar);
      rastroDesde = Math.max(0, rastroDesde - cortar);
    }
    verificarRoda();
  }

  atualizarPovo(dt);
  atualizarSegurancas(dt);
  if (chefe) atualizarChefe(dt);
  atualizarParticulas(dt);

  // Câmera: segue a cabeça e abre conforme a fila cresce.
  const zoomAlvo = Math.max(0.62, 1 - fila.length / 360);
  camera.zoom += (zoomAlvo - camera.zoom) * Math.min(1, dt * 2);
  camera.x += (jogador.x - camera.x) * Math.min(1, dt * 6);
  camera.y += (jogador.y - camera.y) * Math.min(1, dt * 6);

  ajustarCamadas(fila.length);
  if (tempo % 1 < dt) atualizarHud();
}

function naZonaDeDemanda(): boolean {
  return zonasDemanda.some((z) => jogador.x > z.x && jogador.x < z.x + z.w && jogador.y > z.y && jogador.y < z.y + z.h);
}

function posicaoNaFila(i: number): Ponto {
  const idx = rastro.length - 1 - (i + 1) * ESPACO;
  return rastro[Math.max(0, idx)];
}

function recrutar(p: Pessoa) {
  const tipo: Recruta['tipo'] = p.pombo ? 'pombo' : p.tipo;
  if (p.pombo) {
    for (let i = 0; i < 10; i++) fila.push({ tipo: 'pombo', semente: -1, nome: 'Pombo da Sé, pombo' });
    recrutados.push('Pombo da Sé, pombo (vale por dez)');
    texto(p.x, p.y - 8, '+10 POMBO!', P.neon_verde);
    arpejo([523, 659, 784, 1047, 1319], 0.05, 'square', 0.05);
  } else {
    const nome = nomeDoRecruta(recrutados.length, p.tipo);
    fila.push({ tipo, semente: p.semente, nome });
    recrutados.push(nome);
    // Cada tipo entra de um jeito: a tia larga o carrinho, o motoboy derrapa.
    if (p.tipo === 'tia') explodir(p.x, p.y, 6, [P.amarelo, P.folha, P.laranja]);
    if (p.tipo === 'motoboy') explodir(p.x, p.y, 5, [P.neblina, P.cimento]);
    const agora = performance.now();
    if (agora - ultimaNotaRecruta > 40) { nota(400 + Math.min(fila.length, 60) * 12, 0.06, 'square', 0.035); ultimaNotaRecruta = agora; }
  }
  maiorRoda = Math.max(maiorRoda, fila.length);
  $('contador').parentElement!.classList.remove('contador--pulsa');
  void $('contador').offsetWidth;
  $('contador').parentElement!.classList.add('contador--pulsa');
  atualizarHud();
}

function atualizarPovo(dt: number) {
  for (const p of povo) {
    if (!p.pombo) {
      p.troca -= dt;
      if (p.troca < 0) { p.vx = aleatorio(-12, 12); p.vy = aleatorio(-12, 12); p.troca = aleatorio(1.5, 4); }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < limites.x0 + 4 || p.x > limites.x1 - 4) p.vx *= -1;
      if (p.y < limites.y0 + 6 || p.y > limites.y1 - 4) p.vy *= -1;
      p.x = Math.max(limites.x0 + 4, Math.min(limites.x1 - 4, p.x));
      p.y = Math.max(limites.y0 + 6, Math.min(limites.y1 - 4, p.y));
    }
  }
  // Encostar recruta.
  const restantes: Pessoa[] = [];
  for (const p of povo) {
    if (p.pombo) {
      pomboEspera = Math.max(0, pomboEspera - dt);
      if (dist2(p, jogador) < 100 && pomboEspera === 0) {
        pomboPassadas++;
        pomboEspera = 1.5;
        nota(900, 0.05, 'triangle', 0.04);
        if (pomboPassadas >= 3) { recrutar(p); continue; }
      }
      restantes.push(p);
      continue;
    }
    if (dist2(p, jogador) < 64) recrutar(p); else restantes.push(p);
  }
  povo = restantes;
  // A cidade não esvazia: entra gente nova pelas bordas.
  while (povo.length < fase.povo * 0.6) povo.push(novaPessoa());
}

function atualizarSegurancas(dt: number) {
  // Grupos de três, em formação de planilha, chegam pelas bordas.
  const maximo = chefe ? Math.floor(fase.segurancasMax * 0.6) : fase.segurancasMax;
  if (segurancas.length < maximo && tempo > 6 && tutorial.passou('alvo') && Math.random() < dt * 0.35) {
    const lado = Math.floor(Math.random() * 4);
    const bx = lado === 0 ? limites.x0 + 6 : lado === 1 ? limites.x1 - 6 : aleatorio(limites.x0 + 20, limites.x1 - 20);
    const by = lado === 2 ? limites.y0 + 8 : lado === 3 ? limites.y1 - 6 : aleatorio(limites.y0 + 20, limites.y1 - 20);
    contadorGrupo++;
    for (let i = 0; i < 3; i++) segurancas.push({ x: bx, y: by, tonto: 0, ox: (i - 1) * 9, oy: 0, grupo: contadorGrupo });
  }
  const vel = 26 + numeroFase * 4;
  for (const s of segurancas) {
    if (s.tonto > 0) { s.tonto -= dt; continue; }
    const ax = jogador.x + s.ox, ay = jogador.y + s.oy;
    const d = Math.hypot(ax - s.x, ay - s.y) || 1;
    s.x += ((ax - s.x) / d) * vel * dt;
    s.y += ((ay - s.y) / d) * vel * dt;
    if (invulneravel === 0 && dist2(s, jogador) < 49) {
      if (fila.length === 0) return derrota();
      perderDaFila(3, 'seguranca');
      s.tonto = 1.2;
    }
  }
}

function perderDaFila(qtd: number, motivo: 'seguranca' | 'viatura' | 'placa' | 'chefe') {
  invulneravel = 1;
  tremor = 1;
  vibrar(40);
  ruido(0.18, 0.12, 500);
  // A tia da feira absorve uma colisão no lugar de três pessoas.
  const tia = fila.findIndex((r) => r.tipo === 'tia');
  if (motivo === 'seguranca' && tia >= 0) {
    fila.splice(tia, 1);
    texto(jogador.x, jogador.y - 12, 'A tia segurou!', P.amarelo);
  } else {
    const saem = fila.splice(Math.max(0, fila.length - qtd), qtd);
    texto(jogador.x, jogador.y - 12, `-${saem.length}`, P.vermelho);
  }
  atualizarHud();
}

// ─── A roda ───────────────────────────────────────────────

function verificarRoda() {
  if (fila.length < 3) return;
  // Só o corpo da fila fecha roda: o rastro além do último recruta não conta
  // (com uma folga de ~2 pessoas, para a primeira roda sair com 6–8 recrutas).
  const corpo = rastro.length - 1 - (fila.length + 3) * ESPACO;
  const desde = Math.max(rastroDesde, corpo);
  const roda = detectarRoda(rastro, desde, AREA_MINIMA);
  if (!roda) return;
  rastroDesde = roda.indice;
  fecharRoda(roda.poligono);
}

function fecharRoda(poligono: Ponto[]) {
  rodasFechadas++;
  const dano = Math.max(4, fila.length) * (1 + Math.floor(fila.length / 50) * 0.25);
  let acertou = false;
  const centro = poligono.reduce((a, p) => ({ x: a.x + p.x / poligono.length, y: a.y + p.y / poligono.length }), { x: 0, y: 0 });

  for (const a of alvos) {
    if (a.caido || !pontoNoPoligono(a, poligono)) continue;
    a.vida -= dano;
    acertou = true;
    texto(a.x, a.y - 20, `-${Math.round(dano)}`, P.amarelo);
    if (a.vida <= 0) derrubarAlvo(a);
  }
  // Quem está dentro da roda entra nela.
  const dentro = povo.filter((p) => !p.pombo && pontoNoPoligono(p, poligono));
  for (const p of dentro) recrutar(p);
  povo = povo.filter((p) => !dentro.includes(p));
  // Segurança cercado é "realocado": sai de cena.
  const cercados = segurancas.filter((s) => pontoNoPoligono(s, poligono));
  if (cercados.length) {
    segurancas = segurancas.filter((s) => !cercados.includes(s));
    texto(centro.x, centro.y, cercados.length > 1 ? `${cercados.length} seguranças realocados` : 'segurança realocado', P.neon_ciano);
  }
  if (chefe?.ativo) danoAoChefe(poligono, dano);

  // Game feel: pausa de impacto, tremor, panfletos.
  pausaImpacto = 0.08;
  tremor = 0.8;
  explodir(centro.x, centro.y, 28 + Math.min(60, fila.length), [P.branco, P.amarelo, P.neon_rosa, P.papel]);
  acorde([196, 247, 294, 392], 0.35, 'sawtooth', 0.04);
  if (primeiraRoda) {
    // A primeira roda fechada: meio segundo de câmera lenta, o som corta e volta no breakdown.
    primeiraRoda = false;
    pausaImpacto = 0.5;
    cortarEVoltar(500);
    aviso('A RODA FECHOU!', 1400);
  } else if (acertou) {
    aviso(['Roda!', 'Abre a roda!', 'Gira!', 'Mais uma volta!'][rodasFechadas % 4], 700);
  }
  atualizarHud();
}

function derrubarAlvo(a: Alvo) {
  a.vida = 0;
  a.caido = 1;
  greve = Math.min(100, greve + a.max * (100 / fase.alvos.reduce((s, x) => s + VIDA_ALVO[x.tipo], 0)));
  explodir(a.x, a.y, 50, [P.ceu, P.pastel_azul, P.neblina, P.vermelho]);
  ruido(0.5, 0.15, 900);
  vibrar(60);
  texto(a.x, a.y - 26, a.tipo === 'predio' ? 'O prédio espelhado caiu!' : a.tipo === 'catraca' ? 'Catraca livre!' : 'Viatura desmontada!', P.neon_verde);
  if (greve >= 99.5 && !chefe) setTimeout(entrarChefe, 900);
  atualizarHud();
}

// ─── Chefes ───────────────────────────────────────────────

function entrarChefe() {
  if (modo !== 'jogando') return;
  const cx = (limites.x0 + limites.x1) / 2, cy = (limites.y0 + limites.y1) / 2;
  chefe = { ativo: true, x: cx, y: cy - 40, vida: 180, max: 180, fase: 1, vx: 14, vy: 9, timer: 0, timer2: 0, caindo: 0, copias: [] };
  $('barra-chefe').hidden = false;
  $('nome-chefe').textContent = fase.nomeChefe;
  aviso(`${fase.nomeChefe}: “${fase.fala}”`, 3200, true);
  ruido(0.6, 0.08, 300);
  if (fase.chefe === 'algoritmo') nota(988, 0.15, 'sine', 0.06);
  evento(JOGO, 'chefe', { fase: fase.numero });
}

function atualizarChefe(dt: number) {
  const c = chefe!;
  if (c.caindo > 0) {
    c.caindo -= dt;
    if (c.caindo <= 0) vitoria();
    return;
  }
  c.timer += dt; c.timer2 += dt;
  // Anda pela arena, sem pressa — quem tem que correr é você.
  c.x += c.vx * dt; c.y += c.vy * dt;
  if (c.x < limites.x0 + 30 || c.x > limites.x1 - 30) c.vx *= -1;
  if (c.y < limites.y0 + 30 || c.y > limites.y1 - 30) c.vy *= -1;
  c.x = Math.max(limites.x0 + 30, Math.min(limites.x1 - 30, c.x));
  c.y = Math.max(limites.y0 + 30, Math.min(limites.y1 - 30, c.y));
  c.fase = c.vida > c.max * 0.66 ? 1 : c.vida > c.max * 0.33 ? 2 : 3;

  if (fase.chefe === 'proprietario') {
    // O mapa encolhe a cada 10 s: o aluguel subindo.
    if (c.timer >= 10) {
      c.timer = 0;
      const enc = 10;
      const min = { w: fase.arena.w * 0.5, h: fase.arena.h * 0.5 };
      if (limites.x1 - limites.x0 - enc * 2 > min.w) { limites.x0 += enc; limites.x1 -= enc; }
      if (limites.y1 - limites.y0 - enc * 2 > min.h) { limites.y0 += enc * 0.6; limites.y1 -= enc * 0.6; }
      aviso('Aluguel subiu. O bairro encolheu.', 1200);
      ruido(0.3, 0.06, 200);
    }
    if (c.fase === 1 && c.timer2 > 2.6) {
      c.timer2 = 0;
      placas.push({ x: aleatorio(limites.x0 + 20, limites.x1 - 20), y: aleatorio(limites.y0 + 20, limites.y1 - 20) });
      if (placas.length > 10) placas.shift();
    }
    if (c.fase === 2 && c.timer2 > 1.4) {
      c.timer2 = 0;
      const a = Math.atan2(jogador.y - c.y, jogador.x - c.x);
      boletos.push({ x: c.x, y: c.y, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40 });
    }
    if (c.fase === 3 && !viaturaChefe && c.timer2 > 4) {
      c.timer2 = 0;
      const vertical = Math.random() < 0.5;
      viaturaChefe = vertical
        ? { x: aleatorio(limites.x0 + 30, limites.x1 - 30), y: limites.y0 - 20, vx: 0, vy: 150, aviso: 1 }
        : { x: limites.x0 - 20, y: aleatorio(limites.y0 + 30, limites.y1 - 30), vx: 150, vy: 0, aviso: 1 };
    }
  } else {
    // O Algoritmo.
    if (c.fase === 1 && c.timer2 > 5) {
      c.timer2 = 0;
      zonasDemanda = Array.from({ length: 3 }, () => ({ x: aleatorio(limites.x0, limites.x1 - 80), y: aleatorio(limites.y0, limites.y1 - 60), w: 80, h: 60 }));
    }
    if (c.fase === 2) {
      zonasDemanda = [];
      if (c.timer2 > 11) { c.timer2 = 0; invertido = 5; aviso('Sua taxa foi ajustada.', 1500); nota(988, 0.15, 'sine', 0.05); }
    }
    if (c.fase === 3 && c.copias.length === 0) {
      c.copias = [0, 1, 2].map(() => ({ x: aleatorio(limites.x0 + 40, limites.x1 - 40), y: aleatorio(limites.y0 + 40, limites.y1 - 40), real: false }));
      aviso('Ele se dividiu. Só um está carregando.', 1600);
    }
    for (const cp of c.copias) { cp.x += Math.cos(tempo + cp.y) * 12 * dt; cp.y += Math.sin(tempo + cp.x) * 12 * dt; }
  }

  // Placas "Aluga-se": encostar custa um recruta e a placa cai.
  placas = placas.filter((pl) => {
    if (dist2(pl, jogador) < 49 && invulneravel === 0) { perderDaFila(1, 'placa'); explodir(pl.x, pl.y, 8, [P.amarelo, P.vermelho]); return false; }
    return true;
  });
  // Boletos voadores grudam e deixam tudo lento. O grito espanta.
  boletos = boletos.filter((b) => {
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (dist2(b, jogador) < 64) { lento = 2.5; texto(jogador.x, jogador.y - 12, 'boleto!', P.branco); nota(150, 0.15, 'sawtooth', 0.04); return false; }
    return b.x > limites.x0 - 10 && b.x < limites.x1 + 10 && b.y > limites.y0 - 10 && b.y < limites.y1 + 10;
  });
  // Viatura de despejo atravessa a tela e corta a roda ao meio.
  if (viaturaChefe) {
    const v = viaturaChefe;
    if (v.aviso > 0) v.aviso -= dt;
    else {
      v.x += v.vx * dt; v.y += v.vy * dt;
      for (let i = 0; i < fila.length; i++) {
        if (dist2(posicaoNaFila(i), v) < 100) {
          const perdidos = fila.length - i;
          fila.splice(i);
          texto(v.x, v.y, `despejo: -${perdidos}`, P.vermelho);
          tremor = 1; vibrar(50);
          break;
        }
      }
      if (v.x > limites.x1 + 30 || v.y > limites.y1 + 30) viaturaChefe = null;
    }
  }
  // Encostar no chefe custa gente.
  if (invulneravel === 0 && dist2(c, jogador) < 120) perderDaFila(4, 'chefe');
}

function danoAoChefe(poligono: Ponto[], dano: number) {
  const c = chefe!;
  if (fase.chefe === 'algoritmo' && c.copias.length) {
    // Cercar cópia: ela some. Cercar o verdadeiro (o do ícone de carregando): dano.
    const antes = c.copias.length;
    c.copias = c.copias.filter((cp) => !pontoNoPoligono(cp, poligono));
    if (c.copias.length < antes) texto(c.x, c.y - 20, 'era cópia', P.neon_ciano);
  }
  if (!pontoNoPoligono(c, poligono)) return;
  c.vida -= dano;
  texto(c.x, c.y - 24, `-${Math.round(dano)}`, P.neon_rosa);
  ruido(0.25, 0.12, 700);
  if (c.vida <= 0) {
    c.vida = 0;
    c.ativo = false;
    c.caindo = 3.2;
    placas = []; boletos = []; viaturaChefe = null; zonasDemanda = []; c.copias = [];
    aviso(fase.queda, 3000, true);
    explodir(c.x, c.y, 120, [P.vermelho, P.amarelo, P.neon_rosa, P.branco, P.folha]);
    acorde([262, 330, 392, 523, 659], 1.4, 'triangle', 0.06);
  }
  atualizarHud();
}

// ─── Grito do Vocal ───────────────────────────────────────

function gritar() {
  if (modo !== 'jogando' || gritoPronto > 0) return;
  gritoPronto = GRITO_RECARGA;
  gritoAnim = 0.6;
  let atordoados = 0;
  for (const s of segurancas) if (dist2(s, jogador) < GRITO_RAIO ** 2) { s.tonto = 3; atordoados++; }
  boletos = boletos.filter((b) => dist2(b, jogador) > GRITO_RAIO ** 2);
  // Gutural: ruído grave filtrado com um rosnado por baixo.
  ruido(0.5, 0.14, 700); nota(82, 0.45, 'sawtooth', 0.07); nota(87, 0.45, 'sawtooth', 0.05);
  texto(jogador.x, jogador.y - 24, atordoados ? 'AAARGH!' : 'ARGH!', P.amarelo);
  tremor = 0.6;
  vibrar(25);
}

// ─── Partículas e textos ──────────────────────────────────

function explodir(x: number, y: number, n: number, cores: string[]) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = aleatorio(20, 90);
    particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, cor: cores[i % cores.length], vida: aleatorio(0.6, 1.4), tam: Math.random() < 0.5 ? 2 : 1 });
  }
}

function texto(x: number, y: number, t: string, cor: string) { textos.push({ x, y, t, vida: 1.4, cor }); }

function atualizarParticulas(dt: number) {
  for (const p of particulas) { p.vy += 120 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vida -= dt; }
  particulas = particulas.filter((p) => p.vida > 0);
  if (particulas.length > 600) particulas.splice(0, particulas.length - 600);
  for (const t of textos) { t.y -= 14 * dt; t.vida -= dt; }
  textos = textos.filter((t) => t.vida > 0);
}

// ─── Desenho ──────────────────────────────────────────────

function desenhar() {
  ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = fase?.cores.ceu ?? P.preto;
  ctx.fillRect(0, 0, W, H);
  if (!fase || !chao) return;
  const z = camera.zoom;
  const vw = W / z, vh = H / z;
  let cx = Math.max(vw / 2, Math.min(fase.arena.w + 80 - vw / 2, camera.x));
  let cy = Math.max(vh / 2, Math.min(fase.arena.h + 80 - vh / 2, camera.y));
  if (vw > fase.arena.w + 80) cx = (fase.arena.w + 80) / 2;
  if (vh > fase.arena.h + 80) cy = (fase.arena.h + 80) / 2;
  vista = { cx, cy, z };
  const tr = tremor > 0 ? (Math.random() - 0.5) * tremor * 4 : 0;
  const k = z * ESC;
  ctx.setTransform(k, 0, 0, k, Math.round((W / 2 - cx * z + tr) * ESC), Math.round((H / 2 - cy * z + tr) * ESC));

  ctx.drawImage(chao, 0, 0, chao.width / ESC_CHAO, chao.height / ESC_CHAO);
  // Bordas que fecham (aluguel subindo).
  if (limites.x0 > 40 || limites.y0 > 40) {
    ctx.fillStyle = 'rgba(214, 53, 63, 0.35)';
    ctx.fillRect(40, 40, limites.x0 - 40, fase.arena.h);
    ctx.fillRect(limites.x1, 40, 40 + fase.arena.w - limites.x1, fase.arena.h);
    ctx.fillRect(40, 40, fase.arena.w, limites.y0 - 40);
    ctx.fillRect(40, limites.y1, fase.arena.w, 40 + fase.arena.h - limites.y1);
  }
  for (const zd of zonasDemanda) {
    ctx.fillStyle = `rgba(255, 79, 163, ${0.18 + Math.sin(tempo * 6) * 0.06})`;
    ctx.fillRect(zd.x, zd.y, zd.w, zd.h);
  }

  // Alvos
  for (const a of alvos) {
    const s = a.caido && a.tipo === 'predio' ? OCUPACAO : a.sprite;
    if (a.caido && a.tipo !== 'predio') continue;
    const treme = !a.caido && a.vida < a.max ? (Math.random() - 0.5) * (1 - a.vida / a.max) * 2 : 0;
    desenharSprite(ctx, s, a.x + treme, a.y + 4);
    if (!a.caido && a.vida < a.max) {
      ctx.fillStyle = P.preto; ctx.fillRect(a.x - 10, a.y + 6, 20, 2);
      ctx.fillStyle = P.vermelho; ctx.fillRect(a.x - 10, a.y + 6, 20 * (a.vida / a.max), 2);
    }
  }
  // Dica sem texto: nos primeiros segundos, um círculo pontilhado gira em volta do alvo mais perto.
  if (tempo < 25 && rodasFechadas === 0 && fila.length >= 3) {
    const alvo = alvos.filter((a) => !a.caido).sort((a, b) => dist2(a, jogador) - dist2(b, jogador))[0];
    if (alvo) {
      ctx.strokeStyle = P.amarelo;
      ctx.setLineDash([3, 4]);
      ctx.lineDashOffset = -tempo * 20;
      ctx.beginPath(); ctx.arc(alvo.x, alvo.y - 8, 34, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  for (const pl of placas) desenharSprite(ctx, PLACA, pl.x, pl.y);

  // Povo
  for (const p of povo) {
    if (p.pombo) { desenharSprite(ctx, POMBO, p.x, p.y + Math.sin(tempo * 8) * 0.5); continue; }
    // Caminhada em 4 quadros, cada um no seu passo.
    const passo = (Math.floor(tempo * 7 + p.semente) % 4) as 0 | 1 | 2 | 3;
    desenharSprite(ctx, spritePessoa(p.tipo, p.semente, 0, passo), p.x, p.y, p.vx < 0);
  }
  // Pessoa mais perto pisca nos primeiros segundos (ensina a recrutar).
  if (fila.length < 3 && tempo < 20) {
    const perto = povo.filter((p) => !p.pombo).sort((a, b) => dist2(a, jogador) - dist2(b, jogador))[0];
    if (perto && Math.sin(tempo * 8) > 0) { ctx.strokeStyle = P.neon_verde; ctx.lineWidth = 1 / ESC_ARTE * 2; ctx.strokeRect(perto.x - 7, perto.y - 21, 14, 22); ctx.lineWidth = 1; }
  }

  // Rastro neon da roda
  if (fila.length) {
    const fim = Math.max(0, rastro.length - 1 - (fila.length + 1) * ESPACO);
    ctx.strokeStyle = rodasFechadas ? fase.cores.neon : 'rgba(255,255,255,0.25)';
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = fim; i < rastro.length; i++) { const r = rastro[i]; if (i === fim) ctx.moveTo(r.x, r.y); else ctx.lineTo(r.x, r.y); }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  }

  // Fila (do fim para a cabeça, para a cabeça ficar por cima)
  for (let i = fila.length - 1; i >= 0; i--) {
    const pos = posicaoNaFila(i);
    const pulo = Math.abs(Math.sin(tempo * 10 + i * 0.7)) * 1.5;
    const r = fila[i];
    // Na fila todo mundo bate cabeça, cada um no seu tempo.
    const bang = (Math.floor(tempo * 9 + i * 1.7) % 4) as 0 | 1 | 2 | 3;
    desenharSprite(ctx, r.tipo === 'pombo' ? POMBO : spritePessoa(r.tipo, r.semente, bang), pos.x, pos.y - pulo);
  }

  // Seguranças
  for (const s of segurancas) desenharSprite(ctx, spriteSeguranca((Math.floor(tempo * 8 + s.grupo) % 4) as 0 | 1 | 2 | 3, s.tonto > 0), s.x, s.y, s.x > jogador.x);

  // Chefe
  if (chefe) {
    const c = chefe;
    if (fase.chefe === 'proprietario') {
      const caindo = c.caindo > 0;
      ctx.globalAlpha = caindo ? Math.max(0, c.caindo / 3.2) : 1;
      desenharSprite(ctx, PROPRIETARIO, c.x, c.y + 2, c.x > jogador.x);
      ctx.globalAlpha = 1;
    } else {
      const flut = Math.sin(tempo * 3) * 2;
      for (const cp of c.copias) desenharSprite(ctx, ALGORITMO_COPIA, cp.x, cp.y + flut + 2);
      desenharSprite(ctx, ALGORITMO, c.x, c.y + flut + 2);
      // Ícone de carregando: só o verdadeiro tem.
      ctx.strokeStyle = P.neon_rosa;
      ctx.beginPath(); ctx.arc(c.x, c.y - 36 + flut, 4, tempo * 6, tempo * 6 + Math.PI * 1.4); ctx.stroke();
    }
  }
  for (const b of boletos) desenharSprite(ctx, BOLETO, b.x, b.y + 3);
  if (viaturaChefe) {
    const v = viaturaChefe;
    if (v.aviso > 0) {
      ctx.fillStyle = `rgba(214, 53, 63, ${0.25 + Math.sin(tempo * 20) * 0.15})`;
      if (v.vy) ctx.fillRect(v.x - 6, limites.y0, 12, limites.y1 - limites.y0);
      else ctx.fillRect(limites.x0, v.y - 6, limites.x1 - limites.x0, 12);
    } else desenharSprite(ctx, VIATURA, v.x, v.y + 4, v.vx < 0);
  }

  // Onda do grito.
  if (gritoAnim > 0) {
    ctx.strokeStyle = P.amarelo;
    ctx.globalAlpha = gritoAnim;
    for (const f of [1, 0.7]) { ctx.beginPath(); ctx.arc(jogador.x, jogador.y - 10, GRITO_RAIO * f * (1 - gritoAnim / 0.6), 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  // O Vocal (headbang quando a roda tá grande; grita no berro).
  const pisca = invulneravel > 0 && Math.floor(tempo * 16) % 2 === 0;
  if (!pisca) {
    const passo = (Math.floor(tempo * 9) % 4) as 0 | 1 | 2 | 3;
    const bang = (fila.length > 10 ? Math.floor(tempo * 9) % 4 : 0) as 0 | 1 | 2 | 3;
    desenharSprite(ctx, spriteVocal(gritoAnim > 0 || fila.length > 30, bang, oculosDoVocal, passo), jogador.x, jogador.y, Math.cos(jogador.ang) < 0);
  }

  for (const p of particulas) { ctx.fillStyle = p.cor; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.tam, p.tam); }
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  for (const t of textos) {
    ctx.globalAlpha = Math.min(1, t.vida);
    ctx.fillStyle = P.preto; ctx.fillText(t.t, Math.round(t.x) + 1, Math.round(t.y) + 1);
    ctx.fillStyle = t.cor; ctx.fillText(t.t, Math.round(t.x), Math.round(t.y));
  }
  ctx.globalAlpha = 1;

  // Queda do Algoritmo: tela azul de erro, e todo celular diz "Você está offline".
  if (chefe && chefe.caindo > 0 && fase.chefe === 'algoritmo') {
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    ctx.fillStyle = P.azul;
    ctx.globalAlpha = Math.min(1, (3.2 - chefe.caindo) * 1.5) * 0.92;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.fillStyle = P.branco;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(':(', W / 2, H / 2 - 14);
    ctx.fillText('Você está offline', W / 2, H / 2 + 2);
  }

  // Controles invertidos: glitch na tela.
  if (invertido > 0) {
    ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
    ctx.fillStyle = 'rgba(61, 240, 230, 0.12)';
    for (let i = 0; i < 6; i++) ctx.fillRect(0, Math.random() * H, W, 2);
  }
}

// ─── HUD e telas ──────────────────────────────────────────

function atualizarHud() {
  $('contador').textContent = String(fila.length);
  ($('greve') as HTMLElement).style.width = `${greve}%`;
  if (chefe) ($('vida-chefe') as HTMLElement).style.width = `${(chefe.vida / chefe.max) * 100}%`;
  const pronto = gritoPronto <= 0;
  $('btn-grito').classList.toggle('grito--pronto', pronto);
  $('grito-tempo').textContent = pronto ? '' : String(Math.ceil(gritoPronto));
}

let avisoTimer = 0;
function aviso(t: string, ms = 1200, chefeFala = false) {
  const el = $('aviso');
  el.textContent = t;
  el.classList.add('aviso--ver');
  el.classList.toggle('aviso--chefe', chefeFala);
  clearTimeout(avisoTimer);
  avisoTimer = window.setTimeout(() => el.classList.remove('aviso--ver'), ms);
}

const mostrar = (...ids: string[]) => ids.forEach((id) => { $(id).hidden = false; });
const esconder = (...ids: string[]) => ids.forEach((id) => { $(id).hidden = true; });

function formatarTempo(s: number) { return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }

let textoCompartilhar = '';

function vitoria() {
  modo = 'resultado';
  chefe = null;
  const recordes = ler<Record<string, number>>(JOGO, 'recordes', {});
  recordes[fase.numero] = Math.max(recordes[fase.numero] ?? 0, maiorRoda);
  gravar(JOGO, 'recordes', recordes);
  const liberadas = Math.max(ler<number>(JOGO, 'liberadas', 1), fase.numero + 1);
  gravar(JOGO, 'liberadas', Math.min(FASES_RODA.length, liberadas));
  evento(JOGO, 'fase_completa', { fase: fase.numero, roda: maiorRoda, segundos: Math.round(tempo) });
  textoCompartilhar = `Minha roda: ${maiorRoda} pessoas. Derrubei ${fase.nomeChefe} em ${formatarTempo(tempo)}. ✊ RODA`;
  $('res-titulo').textContent = `${fase.nomeChefe} caiu!`;
  $('res-texto').textContent = `Minha roda: ${maiorRoda} pessoas. Derrubei ${fase.nomeChefe} em ${formatarTempo(tempo)}.`;
  const ultima = numeroFase >= FASES_RODA.length - 1;
  $('btn-seguir').textContent = ultima ? 'Créditos' : `Fase ${fase.numero + 1}: ${FASES_RODA[numeroFase + 1].bairro}`;
  $('res-retorno').textContent = '';
  esconder('hud');
  mostrar('resultado');
  if (ultima) { gravar(JOGO, 'oculos', true); oculosDoVocal = true; } // zerou: o Vocal ganha óculos escuros
}

function derrota() {
  modo = 'resultado';
  pararMusica();
  ruido(0.6, 0.12, 300);
  textoCompartilhar = `Minha roda chegou a ${maiorRoda} pessoas no ${fase.bairro}. ✊ RODA`;
  $('res-titulo').textContent = 'A roda se desfez';
  $('res-texto').textContent = `Sem ninguém do lado, o segurança te pegou. A maior roda foi de ${maiorRoda}. Junta o povo de novo.`;
  $('btn-seguir').textContent = 'Tentar de novo';
  $('res-retorno').textContent = '';
  esconder('hud');
  mostrar('resultado');
  evento(JOGO, 'derrota', { fase: fase.numero, roda: maiorRoda });
}

function seguir() {
  const venceu = $('btn-seguir').textContent !== 'Tentar de novo';
  if (!venceu) return iniciarFase(numeroFase);
  if (numeroFase >= FASES_RODA.length - 1) return abrirCreditos();
  iniciarFase(numeroFase + 1);
}

function alternarPausa() {
  if (modo === 'jogando') { modo = 'pausa'; mostrar('pausa'); pararMusica(); }
  else if (modo === 'pausa') { modo = 'jogando'; esconder('pausa'); iniciarMusica(); }
}

function abrirTitulo() {
  modo = 'titulo';
  pararMusica();
  esconder('hud', 'pausa', 'resultado', 'creditos');
  mostrar('titulo');
  const liberadas = ler<number>(JOGO, 'liberadas', 1);
  const lista = $('fases-roda');
  lista.innerHTML = '';
  FASES_RODA.forEach((f, i) => {
    const b = document.createElement('button');
    b.textContent = `${f.numero}. ${f.bairro}`;
    b.disabled = i >= liberadas;
    b.addEventListener('click', () => iniciarFase(i));
    lista.appendChild(b);
  });
  const recordes = ler<Record<string, number>>(JOGO, 'recordes', {});
  const melhor = Math.max(0, ...Object.values(recordes));
  $('recorde').textContent = melhor ? `Maior roda: ${melhor} pessoas` : '';
  desenharArteTitulo();
}

/** Arte do título: a fila girando em volta do prédio espelhado (em pixel de arte, 3×). */
function desenharArteTitulo() {
  const cv = $('titulo-arte') as HTMLCanvasElement;
  cv.width = 960; cv.height = 420;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  let t = 0;
  const pessoa = (i: number) => spritePessoa(i % 5 === 0 ? 'motoboy' : i % 4 === 0 ? 'tia' : 'povo', i * 13, (Math.floor(t * 30 + i) % 4) as 0 | 1 | 2 | 3);
  const pinta = () => {
    if (modo !== 'titulo') return;
    c.clearRect(0, 0, cv.width, cv.height);
    const anel = (frente: boolean) => {
      for (let i = 0; i < 16; i++) {
        const a = t + (i / 16) * Math.PI * 2;
        if ((Math.sin(a) >= 0) !== frente) continue;
        const s = pessoa(i);
        c.drawImage(s, Math.round(480 + Math.cos(a) * 380 - s.width / 2), Math.round(300 + Math.sin(a) * 80 - s.height));
      }
    };
    anel(false);
    c.drawImage(PREDIO, 480 - PREDIO.width / 2, 260 - PREDIO.height);
    anel(true);
    t += 0.012;
    requestAnimationFrame(pinta);
  };
  pinta();
}

/** Créditos: centenas de pixels de gente girando, cada um com nome e profissão. */
function abrirCreditos() {
  modo = 'creditos';
  esconder('resultado', 'hud');
  mostrar('creditos');
  const nomes = recrutados.length ? recrutados : Array.from({ length: 40 }, (_, i) => nomeDoRecruta(i));
  $('creditos-nomes').innerHTML = ['O Vocal, entregador e vocalista', ...nomes].map((n) => `<div>${n}</div>`).join('') + '<div><br/>Fases 3 a 5 chegam na versão 1.0</div>';
  const cv = $('creditos-tela') as HTMLCanvasElement;
  cv.width = 1440; cv.height = 840;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  const total = Math.min(90, Math.max(36, recrutados.length));
  let t = 0;
  const pinta = () => {
    if (modo !== 'creditos') return;
    c.fillStyle = P.preto; c.fillRect(0, 0, cv.width, cv.height);
    const gente: { x: number; y: number; s: Sprite }[] = [];
    for (let anel = 0; anel < 3; anel++) {
      const n = Math.floor(total / 3);
      for (let i = 0; i < n; i++) {
        const a = t * (1 + anel * 0.2) + (i / n) * Math.PI * 2;
        gente.push({
          x: 720 + Math.cos(a) * (240 + anel * 180), y: 500 + Math.sin(a) * (100 + anel * 72),
          s: spritePessoa(i % 6 === 0 ? 'motoboy' : i % 5 === 0 ? 'tia' : 'povo', i * 7 + anel, (Math.floor(t * 60 + i) % 4) as 0 | 1 | 2 | 3),
        });
      }
    }
    gente.push({ x: 720, y: 472, s: OCUPACAO });
    gente.push({ x: 720, y: 600, s: spriteVocal(true, (Math.floor(t * 60) % 4) as 0 | 1 | 2 | 3, true) });
    gente.sort((a, b) => a.y - b.y);
    for (const g of gente) c.drawImage(g.s, Math.round(g.x - g.s.width / 2), Math.round(g.y - g.s.height));
    t += 0.01;
    requestAnimationFrame(pinta);
  };
  pinta();
  evento(JOGO, 'creditos', { recrutados: recrutados.length });
}

// ─── Laço ─────────────────────────────────────────────────
let ultimo = performance.now();
function laco(agora: number) {
  const dt = Math.min(1 / 30, (agora - ultimo) / 1000);
  ultimo = agora;
  if (modo === 'jogando') atualizar(dt);
  if (modo === 'jogando' || modo === 'pausa' || modo === 'resultado') desenhar();
  requestAnimationFrame(laco);
}

// Pausa automática ao trocar de aba (PRD).
document.addEventListener('visibilitychange', () => { if (document.hidden && modo === 'jogando') alternarPausa(); });

$('btn-jogar').addEventListener('click', () => iniciarFase(Math.min(ler<number>(JOGO, 'liberadas', 1), FASES_RODA.length) - 1));
$('btn-pausa').addEventListener('click', alternarPausa);
$('btn-continuar').addEventListener('click', alternarPausa);
$('btn-sair').addEventListener('click', abrirTitulo);
$('btn-seguir').addEventListener('click', seguir);
$('btn-fim-creditos').addEventListener('click', abrirTitulo);
$('btn-grito').addEventListener('pointerdown', (e) => { e.stopPropagation(); gritar(); });
$('btn-som').addEventListener('click', () => {
  setMudo(!estaMudo());
  gravar(JOGO, 'mudo', estaMudo());
  volumeMusica(estaMudo());
  $('btn-som').textContent = estaMudo() ? '🔇 Som' : '🔊 Som';
});
$('btn-compartilhar').addEventListener('click', async () => {
  const r = await compartilhar(textoCompartilhar);
  evento(JOGO, 'compartilhar', { resultado: r });
  $('res-retorno').textContent = r === 'copiado' ? 'Copiado!' : r === 'falhou' ? textoCompartilhar : '';
});
{
  // Botão do grito: a cara do Vocal berrando.
  const gc = $('grito-vocal') as HTMLCanvasElement;
  const v = spriteVocal(true, 0, oculosDoVocal);
  gc.width = 44; gc.height = 44;
  const g2 = gc.getContext('2d')!;
  g2.imageSmoothingEnabled = false;
  g2.drawImage(v, 6, 4, 44, 44, 0, 0, 44, 44);
}

// Gancho de teste (só com #teste na URL): dá recrutas e expõe contadores.
if (location.hash === '#teste') {
  (window as unknown as { __roda: unknown }).__roda = {
    estado: () => ({ x: jogador.x, y: jogador.y, fila: fila.length, rodas: rodasFechadas, greve: Math.round(greve), alvos: alvos.map((a) => Math.round(a.vida)), chefe: chefe?.vida ?? null, modo }),
    dar: (n: number) => { for (let i = 0; i < n; i++) recrutar(novaPessoa()); },
    chefe: () => { greve = 100; entrarChefe(); },
    // Avança a simulação sem depender do requestAnimationFrame.
    passo: (dt: number, ang: number | null) => { alvoAng = ang; atualizar(dt); },
    ir: (x: number, y: number) => { jogador.x = x; jogador.y = y; rastro = [{ x, y }]; rastroDesde = 0; },
    alvo: (i: number) => ({ x: alvos[i].x, y: alvos[i].y }),
    chefePos: () => (chefe ? { x: chefe.x, y: chefe.y } : null),
  };
}

ajustarTela();
abrirTitulo();
requestAnimationFrame(laco);
