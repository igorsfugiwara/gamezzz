/**
 * ESCOMBRO: A FITA — beat 'em up lateral de 16 bits da Escombro HC.
 *
 * Resolução interna 480×270 (escala inteira quando cabe), lutadores de
 * 118 px feitos no motor de volume, ondas de inimigos que travam a câmera,
 * comida que cura, quebráveis, barra de MOSH com o especial de cada
 * integrante e um chefão por fase. O mapa e o carregamento são no visual de
 * Game Boy, como pede o PRD.
 */
import '../compartilhado/base.css';
import './estilo.css';
import { PALETA as P } from '../compartilhado/paleta';
import { ler, gravar } from '../compartilhado/salvar';
import { evento } from '../compartilhado/eventos';
import { compartilhar } from '../compartilhado/compartilhar';
import { destravarAudio, setMudo, estaMudo, vibrar } from '../compartilhado/som';
import { Tutorial } from '../compartilhado/tutorial';
import { t, tri, idioma, definirIdioma, type Idioma } from './i18n';
import {
  INTEGRANTES, INIMIGOS, FASES, ITENS, CHAO, PROGRESSO_INICIAL, VIDA_JOGADOR, MOSH_POR_ACERTO, MOSH_POR_KO,
  integrante, acerta, danoDoGolpe, nota as notaDaFase, concluirFase, pedacosDaFita, formatarTempo,
  type Quem, type TipoInimigo, type TipoItem, type TipoQuebravel, type Fase, type Progresso, type Nota,
} from './regras';
import {
  spriteIntegrante, retratoIntegrante, spriteInimigo, spriteTecnico, spritePato, spriteMao,
  spriteCaramelo, spriteItem, spriteQuebravel, piscada, type Sprite, type PoseLuta,
} from './sprites';
import { montarPalco, desenharFundo, desenharCamada, desenharClima, LARG, ALT, type Palco } from './cenario';
import { chip, sfx } from './chip';

const JOGO = 'escombro';
/** Link da banda no fim do jogo (vazio = botão escondido até a banda definir). */
const LINK_BANDA = '';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const app = $('app');
const tela = $<HTMLCanvasElement>('tela');
const ctx = tela.getContext('2d')!;
ctx.imageSmoothingEnabled = false;

setMudo(ler<boolean>(JOGO, 'mudo', false));
destravarAudio();
let reduzirFlash = ler<boolean>(JOGO, 'flash', false);
let progresso: Progresso = { ...PROGRESSO_INICIAL, ...ler<Progresso>(JOGO, 'progresso', PROGRESSO_INICIAL) };
const salvarProgresso = () => gravar(JOGO, 'progresso', progresso);

// ─── Textos da página ─────────────────────────────────────
function traduzir() {
  document.querySelectorAll<HTMLElement>('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t as Parameters<typeof t>[0]); });
  document.querySelectorAll<HTMLButtonElement>('#idiomas button').forEach((b) => b.classList.toggle('ativo', b.dataset.idioma === idioma()));
  $('b-som').textContent = `${t('jogo.som')}: ${estaMudo() ? 'OFF' : 'ON'}`;
  $('b-flash').textContent = `${t('jogo.flash')}: ${reduzirFlash ? 'ON' : 'OFF'}`;
}
const idiomaSalvo = ler<Idioma | null>(JOGO, 'idioma', null);
if (idiomaSalvo) definirIdioma(idiomaSalvo);
traduzir();

// ─── Escala da tela (pixel inteiro quando cabe) ───────────
function ajustarTela() {
  const deitado = innerWidth > innerHeight;
  const toque = matchMedia('(pointer: coarse)').matches;
  app.classList.toggle('esc--deitado', deitado);
  $('controles').hidden = !(toque && modo === 'jogo');
  const r = $('palco').getBoundingClientRect();
  const k = Math.min(r.width / LARG, (deitado || $('controles').hidden ? innerHeight : innerHeight * 0.58) / ALT);
  const ki = k >= 1 ? Math.floor(k * (devicePixelRatio || 1)) / (devicePixelRatio || 1) : k;
  tela.style.width = `${Math.floor(LARG * ki)}px`;
  tela.style.height = `${Math.floor(ALT * ki)}px`;
}
addEventListener('resize', ajustarTela);

// ─── Entrada: teclado, controle e toque ───────────────────
const teclas = new Set<string>();
const toqueDir = { x: 0, y: 0 };
const toqueBotao = { soco: false, pulo: false, esp: false };
const ctrl = { x: 0, y: 0, soco: false, pulo: false, esp: false, start: false };
const antes = { soco: false, pulo: false, esp: false, start: false };
const aperto = { soco: false, pulo: false, esp: false, start: false };

addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  teclas.add(k);
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (modo === 'titulo') segredo(k);
});
addEventListener('keyup', (e) => teclas.delete(e.key.toLowerCase()));
addEventListener('blur', () => teclas.clear());

function ligarBotao(id: string, chave: keyof typeof toqueBotao) {
  const b = $(id);
  const on = (e: PointerEvent) => { e.preventDefault(); toqueBotao[chave] = true; b.setPointerCapture(e.pointerId); };
  const off = () => { toqueBotao[chave] = false; };
  b.addEventListener('pointerdown', on);
  b.addEventListener('pointerup', off);
  b.addEventListener('pointercancel', off);
}
ligarBotao('b-soco', 'soco');
ligarBotao('b-pulo', 'pulo');
ligarBotao('b-esp', 'esp');
{
  const d = $('direcional');
  const pino = $('pino');
  const mover = (e: PointerEvent) => {
    const r = d.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const m = Math.hypot(dx, dy);
    const lim = r.width * 0.32;
    const k = m > lim ? lim / m : 1;
    pino.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    toqueDir.x = Math.abs(dx) > 12 ? Math.sign(dx) : 0;
    toqueDir.y = Math.abs(dy) > 12 ? Math.sign(dy) : 0;
  };
  d.addEventListener('pointerdown', (e) => { d.setPointerCapture(e.pointerId); mover(e); });
  d.addEventListener('pointermove', (e) => { if (d.hasPointerCapture(e.pointerId)) mover(e); });
  const soltar = () => { toqueDir.x = 0; toqueDir.y = 0; pino.style.transform = ''; };
  d.addEventListener('pointerup', soltar);
  d.addEventListener('pointercancel', soltar);
}
$('b-pausa').addEventListener('click', () => alternarPausa());

function lerControles() {
  let x = 0, y = 0, soco = false, pulo = false, esp = false, start = false;
  const tem = (...ks: string[]) => ks.some((k) => teclas.has(k));
  if (tem('arrowleft', 'a')) x -= 1;
  if (tem('arrowright', 'd')) x += 1;
  if (tem('arrowup', 'w')) y -= 1;
  if (tem('arrowdown', 's')) y += 1;
  soco = tem('j', 'z');
  pulo = tem('k', 'x', ' ');
  esp = tem('l', 'c');
  start = tem('enter', 'escape', 'p');
  for (const gp of navigator.getGamepads?.() ?? []) {
    if (!gp) continue;
    const ax = gp.axes[0] ?? 0, ay = gp.axes[1] ?? 0;
    if (Math.abs(ax) > 0.4) x = Math.sign(ax);
    if (Math.abs(ay) > 0.4) y = Math.sign(ay);
    const b = (i: number) => !!gp.buttons[i]?.pressed;
    if (b(14)) x = -1; if (b(15)) x = 1; if (b(12)) y = -1; if (b(13)) y = 1;
    soco ||= b(2); pulo ||= b(0); esp ||= b(1) || b(3); start ||= b(9);
  }
  if (toqueDir.x || toqueDir.y) { x = toqueDir.x; y = toqueDir.y; }
  soco ||= toqueBotao.soco; pulo ||= toqueBotao.pulo; esp ||= toqueBotao.esp;
  Object.assign(ctrl, { x, y, soco, pulo, esp, start });
  for (const k of ['soco', 'pulo', 'esp', 'start'] as const) { aperto[k] = ctrl[k] && !antes[k]; antes[k] = ctrl[k]; }
}

// ─── Estado de jogo ───────────────────────────────────────
type Modo = 'titulo' | 'selecao' | 'mapa' | 'carregando' | 'jogo' | 'pausa' | 'continue' | 'resultado' | 'fim' | 'arquivo';
let modo: Modo = 'titulo';

type Estado = 'parado' | 'anda' | 'golpe' | 'pulo' | 'voadora' | 'apanha' | 'voa' | 'caido' | 'levanta' | 'especial' | 'prepara' | 'tonto' | 'morto';

interface Corpo {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  dir: 1 | -1; vida: number; max: number; estado: Estado; t: number; pisca: number;
}
interface Jogador extends Corpo { quem: Quem; combo: number; janela: number; acertou: Set<object>; invul: number; mosh: number; vidas: number; golpesSofridos: number[]; noAr: boolean }
interface Inimigo extends Corpo { tipo: TipoInimigo; semente: number; recarga: number; lado: 1 | -1; engajado: boolean; morto: number }
interface Item { x: number; y: number; tipo: TipoItem; vz: number; z: number }
interface Quebravel { x: number; y: number; tipo: TipoQuebravel; item: TipoItem; vida: number; pisca: number }
interface Particula { x: number; y: number; vx: number; vy: number; cor: string; vida: number; tam: number }
interface Faisca { x: number; y: number; vida: number; forte: boolean }
interface Onda3 { x: number; y: number; raio: number; vida: number; cor: string }
interface Projetil { x: number; y: number; z: number; vx: number; vida: number; atingidos: Set<object>; tipo: 'microfonia' | 'entulho' | 'eco'; aviso?: number }
interface Cachorro { x: number; y: number; dir: 1 | -1; vida: number; morde: number; alvo: Inimigo | null }

let fase: Fase = FASES[0];
let palco: Palco;
let jog: Jogador;
let inimigos: Inimigo[] = [];
let itens: Item[] = [];
let quebraveis: Quebravel[] = [];
let particulas: Particula[] = [];
let faiscas: Faisca[] = [];
let ondasFx: Onda3[] = [];
let projeteis: Projetil[] = [];
let cachorro: Cachorro | null = null;
let camX = 0;
let trava: number | null = null;
let ondaIdx = 0;
let filaSpawn: { tipo: TipoInimigo; em: number; lado: 1 | -1 }[] = [];
let tempoFase = 0;
let relogio = 0;
let pausaImpacto = 0;
let tremor = 0;
let flash = 0;
let proximoRaio = 8;
let mensagem = { texto: '', vida: 0, grande: false };
let setaVai = 0;
let pontos = 0;
let combo = 0;
let comboVida = 0;
let comboMax = 0;
let danoSofrido = 0;
let continues = 0;
let terminou = false;
let especialUsado = false;
let itemPego = false;
let pulou = false;
let acertos = 0;
let chefe: Chefe | null = null;

interface Chefe extends Corpo {
  tipo: 'pato' | 'mao' | 'tecnico';
  /** O golpe desta ação já pegou (laser, varrida, chicote). */
  golpeou: boolean;
  acao: string;
  timer: number;
  alvo: { x: number; y: number } | null;
  fase2: boolean;
  chamou: number;
  quadro: number;
}

const SEM_MOSH_FASE0 = 0;

// ─── Utilidades ───────────────────────────────────────────
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const aleatorio = (a: number, b: number) => a + Math.random() * (b - a);

function avisar(texto: string, vida = 1.2, grande = false) { mensagem = { texto, vida, grande }; }

function poeira(x: number, y: number, n = 6, cor: string = P.papel) {
  for (let i = 0; i < n; i++) particulas.push({ x, y, vx: aleatorio(-50, 50), vy: aleatorio(-60, -10), cor, vida: aleatorio(0.25, 0.5), tam: 1 + Math.floor(Math.random() * 2) });
}

// ─── Início de fase ───────────────────────────────────────
function novoJogador(quem: Quem): Jogador {
  return {
    quem, x: 90, y: 220, z: 0, vx: 0, vy: 0, vz: 0, dir: 1, vida: VIDA_JOGADOR, max: VIDA_JOGADOR, estado: 'parado', t: 0, pisca: 0,
    combo: 0, janela: 0, acertou: new Set(), invul: 1, mosh: SEM_MOSH_FASE0, vidas: 3, golpesSofridos: [], noAr: false,
  };
}

function iniciarFase(n: number) {
  fase = FASES[n];
  palco = montarPalco(fase.cenario);
  jog = novoJogador(progresso.quem);
  inimigos = []; itens = []; particulas = []; faiscas = []; ondasFx = []; projeteis = []; cachorro = null; chefe = null;
  quebraveis = fase.quebraveis.map((q) => ({ ...q, vida: 3, pisca: 0 }));
  camX = 0; trava = null; ondaIdx = 0; filaSpawn = [];
  tempoFase = 0; pontos = 0; combo = 0; comboMax = 0; danoSofrido = 0; continues = 0; terminou = false;
  especialUsado = false; itemPego = false; pulou = false; acertos = 0;
  proximoRaio = 6;
  modo = 'jogo';
  mostrar(null);
  ajustarTela();
  chip.tocar(fase.cenario === 'ensaio' ? 'ensaio' : fase.cenario);
  avisar(n === 0 ? tri(fase.nome) : `${t('jogo.round', { n })} · ${fase.ano}`, 2.2, true);
  evento(JOGO, 'fase_inicio', { fase: n, quem: jog.quem });
  if (n === 0) tutorial.iniciar();
  // Teste (?relogio&chefe): pula direto para o chefão.
  if (RELOGIO_TIMER && new URLSearchParams(location.search).has('chefe') && fase.chefe) {
    ondaIdx = fase.ondas.length;
    camX = fase.comprimento - LARG;
    jog.x = camX + 120;
  }
}

// ─── Tutorial jogado (sala de ensaio) ─────────────────────
const naCena = (x: number, y: number, raio = 20) => {
  const r = tela.getBoundingClientRect();
  const k = r.width / LARG;
  return { x: r.left + (x - camX - raio) * k, y: r.top + (y - raio) * k, w: raio * 2 * k, h: raio * 2 * k };
};
const jogando0 = () => modo === 'jogo' && fase.n === 0;
let inicioTut = { x: 90, y: 220 };
const tutorial = new Tutorial(JOGO, [
  { id: 'mover', texto: () => t('tut.mover'), lugar: 'topo', quando: jogando0, alvo: () => naCena(jog.x, jog.y - 60, 30), ok: () => Math.hypot(jog.x - inicioTut.x, jog.y - inicioTut.y) > 40 },
  { id: 'soco', texto: () => t('tut.soco'), lugar: 'topo', quando: jogando0, alvo: () => { const a = inimigos[0]; return a ? naCena(a.x, a.y - 60, 30) : null; }, ok: () => acertos >= 3 },
  { id: 'pulo', texto: () => t('tut.pulo'), lugar: 'topo', quando: jogando0, ok: () => pulou },
  { id: 'mosh', texto: () => t('tut.mosh'), lugar: 'topo', quando: () => jogando0() && jog.mosh > 0, segundos: 4 },
  { id: 'esp', texto: () => t('tut.esp'), lugar: 'topo', quando: () => jogando0() && jog.mosh >= 100, alvo: () => ($('controles').hidden ? null : $('b-esp')), ok: () => especialUsado },
  { id: 'comida', texto: () => t('tut.comida'), lugar: 'topo', quando: jogando0, alvo: () => { const q = quebraveis[0] ?? itens[0]; return q ? naCena(q.x, q.y - 30, 30) : null; }, ok: () => itemPego, segundos: 12 },
  { id: 'fim', texto: () => t('tut.fim'), lugar: 'topo', quando: jogando0, segundos: 3 },
], undefined, () => ({ pular: idioma() === 'pt' ? 'Pular tutorial' : idioma() === 'de' ? 'Tutorial überspringen' : 'Skip tutorial', entendi: 'OK', de: idioma() === 'pt' ? 'de' : idioma() === 'de' ? 'von' : 'of' }));

// ─── Ondas e câmera ───────────────────────────────────────
function atualizarOndas(dt: number) {
  // Spawns pendentes, um de cada vez, de um lado e do outro.
  for (const s of filaSpawn) s.em -= dt;
  while (filaSpawn.length && filaSpawn[0].em <= 0) {
    const s = filaSpawn.shift()!;
    criarInimigo(s.tipo, s.lado);
  }
  if (trava === null && ondaIdx < fase.ondas.length && camX >= fase.ondas[ondaIdx].x) {
    const onda = fase.ondas[ondaIdx];
    trava = onda.x;
    onda.inimigos.forEach((tipo, i) => filaSpawn.push({ tipo, em: i * (fase.n === 0 ? 0.1 : 0.55), lado: i % 2 === 0 ? 1 : -1 }));
    ondaIdx++;
  }
  const vivos = inimigos.filter((e) => e.estado !== 'morto').length;
  if (trava !== null && !filaSpawn.length && vivos === 0 && !chefe) {
    trava = null;
    if (fase.n === 0) { jog.mosh = 100; avisar(t('jogo.especial'), 1.6); }
    else if (ondaIdx < fase.ondas.length || fase.chefe) setaVai = 3;
  }
  // Fim do mundo: chefão.
  const fimX = fase.comprimento - LARG;
  if (!chefe && fase.chefe && ondaIdx >= fase.ondas.length && trava === null && camX >= fimX - 1) {
    trava = fimX;
    criarChefe();
  }
}

function criarInimigo(tipo: TipoInimigo, lado: 1 | -1) {
  const f = INIMIGOS[tipo];
  const fase0 = fase.n === 0;
  const x = fase0 ? 250 + inimigos.length * 110 : lado > 0 ? camX + LARG + 30 : camX - 30;
  inimigos.push({
    tipo, semente: Math.floor(Math.random() * 6), x, y: fase0 ? 214 + inimigos.length * 12 : aleatorio(CHAO.topo + 6, CHAO.base - 4),
    z: 0, vx: 0, vy: 0, vz: 0, dir: lado > 0 ? -1 : 1, vida: f.vida, max: f.vida, estado: 'parado', t: 0, pisca: 0,
    recarga: aleatorio(0.6, 1.6), lado: lado, engajado: false, morto: 0,
  });
}

function atualizarCamera(dt: number) {
  const alvo = clamp(jog.x - 190, 0, fase.comprimento - LARG);
  const limite = trava ?? fase.comprimento - LARG;
  const desejado = Math.min(alvo, limite);
  if (desejado > camX) camX = Math.min(desejado, camX + 260 * dt);
}

// ─── Jogador ──────────────────────────────────────────────
const DUR_GOLPE = [0.22, 0.24, 0.36];

function atualizarJogador(dt: number) {
  const j = jog;
  const ficha = integrante(j.quem);
  j.t += dt;
  j.invul = Math.max(0, j.invul - dt);
  j.janela = Math.max(0, j.janela - dt);
  j.pisca = Math.max(0, j.pisca - dt);
  const noChao = j.z <= 0;

  switch (j.estado) {
    case 'parado':
    case 'anda': {
      const vx = ctrl.x * 96 * ficha.vel, vy = ctrl.y * 60 * ficha.vel;
      j.x += vx * dt; j.y += vy * dt;
      if (ctrl.x) j.dir = ctrl.x > 0 ? 1 : -1;
      j.estado = ctrl.x || ctrl.y ? 'anda' : 'parado';
      if (aperto.pulo) { j.estado = 'pulo'; j.vz = 255; j.vx = ctrl.x * 96 * ficha.vel; j.t = 0; pulou = true; sfx.pulo(); }
      else if (aperto.soco) golpe(j.janela > 0 ? (j.combo + 1) % 3 : 0);
      else if (aperto.esp && j.mosh >= 100) iniciarEspecial();
      break;
    }
    case 'golpe': {
      if (aperto.esp && j.mosh >= 100) { iniciarEspecial(); break; } // o especial corta o combo
      const dur = DUR_GOLPE[j.combo] / ficha.vel ** 0.35;
      const ativo = j.t > dur * 0.35 && j.t < dur * 0.75;
      if (ativo) aplicarGolpeDoJogador(danoDoGolpe(ficha.forca, j.combo, false), j.combo === 2, 34 * ficha.alcance + (j.combo === 2 ? 8 : 0));
      if (aperto.soco && j.t > dur * 0.45) j.janela = 0.3; // guarda o próximo aperto
      if (j.t >= dur) {
        if (j.janela > 0 && j.combo < 2) golpe(j.combo + 1);
        else { j.estado = 'parado'; j.janela = j.combo < 2 ? 0.35 : 0; }
      }
      break;
    }
    case 'pulo':
    case 'voadora': {
      j.x += j.vx * dt;
      j.vz -= 900 * dt;
      j.z = Math.max(0, j.z + j.vz * dt);
      if (j.estado === 'pulo' && aperto.soco) { j.estado = 'voadora'; j.acertou = new Set(); sfx.golpe(); }
      if (j.estado === 'voadora') aplicarGolpeDoJogador(danoDoGolpe(ficha.forca, 0, true), true, 40 * ficha.alcance);
      if (j.z <= 0 && j.vz < 0) { j.z = 0; j.estado = 'parado'; poeira(j.x, j.y, 4); }
      break;
    }
    case 'especial':
      if (j.t > 0.25 && j.t - dt <= 0.25) dispararEspecial();
      if (ficha.especial === 'blast' && j.t > 0.25 && j.t < 1.3) {
        if (Math.floor(j.t * 12) !== Math.floor((j.t - dt) * 12)) { j.acertou = new Set(); aplicarGolpeDoJogador(Math.round(3 * ficha.forca + 1), false, 52, true); }
      }
      if (j.t > (ficha.especial === 'blast' ? 1.35 : 0.8)) j.estado = 'parado';
      break;
    case 'apanha':
      j.x += j.vx * dt; j.vx *= 0.85;
      if (j.t > 0.32) j.estado = 'parado';
      break;
    case 'voa':
      j.x += j.vx * dt;
      j.vz -= 900 * dt;
      j.z = Math.max(0, j.z + j.vz * dt);
      if (j.z <= 0 && j.vz < 0) { j.estado = 'caido'; j.t = 0; j.z = 0; tremor = 0.15; poeira(j.x, j.y, 8); }
      break;
    case 'caido':
      if (j.t > (j.vida <= 0 ? 1.4 : 0.9)) {
        if (j.vida <= 0) { perderVida(); return; }
        j.estado = 'levanta'; j.t = 0; j.invul = 1.2;
      }
      break;
    case 'levanta':
      if (j.t > 0.35) j.estado = 'parado';
      break;
    default:
      break;
  }
  if (noChao || j.estado === 'pulo' || j.estado === 'voadora') {
    j.y = clamp(j.y, CHAO.topo, CHAO.base);
    j.x = clamp(j.x, camX + 14, camX + LARG - 14);
  }
}

function golpe(n: number) {
  jog.estado = 'golpe'; jog.combo = n; jog.t = 0; jog.janela = 0; jog.acertou = new Set();
  sfx.golpe();
}

/** Soco/chute do jogador: inimigos, chefe e quebráveis na frente. */
function aplicarGolpeDoJogador(dano: number, derruba: boolean, alcance: number, semRecuo = false) {
  const j = jog;
  for (const e of inimigos) {
    if (j.acertou.has(e) || e.estado === 'morto' || e.estado === 'voa' || e.estado === 'caido') continue;
    if (!acerta(j, e, alcance)) continue;
    j.acertou.add(e);
    ferirInimigo(e, dano, derruba, j.dir, semRecuo);
  }
  if (chefe && !j.acertou.has(chefe) && acertaChefe(alcance)) {
    j.acertou.add(chefe);
    ferirChefe(dano);
  }
  for (const q of quebraveis) {
    if (j.acertou.has(q) || !acerta(j, { x: q.x, y: q.y, z: 0, dir: 1 }, alcance, 18)) continue;
    j.acertou.add(q);
    q.vida--; q.pisca = 0.15; sfx.acerto(); faiscas.push({ x: q.x, y: q.y - 40, vida: 0.12, forte: false });
    if (q.vida <= 0) quebrar(q);
  }
}

function contarAcerto(pts: number) {
  combo++; comboVida = 1.6; comboMax = Math.max(comboMax, combo);
  pontos += pts;
  acertos++;
  jog.mosh = Math.min(100, jog.mosh + MOSH_POR_ACERTO);
}

function ferirInimigo(e: Inimigo, dano: number, derruba: boolean, dir: 1 | -1, semRecuo = false) {
  const f = INIMIGOS[e.tipo];
  e.vida -= dano;
  e.pisca = 0.12;
  contarAcerto(10);
  pausaImpacto = derruba ? 0.09 : 0.05;
  faiscas.push({ x: e.x - dir * 6, y: e.y - e.z - 70, vida: 0.12, forte: derruba });
  sfx.acerto(derruba);
  if (e.vida <= 0 || derruba) {
    e.estado = 'voa'; e.t = 0; e.vx = dir * 150; e.vz = 170; e.dir = (-dir) as 1 | -1;
    if (e.vida <= 0) { pontos += f.pontos; jog.mosh = Math.min(100, jog.mosh + MOSH_POR_KO); }
  } else if (!semRecuo || e.estado !== 'apanha') {
    e.estado = 'apanha'; e.t = 0; e.vx = dir * 40;
  }
}

function quebrar(q: Quebravel) {
  sfx.quebra();
  tremor = 0.12;
  const cores = q.tipo === 'orelhao' ? [P.laranja, P.vermelho, P.cimento] : q.tipo === 'lixeira' || q.tipo === 'cone' ? [P.laranja, P.pessego] : q.tipo === 'banca' ? [P.folha, P.amarelo, P.vermelho] : [P.caramelo, P.ruga, P.asfalto];
  for (let i = 0; i < 22; i++) particulas.push({ x: q.x + aleatorio(-14, 14), y: q.y - aleatorio(10, 60), vx: aleatorio(-90, 90), vy: aleatorio(-160, -40), cor: cores[i % cores.length], vida: aleatorio(0.4, 0.9), tam: 2 });
  itens.push({ x: q.x, y: q.y, tipo: q.item, vz: 120, z: 10 });
  quebraveis = quebraveis.filter((o) => o !== q);
  pontos += 50;
}

function iniciarEspecial() {
  jog.estado = 'especial'; jog.t = 0; jog.mosh = 0; jog.invul = 1.4; jog.acertou = new Set();
  especialUsado = true;
  sfx.especial();
  flash = reduzirFlash ? 0 : 0.08;
  avisar(tri(integrante(jog.quem).especialNome).toUpperCase(), 1.2);
  vibrar(40);
}

function dispararEspecial() {
  const ficha = integrante(jog.quem);
  tremor = 0.4;
  if (ficha.especial === 'grave') {
    ondasFx.push({ x: jog.x, y: jog.y, raio: 10, vida: 0.6, cor: P.neon_ciano });
    for (const e of inimigos) if (e.estado !== 'morto' && Math.abs(e.x - camX - LARG / 2) < LARG / 2 + 10) ferirInimigo(e, Math.round(20 * ficha.forca), true, e.x > jog.x ? 1 : -1);
    if (chefe) ferirChefe(22);
  } else if (ficha.especial === 'grito') {
    ondasFx.push({ x: jog.x, y: jog.y - 70, raio: 8, vida: 0.7, cor: P.neon_rosa });
    for (const e of inimigos) if (e.estado !== 'morto' && e.estado !== 'voa') { e.vida -= 10; contarAcerto(10); if (e.vida <= 0) ferirInimigo(e, 0, true, e.x > jog.x ? 1 : -1); else { e.estado = 'tonto'; e.t = 0; } }
    if (chefe) { ferirChefe(12); chefe.acao = 'tonto'; chefe.timer = 1.4; }
  } else if (ficha.especial === 'microfonia') {
    projeteis.push({ x: jog.x + jog.dir * 30, y: jog.y, z: 62, vx: jog.dir * 340, vida: 2, atingidos: new Set(), tipo: 'microfonia' });
  }
}

function ferirJogador(dano: number, derruba: boolean, dir: 1 | -1) {
  const j = jog;
  if (j.invul > 0 || j.estado === 'caido' || j.estado === 'voa' || j.estado === 'levanta' || j.estado === 'especial') return;
  j.vida = Math.max(0, j.vida - dano);
  danoSofrido += dano;
  combo = 0;
  j.pisca = 0.15;
  sfx.dano();
  vibrar(25);
  pausaImpacto = 0.07;
  tremor = Math.max(tremor, 0.12);
  const agora = tempoFase;
  j.golpesSofridos = j.golpesSofridos.filter((x) => agora - x < 1.6).concat(agora);
  if (derruba || j.vida <= 0 || j.golpesSofridos.length >= 3) {
    j.estado = 'voa'; j.t = 0; j.vx = dir * 120; j.vz = 160; j.dir = (-dir) as 1 | -1; j.golpesSofridos = [];
  } else { j.estado = 'apanha'; j.t = 0; j.vx = dir * 50; }
}

function perderVida() {
  jog.vidas--;
  evento(JOGO, 'fase_morte', { fase: fase.n });
  if (jog.vidas > 0) {
    jog.vida = VIDA_JOGADOR; jog.estado = 'levanta'; jog.t = 0; jog.invul = 2.5;
    ondasFx.push({ x: jog.x, y: jog.y, raio: 10, vida: 0.5, cor: P.amarelo });
    for (const e of inimigos) if (e.estado !== 'morto' && Math.abs(e.x - jog.x) < 120) ferirInimigo(e, 0, true, e.x > jog.x ? 1 : -1);
  } else abrirContinue();
}

// ─── Inimigos ─────────────────────────────────────────────
function atualizarInimigos(dt: number) {
  const engajados = inimigos.filter((e) => e.engajado && e.estado !== 'morto').length;
  for (const e of inimigos) {
    const f = INIMIGOS[e.tipo];
    e.t += dt;
    e.pisca = Math.max(0, e.pisca - dt);
    if (e.estado === 'morto') { e.morto += dt; continue; }
    switch (e.estado) {
      case 'parado':
      case 'anda': {
        if (e.tipo === 'papelao') break;
        e.recarga -= dt;
        // No máximo dois batem ao mesmo tempo; os outros rodeiam.
        if (!e.engajado && engajados < 2 && Math.random() < dt * 1.5) e.engajado = true;
        const lado = e.x < jog.x ? -1 : 1;
        const distAlvo = e.engajado ? f.alcance - 6 : 80 + (e.semente % 3) * 18;
        const ax = jog.x + lado * distAlvo;
        const ay = jog.y + (e.engajado ? 0 : ((e.semente % 2) * 2 - 1) * 22);
        const dx = ax - e.x, dy = ay - e.y;
        const longe = Math.abs(dx) > 4 || Math.abs(dy) > 3;
        if (longe) {
          const m = Math.hypot(dx, dy) || 1;
          e.x += (dx / m) * f.vel * dt;
          e.y += (dy / m) * f.vel * 0.7 * dt;
          e.estado = 'anda';
        } else e.estado = 'parado';
        e.dir = jog.x > e.x ? 1 : -1;
        e.y = clamp(e.y, CHAO.topo, CHAO.base);
        if (e.engajado && e.recarga <= 0 && acerta(e, jog, f.alcance + 4, 10) && jog.z < 20) { e.estado = 'prepara'; e.t = 0; }
        break;
      }
      case 'prepara':
        if (e.t >= f.preparo) {
          e.estado = 'golpe'; e.t = 0;
          if (acerta(e, jog, f.alcance + 6, 12)) ferirJogador(f.dano, false, e.dir);
          sfx.golpe();
        }
        break;
      case 'golpe':
        if (e.t > 0.22) { e.estado = 'parado'; e.recarga = f.recarga * aleatorio(0.8, 1.3); e.engajado = Math.random() < 0.6; }
        break;
      case 'apanha':
        e.x += e.vx * dt; e.vx *= 0.88;
        if (e.t > 0.3) { e.estado = 'parado'; e.recarga = Math.max(e.recarga, 0.4); }
        break;
      case 'tonto':
        if (e.t > 3) e.estado = 'parado';
        break;
      case 'voa':
        e.x += e.vx * dt;
        e.vz -= 900 * dt;
        e.z = Math.max(0, e.z + e.vz * dt);
        if (e.z <= 0 && e.vz < 0) {
          e.z = 0; poeira(e.x, e.y, 6);
          if (e.vida <= 0) { e.estado = 'morto'; e.t = 0; sfx.ko(); if (Math.random() < 0.18) itens.push({ x: e.x, y: e.y, tipo: Math.random() < 0.5 ? 'coxinha' : 'pastel', vz: 100, z: 8 }); }
          else { e.estado = 'caido'; e.t = 0; }
        }
        break;
      case 'caido':
        if (e.t > 0.9) { e.estado = 'levanta'; e.t = 0; }
        break;
      case 'levanta':
        if (e.t > 0.4) { e.estado = 'parado'; e.recarga = 0.8; }
        break;
      default:
        break;
    }
  }
  // Fantasma flutua (e some no golpe final, sem cair no chão).
  for (const e of inimigos) if (e.tipo === 'fantasma') {
    if (e.estado === 'voa' && e.vida <= 0) { e.estado = 'morto'; e.t = 0; sfx.ko(); }
    if (e.estado !== 'voa' && e.estado !== 'morto') e.z = 14 + Math.sin(relogio * 4 + e.semente) * 4;
  }
  inimigos = inimigos.filter((e) => e.estado !== 'morto' || e.morto < 0.9);
}

// ─── Chefões ──────────────────────────────────────────────
function criarChefe() {
  const tipo = fase.chefe!;
  const vida = tipo === 'pato' ? 320 : tipo === 'mao' ? 340 : 330;
  chefe = {
    tipo, x: camX + LARG - 90, y: 222, z: tipo === 'mao' ? 90 : 0, vx: 0, vy: 0, vz: 0, dir: -1, vida, max: vida,
    estado: 'parado', t: 0, pisca: 0, acao: 'entra', timer: 1.6, alvo: null, fase2: false, chamou: 0, quadro: 0, golpeou: false,
  };
  chip.tocar('chefe');
  if (tipo === 'pato') sfx.pato(); else sfx.motor();
  avisar(nomeDoChefe(tipo), 2.4, true);
}

function nomeDoChefe(tipo: Chefe['tipo']) {
  const nomes = {
    pato: { pt: 'O PATO-ALGORITMO', en: 'THE ALGORITHM DUCK', de: 'DIE ALGORITHMUS-ENTE' },
    mao: { pt: 'A MÃO INVISÍVEL DO MERCADO', en: 'THE INVISIBLE HAND', de: 'DIE UNSICHTBARE HAND' },
    tecnico: { pt: 'O TÉCNICO DE SOM FOLGADO', en: 'THE LAZY SOUND GUY', de: 'DER FAULE TONTECHNIKER' },
  } as const;
  return tri(nomes[tipo]);
}

function acertaChefe(alcance: number): boolean {
  const c = chefe!;
  const j = jog;
  const dx = (c.x - j.x) * j.dir;
  if (c.tipo === 'pato') return dx > -10 && dx < alcance + 42 && Math.abs(c.y - j.y) < 26 && c.z < 50;
  // A mão só apanha quando encosta no chão.
  if (c.tipo === 'mao') return c.z < 24 && dx > -24 && dx < alcance + 56 && Math.abs(c.y - j.y) < 30;
  return dx > -8 && dx < alcance + 20 && Math.abs(c.y - j.y) < 18;
}

function ferirChefe(dano: number) {
  const c = chefe!;
  if (c.acao === 'entra' || c.acao === 'cai') return;
  c.vida -= dano;
  c.pisca = 0.12;
  contarAcerto(20);
  pausaImpacto = 0.06;
  faiscas.push({ x: c.x - jog.dir * 20, y: c.y - c.z - 80, vida: 0.14, forte: true });
  sfx.acerto(true);
  if (c.tipo === 'tecnico' && !c.fase2 && c.vida < c.max / 2) {
    c.fase2 = true; c.acao = 'raiva'; c.timer = 1.4; avisar('!!!', 1.2, true); sfx.ko();
  }
  if (c.vida <= 0) { c.vida = 0; c.acao = 'cai'; c.timer = 2.4; c.z = 0; sfx.ko(); tremor = 0.6; pausaImpacto = 0.25; avisar(t('jogo.ko'), 2.4, true); }
}

function atualizarChefe(dt: number) {
  const c = chefe;
  if (!c) return;
  c.t += dt;
  c.timer -= dt;
  c.pisca = Math.max(0, c.pisca - dt);
  const j = jog;
  const naArena = (x: number) => clamp(x, camX + 50, camX + LARG - 50);
  if (c.acao === 'cai') {
    if (Math.floor(c.t * 10) % 3 === 0) poeira(c.x + aleatorio(-40, 40), c.y, 2, P.amarelo);
    if (c.timer <= 0) { chefe = null; pontos += 2000; vencerFase(); }
    return;
  }
  if (c.acao === 'tonto') { if (c.timer <= 0) { c.acao = c.tipo === 'mao' ? 'sobe' : 'pensa'; c.timer = 0.5; } return; }

  if (c.tipo === 'pato') {
    // O Pato-Algoritmo convoca a polícia com 66% e 33% da vida.
    const marcos = [0.66, 0.33];
    if (c.chamou < 2 && c.vida / c.max < marcos[c.chamou]) { c.chamou++; c.acao = 'grasna'; c.timer = 0.9; sfx.pato(); criarInimigo('pm', 1); criarInimigo('gcm', -1); }
    switch (c.acao) {
      case 'entra': c.x -= 40 * dt; if (c.timer <= 0) { c.acao = 'pensa'; c.timer = 1; } break;
      case 'pensa':
        c.dir = j.x < c.x ? -1 : 1;
        c.x += (j.x - c.x) * 0.3 * dt; c.y += (j.y - c.y) * 0.8 * dt;
        if (c.timer <= 0) {
          const r = Math.random();
          if (r < 0.4) { c.acao = 'agacha'; c.timer = 0.55; }
          else if (r < 0.7) { c.acao = 'mira'; c.timer = 0.7; }
          else { c.acao = 'carrega'; c.timer = 0.85; c.alvo = { x: 0, y: j.y }; c.golpeou = false; sfx.pato(); }
        }
        break;
      case 'agacha': if (c.timer <= 0) { c.acao = 'pula'; c.timer = 1; c.alvo = { x: naArena(j.x), y: j.y }; c.vz = 330; sfx.pulo(); } break;
      case 'pula': {
        const a = c.alvo!;
        c.x += (a.x - c.x) * 2.2 * dt; c.y += (a.y - c.y) * 2.2 * dt;
        c.vz -= 700 * dt; c.z = Math.max(0, c.z + c.vz * dt);
        if (c.z <= 0 && c.vz < 0) {
          c.z = 0; tremor = 0.4; sfx.quebra();
          ondasFx.push({ x: c.x, y: c.y, raio: 20, vida: 0.45, cor: P.neon_ciano });
          if (Math.hypot(j.x - c.x, (j.y - c.y) * 2) < 80 && j.z < 8) ferirJogador(14, true, j.x > c.x ? 1 : -1);
          c.acao = 'pensa'; c.timer = 1.1;
        }
        break;
      }
      case 'mira': c.dir = j.x < c.x ? -1 : 1; c.y += (j.y - c.y) * 3 * dt; if (c.timer <= 0) { c.acao = 'investe'; c.timer = 1.4; } break;
      case 'investe':
        c.x += c.dir * 270 * dt;
        if (Math.abs(j.x - c.x) < 44 && Math.abs(j.y - c.y) < 20 && j.z < 30) ferirJogador(12, true, c.dir);
        if (c.timer <= 0 || c.x < camX + 40 || c.x > camX + LARG - 40) { c.x = naArena(c.x); c.acao = 'pensa'; c.timer = 1.2; }
        break;
      case 'carrega':
        // Olho de LED mira a faixa do jogador; depois dispara o laser.
        c.dir = j.x < c.x ? -1 : 1;
        if (c.timer <= 0) { c.acao = 'laser'; c.timer = 0.6; sfx.especial(); }
        break;
      case 'laser':
        if (!c.golpeou && Math.abs(j.y - c.alvo!.y) < 11 && j.z < 30 && (j.x - c.x) * c.dir > 0) { c.golpeou = true; ferirJogador(13, true, c.dir); }
        if (c.timer <= 0) { c.acao = 'pensa'; c.timer = 1; }
        break;
      case 'grasna': if (c.timer <= 0) { c.acao = 'pensa'; c.timer = 0.8; } break;
    }
    c.quadro = c.acao === 'agacha' ? 1 : c.acao === 'pula' ? 2 : c.acao === 'grasna' || c.acao === 'mira' || c.acao === 'carrega' || c.acao === 'laser' ? 3 : 0;
  } else if (c.tipo === 'mao') {
    // A Mão Invisível: paira, aponta, desce batendo; só apanha quando está no chão.
    const marcos = [0.7, 0.4];
    if (c.chamou < 2 && c.vida / c.max < marcos[c.chamou] && c.z > 30) { c.chamou++; c.acao = 'convoca'; c.timer = 0.9; }
    const pairar = (alvoX: number, alvoY: number, vel: number) => {
      c.x += clamp(alvoX - c.x, -vel * dt, vel * dt);
      c.y += clamp(alvoY - c.y, -vel * 0.6 * dt, vel * 0.6 * dt);
      c.z += (78 + Math.sin(c.t * 3) * 6 - c.z) * Math.min(1, dt * 3);
    };
    switch (c.acao) {
      case 'entra': pairar(camX + LARG - 120, 210, 80); if (c.timer <= 0) { c.acao = 'paira'; c.timer = 1.2; } break;
      case 'paira':
        c.dir = j.x < c.x ? -1 : 1;
        pairar(j.x - c.dir * 70, j.y, 90);
        if (c.timer <= 0) {
          const r = Math.random();
          if (r < 0.6) { c.acao = 'mira'; c.timer = 0.85; c.alvo = { x: naArena(j.x), y: j.y }; }
          else { c.acao = 'prepara'; c.timer = 0.7; c.x = j.x < camX + LARG / 2 ? camX + LARG - 40 : camX + 40; c.y = j.y; c.dir = c.x > j.x ? -1 : 1; }
        }
        break;
      case 'mira': pairar(c.alvo!.x, c.alvo!.y, 260); if (c.timer <= 0) { c.acao = 'bate'; c.vz = -520; } break;
      case 'bate':
        c.z = Math.max(0, c.z + c.vz * dt);
        if (c.z <= 0) {
          tremor = 0.45; sfx.quebra();
          ondasFx.push({ x: c.x, y: c.y, raio: 16, vida: 0.4, cor: P.pastel_azul });
          if (Math.hypot(j.x - c.x, (j.y - c.y) * 1.6) < 46 && j.z < 20) ferirJogador(15, true, j.x > c.x ? 1 : -1);
          c.acao = 'no_chao'; c.timer = 1.5;
        }
        break;
      case 'no_chao': if (c.timer <= 0) { c.acao = 'sobe'; c.timer = 0.6; } break;
      case 'sobe': c.z = Math.min(78, c.z + 140 * dt); if (c.z >= 70) { c.acao = 'paira'; c.timer = 1.1; } break;
      case 'prepara': c.z = Math.max(4, c.z - 160 * dt); if (c.timer <= 0) { c.acao = 'varre'; c.timer = 2; c.golpeou = false; sfx.motor(); } break;
      case 'varre':
        c.x += c.dir * 300 * dt;
        if (!c.golpeou && Math.abs(j.x - c.x) < 34 && Math.abs(j.y - c.y) < 16 && j.z < 16) { c.golpeou = true; ferirJogador(13, true, c.dir); }
        if (c.timer <= 0 || c.x < camX + 20 || c.x > camX + LARG - 20) { c.x = naArena(c.x); c.acao = 'sobe'; }
        break;
      case 'convoca':
        pairar(c.x, c.y, 0);
        if (c.timer <= 0) { criarInimigo('fantasma', 1); criarInimigo('fantasma', -1); if (c.chamou === 2) criarInimigo('fantasma', 1); c.acao = 'paira'; c.timer = 1.4; }
        break;
    }
  } else {
    // Técnico de Som folgado: chicote de cabo, microfonia e, bravo, investida.
    const vel = c.fase2 ? 1.4 : 1;
    switch (c.acao) {
      case 'entra': c.x -= 60 * dt; if (c.timer <= 0) { c.acao = 'pensa'; c.timer = 0.8; } break;
      case 'raiva': if (c.timer <= 0) { c.acao = 'pensa'; c.timer = 0.4; } break;
      case 'pensa': {
        c.dir = j.x < c.x ? -1 : 1;
        const ax = j.x - c.dir * 80;
        c.x += clamp(ax - c.x, -1, 1) * 60 * vel * dt;
        c.y += clamp(j.y - c.y, -1, 1) * 45 * vel * dt;
        c.y = clamp(c.y, CHAO.topo, CHAO.base);
        if (c.timer <= 0) {
          const perto = Math.abs(j.x - c.x) < 130 && Math.abs(j.y - c.y) < 16;
          const r = Math.random();
          if (perto && r < 0.55) { c.acao = 'cabo_prep'; c.timer = 0.55 / vel; c.golpeou = false; }
          else if (c.fase2 && r > 0.8) { c.acao = 'mira'; c.timer = 0.5; }
          else { c.acao = 'micro_prep'; c.timer = 0.65 / vel; }
        }
        break;
      }
      case 'cabo_prep': if (c.timer <= 0) { c.acao = 'cabo'; c.timer = 0.35; sfx.golpe(); } break;
      case 'cabo': {
        const dx = (j.x - c.x) * c.dir;
        if (!c.golpeou && dx > 0 && dx < 128 && Math.abs(j.y - c.y) < 14 && j.z < 30) { c.golpeou = true; ferirJogador(12, true, c.dir); }
        if (c.timer <= 0) { c.acao = 'pensa'; c.timer = 0.9 / vel; }
        break;
      }
      case 'micro_prep':
        if (c.timer <= 0) {
          projeteis.push({ x: c.x + c.dir * 40, y: c.y, z: 70, vx: c.dir * 230 * vel, vida: 3, atingidos: new Set(), tipo: 'eco' });
          sfx.especial();
          c.acao = 'pensa'; c.timer = 1 / vel;
        }
        break;
      case 'mira': c.dir = j.x < c.x ? -1 : 1; if (c.timer <= 0) { c.acao = 'investe'; c.timer = 1.1; } break;
      case 'investe':
        c.x += c.dir * 260 * dt;
        if (Math.abs(j.x - c.x) < 36 && Math.abs(j.y - c.y) < 18 && j.z < 30) ferirJogador(14, true, c.dir);
        if (c.timer <= 0 || c.x < camX + 40 || c.x > camX + LARG - 40) { c.x = naArena(c.x); c.acao = 'pensa'; c.timer = 0.9; }
        break;
    }
  }
}

// ─── Itens, cachorro, projéteis, efeitos ──────────────────
function atualizarMundo(dt: number) {
  for (const it of itens) { it.vz -= 600 * dt; it.z = Math.max(0, it.z + it.vz * dt); }
  for (const it of [...itens]) {
    if (it.z > 2 || Math.abs(it.x - jog.x) > 18 || Math.abs(it.y - jog.y) > 12 || jog.estado === 'voa' || jog.estado === 'caido') continue;
    itens = itens.filter((o) => o !== it);
    itemPego = true;
    sfx.item();
    if (it.tipo === 'caramelo') { cachorro = { x: camX - 20, y: jog.y + 6, dir: 1, vida: 14, morde: 0, alvo: null }; sfx.cachorro(); avisar(t('item.caramelo'), 1.4); continue; }
    const ef = ITENS[it.tipo];
    jog.vida = Math.min(jog.max, jog.vida + ef.vida);
    jog.mosh = Math.min(100, jog.mosh + ef.mosh);
    avisar(t(`item.${it.tipo}` as Parameters<typeof t>[0]), 1);
    pontos += 100;
  }
  if (cachorro) {
    const d = cachorro;
    d.vida -= dt; d.morde -= dt;
    if (!d.alvo || d.alvo.estado === 'morto') d.alvo = inimigos.filter((e) => e.estado !== 'morto').sort((a, b) => Math.abs(a.x - d.x) - Math.abs(b.x - d.x))[0] ?? null;
    const ax = d.vida <= 0 ? camX - 60 : d.alvo ? d.alvo.x - d.dir * 22 : jog.x - 30;
    const ay = d.alvo && d.vida > 0 ? d.alvo.y + 2 : jog.y + 8;
    const dx = ax - d.x, dy = ay - d.y;
    if (Math.abs(dx) > 3) { d.x += Math.sign(dx) * Math.min(Math.abs(dx), 150 * dt); d.dir = dx > 0 ? 1 : -1; }
    d.y += clamp(dy, -60 * dt, 60 * dt);
    if (d.alvo && d.vida > 0 && d.morde <= 0 && Math.abs(d.alvo.x - d.x) < 30 && Math.abs(d.alvo.y - d.y) < 12 && d.alvo.estado !== 'voa' && d.alvo.estado !== 'caido') {
      d.morde = 0.6; sfx.cachorro();
      ferirInimigo(d.alvo, 4, false, d.dir);
    }
    if (d.vida <= 0 && d.x < camX - 50) cachorro = null;
  }
  for (const p of projeteis) {
    p.vida -= dt;
    if (p.tipo === 'eco') {
      p.x += p.vx * dt;
      if (!p.atingidos.has(jog) && Math.abs(jog.x - p.x) < 16 && Math.abs(jog.y - p.y) < 14 && jog.z < 30) { p.atingidos.add(jog); ferirJogador(10, false, p.vx > 0 ? 1 : -1); }
    } else if (p.tipo === 'microfonia') {
      p.x += p.vx * dt;
      for (const e of inimigos) if (!p.atingidos.has(e) && e.estado !== 'morto' && Math.abs(e.x - p.x) < 20 && Math.abs(e.y - p.y) < 22) { p.atingidos.add(e); ferirInimigo(e, 20, true, p.vx > 0 ? 1 : -1); }
      if (chefe && !p.atingidos.has(chefe) && Math.abs(chefe.x - p.x) < 40 && Math.abs(chefe.y - p.y) < 30) { p.atingidos.add(chefe); ferirChefe(24); }
    } else {
      p.aviso = (p.aviso ?? 0) - dt;
      if (p.aviso <= 0) {
        p.z = Math.max(0, p.z - 600 * dt);
        if (p.z <= 0 && !p.atingidos.has(p)) {
          p.atingidos.add(p); p.vida = 0.3; tremor = 0.2; sfx.quebra();
          for (let i = 0; i < 10; i++) particulas.push({ x: p.x, y: p.y, vx: aleatorio(-80, 80), vy: aleatorio(-150, -40), cor: i % 2 ? P.cimento : P.ruga, vida: 0.6, tam: 2 });
          if (Math.hypot(jog.x - p.x, (jog.y - p.y) * 1.6) < 26 && jog.z < 20) ferirJogador(10, false, jog.x > p.x ? 1 : -1);
        }
      }
    }
  }
  projeteis = projeteis.filter((p) => p.vida > 0 && p.x > camX - 80 && p.x < camX + LARG + 80);
  for (const p of particulas) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.vida -= dt; }
  particulas = particulas.filter((p) => p.vida > 0);
  for (const f of faiscas) f.vida -= dt;
  faiscas = faiscas.filter((f) => f.vida > 0);
  for (const o of ondasFx) { o.raio += 360 * dt; o.vida -= dt; }
  ondasFx = ondasFx.filter((o) => o.vida > 0);
  for (const q of quebraveis) q.pisca = Math.max(0, q.pisca - dt);
  if (comboVida > 0) { comboVida -= dt; if (comboVida <= 0) combo = 0; }
}

// ─── Fim de fase ──────────────────────────────────────────
function vencerFase() {
  if (terminou) return;
  terminou = true;
  chip.tocar('vitoria');
  const n = fase.n;
  if (n === 0) {
    progresso = concluirFase(progresso, 0, { nota: 'A', tempo: tempoFase, pontos });
    salvarProgresso();
    tutorial.concluir();
    setTimeout(() => abrirMapa(1), 1200);
    return;
  }
  const nt = notaDaFase(danoSofrido, tempoFase, fase.par, comboMax, continues);
  const jaZerou = progresso.zerou;
  const novoArquivo = fase.arquivo && !progresso.arquivo.includes(n);
  progresso = concluirFase(progresso, n, { nota: nt, tempo: tempoFase, pontos });
  salvarProgresso();
  evento(JOGO, 'fase_fim', { fase: n, nota: nt, tempo: Math.round(tempoFase), quem: jog.quem });
  setTimeout(() => abrirResultado(nt, !!novoArquivo, !jaZerou && progresso.zerou), 1600);
}

// ─── Laço principal ───────────────────────────────────────
let anterior = performance.now();
function quadro(agora: number) {
  const dt = Math.min(1 / 30, (agora - anterior) / 1000);
  anterior = agora;
  relogio += dt;
  lerControles();
  if (modo === 'jogo') {
    if (aperto.start) alternarPausa();
    else passo(dt);
    desenhar();
  } else if (modo === 'pausa' || modo === 'continue') {
    if (aperto.start && modo === 'pausa') alternarPausa();
    if (modo === 'continue') atualizarContinue(dt);
    desenhar();
  } else if (modo === 'titulo') {
    if (aperto.start || aperto.soco) apertouStart();
    desenharTituloFundo();
  } else if (modo === 'selecao') {
    navegarSelecao();
  } else if (modo === 'mapa') {
    navegarMapa();
    desenharMapa();
  }
  proximoQuadro();
}
/** `?relogio` troca o requestAnimationFrame por timer: dá para testar com a aba escondida. */
const RELOGIO_TIMER = new URLSearchParams(location.search).has('relogio');
if (RELOGIO_TIMER) Object.assign(window, { __esc: () => ({ modo, camX, ondaIdx, inimigos: inimigos.length, alvos: inimigos.map((e) => ({ x: Math.round(e.x), y: Math.round(e.y), vida: e.vida, estado: e.estado })), quebraveis: quebraveis.length, itens: itens.length, chefe: chefe && { vida: chefe.vida, acao: chefe.acao }, jog: { x: jog.x, y: jog.y, z: jog.z, vida: jog.vida, mosh: jog.mosh, estado: jog.estado, invul: jog.invul, pisca: jog.pisca } }) });
const proximoQuadro = () => (RELOGIO_TIMER ? setTimeout(() => quadro(performance.now()), 16) : requestAnimationFrame(quadro));

function passo(dt: number) {
  if (pausaImpacto > 0) { pausaImpacto -= dt; atualizarMundo(dt * 0.2); return; }
  tempoFase += dt;
  atualizarJogador(dt);
  atualizarInimigos(dt);
  atualizarChefe(dt);
  atualizarMundo(dt);
  atualizarOndas(dt);
  atualizarCamera(dt);
  tremor = Math.max(0, tremor - dt);
  flash = Math.max(0, flash - dt);
  setaVai = Math.max(0, setaVai - dt);
  mensagem.vida -= dt;
  if (fase.cenario === 'garoa') {
    proximoRaio -= dt;
    if (proximoRaio <= 0) { proximoRaio = aleatorio(7, 13); flash = reduzirFlash ? 0 : 0.35; setTimeout(() => sfx.quebra(), 280); }
  }
  // Sala de ensaio: acaba com os dois bonecos no chão e o amplificador quebrado.
  if (fase.n === 0 && !terminou && ondaIdx > 0 && !filaSpawn.length && inimigos.every((e) => e.estado === 'morto') && !quebraveis.length && (itemPego || !itens.length)) vencerFase();
  $('b-esp').classList.toggle('pronto', jog.mosh >= 100);
}

// ─── Desenho ──────────────────────────────────────────────
type Desenhavel = { y: number; f: () => void };

function poseDoJogador(): { s: Sprite; caido: boolean } {
  const j = jog;
  const passoAnim = (Math.floor(relogio * 9) % 4) as 0 | 1 | 2 | 3;
  const respiro = Math.floor(relogio * 2) % 2 === 1;
  let pose: PoseLuta = 'guarda';
  let p: 0 | 1 | 2 | 3 = 0;
  switch (j.estado) {
    case 'anda': p = passoAnim; break;
    case 'golpe': pose = j.t < (DUR_GOLPE[j.combo] / integrante(j.quem).vel ** 0.35) * 0.8 ? (['soco', 'soco2', 'chute'] as const)[j.combo] : 'guarda'; break;
    case 'pulo': pose = 'pulo'; break;
    case 'voadora': pose = 'chute'; break;
    case 'especial': pose = 'especial'; break;
    case 'apanha': case 'voa': pose = 'apanha'; break;
    case 'caido': return { s: spriteIntegrante(j.quem, 'apanha'), caido: true };
    default: break;
  }
  return { s: spriteIntegrante(j.quem, pose, p, j.estado === 'parado' && respiro), caido: false };
}

function poseDoInimigo(e: Inimigo): { s: Sprite; caido: boolean } {
  const passoAnim = (Math.floor((relogio + e.semente * 0.13) * 8) % 4) as 0 | 1 | 2 | 3;
  if (e.estado === 'caido' || e.estado === 'morto') return { s: spriteInimigo(e.tipo, e.semente, 'apanha'), caido: e.tipo !== 'fantasma' };
  const pose: PoseLuta | 'tonto' = e.estado === 'prepara' ? 'guarda' : e.estado === 'golpe' ? (e.tipo === 'choque' ? 'soco2' : 'soco')
    : e.estado === 'apanha' || e.estado === 'voa' ? 'apanha' : e.estado === 'tonto' ? 'tonto' : 'guarda';
  return { s: spriteInimigo(e.tipo, e.semente, pose, e.estado === 'anda' ? passoAnim : 0), caido: false };
}

/** Sprite com o pé em (x, y-z), virado para `dir`; caído = deitado de costas. */
function desenharLutador(s: Sprite, x: number, y: number, z: number, dir: 1 | -1, caido: boolean, pisca: number, k = 1) {
  const sx = Math.round(x - camX), sy = Math.round(y - z);
  const img = pisca > 0 ? piscada(s) : s;
  const cx = 27 * k;
  ctx.save();
  ctx.translate(sx, sy);
  if (caido) {
    ctx.translate(0, -10 * k);
    ctx.rotate(-dir * Math.PI / 2);
    ctx.scale(dir, 1);
    ctx.drawImage(img, -cx, -(img.height - 2));
  } else {
    ctx.scale(dir, 1);
    ctx.drawImage(img, -cx, -(img.height - 2));
  }
  ctx.restore();
}

function sombra(x: number, y: number, w: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath();
  ctx.ellipse(Math.round(x - camX), Math.round(y), w, w * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
}

function desenhar() {
  const shx = tremor > 0 ? Math.round(aleatorio(-3, 3) * Math.min(1, tremor * 4)) : 0;
  const shy = tremor > 0 ? Math.round(aleatorio(-2, 2) * Math.min(1, tremor * 4)) : 0;
  ctx.save();
  ctx.translate(shx, shy);
  desenharFundo(ctx, palco, camX, flash);
  desenharClima(ctx, fase.cenario, relogio, false);

  // Sombras primeiro, depois tudo por profundidade.
  const lista: Desenhavel[] = [];
  for (const q of quebraveis) { sombra(q.x, q.y, 16); lista.push({ y: q.y, f: () => { const s = spriteQuebravel(q.tipo, q.vida < 3); ctx.drawImage(q.pisca > 0 ? piscada(s) : s, Math.round(q.x - camX - 32), Math.round(q.y - s.height + 2)); } }); }
  for (const it of itens) { sombra(it.x, it.y, 8); lista.push({ y: it.y, f: () => { const s = spriteItem(it.tipo); const b = Math.sin(relogio * 6) > 0 ? -1 : 0; ctx.drawImage(s, Math.round(it.x - camX - s.width / 2), Math.round(it.y - it.z - s.height + 2 + b)); } }); }
  for (const e of inimigos) {
    if (e.estado === 'morto' && e.tipo !== 'fantasma' && Math.floor(e.morto * 12) % 2 === 1) continue;
    sombra(e.x, e.y, 16);
    lista.push({ y: e.y, f: () => {
      const { s, caido } = poseDoInimigo(e);
      if (e.tipo === 'fantasma') ctx.globalAlpha = e.estado === 'morto' ? Math.max(0, 0.7 - e.morto) : 0.78;
      desenharLutador(s, e.x, e.y, e.z, e.dir, caido, e.pisca);
      ctx.globalAlpha = 1;
      if (e.estado === 'prepara' && Math.floor(relogio * 12) % 2 === 0) desenharAviso(e.x, e.y - 128);
    } });
  }
  if (cachorro) { const d = cachorro; sombra(d.x, d.y, 12); lista.push({ y: d.y, f: () => { const s = spriteCaramelo((Math.floor(relogio * 12) % 4) as 0 | 1 | 2 | 3, d.morde > 0.4); ctx.save(); ctx.translate(Math.round(d.x - camX), Math.round(d.y)); ctx.scale(d.dir, 1); ctx.drawImage(s, -24, -s.height + 2); ctx.restore(); } }); }
  if (chefe) {
    const c = chefe;
    sombra(c.x, c.y, c.tipo === 'pato' ? 52 : c.tipo === 'mao' ? Math.max(20, 52 - c.z * 0.3) : 30);
    lista.push({ y: c.y, f: () => desenharChefe(c) });
  }
  sombra(jog.x, jog.y, 15);
  lista.push({ y: jog.y + 0.1, f: () => {
    if (jog.invul > 0 && jog.estado !== 'especial' && Math.floor(relogio * 20) % 2 === 0) return;
    const { s, caido } = poseDoJogador();
    desenharLutador(s, jog.x, jog.y, jog.z, jog.dir, caido, jog.pisca);
  } });
  // Mira da Mão Invisível.
  if (chefe?.tipo === 'mao' && chefe.acao === 'mira' && chefe.alvo) desenharAlvo(chefe.alvo.x, chefe.alvo.y);
  lista.sort((a, b) => a.y - b.y).forEach((d) => d.f());

  // Microfonia (do Renato) e eco (do técnico): ondas de som atravessando.
  for (const p of projeteis) if (p.tipo === 'microfonia' || p.tipo === 'eco') {
    const cores = p.tipo === 'eco' ? [P.neon_rosa, P.branco] : [P.branco, P.neon_ciano];
    for (let i = 0; i < 4; i++) { ctx.fillStyle = cores[i % 2]; ctx.fillRect(Math.round(p.x - camX - i * 6 * Math.sign(p.vx)), Math.round(p.y - p.z - 14 + i * 2), 3, 28 - i * 4); }
  }
  for (const o of ondasFx) {
    ctx.strokeStyle = o.cor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(Math.round(o.x - camX), Math.round(o.y), o.raio, o.raio * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
  }
  for (const f of faiscas) desenharFaisca(f);
  for (const p of particulas) { ctx.fillStyle = p.cor; ctx.fillRect(Math.round(p.x - camX), Math.round(p.y), p.tam, p.tam); }

  for (const cam of palco.frente ? [palco.frente] : []) desenharCamada(ctx, cam, camX);
  desenharClima(ctx, fase.cenario, relogio, true);
  ctx.restore();
  if (flash > 0) { ctx.fillStyle = `rgba(230,236,255,${Math.min(0.55, flash * 1.6)})`; ctx.fillRect(0, 0, LARG, ALT); }
  desenharHud();
}

function desenharChefe(c: Chefe) {
  if (c.acao === 'cai' && Math.floor(c.t * 14) % 2 === 1) return;
  const pisca = c.pisca;
  if (c.tipo === 'pato') {
    const s = spritePato(c.quadro as 0 | 1 | 2 | 3);
    const img = pisca > 0 ? piscada(s) : s;
    ctx.save(); ctx.translate(Math.round(c.x - camX), Math.round(c.y - c.z)); ctx.scale(c.dir, 1);
    ctx.drawImage(img, -72, -img.height + 4); ctx.restore();
    // Laser do olho: aviso piscando, depois o raio na faixa do jogador.
    if ((c.acao === 'carrega' || c.acao === 'laser') && c.alvo) {
      const ox = c.x + c.dir * 30 - camX, oy = c.y - 92;
      const fx = c.dir > 0 ? LARG + 10 : -10, fy = c.alvo.y - 40;
      if (c.acao === 'carrega' ? Math.floor(relogio * 14) % 2 === 0 : true) {
        ctx.strokeStyle = c.acao === 'laser' ? P.neon_rosa : 'rgba(255,79,163,0.6)';
        ctx.lineWidth = c.acao === 'laser' ? 6 : 1;
        ctx.beginPath(); ctx.moveTo(Math.round(ox), Math.round(oy)); ctx.lineTo(fx, fy); ctx.stroke();
        if (c.acao === 'laser') { ctx.strokeStyle = P.branco; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Math.round(ox), Math.round(oy)); ctx.lineTo(fx, fy); ctx.stroke(); }
      }
    }
  } else if (c.tipo === 'mao') {
    const pose = c.acao === 'bate' || c.acao === 'no_chao' ? 1 : c.acao === 'varre' || c.acao === 'prepara' ? 0 : 2;
    const s = spriteMao(pose);
    const img = pisca > 0 ? piscada(s) : s;
    ctx.save();
    // Invisível: translúcida, tremulando como miragem.
    ctx.globalAlpha = c.z < 24 ? 0.9 : 0.45 + 0.25 * Math.sin(relogio * 5) ** 2;
    ctx.translate(Math.round(c.x - camX), Math.round(c.y - c.z));
    ctx.scale(c.dir < 0 ? 1 : -1, 1);
    ctx.drawImage(img, -70, -img.height + 14);
    ctx.restore();
  } else {
    const passoAnim = (Math.floor(c.t * 8) % 4) as 0 | 1 | 2 | 3;
    const pose: PoseLuta | 'tonto' | 'microfone' = c.acao === 'tonto' ? 'tonto' : c.acao === 'cabo' ? 'soco' : c.acao === 'investe' ? 'soco2'
      : c.acao === 'micro_prep' || c.acao === 'raiva' ? 'microfone' : c.acao === 'cai' ? 'apanha' : 'guarda';
    const s = spriteTecnico(pose, c.acao === 'pensa' ? passoAnim : 0, c.fase2);
    desenharLutador(s, c.x, c.y, c.z, c.dir, c.acao === 'cai' && c.timer < 1.6, pisca, 1.45);
    if ((c.acao === 'cabo_prep' || c.acao === 'micro_prep') && Math.floor(relogio * 12) % 2 === 0) desenharAviso(c.x, c.y - 180);
    if (c.acao === 'cabo') {
      // Cabo XLR estalando como chicote, com o plugue na ponta.
      const prog = Math.min(1, (0.35 - c.timer) / 0.15);
      const x0 = c.x + c.dir * 24 - camX, y0 = c.y - 92;
      const x1 = x0 + c.dir * 125 * prog, y1 = c.y - 40;
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * 10;
        ctx.fillStyle = P.preto; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
        ctx.fillStyle = P.concreto; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
      ctx.fillStyle = P.neblina; ctx.fillRect(Math.round(x1) - 3, Math.round(y1) - 2, 6, 4);
    }
  }
}

function desenharAviso(x: number, y: number) {
  ctx.fillStyle = P.amarelo;
  ctx.fillRect(Math.round(x - camX - 1), Math.round(y), 3, 8);
  ctx.fillRect(Math.round(x - camX - 1), Math.round(y + 10), 3, 3);
}

function desenharAlvo(x: number, y: number) {
  const pisca = Math.floor(relogio * 10) % 2 === 0;
  ctx.strokeStyle = pisca ? P.vermelho : P.amarelo;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(Math.round(x - camX), Math.round(y), 30, 9, 0, 0, Math.PI * 2); ctx.stroke();
}

function desenharFaisca(f: Faisca) {
  const x = Math.round(f.x - camX), y = Math.round(f.y);
  const r = f.forte ? 12 : 8;
  ctx.fillStyle = P.branco;
  ctx.fillRect(x - r, y - 1, r * 2, 3); ctx.fillRect(x - 1, y - r, 3, r * 2);
  ctx.fillStyle = P.amarelo;
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; ctx.fillRect(x + Math.round(Math.cos(a) * r * 0.7) - 1, y + Math.round(Math.sin(a) * r * 0.7) - 1, 3, 3); }
}

// HUD em fonte de pixel, dentro da tela 480×270.
/** A fonte de pixel não tem todos os acentos: tira o agudo, o grave e o circunflexo; mantém til e cedilha. */
const semAcento = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, (m) => (m === '\u0303' || m === '\u0327' ? m : '')).normalize('NFC');

function texto(s: string, x: number, y: number, cor: string = P.branco, tam = 8, alinha: CanvasTextAlign = 'left') {
  s = semAcento(s);
  ctx.font = `${tam}px 'Press Start 2P', monospace`;
  ctx.textAlign = alinha;
  ctx.textBaseline = 'top';
  ctx.fillStyle = P.preto;
  ctx.fillText(s, x + 1, y + 1);
  ctx.fillStyle = cor;
  ctx.fillText(s, x, y);
}

function barra(x: number, y: number, w: number, h: number, frac: number, cor: string, fundo: string = P.vinho) {
  ctx.fillStyle = P.preto; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = fundo; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = cor; ctx.fillRect(x, y, Math.round(w * clamp(frac, 0, 1)), h);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, Math.round(w * clamp(frac, 0, 1)), 1);
}

function desenharHud() {
  const j = jog;
  // Retrato: recorte da cabeça do sprite.
  const s = spriteIntegrante(j.quem, 'guarda');
  ctx.fillStyle = P.preto; ctx.fillRect(6, 6, 30, 30);
  ctx.fillStyle = P.asfalto; ctx.fillRect(7, 7, 28, 28);
  ctx.drawImage(s, 12, 4, 30, 30, 6, 6, 30, 30);
  texto(integrante(j.quem).nome, 42, 6, P.amarelo);
  barra(42, 17, 120, 7, j.vida / j.max, j.vida < 30 ? P.vermelho : P.amarelo);
  const cheio = j.mosh >= 100;
  barra(42, 28, 80, 5, j.mosh / 100, cheio && Math.floor(relogio * 8) % 2 ? P.branco : P.neon_ciano, P.marinho);
  texto(t('hud.mosh'), 126, 27, cheio ? P.neon_ciano : P.neblina, 6);
  texto(`x${j.vidas}`, 168, 16, P.branco);
  if (fase.n > 0) {
    texto(formatarTempo(tempoFase), LARG / 2, 8, P.branco, 8, 'center');
    texto(`${t('hud.fita')} ${pedacosDaFita(progresso) + (terminou && fase.fita ? 0 : 0)}/4`, LARG - 8, 8, P.neon_ciano, 8, 'right');
    texto(String(pontos).padStart(7, '0'), LARG - 8, 20, P.branco, 8, 'right');
  }
  if (combo >= 2) texto(`${combo} HITS`, 8, 44, combo >= 10 ? P.neon_rosa : P.amarelo, 10);
  if (chefe) {
    texto(nomeDoChefe(chefe.tipo), LARG / 2, ALT - 26, P.branco, 8, 'center');
    barra(60, ALT - 14, LARG - 120, 6, chefe.vida / chefe.max, P.neon_rosa, P.noite);
  }
  if (setaVai > 0 && Math.floor(relogio * 4) % 2 === 0) texto(`${t('jogo.go')} ▶`, LARG - 16, ALT / 2 - 20, P.amarelo, 14, 'right');
  if (mensagem.vida > 0) {
    const tam = mensagem.grande ? 16 : 10;
    texto(mensagem.texto, LARG / 2, ALT / 2 - 50, mensagem.grande ? P.amarelo : P.branco, tam, 'center');
  }
}

// Título: cena da garoa com a banda parada.
let fundoTitulo: Palco | null = null;
function desenharTituloFundo() {
  fundoTitulo ??= montarPalco('garoa');
  camX = (relogio * 12) % 960;
  desenharFundo(ctx, fundoTitulo, camX, Math.sin(relogio * 0.7) > 0.995 ? 1 : 0);
  desenharClima(ctx, 'garoa', relogio, false);
  const ordem: Quem[] = ['igor', 'pucci', 'vocal', 'renato'];
  ordem.forEach((q, i) => {
    const s = spriteIntegrante(q, 'guarda', 0, Math.floor(relogio * 2 + i) % 2 === 0);
    ctx.drawImage(s, 110 + i * 70, 248 - s.height);
  });
  desenharClima(ctx, 'garoa', relogio, true);
  camX = 0;
}

// ─── Telas ────────────────────────────────────────────────
const TELAS = ['titulo', 'selecao', 'mapa', 'carregando', 'pausa', 'continue', 'resultado', 'fim', 'arquivo'];
function mostrar(id: string | null) {
  for (const t2 of TELAS) $(t2).hidden = t2 !== id;
  ajustarTela();
}

// Título
document.querySelectorAll<HTMLButtonElement>('#idiomas button').forEach((b) => b.addEventListener('click', () => {
  definirIdioma(b.dataset.idioma as Idioma);
  gravar(JOGO, 'idioma', idioma());
  traduzir();
}));
function apertouStart() {
  if (!$('menu-titulo').hidden) return;
  sfx.confirma();
  chip.tocar('titulo');
  $('b-start').hidden = true;
  $('menu-titulo').hidden = false;
  $('b-continuar').hidden = progresso.liberada === 0 && !Object.keys(progresso.melhores).length;
  (($('b-continuar').hidden ? $('b-novo') : $('b-continuar')) as HTMLButtonElement).focus();
}
$('b-start').addEventListener('click', apertouStart);
$('b-novo').addEventListener('click', () => { sfx.confirma(); abrirSelecao(); });
$('b-continuar').addEventListener('click', () => { sfx.confirma(); abrirMapa(progresso.liberada); });
$('b-arquivo').addEventListener('click', () => abrirArquivo());

/** Código na tela de título: ↑ ↑ ↓ ↓ ← → libera o Duxxo. */
const CODIGO = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright'];
let codigo: string[] = [];
function segredo(k: string) {
  codigo = [...codigo, k].slice(-CODIGO.length);
  if (codigo.join() === CODIGO.join() && !progresso.zerou) {
    progresso = { ...progresso, zerou: true };
    salvarProgresso();
    sfx.item();
    evento(JOGO, 'segredo', { qual: 'duxxo' });
    (document.querySelector('.aviso-flash') as HTMLElement).textContent = t('fim.duxxo');
  }
}

// Seleção
let escolhido: Quem = progresso.quem;
function abrirSelecao() {
  modo = 'selecao';
  mostrar('selecao');
  const fileira = $('fileira');
  fileira.innerHTML = '';
  for (const ig of INTEGRANTES) {
    const travado = ig.secreto && !progresso.zerou;
    const b = document.createElement('button');
    b.disabled = !!travado;
    b.title = travado ? t('sel.travado') : ig.nome;
    b.setAttribute('aria-label', travado ? t('sel.secreto') : ig.nome);
    const c = document.createElement('canvas');
    c.width = 32; c.height = 32;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    if (!travado) g.drawImage(spriteIntegrante(ig.id, 'guarda'), 10, 2, 32, 32, 0, 0, 32, 32);
    else { g.fillStyle = P.asfalto; g.fillRect(0, 0, 32, 32); g.fillStyle = P.cimento; g.font = '16px monospace'; g.fillText('?', 11, 22); }
    b.appendChild(c);
    b.addEventListener('click', () => { escolhido = ig.id; sfx.menu(); atualizarSelecao(); });
    b.dataset.quem = ig.id;
    fileira.appendChild(b);
  }
  atualizarSelecao();
}
function atualizarSelecao() {
  const ig = integrante(escolhido);
  $('sel-nome').textContent = ig.nome;
  $('sel-inst').textContent = tri(ig.instrumento);
  $('sel-esp').textContent = tri(ig.especialNome);
  $('sel-esp-txt').textContent = tri(ig.especialTexto);
  const pct = (v: number) => `${Math.round(clamp((v - 0.6) / 0.8, 0.1, 1) * 100)}%`;
  $('st-forca').style.width = pct(ig.forca);
  $('st-vel').style.width = pct(ig.vel);
  $('st-alc').style.width = pct(ig.alcance);
  const c = $<HTMLCanvasElement>('retrato');
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, c.width, c.height);
  const r = retratoIntegrante(escolhido);
  g.drawImage(r, 0, c.height - r.height * 2, r.width * 2, r.height * 2);
  document.querySelectorAll<HTMLButtonElement>('#fileira button').forEach((b) => b.classList.toggle('ativo', b.dataset.quem === escolhido));
}
let seletorTrava = 0;
function navegarSelecao() {
  seletorTrava -= 1 / 60;
  if (ctrl.x && seletorTrava <= 0) {
    const lista = INTEGRANTES.filter((i) => !i.secreto || progresso.zerou);
    const i = lista.findIndex((x) => x.id === escolhido);
    escolhido = lista[(i + ctrl.x + lista.length) % lista.length].id;
    sfx.menu(); atualizarSelecao(); seletorTrava = 0.22;
  }
  if (aperto.soco || aperto.start) escolher();
}
function escolher() {
  progresso = { ...progresso, quem: escolhido };
  salvarProgresso();
  sfx.confirma();
  abrirMapa(progresso.liberada);
}
$('b-escolher').addEventListener('click', escolher);

// Mapa Game Boy
const GB = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'];
const PONTOS_MAPA = [{ x: 22, y: 112 }, { x: 46, y: 84 }, { x: 74, y: 100 }, { x: 98, y: 70 }, { x: 118, y: 92 }, { x: 132, y: 58 }, { x: 146, y: 30 }];
let noMapa = 0;
let kombi = { x: 22, y: 112 };
function abrirMapa(n: number) {
  modo = 'mapa';
  noMapa = clamp(n, 0, progresso.liberada);
  kombi = { ...PONTOS_MAPA[noMapa] };
  chip.tocar('titulo');
  mostrar('mapa');
  atualizarLegenda();
}
function atualizarLegenda() {
  const f = FASES[noMapa];
  const melhor = progresso.melhores[noMapa];
  $('mapa-legenda').textContent = `${f.n === 0 ? '' : `${f.n} · `}${f.ano} · ${tri(f.nome).toUpperCase()}${melhor && f.n > 0 ? ` · ${melhor.nota}` : ''}`;
}
let mapaTrava = 0;
function navegarMapa() {
  mapaTrava -= 1 / 60;
  if (ctrl.x && mapaTrava <= 0) moverMapa(ctrl.x);
  if (aperto.soco || aperto.start) bora();
}
function moverMapa(d: number) {
  const novo = clamp(noMapa + d, 0, progresso.liberada);
  if (novo !== noMapa) { noMapa = novo; sfx.menu(); atualizarLegenda(); }
  mapaTrava = 0.25;
}
$('b-mapa-esq').addEventListener('click', () => moverMapa(-1));
$('b-mapa-dir').addEventListener('click', () => moverMapa(1));
$('b-bora').addEventListener('click', () => bora());
function desenharMapa() {
  const c = $<HTMLCanvasElement>('mapa-tela');
  const g = c.getContext('2d')!;
  g.fillStyle = GB[3]; g.fillRect(0, 0, 160, 144);
  // Quarteirões e rio (Tietê), estrada pontilhada até a Europa.
  g.fillStyle = GB[2];
  for (let y = 4; y < 140; y += 14) for (let x = 4 + ((y / 14) % 2) * 6; x < 150; x += 16) g.fillRect(x, y, 10, 8);
  g.fillStyle = GB[1]; g.fillRect(0, 124, 160, 6);
  for (let i = 0; i < PONTOS_MAPA.length - 1; i++) {
    const a = PONTOS_MAPA[i], b = PONTOS_MAPA[i + 1];
    for (let s = 0; s < 1; s += 0.08) { g.fillStyle = i < progresso.liberada ? GB[0] : GB[1]; g.fillRect(Math.round(a.x + (b.x - a.x) * s), Math.round(a.y + (b.y - a.y) * s), 2, 2); }
  }
  PONTOS_MAPA.forEach((p, i) => {
    const liberado = i <= progresso.liberada && i < FASES.length;
    g.fillStyle = GB[0]; g.fillRect(p.x - 5, p.y - 5, 10, 10);
    g.fillStyle = liberado ? (progresso.melhores[i] ? GB[1] : GB[2]) : GB[3]; g.fillRect(p.x - 4, p.y - 4, 8, 8);
    g.fillStyle = GB[0]; g.font = '6px monospace'; g.fillText(i >= FASES.length ? '27' : String(i), p.x - 3, p.y + 2);
  });
  g.fillStyle = GB[0]; g.font = '7px monospace';
  g.fillText('SP', 8, 138); g.fillText('GÖTTINGEN', 104, 12);
  // Kombi vista de cima andando até o ponto escolhido.
  const alvo = PONTOS_MAPA[noMapa];
  kombi.x += (alvo.x - kombi.x) * 0.15; kombi.y += (alvo.y - kombi.y) * 0.15;
  const kx = Math.round(kombi.x) - 6, ky = Math.round(kombi.y) - 16;
  g.fillStyle = GB[0]; g.fillRect(kx, ky, 12, 8);
  g.fillStyle = GB[3]; g.fillRect(kx + 1, ky + 1, 10, 3);
  g.fillStyle = GB[1]; g.fillRect(kx + 1, ky + 4, 10, 3);
  g.fillStyle = GB[0]; g.fillRect(kx + 1, ky + 8, 2, 1); g.fillRect(kx + 9, ky + 8, 2, 1);
}
function bora() {
  if (modo !== 'mapa') return;
  sfx.confirma();
  carregar(noMapa);
}

// Carregamento: gera os sprites da fase aos poucos, com dica da banda.
const DICAS = [
  { pt: 'Coxinha cura. Caldo de cana cura mais.', en: 'Coxinha heals. Sugarcane juice heals more.', de: 'Coxinha heilt. Zuckerrohrsaft heilt mehr.' },
  { pt: 'O vira-lata caramelo morde por 14 segundos. Respeita.', en: 'The caramel mutt bites for 14 seconds. Respect.', de: 'Der Karamell-Straßenhund beißt 14 Sekunden lang.' },
  { pt: 'Inimigo piscando "!" vai bater. Sai da frente.', en: 'An enemy flashing "!" is about to hit. Move.', de: 'Gegner mit "!" schlägt gleich zu. Ausweichen.' },
  { pt: 'Ninguém solta a mão de ninguém.', en: 'Nobody lets go of anyone’s hand.', de: 'Niemand lässt jemandes Hand los.' },
  { pt: 'Soco no ar vira voadora.', en: 'Punch in the air for a flying kick.', de: 'Schlag in der Luft = Flugtritt.' },
];
function carregar(n: number) {
  modo = 'carregando';
  mostrar('carregando');
  $('dica').textContent = tri(DICAS[Math.floor(Math.random() * DICAS.length)]);
  const f = FASES[n];
  const tarefas: (() => void)[] = [];
  const poses: PoseLuta[] = ['guarda', 'soco', 'soco2', 'chute', 'pulo', 'apanha', 'especial'];
  for (const p of poses) tarefas.push(() => spriteIntegrante(progresso.quem, p));
  for (let k = 0; k < 4; k++) tarefas.push(() => spriteIntegrante(progresso.quem, 'guarda', k as 0 | 1 | 2 | 3));
  tarefas.push(() => spriteIntegrante(progresso.quem, 'guarda', 0, true));
  const tipos = [...new Set(f.ondas.flatMap((o) => o.inimigos))];
  for (const tp of tipos) for (let s = 0; s < (tp === 'papelao' ? 1 : 3); s++) {
    for (const p of ['guarda', 'soco', 'apanha'] as const) tarefas.push(() => spriteInimigo(tp, s, p));
    for (let k = 1; k < 4; k++) tarefas.push(() => spriteInimigo(tp, s, 'guarda', k as 0 | 1 | 2 | 3));
  }
  if (f.chefe === 'pato') for (let q = 0; q < 4; q++) tarefas.push(() => spritePato(q as 0 | 1 | 2 | 3));
  if (f.chefe === 'mao') { for (let q = 0; q < 3; q++) tarefas.push(() => spriteMao(q as 0 | 1 | 2)); for (const p of ['guarda', 'soco', 'apanha'] as const) tarefas.push(() => spriteInimigo('fantasma', 0, p)); }
  if (f.chefe === 'tecnico') for (const b of [false, true]) for (const p of ['guarda', 'soco', 'microfone'] as const) tarefas.push(() => spriteTecnico(p, 0, b));
  for (const q of f.quebraveis) { tarefas.push(() => spriteQuebravel(q.tipo)); tarefas.push(() => spriteItem(q.item)); }
  const total = tarefas.length;
  const passoCarga = () => {
    const ate = performance.now() + 14;
    while (tarefas.length && performance.now() < ate) tarefas.shift()!();
    $('carga').style.width = `${Math.round((1 - tarefas.length / total) * 100)}%`;
    if (tarefas.length) setTimeout(passoCarga, 0);
    else setTimeout(() => iniciarFase(n), 250);
  };
  setTimeout(passoCarga, 30);
}

// Pausa
function alternarPausa() {
  if (modo === 'jogo') { modo = 'pausa'; mostrar('pausa'); tutorial.pausar?.(); }
  else if (modo === 'pausa') { modo = 'jogo'; mostrar(null); tutorial.retomar?.(); }
}
$('b-voltar').addEventListener('click', alternarPausa);
$('b-som').addEventListener('click', () => { setMudo(!estaMudo()); gravar(JOGO, 'mudo', estaMudo()); traduzir(); });
$('b-flash').addEventListener('click', () => { reduzirFlash = !reduzirFlash; gravar(JOGO, 'flash', reduzirFlash); traduzir(); });
$('b-sair').addEventListener('click', () => { chip.parar(); tutorial.pausar?.(); abrirMapa(fase.n); });

// Continue?
let contagem = 9;
function abrirContinue() {
  modo = 'continue';
  contagem = 9.99;
  mostrar('continue');
}
function atualizarContinue(dt: number) {
  contagem -= dt;
  $('contagem').textContent = String(Math.max(0, Math.floor(contagem)));
  if (aperto.start || aperto.soco) continuar();
  if (contagem <= 0) { chip.parar(); evento(JOGO, 'fim_de_jogo', { fase: fase.n }); abrirMapa(fase.n); }
}
function continuar() {
  if (modo !== 'continue') return;
  continues++;
  jog.vidas = 3; jog.vida = VIDA_JOGADOR; jog.estado = 'levanta'; jog.t = 0; jog.invul = 2.5;
  modo = 'jogo';
  mostrar(null);
}
$('b-cont').addEventListener('click', continuar);

// Resultado
let ultimaNota: Nota = 'C';
function abrirResultado(nt: Nota, novoArquivo: boolean, zerouAgora: boolean) {
  modo = 'resultado';
  ultimaNota = nt;
  mostrar('resultado');
  $('res-titulo').textContent = t('res.completa', { n: fase.n });
  $('res-nota').textContent = nt;
  const linhas: [string, string][] = [
    [t('res.tempo'), formatarTempo(tempoFase)],
    [t('res.combo'), String(comboMax)],
    [t('res.dano'), String(Math.round(danoSofrido))],
    [t('res.pontos'), String(pontos)],
  ];
  $('res-numeros').innerHTML = linhas.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
  $('res-fita').textContent = fase.fita ? `${t('res.fita')}: ${pedacosDaFita(progresso)}/4` : '';
  $('res-arquivo').hidden = !(novoArquivo && fase.arquivo);
  if (fase.arquivo) $('res-arq-txt').textContent = tri(fase.arquivo.titulo);
  $('res-retorno').textContent = '';
  $('b-proxima').onclick = () => {
    if (zerouAgora || fase.n === FASES.length - 1) abrirFim(zerouAgora);
    else abrirMapa(fase.n + 1);
  };
}
$('b-compartilhar').addEventListener('click', async () => {
  const r = await compartilhar(t('res.texto', { n: fase.n, quem: integrante(jog.quem).nome, nota: ultimaNota, tempo: formatarTempo(tempoFase), combo: comboMax }));
  if (r === 'copiado') $('res-retorno').textContent = t('res.copiado');
});

// Fim (fita 3/4 nesta versão)
function abrirFim(duxxo: boolean) {
  modo = 'fim';
  mostrar('fim');
  $('fim-titulo').textContent = t('fim.titulo', { n: pedacosDaFita(progresso) });
  (document.querySelector('.fim-duxxo') as HTMLElement).hidden = !duxxo;
  const seguir = $<HTMLAnchorElement>('b-seguir');
  seguir.hidden = !LINK_BANDA;
  if (LINK_BANDA) seguir.href = LINK_BANDA;
}
$('b-fim-menu').addEventListener('click', () => abrirMapa(progresso.liberada));

// Arquivo
function abrirArquivo() {
  modo = 'arquivo';
  mostrar('arquivo');
  const ul = $('arquivo-lista');
  ul.innerHTML = '';
  const itensArq = FASES.filter((f) => f.arquivo && progresso.arquivo.includes(f.n));
  if (!itensArq.length) { ul.innerHTML = `<li>${t('arq.vazio')}</li>`; return; }
  for (const f of itensArq) {
    const li = document.createElement('li');
    li.innerHTML = `<b>${f.ano} · ${tri(f.arquivo!.titulo)}</b>${tri(f.arquivo!.texto)}<small>${t('arq.breve')}</small>`;
    ul.appendChild(li);
  }
}
$('b-arq-fechar').addEventListener('click', () => { modo = 'titulo'; mostrar('titulo'); });

// ─── Partida ──────────────────────────────────────────────
document.fonts?.load("8px 'Press Start 2P'").catch(() => undefined);
jog = novoJogador(progresso.quem);
palco = montarPalco('garoa');
mostrar('titulo');
ajustarTela();
proximoQuadro();

if (new URLSearchParams(location.search).has('fase')) {
  const n = clamp(Number(new URLSearchParams(location.search).get('fase')) || 0, 0, FASES.length - 1);
  progresso = { ...progresso, liberada: Math.max(progresso.liberada, n) };
  carregar(n);
}
