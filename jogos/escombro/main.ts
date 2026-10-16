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
  type Quem, type TipoInimigo, type TipoItem, type TipoQuebravel, type Fase, type Progresso, type Nota, type Chefe as TipoChefe,
  PEDACOS_DA_FITA, liberado,
} from './regras';
import {
  spriteIntegrante, retratoIntegrante, spriteInimigo, spriteTecnico, spritePato, spriteMao,
  spriteCaramelo, spriteItem, spriteQuebravel, piscada, spriteDenao, spritePequenoPoder, spriteVirus, type Sprite, type PoseLuta,
} from './sprites';
import { montarPalco, desenharFundo, desenharCamada, desenharClima, LARG, ALT, type Palco } from './cenario';
import { chip, sfx } from './chip';
import { tocarFaixa, carregarFaixa, abrirFiltro, abaixar, ajustarVolume, type Faixa } from './musica';

/** Música (lo-fi) de cada fase; menus tocam Cicatrizes. */
const FAIXA_DA_FASE: Faixa[] = ['sofrer', 'rasgando', 'vidaVazia', 'sofrer', 'cicatrizes', 'rasgando'];

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

type Estado = 'parado' | 'anda' | 'golpe' | 'pulo' | 'voadora' | 'apanha' | 'voa' | 'caido' | 'levanta' | 'especial' | 'prepara' | 'tonto' | 'morto' | 'danca';

interface Corpo {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  dir: 1 | -1; vida: number; max: number; estado: Estado; t: number; pisca: number;
}
interface Jogador extends Corpo { quem: Quem; combo: number; janela: number; acertou: Set<object>; invul: number; mosh: number; vidas: number; golpesSofridos: number[]; noAr: boolean }
interface Inimigo extends Corpo { tipo: TipoInimigo; semente: number; recarga: number; lado: 1 | -1; engajado: boolean; morto: number; rotulo?: string }
interface Item { x: number; y: number; tipo: TipoItem; vz: number; z: number }
interface Quebravel { x: number; y: number; tipo: TipoQuebravel; item: TipoItem; vida: number; pisca: number }
interface Particula { x: number; y: number; vx: number; vy: number; cor: string; vida: number; tam: number }
interface Faisca { x: number; y: number; vida: number; forte: boolean }
interface Onda3 { x: number; y: number; raio: number; vida: number; cor: string }
interface Projetil { x: number; y: number; z: number; vx: number; vy?: number; vida: number; atingidos: Set<object>; tipo: 'microfonia' | 'entulho' | 'eco' | 'gel' | 'gota'; aviso?: number }
/** Aliado controlado pelo jogo (o Jota, solto da delegacia). */
interface Aliado extends Corpo { quem: Quem; combo: number; acertou: Set<object>; espera: number }
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
let aliado: Aliado | null = null;
/** Comprimento do mundo nesta tela (a delegacia é uma tela só). */
let comprimento = 0;
/** 1 = primeira tela da fase; 2 = segunda (delegacia). */
let etapa = 1;
let recargaGel = 0;
const ROTULOS_FANTASMA = { pt: ['6X1', 'SALÁRIO MÍNIMO', '3H DE BUSÃO', 'BOLETO'], en: ['6-DAY WEEK', 'MINIMUM WAGE', '3H COMMUTE', 'BILLS'], de: ['6-TAGE-WOCHE', 'MINDESTLOHN', '3H PENDELN', 'RECHNUNGEN'] };
let rotuloIdx = 0;

interface Chefe extends Corpo {
  tipo: TipoChefe;
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
  camX = 0; trava = null; ondaIdx = 0; filaSpawn = []; aliado = null; etapa = 1; comprimento = fase.comprimento; recargaGel = 0; rotuloIdx = 0;
  tempoFase = 0; pontos = 0; combo = 0; comboMax = 0; danoSofrido = 0; continues = 0; terminou = false;
  especialUsado = false; itemPego = false; pulou = false; acertos = 0;
  proximoRaio = 6;
  modo = 'jogo';
  mostrar(null);
  ajustarTela();
  void tocarFaixa(FAIXA_DA_FASE[n] ?? 'cicatrizes');
  avisar(n === 0 ? tri(fase.nome) : `${t('jogo.round', { n })} · ${fase.ano}`, 2.2, true);
  cartao(tri(fase.historia), 5);
  evento(JOGO, 'fase_inicio', { fase: n, quem: jog.quem });
  if (n === 0) tutorial.iniciar();
  // Teste (?relogio&chefe): pula direto para o chefão.
  if (RELOGIO_TIMER && new URLSearchParams(location.search).has('chefe') && fase.chefe) {
    ondaIdx = fase.ondas.length;
    camX = fase.comprimento - LARG;
    jog.x = camX + 120;
  }
}

/** Cartão de história em cima da tela, alguns segundos. */
let cartaoTimer = 0;
function cartao(textoCartao: string, segundos: number) {
  const el = $('cartao');
  el.textContent = textoCartao;
  el.hidden = false;
  clearTimeout(cartaoTimer);
  cartaoTimer = window.setTimeout(() => { el.hidden = true; }, segundos * 1000);
}

/** Festival: limpou a rua, a luta continua na delegacia, com o Jota solto ajudando. */
function iniciarSegundaTela() {
  const seg = fase.segundaTela!;
  etapa = 2;
  palco = montarPalco(seg.cenario);
  comprimento = LARG;
  camX = 0; trava = 0;
  inimigos = []; itens = []; quebraveis = []; projeteis = [];
  jog.x = 110; jog.y = 222; jog.z = 0; jog.estado = 'parado';
  if (cachorro) cachorro.x = 60;
  cartao(tri(seg.texto), 6);
  tremor = 0.2;
  setTimeout(() => {
    if (modo !== 'jogo' || etapa !== 2) return;
    criarChefe();
    aliado = { quem: 'vocal', x: LARG - 40, y: 200, z: 0, vx: 0, vy: 0, vz: 0, dir: -1, vida: 1, max: 1, estado: 'anda', t: 0, pisca: 0, combo: 0, acertou: new Set(), espera: 0.8 };
  }, 2200);
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
  // Fim do mundo: chefão (ou a segunda tela, que tem o chefão dela).
  const fimX = comprimento - LARG;
  if (!chefe && fase.chefe && etapa === 1 && ondaIdx >= fase.ondas.length && trava === null && camX >= fimX - 1) {
    trava = fimX;
    if (fase.segundaTela) iniciarSegundaTela();
    else criarChefe();
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
    rotulo: tipo === 'fantasma' ? tri({ pt: ROTULOS_FANTASMA.pt[rotuloIdx % 4], en: ROTULOS_FANTASMA.en[rotuloIdx % 4], de: ROTULOS_FANTASMA.de[rotuloIdx++ % 4] }) : undefined,
  });
}

function atualizarCamera(dt: number) {
  const alvo = clamp(jog.x - 190, 0, comprimento - LARG);
  const limite = trava ?? comprimento - LARG;
  const desejado = Math.min(alvo, limite);
  if (desejado > camX) camX = Math.min(desejado, camX + 260 * dt);
}

// ─── Jogador ──────────────────────────────────────────────
/** Combo de roda punk: gancho (crowdkill), moinho de braço e chute giratório. */
const DUR_GOLPE = [0.22, 0.34, 0.46];
/** Janela em que cada golpe pega (fração da duração). */
const ATIVO = [[0.35, 0.75], [0.5, 0.85], [0.62, 0.92]];

function atualizarJogador(dt: number) {
  const j = jog;
  const ficha = integrante(j.quem);
  j.t += dt;
  j.invul = Math.max(0, j.invul - dt);
  j.janela = Math.max(0, j.janela - dt);
  j.pisca = Math.max(0, j.pisca - dt);
  recargaGel = Math.max(0, recargaGel - dt);
  const noChao = j.z <= 0;

  switch (j.estado) {
    case 'parado':
    case 'anda': {
      const vx = ctrl.x * 96 * ficha.vel, vy = ctrl.y * 60 * ficha.vel;
      j.x += vx * dt; j.y += vy * dt;
      if (ctrl.x) j.dir = ctrl.x > 0 ? 1 : -1;
      j.estado = ctrl.x || ctrl.y ? 'anda' : 'parado';
      if (aperto.pulo) { j.estado = 'pulo'; j.vz = 290; j.vx = ctrl.x * 96 * ficha.vel; j.t = 0; pulou = true; sfx.pulo(); }
      else if (aperto.soco && fase.distancia) atirarGel();
      else if (aperto.soco) golpe(j.janela > 0 ? (j.combo + 1) % 3 : 0);
      else if (aperto.esp && j.mosh >= 100) iniciarEspecial();
      break;
    }
    case 'golpe': {
      if (aperto.esp && j.mosh >= 100) { iniciarEspecial(); break; } // o especial corta o combo
      if (fase.distancia) { if (j.t > 0.2) j.estado = 'parado'; break; } // pandemia: só o jato de álcool
      const dur = DUR_GOLPE[j.combo] / ficha.vel ** 0.35;
      const [a0, a1] = ATIVO[j.combo];
      if (j.t > dur * a0 && j.t < dur * a1) aplicarGolpeDoJogador(danoDoGolpe(ficha.forca, j.combo, false), j.combo === 2, 38 * ficha.alcance + (j.combo === 2 ? 18 : j.combo === 1 ? 8 : 4));
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
      if (j.estado === 'pulo' && aperto.soco) { j.estado = 'voadora'; j.t = 0; j.acertou = new Set(); sfx.golpe(); }
      // Voadora giratória: pega quando a perna desce do alto e fica reta (quadros 3 e 4).
      if (j.estado === 'voadora' && j.t > 0.16) aplicarGolpeDoJogador(danoDoGolpe(ficha.forca, 0, true), true, 50 * ficha.alcance);
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
      // Apanhou no ar: cai, em vez de ficar flutuando.
      if (j.z > 0) { j.vz -= 900 * dt; j.z = Math.max(0, j.z + j.vz * dt); }
      if (j.t > 0.32 && j.z <= 0) j.estado = 'parado';
      break;
    case 'danca':
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

/** Pandemia: jato de álcool em gel, à distância (o vírus não pode chegar perto). */
function atirarGel() {
  if (recargaGel > 0) return;
  recargaGel = 0.26;
  jog.estado = 'golpe'; jog.combo = 0; jog.t = 0;
  projeteis.push({ x: jog.x + jog.dir * 30, y: jog.y, z: 58, vx: jog.dir * 330, vida: 0.6, atingidos: new Set(), tipo: 'gel' });
  sfx.golpe();
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
  if (derruba || j.vida <= 0 || j.golpesSofridos.length >= 3 || j.z > 0) {
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
          if (e.vida <= 0) { e.estado = 'morto'; e.t = 0; sfx.ko(); if ((e.tipo === 'pm' || e.tipo === 'gcm' || e.tipo === 'choque') && Math.random() < 0.25) itens.push({ x: e.x, y: e.y, tipo: 'coxinha', vz: 100, z: 8 }); }
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
  // Fantasma e vírus flutuam (e somem no golpe final, sem cair no chão).
  for (const e of inimigos) if (e.tipo === 'fantasma' || e.tipo === 'virus') {
    if (e.estado === 'voa' && e.vida <= 0) { e.estado = 'morto'; e.t = 0; sfx.ko(); }
    if (e.estado !== 'voa' && e.estado !== 'morto') e.z = 14 + Math.sin(relogio * 4 + e.semente) * 4;
  }
  inimigos = inimigos.filter((e) => e.estado !== 'morto' || e.morto < 0.9);
}

// ─── Chefões ──────────────────────────────────────────────
function criarChefe() {
  const tipo = fase.chefe!;
  const vida = { algoritmo: 320, tecnico: 330, pequenoPoder: 300, virus: 280, mao: 360 }[tipo];
  chefe = {
    tipo, x: camX + LARG - 90, y: 222, z: tipo === 'mao' ? 90 : tipo === 'virus' ? 40 : 0, vx: 0, vy: 0, vz: 0, dir: -1, vida, max: vida,
    estado: 'parado', t: 0, pisca: 0, acao: 'entra', timer: 1.6, alvo: null, fase2: false, chamou: 0, quadro: 0, golpeou: false,
  };
  abrirFiltro(true); // no chefão a banda entra de verdade
  if (tipo === 'algoritmo') sfx.pato(); else sfx.motor();
  avisar(nomeDoChefe(tipo), 2.4, true);
}

function nomeDoChefe(tipo: Chefe['tipo']) {
  const nomes: Record<TipoChefe, { pt: string; en: string; de: string }> = {
    algoritmo: { pt: 'O ALGORITMO', en: 'THE ALGORITHM', de: 'DER ALGORITHMUS' },
    tecnico: { pt: 'O TÉCNICO DE SOM FOLGADO', en: 'THE LAZY SOUND GUY', de: 'DER FAULE TONTECHNIKER' },
    pequenoPoder: { pt: 'A SÍNDROME DO PEQUENO PODER', en: 'PETTY POWER SYNDROME', de: 'DAS KLEINE-MACHT-SYNDROM' },
    virus: { pt: 'O VÍRUS', en: 'THE VIRUS', de: 'DAS VIRUS' },
    mao: { pt: 'A MÃO INVISÍVEL DO MERCADO', en: 'THE INVISIBLE HAND', de: 'DIE UNSICHTBARE HAND' },
  };
  return tri(nomes[tipo]);
}

function acertaChefe(alcance: number): boolean {
  const c = chefe!;
  const j = jog;
  const dx = (c.x - j.x) * j.dir;
  if (c.tipo === 'algoritmo') return dx > -10 && dx < alcance + 42 && Math.abs(c.y - j.y) < 26 && c.z < 50;
  // A mão só apanha quando encosta no chão.
  if (c.tipo === 'mao') return c.z < 24 && dx > -24 && dx < alcance + 56 && Math.abs(c.y - j.y) < 30;
  if (c.tipo === 'virus') return dx > -30 && dx < alcance + 46 && Math.abs(c.y - j.y) < 30;
  return dx > -8 && dx < alcance + 20 && Math.abs(c.y - j.y) < 18;
}

function ferirChefe(dano: number) {
  const c = chefe!;
  if (c.acao === 'entra' || c.acao === 'cai' || c.acao === 'derrotado') return;
  c.vida -= dano;
  c.pisca = 0.12;
  contarAcerto(20);
  pausaImpacto = 0.06;
  faiscas.push({ x: c.x - jog.dir * 20, y: c.y - c.z - 80, vida: 0.14, forte: true });
  sfx.acerto(true);
  if ((c.tipo === 'tecnico' || c.tipo === 'pequenoPoder') && !c.fase2 && c.vida < c.max / 2) {
    c.fase2 = true; c.acao = 'raiva'; c.timer = 1.4; avisar('!!!', 1.2, true); sfx.ko();
    if (c.tipo === 'pequenoPoder') { // caiu do banquinho: o banquinho vira lasca
      c.z = 0; sfx.quebra();
      for (let i = 0; i < 16; i++) particulas.push({ x: c.x, y: c.y - 6, vx: aleatorio(-100, 100), vy: aleatorio(-170, -50), cor: i % 2 ? P.caramelo : P.ruga, vida: 0.8, tam: 2 });
    }
  }
  if (c.vida <= 0) { c.vida = 0; c.acao = 'cai'; c.timer = 2.4; sfx.ko(); tremor = 0.6; pausaImpacto = 0.25; avisar(t('jogo.ko'), 2.4, true); }
}

function atualizarChefe(dt: number) {
  const c = chefe;
  if (!c) return;
  c.t += dt;
  c.timer -= dt;
  c.pisca = Math.max(0, c.pisca - dt);
  const j = jog;
  const naArena = (x: number) => clamp(x, camX + 50, camX + LARG - 50);
  if (c.acao === 'derrotado') return; // fica estirado no chão
  if (c.acao === 'cai') {
    c.z = Math.max(0, c.z - 300 * dt);
    if (c.timer > 1.6 && Math.floor(c.t * 10) % 3 === 0) poeira(c.x + aleatorio(-40, 40), c.y, 2, P.amarelo);
    if (c.timer <= 0) { c.acao = 'derrotado'; pontos += 2000; vencerFase(); }
    return;
  }
  if (c.acao === 'tonto') { if (c.timer <= 0) { c.acao = c.tipo === 'mao' ? 'sobe' : 'pensa'; c.timer = 0.5; } return; }

  if (c.tipo === 'algoritmo') {
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
  } else if (c.tipo === 'pequenoPoder') {
    // Síndrome do Pequeno Poder: em cima do banquinho, cassetete e salto; sem banquinho, fica nervoso.
    const vel = c.fase2 ? 1.45 : 1;
    if (!c.fase2 && c.acao !== 'salto') c.z = 16; // em pé no banquinho
    switch (c.acao) {
      case 'entra': c.x -= 50 * dt; if (c.timer <= 0) { c.acao = 'pensa'; c.timer = 0.8; } break;
      case 'raiva': if (c.timer <= 0) { c.acao = 'pensa'; c.timer = 0.4; } break;
      case 'pensa': {
        c.dir = j.x < c.x ? -1 : 1;
        c.x += clamp(j.x - c.dir * 54 - c.x, -1, 1) * 55 * vel * dt;
        c.y += clamp(j.y - c.y, -1, 1) * 45 * vel * dt;
        c.y = clamp(c.y, CHAO.topo, CHAO.base);
        if (c.timer <= 0) {
          const perto = Math.abs(j.x - c.x) < 74 && Math.abs(j.y - c.y) < 14;
          if (perto && Math.random() < 0.6) { c.acao = 'prepara'; c.timer = 0.5 / vel; c.golpeou = false; }
          else if (!c.fase2) { c.acao = 'salto'; c.timer = 0.9; c.vz = 300; c.alvo = { x: naArena(j.x), y: j.y }; sfx.pulo(); }
          else { c.acao = 'mira'; c.timer = 0.45; }
        }
        break;
      }
      case 'prepara': if (c.timer <= 0) {
        c.acao = 'soco'; c.timer = 0.3;
        if (Math.abs(j.x - c.x) < 74 && Math.abs(j.y - c.y) < 15 && (j.x - c.x) * c.dir > 0) ferirJogador(12, c.fase2, c.dir);
        sfx.golpe();
      } break;
      case 'soco': if (c.timer <= 0) { c.acao = 'pensa'; c.timer = 0.8 / vel; } break;
      case 'salto': {
        // Pula com banquinho e tudo e cai em cima.
        const a = c.alvo!;
        c.x += (a.x - c.x) * 2.4 * dt; c.y += (a.y - c.y) * 2.4 * dt;
        c.vz -= 800 * dt; c.z = Math.max(16, c.z + c.vz * dt);
        if (c.z <= 16 && c.vz < 0) {
          tremor = 0.35; sfx.quebra();
          ondasFx.push({ x: c.x, y: c.y, raio: 16, vida: 0.4, cor: P.amarelo });
          if (Math.hypot(j.x - c.x, (j.y - c.y) * 2) < 70 && j.z < 8) ferirJogador(13, true, j.x > c.x ? 1 : -1);
          c.acao = 'pensa'; c.timer = 1;
        }
        break;
      }
      case 'mira': c.dir = j.x < c.x ? -1 : 1; if (c.timer <= 0) { c.acao = 'investe'; c.timer = 1; } break;
      case 'investe':
        c.x += c.dir * 270 * dt;
        if (Math.abs(j.x - c.x) < 36 && Math.abs(j.y - c.y) < 18 && j.z < 30) ferirJogador(13, true, c.dir);
        if (c.timer <= 0 || c.x < camX + 40 || c.x > camX + LARG - 40) { c.x = naArena(c.x); c.acao = 'pensa'; c.timer = 0.8; }
        break;
    }
  } else if (c.tipo === 'virus') {
    // O Vírus: flutua, cospe gotículas, se divide e encosta para contaminar.
    const marcos = [0.7, 0.4];
    if (c.chamou < 2 && c.vida / c.max < marcos[c.chamou]) { c.chamou++; c.acao = 'divide'; c.timer = 0.8; }
    c.z = 40 + Math.sin(c.t * 2) * 8;
    if (Math.hypot(j.x - c.x, (j.y - c.y) * 1.5) < 44 && j.z < 30) ferirJogador(8, false, j.x > c.x ? 1 : -1); // encostou, contaminou
    switch (c.acao) {
      case 'entra': c.x -= 40 * dt; if (c.timer <= 0) { c.acao = 'pensa'; c.timer = 1.2; } break;
      case 'pensa':
        c.dir = j.x < c.x ? -1 : 1;
        c.x += clamp(j.x - c.dir * 130 - c.x, -1, 1) * 40 * dt;
        c.y += clamp(j.y - c.y, -1, 1) * 30 * dt;
        if (c.timer <= 0) {
          if (Math.random() < 0.6) { c.acao = 'cospe'; c.timer = 0.6; }
          else { c.acao = 'investe'; c.timer = 1.4; }
        }
        break;
      case 'cospe': if (c.timer <= 0) {
        for (const vy of [-40, 0, 40]) projeteis.push({ x: c.x + c.dir * 30, y: c.y, z: 50, vx: c.dir * 170, vy, vida: 2.4, atingidos: new Set(), tipo: 'gota' });
        sfx.cachorro(); c.acao = 'pensa'; c.timer = 1.3;
      } break;
      case 'investe':
        c.x += c.dir * 150 * dt; c.y += clamp(j.y - c.y, -1, 1) * 40 * dt;
        if (c.timer <= 0 || c.x < camX + 40 || c.x > camX + LARG - 40) { c.x = naArena(c.x); c.acao = 'pensa'; c.timer = 1; }
        break;
      case 'divide':
        if (c.timer <= 0) { for (let i = 0; i < 3; i++) criarInimigo('virus', i % 2 ? 1 : -1); c.acao = 'pensa'; c.timer = 1; }
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

// ─── Aliado: o Jota solto da delegacia ────────────────────
function atualizarAliado(dt: number) {
  const a = aliado;
  if (!a) return;
  a.t += dt;
  a.espera -= dt;
  if (terminou) { a.estado = 'danca'; return; }
  const alvo: { x: number; y: number } | null = chefe && chefe.acao !== 'cai' && chefe.acao !== 'derrotado' ? chefe : inimigos.find((e) => e.estado !== 'morto') ?? null;
  if (a.estado === 'golpe') {
    const dur = DUR_GOLPE[a.combo];
    if (a.t > dur * ATIVO[a.combo][0] && a.t < dur * ATIVO[a.combo][1] && alvo) {
      if (chefe && alvo === chefe && !a.acertou.has(chefe) && Math.abs(chefe.x - a.x) < 80 && Math.abs(chefe.y - a.y) < 22) { a.acertou.add(chefe); ferirChefe(a.combo === 2 ? 12 : 7); }
      for (const e of inimigos) if (!a.acertou.has(e) && e.estado !== 'morto' && Math.abs(e.x - a.x) < 50 && Math.abs(e.y - a.y) < 14) { a.acertou.add(e); ferirInimigo(e, a.combo === 2 ? 12 : 7, a.combo === 2, a.dir); }
    }
    if (a.t >= dur) {
      if (a.combo < 2) { a.combo++; a.t = 0; a.acertou = new Set(); }
      else { a.estado = 'parado'; a.espera = 0.7; }
    }
    return;
  }
  if (!alvo) { a.estado = 'parado'; return; }
  a.dir = alvo.x > a.x ? 1 : -1;
  const ax = alvo.x - a.dir * 50, ay = alvo.y;
  const dx = ax - a.x, dy = ay - a.y;
  if (Math.abs(dx) > 6 || Math.abs(dy) > 4) {
    a.x += clamp(dx, -100 * dt, 100 * dt); a.y += clamp(dy, -60 * dt, 60 * dt);
    a.estado = 'anda';
  } else a.estado = 'parado';
  if (a.espera <= 0 && Math.abs(dx) < 20 && Math.abs(dy) < 10) { a.estado = 'golpe'; a.combo = 0; a.t = 0; a.acertou = new Set(); sfx.golpe(); }
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
    if (p.tipo === 'gel') {
      // Álcool em gel: o jato acerta o primeiro que encontrar.
      p.x += p.vx * dt;
      const forca = integrante(jog.quem).forca;
      for (const e of inimigos) if (!p.atingidos.size && e.estado !== 'morto' && Math.abs(e.x - p.x) < 18 && Math.abs(e.y - p.y) < 20) {
        p.atingidos.add(e); p.vida = 0; ferirInimigo(e, Math.round(9 * forca), e.tipo === 'virus', p.vx > 0 ? 1 : -1);
        for (let i = 0; i < 6; i++) particulas.push({ x: p.x, y: p.y - 60, vx: aleatorio(-60, 60), vy: aleatorio(-80, 0), cor: P.pastel_azul, vida: 0.4, tam: 2 });
      }
      if (chefe && !p.atingidos.size && Math.abs(chefe.x - p.x) < 44 && Math.abs(chefe.y - p.y) < 30) { p.atingidos.add(chefe); p.vida = 0; ferirChefe(Math.round(7 * forca)); }
    } else if (p.tipo === 'gota') {
      p.x += p.vx * dt; p.y += (p.vy ?? 0) * dt;
      if (!p.atingidos.has(jog) && Math.abs(jog.x - p.x) < 14 && Math.abs(jog.y - p.y) < 12 && jog.z < 30) { p.atingidos.add(jog); p.vida = 0; ferirJogador(8, false, p.vx > 0 ? 1 : -1); }
    } else if (p.tipo === 'eco') {
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
  abaixar();
  chip.tocar('vitoria');
  // Dança da vitória: o integrante comemora em cima do chefão caído.
  jog.estado = 'danca'; jog.t = 0; jog.z = 0; jog.invul = 99;
  for (const e of inimigos) if (e.estado !== 'morto') { e.vida = 0; e.estado = 'voa'; e.vz = 160; e.vx = (e.x > jog.x ? 1 : -1) * 120; }
  const n = fase.n;
  if (n === 0) {
    progresso = concluirFase(progresso, 0, { nota: 'A', tempo: tempoFase, pontos });
    salvarProgresso();
    tutorial.concluir();
    setTimeout(() => abrirMapa(1), 2200);
    return;
  }
  const nt = notaDaFase(danoSofrido, tempoFase, fase.par, comboMax, continues);
  const jaZerou = progresso.zerou;
  const felipeAntes = liberado(integrante('felipeles'), progresso);
  const novoArquivo = fase.arquivo && !progresso.arquivo.includes(n);
  progresso = concluirFase(progresso, n, { nota: nt, tempo: tempoFase, pontos });
  salvarProgresso();
  evento(JOGO, 'fase_fim', { fase: n, nota: nt, tempo: Math.round(tempoFase), quem: jog.quem });
  const felipeAgora = !felipeAntes && liberado(integrante('felipeles'), progresso);
  setTimeout(() => { abrirResultado(nt, !!novoArquivo, !jaZerou && progresso.zerou); if (felipeAgora) $('res-retorno').textContent = t('res.felipeles'); }, 3400);
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
if (RELOGIO_TIMER) Object.assign(window, { __escNocaute: () => { if (chefe) { chefe.vida = 1; ferirChefe(5); } }, __esc: () => ({ modo, camX, ondaIdx, inimigos: inimigos.length, alvos: inimigos.map((e) => ({ x: Math.round(e.x), y: Math.round(e.y), vida: e.vida, estado: e.estado })), quebraveis: quebraveis.length, itens: itens.length, chefe: chefe && { vida: chefe.vida, acao: chefe.acao }, jog: { x: jog.x, y: jog.y, z: jog.z, vida: jog.vida, mosh: jog.mosh, estado: jog.estado, invul: jog.invul, pisca: jog.pisca } }) });
const proximoQuadro = () => (RELOGIO_TIMER ? setTimeout(() => quadro(performance.now()), 16) : requestAnimationFrame(quadro));

function passo(dt: number) {
  if (pausaImpacto > 0) { pausaImpacto -= dt; atualizarMundo(dt * 0.2); return; }
  tempoFase += dt;
  atualizarJogador(dt);
  atualizarInimigos(dt);
  atualizarChefe(dt);
  atualizarAliado(dt);
  atualizarMundo(dt);
  atualizarOndas(dt);
  atualizarCamera(dt);
  tremor = Math.max(0, tremor - dt);
  flash = Math.max(0, flash - dt);
  setaVai = Math.max(0, setaVai - dt);
  mensagem.vida -= dt;
  if (fase.cenario === 'centro') {
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
    case 'anda': pose = 'twostep'; p = passoAnim; break;
    case 'golpe': {
      const u = j.t / (DUR_GOLPE[j.combo] / integrante(j.quem).vel ** 0.35);
      pose = fase.distancia ? 'soco' : (['soco', 'moinho', 'giro'] as const)[j.combo];
      if (j.combo === 0 && u > 0.85) pose = 'guarda';
      else if (j.combo === 1) p = (u < 0.3 ? 0 : u < 0.6 ? 1 : 2) as 0 | 1 | 2;
      else if (j.combo === 2) p = (u < 0.25 ? 0 : u < 0.45 ? 1 : u < 0.7 ? 2 : 3) as 0 | 1 | 2 | 3;
      break;
    }
    case 'danca': pose = 'danca'; p = (Math.floor(j.t * 6) % 4) as 0 | 1 | 2 | 3; break;
    case 'pulo': pose = 'pulo'; break;
    case 'voadora': pose = 'voadora'; p = Math.min(3, Math.floor(j.t / 0.08)) as 0 | 1 | 2 | 3; break;
    case 'especial': pose = 'especial'; break;
    case 'apanha': case 'voa': pose = 'apanha'; break;
    case 'caido': return { s: spriteIntegrante(j.quem, 'apanha', 0, false, !!fase.distancia), caido: true };
    default: break;
  }
  return { s: spriteIntegrante(j.quem, pose, p, j.estado === 'parado' && respiro, !!fase.distancia), caido: false };
}

function poseDoInimigo(e: Inimigo): { s: Sprite; caido: boolean } {
  const passoAnim = (Math.floor((relogio + e.semente * 0.13) * 8) % 4) as 0 | 1 | 2 | 3;
  if (e.estado === 'caido' || e.estado === 'morto') return { s: spriteInimigo(e.tipo, e.semente, 'apanha'), caido: e.tipo !== 'fantasma' };
  const pose: PoseLuta | 'tonto' = e.estado === 'prepara' ? 'guarda' : e.estado === 'golpe' ? (e.tipo === 'choque' ? 'soco2' : 'soco')
    : e.estado === 'apanha' || e.estado === 'voa' ? 'apanha' : e.estado === 'tonto' ? 'tonto' : 'guarda';
  return { s: spriteInimigo(e.tipo, e.semente, pose, e.estado === 'anda' || e.tipo === 'virus' ? passoAnim : 0), caido: false };
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
  desenharClima(ctx, etapa === 2 && fase.segundaTela ? fase.segundaTela.cenario : fase.cenario, relogio, false);

  // Sombras primeiro, depois tudo por profundidade.
  const lista: Desenhavel[] = [];
  for (const q of quebraveis) { sombra(q.x, q.y, 16); lista.push({ y: q.y, f: () => { const s = spriteQuebravel(q.tipo, q.vida < 3); ctx.drawImage(q.pisca > 0 ? piscada(s) : s, Math.round(q.x - camX - 32), Math.round(q.y - s.height + 2)); } }); }
  for (const it of itens) { sombra(it.x, it.y, 8); lista.push({ y: it.y, f: () => { const s = spriteItem(it.tipo); const b = Math.sin(relogio * 6) > 0 ? -1 : 0; ctx.drawImage(s, Math.round(it.x - camX - s.width / 2), Math.round(it.y - it.z - s.height + 2 + b)); } }); }
  for (const e of inimigos) {
    if (e.estado === 'morto' && e.tipo !== 'fantasma' && e.tipo !== 'virus' && Math.floor(e.morto * 12) % 2 === 1) continue;
    sombra(e.x, e.y, 16);
    lista.push({ y: e.y, f: () => {
      const { s, caido } = poseDoInimigo(e);
      if (e.tipo === 'fantasma' || e.tipo === 'virus') ctx.globalAlpha = e.estado === 'morto' ? Math.max(0, 0.7 - e.morto) : e.tipo === 'virus' ? 0.95 : 0.78;
      desenharLutador(s, e.x, e.y, e.z, e.dir, caido, e.pisca);
      ctx.globalAlpha = 1;
      if (e.estado === 'prepara' && Math.floor(relogio * 12) % 2 === 0) desenharAviso(e.x, e.y - 128);
    } });
  }
  if (cachorro) { const d = cachorro; sombra(d.x, d.y, 12); lista.push({ y: d.y, f: () => { const s = spriteCaramelo((Math.floor(relogio * 12) % 4) as 0 | 1 | 2 | 3, d.morde > 0.4); ctx.save(); ctx.translate(Math.round(d.x - camX), Math.round(d.y)); ctx.scale(d.dir, 1); ctx.drawImage(s, -24, -s.height + 2); ctx.restore(); } }); }
  if (chefe) {
    const c = chefe;
    sombra(c.x, c.y, c.tipo === 'algoritmo' ? 52 : c.tipo === 'mao' ? Math.max(20, 52 - c.z * 0.3) : 30);
    lista.push({ y: c.y, f: () => desenharChefe(c) });
  }
  if (aliado) {
    const a = aliado;
    sombra(a.x, a.y, 16);
    lista.push({ y: a.y, f: () => {
      const f = (Math.floor(relogio * 9) % 4) as 0 | 1 | 2 | 3;
      const u = a.estado === 'golpe' ? a.t / DUR_GOLPE[a.combo] : 0;
      const pose: PoseLuta = a.estado === 'anda' ? 'twostep' : a.estado === 'danca' ? 'danca' : a.estado === 'golpe' ? (['soco', 'moinho', 'giro'] as const)[a.combo] : 'guarda';
      const fq = (a.estado === 'golpe' ? Math.min(a.combo === 2 ? 3 : 2, Math.floor(u * (a.combo === 2 ? 4 : 3))) : f) as 0 | 1 | 2 | 3;
      desenharLutador(spriteIntegrante(a.quem, pose, fq), a.x, a.y, 0, a.dir, false, 0);
    } });
  }
  if (fase.cenario === 'ensaio') lista.push({ y: 198, f: () => desenharLutador(spriteDenao((Math.floor(relogio * 2) % 2) as 0 | 1), 430, 198, 0, 1, false, 0) });
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
  for (const p of projeteis) {
    if (p.tipo === 'gel') { for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? P.pastel_azul : P.branco; ctx.fillRect(Math.round(p.x - camX - i * 5 * Math.sign(p.vx)), Math.round(p.y - p.z + (i % 2)), 4 - (i >> 1), 3); } }
    else if (p.tipo === 'gota') { ctx.fillStyle = P.neon_verde; ctx.fillRect(Math.round(p.x - camX) - 2, Math.round(p.y - p.z) - 2, 5, 5); ctx.fillStyle = P.musgo; ctx.fillRect(Math.round(p.x - camX) + 1, Math.round(p.y - p.z) + 1, 2, 2); }
  }
  // Rótulos dos fantasmas: as obrigações do capitalismo.
  for (const e of inimigos) if (e.rotulo && e.estado !== 'morto') texto(e.rotulo, Math.round(e.x - camX), Math.round(e.y - e.z - 104), P.neon_rosa, 6, 'center');
  for (const o of ondasFx) {
    ctx.strokeStyle = o.cor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(Math.round(o.x - camX), Math.round(o.y), o.raio, o.raio * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
  }
  for (const f of faiscas) desenharFaisca(f);
  for (const p of particulas) { ctx.fillStyle = p.cor; ctx.fillRect(Math.round(p.x - camX), Math.round(p.y), p.tam, p.tam); }

  for (const cam of palco.frente ? [palco.frente] : []) desenharCamada(ctx, cam, camX);
  desenharClima(ctx, etapa === 2 && fase.segundaTela ? fase.segundaTela.cenario : fase.cenario, relogio, true);
  ctx.restore();
  if (flash > 0) { ctx.fillStyle = `rgba(230,236,255,${Math.min(0.55, flash * 1.6)})`; ctx.fillRect(0, 0, LARG, ALT); }
  desenharHud();
}

function desenharChefe(c: Chefe) {
  const pisca = c.pisca;
  const nocaute = c.acao === 'derrotado' || (c.acao === 'cai' && c.timer < 1.8);
  if (c.tipo === 'algoritmo') {
    const s = spritePato(nocaute ? 0 : c.quadro as 0 | 1 | 2 | 3);
    const img = pisca > 0 ? piscada(s) : s;
    ctx.save(); ctx.translate(Math.round(c.x - camX), Math.round(c.y - c.z));
    if (nocaute) { ctx.translate(0, -48); ctx.rotate(-c.dir * Math.PI / 2); } // estirado de lado no asfalto
    ctx.scale(c.dir, 1);
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
  } else if (c.tipo === 'pequenoPoder') {
    if (!c.fase2 && !nocaute) {
      // O banquinho embaixo do pé.
      const bx = Math.round(c.x - camX), by = Math.round(c.y);
      ctx.fillStyle = P.ruga; ctx.fillRect(bx - 16, by - 16, 32, 4);
      ctx.fillStyle = P.caramelo; ctx.fillRect(bx - 16, by - 16, 32, 1);
      ctx.fillStyle = P.chocolate; for (const lx of [-14, -4, 4, 12]) ctx.fillRect(bx + lx, by - 12, 2, 12);
    }
    const passoAnim = (Math.floor(c.t * 8) % 4) as 0 | 1 | 2 | 3;
    const pose: PoseLuta | 'tonto' = c.acao === 'tonto' ? 'tonto' : c.acao === 'soco' ? 'soco' : c.acao === 'investe' ? 'soco2' : c.acao === 'salto' ? 'pulo' : nocaute || c.acao === 'raiva' ? 'apanha' : 'guarda';
    desenharLutador(spritePequenoPoder(pose, c.acao === 'pensa' ? passoAnim : 0, c.fase2), c.x, c.y, nocaute ? 0 : c.z, c.dir, nocaute, pisca, 1.15);
    if (c.acao === 'prepara' && Math.floor(relogio * 12) % 2 === 0) desenharAviso(c.x, c.y - c.z - 150);
  } else if (c.tipo === 'virus') {
    const s = spriteVirus((Math.floor(c.t * 4) % 2) as 0 | 1, 2.4, pisca > 0);
    ctx.save();
    if (nocaute) ctx.globalAlpha = 0.45;
    ctx.drawImage(pisca > 0 ? piscada(s) : s, Math.round(c.x - camX - s.width / 2), Math.round(c.y - (nocaute ? 0 : c.z) - s.height + 10));
    ctx.restore();
  } else if (c.tipo === 'mao') {
    // Mão de mago: os dedos mexem enquanto ela paira e conjura os fantasmas.
    const magia = (Math.floor(relogio * 6) % 2 ? 3 : 4) as 3 | 4;
    const pose = nocaute || c.acao === 'varre' || c.acao === 'prepara' ? 0 : c.acao === 'bate' || c.acao === 'no_chao' ? 1 : c.acao === 'mira' ? 2 : magia;
    const s = spriteMao(pose);
    const img = pisca > 0 ? piscada(s) : s;
    ctx.save();
    // Invisível: translúcida, tremulando como miragem.
    ctx.globalAlpha = nocaute || c.z < 24 ? 0.9 : 0.45 + 0.25 * Math.sin(relogio * 5) ** 2;
    ctx.translate(Math.round(c.x - camX), Math.round(c.y - c.z));
    ctx.scale(c.dir < 0 ? 1 : -1, 1);
    ctx.drawImage(img, -70, -img.height + 14);
    ctx.restore();
  } else {
    const passoAnim = (Math.floor(c.t * 8) % 4) as 0 | 1 | 2 | 3;
    const pose: PoseLuta | 'tonto' | 'microfone' = c.acao === 'tonto' ? 'tonto' : c.acao === 'cabo' ? 'soco' : c.acao === 'investe' ? 'soco2'
      : c.acao === 'micro_prep' || c.acao === 'raiva' ? 'microfone' : c.acao === 'cai' ? 'apanha' : 'guarda';
    const s = spriteTecnico(pose, c.acao === 'pensa' ? passoAnim : 0, c.fase2);
    desenharLutador(s, c.x, c.y, c.z, c.dir, nocaute, pisca, 1.45);
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
  const s = spriteIntegrante(j.quem, 'guarda', 0, false, !!fase.distancia);
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
    texto(`${t('hud.fita')} ${pedacosDaFita(progresso)}/${PEDACOS_DA_FITA}`, LARG - 8, 8, P.neon_ciano, 8, 'right');
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
  fundoTitulo ??= montarPalco('centro');
  camX = (relogio * 12) % 960;
  desenharFundo(ctx, fundoTitulo, camX, Math.sin(relogio * 0.7) > 0.995 ? 1 : 0);
  desenharClima(ctx, 'centro', relogio, false);
  const ordem: Quem[] = ['igor', 'pucci', 'vocal', 'renato'];
  ordem.forEach((q, i) => {
    const s = spriteIntegrante(q, 'guarda', 0, Math.floor(relogio * 2 + i) % 2 === 0);
    ctx.drawImage(s, 110 + i * 70, 248 - s.height);
  });
  desenharClima(ctx, 'centro', relogio, true);
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
  void tocarFaixa('cicatrizes');
  $('b-start').hidden = true;
  $('menu-titulo').hidden = false;
  $('b-continuar').hidden = progresso.liberada === 0 && !Object.keys(progresso.melhores).length;
  (($('b-continuar').hidden ? $('b-novo') : $('b-continuar')) as HTMLButtonElement).focus();
}
$('b-start').addEventListener('click', apertouStart);
$('b-novo').addEventListener('click', () => { sfx.confirma(); abrirMapa(0); });
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
/** Fase que começa depois de escolher (a seleção vem antes de toda fase). */
let faseEscolhida = 0;
function abrirSelecao(n = progresso.liberada) {
  faseEscolhida = n;
  escolhido = progresso.quem;
  if (!disponivel(integrante(escolhido))) escolhido = 'igor';
  modo = 'selecao';
  mostrar('selecao');
  const fileira = $('fileira');
  fileira.innerHTML = '';
  for (const ig of INTEGRANTES) {
    const travado = !liberado(ig, progresso);
    const preso = !travado && !disponivel(ig);
    const b = document.createElement('button');
    b.disabled = travado || preso;
    b.title = travado ? (ig.secreto === 'notaS' ? t('sel.travadoS') : t('sel.travado')) : preso ? t('sel.preso') : ig.nome;
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
/** Pode jogar com ele nesta fase? (liberado e, no festival, não é o Jota, que está na delegacia). */
function disponivel(ig: (typeof INTEGRANTES)[number]) {
  return liberado(ig, progresso) && !(FASES[faseEscolhida]?.semJota && ig.id === 'vocal');
}
let seletorTrava = 0;
function navegarSelecao() {
  seletorTrava -= 1 / 60;
  if (ctrl.x && seletorTrava <= 0) {
    const lista = INTEGRANTES.filter(disponivel);
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
  carregar(faseEscolhida);
}
$('b-escolher').addEventListener('click', escolher);

// Mapa Game Boy
const GB = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'];
/** As quatro paradas pela cidade: sala de ensaio, periferia, canteiro e a casa de show. */
/** Ipiranga, Centro, a estrada, Brasília, a cidade fechada da pandemia e o Mercado. */
const PONTOS_MAPA = [{ x: 22, y: 116 }, { x: 46, y: 92 }, { x: 76, y: 108 }, { x: 132, y: 30 }, { x: 108, y: 86 }, { x: 140, y: 112 }];
let noMapa = 0;
let kombi = { x: 22, y: 112 };
function abrirMapa(n: number) {
  modo = 'mapa';
  noMapa = clamp(n, 0, progresso.liberada);
  kombi = { ...PONTOS_MAPA[noMapa] };
  void tocarFaixa('cicatrizes');
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
  // Quarteirões e rio (Tietê), com a estrada pontilhada até Brasília.
  g.fillStyle = GB[2];
  for (let y = 4; y < 140; y += 14) for (let x = 4 + ((y / 14) % 2) * 6; x < 150; x += 16) g.fillRect(x, y, 10, 8);
  g.fillStyle = GB[1]; g.fillRect(0, 124, 160, 6);
  for (let i = 0; i < PONTOS_MAPA.length - 1; i++) {
    const a = PONTOS_MAPA[i], b = PONTOS_MAPA[i + 1];
    for (let s = 0; s < 1; s += 0.08) { g.fillStyle = i < progresso.liberada ? GB[0] : GB[1]; g.fillRect(Math.round(a.x + (b.x - a.x) * s), Math.round(a.y + (b.y - a.y) * s), 2, 2); }
  }
  PONTOS_MAPA.forEach((p, i) => {
    const liberado = i <= progresso.liberada;
    g.fillStyle = GB[0]; g.fillRect(p.x - 5, p.y - 5, 10, 10);
    g.fillStyle = liberado ? (progresso.melhores[i] ? GB[1] : GB[2]) : GB[3]; g.fillRect(p.x - 4, p.y - 4, 8, 8);
    g.fillStyle = GB[0]; g.font = '6px monospace'; g.fillText(String(i), p.x - 2, p.y + 2);
  });
  g.fillStyle = GB[0]; g.font = '7px monospace';
  g.fillText('SÃO PAULO', 6, 138); g.fillText('BRASÍLIA', 100, 16);
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
  abrirSelecao(noMapa);
}

// Carregamento: gera os sprites da fase aos poucos, com dica da banda.
const DICAS = [
  { pt: 'Café cura. Energético cura mais e enche o MOSH.', en: 'Coffee heals. Energy drinks heal more and fill MOSH.', de: 'Kaffee heilt. Energy-Drinks heilen mehr und füllen MOSH.' },
  { pt: 'O combo é de roda: gancho, moinho e chute giratório.', en: 'The combo is pure pit: hook, windmill and spin kick.', de: 'Die Kombo ist reiner Pit: Haken, Windmühle, Drehkick.' },
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
  const quem = progresso.quem;
  for (const p of ['guarda', 'soco', 'chute', 'pulo', 'apanha', 'especial'] as const) tarefas.push(() => spriteIntegrante(quem, p));
  for (let k = 0; k < 4; k++) { const f = k as 0 | 1 | 2 | 3; tarefas.push(() => spriteIntegrante(quem, 'twostep', f)); tarefas.push(() => spriteIntegrante(quem, 'danca', f)); }
  const masc = !!f.distancia;
  for (let k = 0; k < 4; k++) { const fq = k as 0 | 1 | 2 | 3; tarefas.push(() => spriteIntegrante(quem, 'moinho', Math.min(2, k) as 0 | 1 | 2)); tarefas.push(() => spriteIntegrante(quem, 'giro', fq)); tarefas.push(() => spriteIntegrante(quem, 'voadora', fq)); }
  if (masc) for (const p of ['guarda', 'soco', 'pulo', 'apanha'] as const) tarefas.push(() => spriteIntegrante(quem, p, 0, false, true));
  if (f.segundaTela) for (const p of ['guarda', 'soco', 'twostep'] as const) tarefas.push(() => spriteIntegrante('vocal', p));
  if (f.chefe === 'pequenoPoder') for (const b of [false, true]) for (const p of ['guarda', 'soco', 'pulo'] as const) tarefas.push(() => spritePequenoPoder(p, 0, b));
  if (f.chefe === 'virus') tarefas.push(() => spriteVirus(0, 2.4), () => spriteVirus(1, 2.4));
  if (f.cenario === 'ensaio') tarefas.push(() => spriteDenao(0), () => spriteDenao(1));
  tarefas.push(() => spriteIntegrante(quem, 'guarda', 0, true));
  const musica = carregarFaixa(FAIXA_DA_FASE[n] ?? 'cicatrizes');
  const tipos = [...new Set(f.ondas.flatMap((o) => o.inimigos))];
  for (const tp of tipos) for (let s = 0; s < (tp === 'papelao' ? 1 : 3); s++) {
    for (const p of ['guarda', 'soco', 'apanha'] as const) tarefas.push(() => spriteInimigo(tp, s, p));
    for (let k = 1; k < 4; k++) tarefas.push(() => spriteInimigo(tp, s, 'guarda', k as 0 | 1 | 2 | 3));
  }
  if (f.chefe === 'algoritmo') for (let q = 0; q < 4; q++) tarefas.push(() => spritePato(q as 0 | 1 | 2 | 3));
  if (f.chefe === 'mao') { for (let q = 0; q < 3; q++) tarefas.push(() => spriteMao(q as 0 | 1 | 2)); for (const p of ['guarda', 'soco', 'apanha'] as const) tarefas.push(() => spriteInimigo('fantasma', 0, p)); }
  if (f.chefe === 'tecnico') for (const b of [false, true]) for (const p of ['guarda', 'soco', 'microfone'] as const) tarefas.push(() => spriteTecnico(p, 0, b));
  for (const q of f.quebraveis) { tarefas.push(() => spriteQuebravel(q.tipo)); tarefas.push(() => spriteItem(q.item)); }
  const total = tarefas.length;
  const passoCarga = () => {
    const ate = performance.now() + 14;
    while (tarefas.length && performance.now() < ate) tarefas.shift()!();
    $('carga').style.width = `${Math.round((1 - tarefas.length / total) * 100)}%`;
    if (tarefas.length) setTimeout(passoCarga, 0);
    else void musica.then(() => setTimeout(() => iniciarFase(n), 150));
  };
  setTimeout(passoCarga, 30);
}

// Pausa
function alternarPausa() {
  if (modo === 'jogo') { modo = 'pausa'; mostrar('pausa'); tutorial.pausar?.(); }
  else if (modo === 'pausa') { modo = 'jogo'; mostrar(null); tutorial.retomar?.(); }
}
$('b-voltar').addEventListener('click', alternarPausa);
$('b-som').addEventListener('click', () => { setMudo(!estaMudo()); gravar(JOGO, 'mudo', estaMudo()); ajustarVolume(); traduzir(); });
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
  $('fim-titulo').textContent = t('fim.titulo', { n: pedacosDaFita(progresso), t: PEDACOS_DA_FITA });
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
palco = montarPalco('centro');
mostrar('titulo');
ajustarTela();
proximoQuadro();

if (new URLSearchParams(location.search).has('fase')) {
  const n = clamp(Number(new URLSearchParams(location.search).get('fase')) || 0, 0, FASES.length - 1);
  progresso = { ...progresso, liberada: Math.max(progresso.liberada, n) };
  carregar(n);
}
