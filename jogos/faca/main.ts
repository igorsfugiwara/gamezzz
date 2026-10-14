import '../compartilhado/base.css';
import './estilo.css';
import * as M from './motor';
import { Cena } from './cena';
import { desenharZine, exportarZine } from './zine';
import { desenharParada, type Parada } from './paisagem';
import { integranteHD } from './visual';
import { trilha } from './trilha';
import { t as tr, lista, idiomaAtual, definirIdioma } from './i18n';
import { emCache } from '../compartilhado/canvas';
import { ler, gravar } from '../compartilhado/salvar';
import { compartilhar, urlDoJogo } from '../compartilhado/compartilhar';
import { evento as registrar } from '../compartilhado/eventos';
import { Tutorial } from '../compartilhado/tutorial';
import { nota, acorde, arpejo, ruido, vibrar, destravarAudio, setMudo, estaMudo, PENTATONICA } from '../compartilhado/som';

const JOGO = 'faca';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

interface Registro { seed: string; fim: string; noite: number; shows: number; data: string }
interface BandaSalva { nomes: Partial<Record<M.Integrante, string>>; nomeBanda: string }

let t: M.Turne | null = null;
let show: M.Show | null = null;
let anteriores: Partial<Record<M.Recurso, number>> = {};
const cena = new Cena($<HTMLCanvasElement>('cena'));
setMudo(ler(JOGO, 'mudo', false));

// ─── Som ──────────────────────────────────────────────────
const sons = {
  musica(energia: number) {
    const k = 1 + Math.min(1, energia / 20);
    acorde([73 * k, 110 * k, 147 * k], 0.22, 'sawtooth', 0.03);
    ruido(0.06, 0.1, 900);
  },
  fala() { arpejo([523, 659, 784], 0.05, 'square', 0.035); },
  acao() { ruido(0.18, 0.06, 3000); nota(330, 0.1, 'square', 0.035); },
  microfonia() { nota(2093, 0.35, 'sine', 0.05); nota(2217, 0.3, 'sine', 0.035, 0.05); },
  mosh() { ruido(0.6, 0.12, 900); arpejo(PENTATONICA.slice(3, 10), 0.04, 'square', 0.05); },
  desabou() { ruido(1.1, 0.16, 380); nota(55, 0.8, 'sawtooth', 0.06); },
  acertou() { acorde([147, 220, 294], 1.2, 'sawtooth', 0.04); },
  clique() { nota(440, 0.05, 'square', 0.03); },
  virada() { [0, 0.07, 0.14, 0.21].forEach((a, i) => nota(180 - i * 25, 0.06, 'triangle', 0.06, a)); ruido(0.1, 0.08, 1400); },
  van() { ruido(0.4, 0.07, 500); nota(90, 0.3, 'sawtooth', 0.04); },
};

// ─── Idioma ───────────────────────────────────────────────
function aplicarIdioma() {
  document.documentElement.lang = idiomaAtual() === 'en' ? 'en' : 'pt-BR';
  document.querySelectorAll<HTMLElement>('[data-t]').forEach((el) => { el.textContent = tr(el.dataset.t!); });
  $('btn-idioma').textContent = tr('idioma');
}
$('btn-idioma').addEventListener('click', () => {
  definirIdioma(idiomaAtual() === 'pt' ? 'en' : 'pt');
  aplicarIdioma();
  if (!$('titulo').hidden) telaTitulo();
  else if (!$('banda-tela').hidden) telaBanda(sementePendente);
});

// ─── Telas ────────────────────────────────────────────────
const TELAS = ['titulo', 'banda-tela', 'mapa', 'folha', 'show', 'resultado', 'fim'] as const;
type Tela = (typeof TELAS)[number];

function mostrar(tela: Tela) {
  for (const id of TELAS) $(id).hidden = id !== tela;
  const comHud = tela === 'mapa' || tela === 'folha';
  $('hud').hidden = !comHud;
  $('btn-idioma').hidden = tela !== 'titulo' && tela !== 'banda-tela';
  if (tela !== 'show') cena.parar();
  if (tela === 'show') trilha.tocar('show');
  else if (tela !== 'titulo') trilha.tocar('estrada');
  if (comHud) requestAnimationFrame(() => document.documentElement.style.setProperty('--hud-h', `${$('hud').offsetHeight}px`));
  if (tela === 'titulo') animarTitulo(); else pararTitulo();
}

let avisoTimer = 0;
function aviso(texto: string, ms = 2200) {
  const el = $('aviso');
  el.textContent = texto;
  el.classList.add('aviso--ver');
  clearTimeout(avisoTimer);
  avisoTimer = window.setTimeout(() => el.classList.remove('aviso--ver'), ms);
}

async function avisos(l: string[]) {
  for (const a of l) {
    aviso(a, 2400);
    await new Promise((ok) => setTimeout(ok, 2500));
  }
}

function salvar() {
  if (!t) return;
  if (t.fim) {
    // Fecha a turnê uma vez só: grava no caderno e apaga o save.
    if (ler<M.Turne | null>(JOGO, 'turne', null)) {
      const caderno = ler<Registro[]>(JOGO, 'caderno', []);
      caderno.unshift({ seed: t.seed, fim: t.fim, noite: t.noite, shows: t.stats.shows, data: new Date().toISOString().slice(0, 10) });
      gravar(JOGO, 'caderno', caderno.slice(0, 30));
      registrar(JOGO, 'turne_fim', { fim: t.fim, noite: t.noite, saidas: t.saidas.length });
    }
    gravar(JOGO, 'turne', null);
    return;
  }
  gravar(JOGO, 'turne', t);
}

/** Vai para a tela da fase atual da turnê. */
function seguir() {
  if (!t) return telaTitulo();
  salvar();
  const f = t.fase;
  if (t.fim || f.tipo === 'fim') return telaFim();
  renderHud();
  if (f.tipo === 'mapa') telaMapa();
  else if (f.tipo === 'evento') telaEvento();
  else if (f.tipo === 'descanso') telaDescanso();
  else if (f.tipo === 'perdida') telaPerdida();
  else if (f.tipo === 'show') comecarShow();
  else if (f.tipo === 'recompensa') telaResultado();
}

/** Retrato (meio corpo) de um integrante num canvas. */
function retrato(quem: M.Integrante, alturaPx = 34): HTMLCanvasElement {
  const s = emCache(`hud-${quem}`, () => integranteHD(quem, { extra: undefined, pose: 'parado' }));
  const c = document.createElement('canvas');
  c.width = s.width;
  c.height = 64;
  c.className = 'pixel retrato';
  c.style.height = `${alturaPx}px`;
  c.getContext('2d')!.drawImage(s, 0, 0, s.width, 64, 0, 0, s.width, 64);
  return c;
}

// ─── Título ───────────────────────────────────────────────
let tituloTimer = 0;
function animarTitulo() {
  const c = $<HTMLCanvasElement>('titulo-banda');
  const ctx = c.getContext('2d')!;
  let quadro = 0;
  const desenhar = () => {
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = false;
    M.ORDEM_BANDA.forEach((quem, i) => {
      // Headbang em 4 quadros, cada um defasado.
      const q = ((quadro + i) % 4) as 0 | 1 | 2 | 3;
      const s = emCache(`titulo-${quem}-${q}`, () => integranteHD(quem, quem === 'vocal' ? { pose: 'chifres', grito: q % 2 === 1, quadro: q } : { quadro: q }));
      ctx.drawImage(s, 8 + i * 60, c.height - s.height);
    });
    quadro++;
  };
  desenhar();
  clearInterval(tituloTimer);
  tituloTimer = window.setInterval(desenhar, 150);
}
function pararTitulo() { clearInterval(tituloTimer); }

const seedDaUrl = M.normalizarSeed(new URLSearchParams(location.search).get('seed') ?? '');

function telaTitulo() {
  const salvo = ler<M.Turne | null>(JOGO, 'turne', null);
  const continuar = $<HTMLButtonElement>('btn-continuar');
  continuar.hidden = !salvo || salvo.versao !== 2;
  if (salvo) continuar.textContent = tr('titulo.continuar', { n: Math.max(1, salvo.noite) });
  const amigo = $<HTMLButtonElement>('btn-amigo');
  amigo.hidden = !seedDaUrl;
  if (seedDaUrl) amigo.textContent = tr('titulo.amigo', { seed: seedDaUrl });
  const caderno = ler<Registro[]>(JOGO, 'caderno', []);
  const c = caderno.filter((r) => r.fim === 'completa').length;
  $('caderno').textContent = !caderno.length ? tr('titulo.vazio') : caderno.length === 1 ? tr('titulo.caderno1', { c }) : tr('titulo.caderno', { n: caderno.length, c });
  aplicarIdioma();
  mostrar('titulo');
}

// ─── Banda (nomes editáveis) ──────────────────────────────
let sementePendente = '';

function telaBanda(seed: string) {
  sementePendente = seed;
  const salva = ler<BandaSalva>(JOGO, 'banda', { nomes: {}, nomeBanda: '' });
  const nomeBanda = $<HTMLInputElement>('banda-nome');
  nomeBanda.placeholder = tr('banda.padrao');
  if (!nomeBanda.dataset.tocado) nomeBanda.value = salva.nomeBanda;
  const box = $('banda-membros');
  const atuais = Object.fromEntries([...box.querySelectorAll<HTMLInputElement>('input')].map((i) => [i.dataset.quem, i.value]));
  box.replaceChildren();
  for (const quem of M.ORDEM_BANDA) {
    const card = document.createElement('div');
    card.className = 'membro-card';
    const fig = emCache(`banda-tela-${quem}`, () => integranteHD(quem));
    const c = document.createElement('canvas');
    c.width = fig.width; c.height = fig.height; c.className = 'pixel';
    c.getContext('2d')!.drawImage(fig, 0, 0);
    const info = document.createElement('div');
    const papel = document.createElement('span');
    papel.className = 'membro-card__papel';
    papel.textContent = tr(`papel.${quem}`);
    const input = document.createElement('input');
    input.dataset.quem = quem;
    input.maxLength = 16;
    input.placeholder = M.NOMES_PADRAO[quem];
    input.value = atuais[quem] ?? salva.nomes[quem] ?? '';
    input.setAttribute('aria-label', tr(`papel.${quem}`));
    const hab = document.createElement('small');
    hab.textContent = `${tr('banda.hab')}: ${tr(`hab.${quem}`)}`;
    const def = document.createElement('small');
    def.textContent = `${tr('banda.def')}: ${tr(`def.${quem}`)}`;
    info.append(papel, input, hab, def);
    card.append(c, info);
    box.appendChild(card);
  }
  aplicarIdioma();
  mostrar('banda-tela');
}
$('banda-nome').addEventListener('input', () => { $('banda-nome').dataset.tocado = '1'; });

$('btn-bora').addEventListener('click', () => {
  const nomes = Object.fromEntries([...document.querySelectorAll<HTMLInputElement>('#banda-membros input')].map((i) => [i.dataset.quem!, i.value.trim()])) as Partial<Record<M.Integrante, string>>;
  const nomeBanda = $<HTMLInputElement>('banda-nome').value.trim();
  gravar<BandaSalva>(JOGO, 'banda', { nomes, nomeBanda });
  comecar(sementePendente, nomes, nomeBanda);
});

function comecar(seed: string, nomes: Partial<Record<M.Integrante, string>>, nomeBanda: string) {
  destravarAudio();
  t = M.novaTurne(seed, nomes, nomeBanda);
  anteriores = {};
  registrar(JOGO, 'turne_inicio', { seed, amigo: seed === seedDaUrl });
  tutorial.iniciar();
  sons.van();
  seguir();
}

$('btn-nova').addEventListener('click', () => { destravarAudio(); telaBanda(M.novaSeed()); });
$('btn-amigo').addEventListener('click', () => { destravarAudio(); if (seedDaUrl) telaBanda(seedDaUrl); });
$('btn-voltar-banda').addEventListener('click', () => telaTitulo());
$('btn-continuar').addEventListener('click', () => {
  destravarAudio();
  t = ler<M.Turne | null>(JOGO, 'turne', null);
  anteriores = {};
  tutorial.iniciar();
  seguir();
});

// ─── HUD ──────────────────────────────────────────────────
const RECURSOS: { r: M.Recurso; icone: string; baixo: (t: M.Turne) => boolean; fmt: (v: number) => string }[] = [
  { r: 'grana', icone: '💸', baixo: (t) => t.grana < 15, fmt: (v) => tr('ef.grana', { v }) },
  { r: 'gasolina', icone: '⛽', baixo: (t) => t.gasolina < M.custoGasolina(t), fmt: (v) => tr('ef.gasolina', { v }) },
  { r: 'clima', icone: '🤝', baixo: (t) => t.clima <= 2, fmt: (v) => `${v}` },
  { r: 'voz', icone: '🎤', baixo: (t) => t.voz <= 1, fmt: (v) => `${v}` },
  { r: 'hype', icone: '🔥', baixo: (t) => t.hype <= 1, fmt: (v) => `${v}` },
];

function renderHud() {
  if (!t) return;
  const box = $('recursos');
  box.replaceChildren();
  for (const def of RECURSOS) {
    const v = t[def.r];
    const el = document.createElement('span');
    el.className = `recurso${def.baixo(t) ? ' recurso--baixo' : ''}`;
    el.title = `${tr(`rec.${def.r}`)} — ${tr('rec.se_zerar')}: ${tr(`rec.zero.${def.r}`)}`;
    el.textContent = `${def.icone} ${def.fmt(v)}`;
    const antes = anteriores[def.r];
    if (antes !== undefined && antes !== v) {
      const d = document.createElement('i');
      d.className = `recurso__delta recurso__delta--${v > antes ? 'mais' : 'menos'}`;
      d.textContent = `${v > antes ? '+' : '−'}${Math.abs(v - antes)}`;
      el.appendChild(d);
    }
    anteriores[def.r] = v;
    box.appendChild(el);
  }
  const banda = $('banda');
  banda.replaceChildren();
  for (const quem of M.ORDEM_BANDA) {
    const el = document.createElement('span');
    const saiu = !t.banda.includes(quem);
    const nome = t.nomes[quem];
    el.className = `membro${saiu ? ' membro--saiu' : ''}`;
    el.title = saiu ? tr('membro.saiu', { nome }) : `${nome}, ${tr(`papel.${quem}`)} — ${tr(`hab.${quem}`)}. ${tr('banda.def')}: ${tr(`def.${quem}`)}.`;
    el.append(retrato(quem), nome);
    banda.appendChild(el);
  }
}

// ─── Mapa: noites ligadas pela estrada ────────────────────
const ICONES: Record<M.TipoNo, string> = { show: '🎸', evento: '🏙️', estrada: '🛣️', descanso: '🛏️' };

export function lugarDe(no: M.No): string {
  return no.final ? tr('lugar.final') : lista(`lugar.${no.tipo}`)[no.local] ?? '';
}

/** Ligações entre a noite n (índice) e a seguinte, na mesma regra do motor. */
function ligacoes(tt: M.Turne, n: number): [number, number][] {
  const de = tt.mapa[n], para = tt.mapa[n + 1];
  if (!para) return [];
  const out: [number, number][] = [];
  de.forEach((_, f) => para.forEach((__, g) => {
    if (de.length === 1 || para.length === 1 || Math.abs(f - g) <= 1) out.push([f, g]);
  }));
  return out;
}

function telaMapa() {
  if (!t) return;
  const tt = t;
  const livres = M.caminhos(tt);
  const listaEl = $('noites');
  listaEl.replaceChildren();
  let atual: HTMLElement | null = null;
  tt.mapa.forEach((linha, idx) => {
    const n = idx + 1;
    const li = document.createElement('li');
    li.className = `noite${n === tt.noite + 1 ? ' noite--atual' : ''}`;
    const rot = document.createElement('span');
    rot.className = 'noite__rotulo';
    rot.textContent = tr('mapa.noite', { n });
    const nos = document.createElement('div');
    nos.className = 'noite__nos';
    linha.forEach((no, f) => {
      const b = document.createElement('button');
      b.dataset.noite = String(idx);
      b.dataset.faixa = String(f);
      const feito = n <= tt.noite && tt.rota[idx] === f;
      const aqui = n === tt.noite && tt.rota[idx] === f;
      const livre = n === tt.noite + 1 && livres.includes(f);
      b.className = `no${feito ? ' no--feito' : ''}${aqui ? ' no--aqui' : ''}${livre ? ' no--livre' : ''}${n <= tt.noite && !feito ? ' no--passou' : ''}${no.final ? ' no--final' : ''}`;
      b.disabled = !livre;
      const icone = document.createElement('span');
      icone.className = 'no__icone';
      icone.textContent = no.final ? '⭐' : ICONES[no.tipo];
      const nome = document.createElement('b');
      nome.textContent = tr(no.final ? 'no.final' : `no.${no.tipo}`);
      const sub = document.createElement('span');
      sub.textContent = no.tipo === 'show' && !no.final ? `${lugarDe(no)}, ${no.cidade}` : no.cidade;
      b.append(icone, nome, sub);
      if (livre) {
        b.addEventListener('click', () => {
          sons.clique();
          vibrar(10);
          M.viajar(tt, f);
          if (tt.fase.tipo === 'evento' && tt.fase.id === 'sem-gasolina') sons.van();
          seguir();
        });
      }
      nos.appendChild(b);
    });
    li.append(rot, nos);
    listaEl.appendChild(li);
    if (n === tt.noite + 1) atual = li;
  });
  const abastecer = $<HTMLButtonElement>('btn-abastecer');
  abastecer.textContent = tr('mapa.abastecer', { l: M.ABASTECER.gasolina, r: M.ABASTECER.grana });
  abastecer.disabled = !M.podeAbastecer(tt);
  $('btn-baralho').textContent = tr('mapa.baralho', { n: tt.baralho.length });
  mostrar('mapa');
  requestAnimationFrame(() => {
    desenharEstradas(tt);
    (atual as HTMLElement | null)?.scrollIntoView({ block: 'center' });
  });
}

/** Estrada em SVG atrás dos nós: asfalto com faixa amarela, o caminho feito aceso. */
function desenharEstradas(tt: M.Turne) {
  const caixa = $('mapa-rolagem');
  const svg = document.getElementById('estradas') as unknown as SVGSVGElement;
  const base = caixa.getBoundingClientRect();
  const centro = (n: number, f: number) => {
    const el = caixa.querySelector<HTMLElement>(`.no[data-noite="${n}"][data-faixa="${f}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left - base.left + r.width / 2, y: r.top - base.top + caixa.scrollTop + r.height / 2 };
  };
  svg.setAttribute('width', String(caixa.clientWidth));
  svg.setAttribute('height', String(caixa.scrollHeight));
  const ns = 'http://www.w3.org/2000/svg';
  svg.replaceChildren();
  const camadas = ['estrada__borda', 'estrada__asfalto', 'estrada__faixa'];
  const caminhos: { d: string; classe: string }[] = [];
  for (let n = 0; n < tt.mapa.length - 1; n++) {
    for (const [f, g] of ligacoes(tt, n)) {
      const a = centro(n, f), b = centro(n + 1, g);
      if (!a || !b) continue;
      const meio = (a.y + b.y) / 2;
      const d = `M ${a.x} ${a.y} C ${a.x} ${meio}, ${b.x} ${meio}, ${b.x} ${b.y}`;
      const feita = tt.rota[n] === f && tt.rota[n + 1] === g && n + 1 < tt.noite;
      const livre = n + 1 === tt.noite && tt.rota[n] === f && M.caminhos(tt).includes(g);
      const inicio = tt.noite === 0 && n === 0;
      caminhos.push({ d, classe: feita ? 'estrada--feita' : livre || inicio ? 'estrada--livre' : n + 1 < tt.noite ? 'estrada--velha' : '' });
    }
  }
  // Primeiro todas as bordas, depois o asfalto, depois as faixas: cruzamentos limpos.
  for (const camada of camadas) {
    for (const c of caminhos) {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', c.d);
      p.setAttribute('class', `${camada} ${c.classe}`);
      svg.appendChild(p);
    }
  }
}
window.addEventListener('resize', () => { if (t && !$('mapa').hidden) desenharEstradas(t); });

$('btn-abastecer').addEventListener('click', () => {
  if (!t) return;
  M.abastecer(t);
  arpejo([262, 330, 392], 0.05, 'square', 0.04);
  salvar();
  renderHud();
  telaMapa();
});
$('btn-baralho').addEventListener('click', () => t && abrirBaralho(tr('baralho.titulo'), null));
$('btn-som').addEventListener('click', () => {
  setMudo(!estaMudo());
  gravar(JOGO, 'mudo', estaMudo());
  $('btn-som').textContent = estaMudo() ? '🔇' : '🔊';
});
$('btn-sair').addEventListener('click', () => { salvar(); t = null; trilha.parar(); telaTitulo(); });

// ─── Cartas (DOM) ─────────────────────────────────────────
function elementoCarta(id: string, tag: 'button' | 'div' = 'button', extra?: { temp?: boolean; custo?: number }): HTMLElement {
  const c = M.carta(id);
  const tc = M.textoDaCarta(c);
  const el = document.createElement(tag);
  el.className = `carta carta--${c.tipo}${c.raridade === 'rara' ? ' carta--rara' : ''}${extra?.temp ? ' carta--temp' : ''}`;
  if (extra?.temp) el.dataset.gratis = tr('carta.gratis');
  const custo = extra?.custo ?? c.folego;
  if (custo !== null) {
    const k = document.createElement('span');
    k.className = `carta__custo${extra?.custo !== undefined && extra.custo < (c.folego ?? 0) ? ' carta__custo--barato' : ''}`;
    k.textContent = String(custo);
    el.appendChild(k);
  }
  const nome = document.createElement('span');
  nome.className = 'carta__nome';
  nome.textContent = tc.nome;
  const tipo = document.createElement('span');
  tipo.className = 'carta__tipo';
  tipo.textContent = tr(`tipo.${c.tipo}`) + (c.raridade === 'rara' ? ` · ${tr('carta.rara')}` : '');
  const efeito = document.createElement('span');
  efeito.className = 'carta__efeito';
  efeito.textContent = tc.efeito;
  const texto = document.createElement('span');
  texto.className = 'carta__texto';
  texto.textContent = `“${tc.texto}”`;
  el.append(nome, tipo, efeito, texto);
  el.title = `${tc.nome} — ${tc.efeito}. “${tc.texto}”`;
  return el;
}

/** Modal do baralho; com `aoEscolher`, vira seletor de carta para tirar. */
function abrirBaralho(titulo: string, aoEscolher: ((indice: number) => void) | null) {
  if (!t) return;
  $('baralho-titulo').textContent = titulo;
  const l = $('baralho-lista');
  l.replaceChildren();
  const ordem = t.baralho.map((id, i) => ({ id, i })).sort((a, b) => M.carta(a.id).tipo.localeCompare(M.carta(b.id).tipo) || a.id.localeCompare(b.id));
  for (const { id, i } of ordem) {
    const el = elementoCarta(id, aoEscolher ? 'button' : 'div');
    if (aoEscolher) el.addEventListener('click', () => { fecharBaralho(); aoEscolher(i); });
    l.appendChild(el);
  }
  $('modal-baralho').hidden = false;
}
function fecharBaralho() { $('modal-baralho').hidden = true; }
$('btn-fechar-baralho').addEventListener('click', fecharBaralho);

// ─── Folha: evento, pousada, nó perdido ───────────────────
function folha(onde: string, titulo: string, texto: string, parada: Parada | null) {
  $('folha-onde').textContent = onde;
  $('folha-titulo').textContent = titulo;
  $('folha-texto').textContent = texto;
  $('folha-escolhas').replaceChildren();
  $('folha-escolhas').hidden = false;
  $('folha-desfecho').hidden = true;
  const quadro = $<HTMLCanvasElement>('paisagem');
  quadro.hidden = !parada || !t;
  if (parada && t) {
    const no = t.noite ? M.noAtual(t) : null;
    let h = 0;
    for (const ch of t.seed + t.noite) h = (h * 31 + ch.charCodeAt(0)) % 997;
    desenharParada(quadro, parada, {
      cidade: no?.cidade ?? '', nomeBanda: t.nomeBanda, banda: t.banda,
      letreiro: tr('no.descanso'), rumo: tr('placa.km', { n: 3 + (h % 40) }),
    });
  }
  const papel = $('papel');
  papel.style.animation = 'none';
  void papel.offsetWidth;
  papel.style.animation = '';
  mostrar('folha');
  $('folha').scrollTop = 0;
}

function botaoEscolha(texto: string, detalhe: string, motivo: string | null, acao: () => void) {
  const b = document.createElement('button');
  b.className = 'escolha';
  b.disabled = motivo !== null;
  const forte = document.createElement('span');
  forte.textContent = texto;
  const small = document.createElement('small');
  small.textContent = motivo ?? detalhe;
  b.append(forte, small);
  b.addEventListener('click', acao);
  $('folha-escolhas').appendChild(b);
}

function desfecho(texto: string, efeitos: string, l: string[]) {
  $('folha-escolhas').hidden = true;
  $('desfecho-texto').textContent = texto;
  $('desfecho-efeitos').textContent = efeitos;
  $('btn-seguir').textContent = tr('folha.seguir');
  $('folha-desfecho').hidden = false;
  renderHud();
  void avisos(l);
}
$('btn-seguir').addEventListener('click', () => { sons.clique(); seguir(); });

function onde(): string {
  if (!t || !t.noite) return '';
  const no = M.noAtual(t);
  const lugar = no.tipo === 'estrada' ? tr('onde.rumo', { via: lugarDe(no), cidade: no.cidade }) : no.cidade;
  return tr('onde.noite', { n: t.noite, lugar });
}

function telaEvento() {
  if (!t || t.fase.tipo !== 'evento') return;
  const tt = t;
  const fase = t.fase;
  const ev = M.evento(fase.id);
  const tx = M.textoDoEvento(ev);
  const no = M.noAtual(tt);
  const parada: Parada = ev.id === 'sem-gasolina' || ev.onde === 'estrada' || no.tipo === 'estrada' ? 'estrada' : 'cidade';
  folha(onde(), tx.titulo, tx.texto, parada);
  tutorial.dica({ id: 'evento', texto: () => tr('tut.evento'), gesto: 'nenhum', alvo: () => document.querySelector('.escolha'), segundos: 6 });
  if (ev.momento === 'van') sons.van();
  ev.escolhas.forEach((e, i) => {
    const partes = [M.descreverEfeitos(e.efeitos)];
    if (e.carta) partes.push(tr('escolha.carta', { nome: M.textoDaCarta(M.carta(e.carta)).nome }));
    if (e.remover) partes.push(tr('escolha.remover', { nome: M.textoDaCarta(M.carta(e.remover)).nome }));
    if (e.requer === 'conserto') partes.push(tr('escolha.conserto'));
    if (e.sorte) partes.push(tr('escolha.risco'));
    botaoEscolha(tx.escolhas[i].texto, partes.filter(Boolean).join(' · '), M.escolhaDisponivel(tt, ev, i, fase.bloqueada), () => {
      sons.clique();
      vibrar(10);
      const d = M.escolherNoEvento(tt, i);
      if (!d) return;
      salvar();
      desfecho(d.texto, M.descreverEfeitos(d.efeitos), d.avisos);
    });
  });
}

function telaDescanso() {
  if (!t) return;
  const tt = t;
  const no = M.noAtual(tt);
  folha(onde(), tr('pousada.titulo'), tr('pousada.texto', { lugar: lugarDe(no) }), 'pousada');
  (Object.keys(M.DESCANSOS) as M.Descanso[]).forEach((tipo) => {
    const d = M.DESCANSOS[tipo];
    const motivo = M.descansoDisponivel(tt, tipo) ? null : tr(tipo === 'dormir' ? 'desc.sem_grana' : 'desc.enxuto');
    botaoEscolha(tr(`desc.${tipo}.titulo`), `${tr(`desc.${tipo}.texto`)} ${M.descreverEfeitos(d.efeitos)}`, motivo, () => {
      sons.clique();
      if (tipo === 'ensaiar') {
        abrirBaralho(tr('desc.tirar'), (i) => {
          const nome = M.textoDaCarta(M.carta(tt.baralho[i])).nome;
          const av = M.descansar(tt, 'ensaiar', i);
          if (!av) return;
          salvar();
          desfecho(tr('desc.tirou', { nome }), M.descreverEfeitos(d.efeitos), av);
        });
        return;
      }
      const av = M.descansar(tt, tipo);
      if (!av) return;
      salvar();
      desfecho(tr(`desc.${tipo}.texto`), M.descreverEfeitos(d.efeitos), av);
    });
  });
}

function telaPerdida() {
  if (!t || t.fase.tipo !== 'perdida') return;
  const grana = t.fase.motivo === 'grana';
  folha(onde(), tr('perdida.titulo'), tr(grana ? 'perdida.grana' : 'perdida.machucado'), 'cidade');
  M.seguirDepoisDePerdida(t);
  salvar();
  desfecho(tr(grana ? 'perdida.grana.fim' : 'perdida.machucado.fim'), grana ? M.descreverEfeitos({ clima: -1 }) : M.descreverEfeitos({ grana: -10 }), []);
}

// ─── Show ─────────────────────────────────────────────────
function comecarShow() {
  if (!t) return;
  const tt = t;
  const { show: s, avisos: av } = M.iniciarShow(tt);
  show = s;
  const no = M.noAtual(tt);
  $('show-lugar').textContent = no.final ? tr('show.festival', { cidade: no.cidade }) : `${lugarDe(no)} · ${no.cidade}`;
  cena.banda = [...tt.banda];
  cena.mascote = !!tt.flags.mascote;
  cena.nomeBanda = tt.nomeBanda;
  cena.preparar(8 + tt.hype * 3, tt.noite * 7919 + tt.seed.charCodeAt(0));
  mostrar('show');
  trilha.intensidade(0);
  cena.iniciar();
  $('vu').classList.add('vu--chama');
  setTimeout(() => $('vu').classList.remove('vu--chama'), 2600);
  renderShow();
  if (tt.fim) { finalizarShow(); return; }
  void avisos(av);
}

function renderShow() {
  if (!t || !show) return;
  const s = show;
  const tt = t;
  $('show-bloco').textContent = tr('show.musica', { n: Math.min(s.bloco, M.BLOCOS), t: M.BLOCOS });
  $('show-voz').textContent = `🎤 ${tt.voz}${s.cantaJunto ? tr('show.canta') : ''}`;
  // VU: o alvo fica no meio; acima do dobro, o palco desaba.
  const segs = $('vu-segs');
  if (!segs.children.length) for (let i = 0; i < 24; i++) segs.appendChild(document.createElement('i'));
  const cheios = Math.min(24, Math.round((s.energia / (s.alvo * 2)) * 24));
  [...segs.children].forEach((el, i) => {
    el.className = i < cheios ? `on${i >= 12 ? ' quente' : ''}${i >= 20 ? ' pico' : ''}` : '';
  });
  $('vu').classList.toggle('vu--batido', s.energia >= s.alvo);
  $('vu-num').textContent = `${s.energia}/${s.alvo}`;
  $('vu-alvo').dataset.rotulo = tr('vu.alvo');
  cena.razao = s.energia / s.alvo;
  trilha.intensidade(cena.razao);

  const folego = $('folego');
  folego.replaceChildren();
  for (let i = 0; i < Math.max(M.FOLEGO, s.folego); i++) {
    const p = document.createElement('i');
    if (i < s.folego) p.className = 'cheio';
    folego.appendChild(p);
  }
  const prox = M.espiar(tt, s);
  $('espiar').textContent = prox ? tr('show.espia', { nome: tt.nomes.guitarra, carta: M.textoDaCarta(M.carta(prox)).nome }) : '';

  const mao = $('mao');
  mao.replaceChildren();
  s.mao.forEach((m, i) => {
    const c = M.carta(m.id);
    const el = elementoCarta(m.id, 'button', { temp: m.temp, custo: c.folego === null ? undefined : M.custoDe(s, c) });
    el.style.setProperty('--i', String(i));
    if (M.podeJogar(tt, s, i) !== null) el.dataset.off = '';
    el.addEventListener('click', () => tocarCarta(i, el));
    mao.appendChild(el);
  });
  const algumaJogavel = s.mao.some((_, i) => M.podeJogar(tt, s, i) === null);
  $('btn-bloco').classList.toggle('chamando', !algumaJogavel);
  $('btn-bloco').textContent = tr(s.bloco >= M.BLOCOS ? 'show.encerrar' : 'show.proxima');
}

// ─── Tutorial jogado (primeira noite) ─────────────────────
const visivel = (id: string) => !$(id).hidden;
/** A carta jogável que mais levanta o público (ou null). */
function melhorCarta(): HTMLElement | null {
  if (!t || !show) return null;
  const cartas = [...$('mao').children] as HTMLElement[];
  const melhor = show.mao
    .map((m, i) => ({ i, e: M.carta(m.id).energia }))
    .filter(({ i, e }) => e > 0 && !('off' in (cartas[i]?.dataset ?? {})))
    .sort((a, b) => b.e - a.e)[0];
  return melhor ? cartas[melhor.i] : null;
}
const tutorial = new Tutorial(JOGO, [
  { id: 'mapa', texto: () => tr('tut.mapa'), quando: () => visivel('mapa'),
    alvo: () => document.querySelector('.no--livre'), ok: () => !!t && t.noite >= 1 },
  { id: 'carta', texto: () => tr('tut.carta'), lugar: 'topo', quando: () => visivel('show') && !!melhorCarta(),
    alvo: melhorCarta, ok: () => !!show && show.energia > 0 },
  { id: 'vu', texto: () => tr('tut.vu'), lugar: 'topo', gesto: 'nenhum', luz: true, quando: () => visivel('show'),
    alvo: () => $('vu'), segundos: 4 },
  { id: 'combo', texto: () => tr('tut.combo'), lugar: 'topo', gesto: 'nenhum', quando: () => visivel('show'),
    alvo: () => $('mao'), segundos: 5 },
  { id: 'bloco', texto: () => tr('tut.bloco'), lugar: 'topo', quando: () => visivel('show') && !melhorCarta(),
    alvo: () => $('btn-bloco'), ok: () => !show || show.bloco >= 2 },
  { id: 'recompensa', texto: () => tr('tut.recompensa'), quando: () => visivel('resultado'),
    alvo: () => document.querySelector('#recompensas .carta') ?? $('btn-pular'), ok: () => !visivel('resultado') },
  { id: 'recursos', texto: () => tr('tut.recursos'), gesto: 'nenhum', luz: true,
    quando: () => visivel('mapa') && !$('hud').hidden, alvo: () => $('recursos'), segundos: 6 },
  { id: 'caminho', texto: () => tr('tut.caminho'), quando: () => visivel('mapa'),
    alvo: () => document.querySelector('.no--livre'), ok: () => !!t && t.noite >= 2 },
], undefined, () => ({ pular: tr('tut.pular'), entendi: tr('tut.entendi'), de: tr('tut.de') }));

function pop(texto: string, classe = '') {
  const el = document.createElement('span');
  el.className = `pop ${classe}`;
  el.textContent = texto;
  el.style.left = `${58 + Math.random() * 22}%`;
  el.style.top = `${25 + Math.random() * 30}%`;
  $('pops').appendChild(el);
  setTimeout(() => el.remove(), 950);
}

let ocupado = false;
function tocarCarta(i: number, el: HTMLElement) {
  if (!t || !show || ocupado) return;
  const tt = t;
  const s = show;
  const motivo = M.podeJogar(tt, s, i);
  if (motivo) {
    el.classList.remove('carta--nega');
    void el.offsetWidth;
    el.classList.add('carta--nega');
    sons.microfonia();
    cena.momento('erro');
    aviso(tr(`motivo.${motivo}`), 1200);
    return;
  }
  const c = M.carta(s.mao[i].id);
  const j = M.jogar(tt, s, i);
  if (!j) return;
  // Retorno imediato: som, VU e cena no mesmo quadro do toque.
  el.classList.add('carta--batendo');
  vibrar(c.tipo === 'musica' ? 18 : 10);
  if (c.especial?.dobra || c.especial?.choque) trilha.breakdown();
  if (j.momento === 'mosh') sons.mosh();
  else if (j.momento === 'desabou') sons.desabou();
  else if (c.tipo === 'musica') sons.musica(j.energia);
  else if (c.tipo === 'fala') sons.fala();
  else if (c.tipo === 'problema') sons.virada();
  else sons.acao();
  if (j.microfonias) setTimeout(sons.microfonia, 120);
  cena.momento(j.momento ?? 'carta');
  cena.razao = s.energia / s.alvo;
  trilha.intensidade(cena.razao);
  if (j.energia > 0) pop(`+${j.energia}`, j.energia >= 10 ? 'pop--grande' : '');
  else if (j.energia < 0) pop(`${j.energia}`, 'pop--menos');
  if (j.momento === 'mosh') { pop('MOSH!', 'pop--grande'); aviso(tr('show.mosh')); }
  if (j.momento === 'desabou') { pop(tr('pop.desabou'), 'pop--grande'); aviso(tr('show.desabou'), 3000); }
  if (j.momento === 'pit') pop(tr('pop.roda'), 'pop--grande');
  if (j.momento === 'parede') pop(tr('pop.parede'), 'pop--grande');
  j.textos.forEach((tx, k) => setTimeout(() => pop(tx, 'pop--texto'), 200 + k * 350));
  void avisos(j.avisos);
  ocupado = true;
  setTimeout(() => {
    ocupado = false;
    renderShow();
    if (s.encerrado) setTimeout(finalizarShow, 700);
  }, 230);
}

$('btn-bloco').addEventListener('click', () => {
  if (!t || !show || ocupado) return;
  const s = show;
  sons.virada();
  const j = M.proximoBloco(t, s);
  if (s.encerrado) { finalizarShow(); return; }
  if (j.microfonias) { setTimeout(sons.microfonia, 150); pop(`${j.energia}`, 'pop--menos'); j.textos.forEach((tx) => pop(tx, 'pop--texto')); }
  aviso(tr('show.musica_n', { n: s.bloco }), 900);
  renderShow();
});

window.addEventListener('keydown', (e) => {
  if ($('show').hidden || !show) return;
  const n = Number(e.key);
  if (n >= 1 && n <= show.mao.length) {
    const el = $('mao').children[n - 1] as HTMLElement;
    tocarCarta(n - 1, el);
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    $('btn-bloco').click();
  }
});

function finalizarShow() {
  if (!t || !show) return;
  const s = show;
  show = null;
  const r = M.encerrarShow(t, s);
  registrar(JOGO, 'show_fim', { noite: t.noite, sucesso: r.sucesso, energia: r.energia, alvo: r.alvo });
  if (r.sucesso) sons.acertou(); else sons.microfonia();
  cena.razao = r.sucesso ? 1.4 : 0.1;
  setTimeout(() => {
    cena.parar();
    seguir();
    void avisos(r.avisos);
  }, r.sucesso ? 900 : 600);
}

// ─── Resultado do show ────────────────────────────────────
function telaResultado() {
  if (!t || t.fase.tipo !== 'recompensa') return;
  const tt = t;
  const { opcoes, resumo: r } = t.fase;
  const chave = r.desabou ? 'desabou' : !r.sucesso ? 'morno' : r.energia >= r.alvo * 1.5 ? 'abaixo' : 'bom';
  $('res-titulo').textContent = tr(`res.${chave}`);
  $('res-texto').textContent = tr(r.desabou ? 'res.desabou.texto' : r.sucesso ? 'res.bom.texto' : 'res.morno.texto');
  const numeros = [
    `⚡ ${r.energia}/${r.alvo}`,
    tr('res.cache', { v: r.cache }),
    ...(r.merch ? [tr('res.merch', { v: r.merch })] : []),
    ...(r.extra ? [tr('res.extra', { v: r.extra })] : []),
    tr('res.publico', { v: r.publico }),
  ];
  const ul = $('res-numeros');
  ul.replaceChildren(...numeros.map((n) => Object.assign(document.createElement('li'), { textContent: n })));
  $('res-escolha').textContent = opcoes.length ? tr('res.escolha') : '';
  const box = $('recompensas');
  box.replaceChildren();
  for (const id of opcoes) {
    const el = elementoCarta(id);
    el.addEventListener('click', () => {
      M.escolherRecompensa(tt, id);
      arpejo([392, 494, 587, 784], 0.05, 'square', 0.04);
      aviso(tr('res.entrou', { nome: M.textoDaCarta(M.carta(id)).nome }), 1400);
      seguir();
    });
    box.appendChild(el);
  }
  $('btn-pular').textContent = tr(opcoes.length ? 'res.pular' : 'folha.seguir');
  mostrar('resultado');
}
$('btn-pular').addEventListener('click', () => {
  if (!t) return;
  M.escolherRecompensa(t, null);
  sons.clique();
  seguir();
});

// ─── Fim ──────────────────────────────────────────────────
function telaFim() {
  if (!t) return;
  const tt = t;
  mostrar('fim');
  aplicarIdioma();
  $('fim-retorno').textContent = '';
  void desenharZine($<HTMLCanvasElement>('zine'), tt);
  if (tt.fim === 'completa') setTimeout(sons.acertou, 200);
}

$('btn-zine').addEventListener('click', async () => {
  if (!t) return;
  const r = await exportarZine($<HTMLCanvasElement>('zine'), t);
  registrar(JOGO, 'compartilhar', { tipo: 'zine' });
  $('fim-retorno').textContent = r === 'baixado' ? tr('fim.salvo') : r === 'falhou' ? tr('fim.falhou') : '';
});

$('btn-desafio').addEventListener('click', async () => {
  if (!t) return;
  const resultado = t.fim === 'completa' ? (t.banda.length === 4 ? tr('fim.inteira') : tr('fim.parcial', { n: t.banda.length })) : tr('fim.acabou', { n: t.noite });
  const r = await compartilhar(tr('fim.texto', { seed: t.seed, resultado }), `${urlDoJogo()}?seed=${t.seed}`);
  registrar(JOGO, 'compartilhar', { tipo: 'seed' });
  $('fim-retorno').textContent = r === 'copiado' ? tr('fim.copiado') : r === 'falhou' ? tr('fim.nao_compartilhou') : '';
});

$('btn-denovo').addEventListener('click', () => { t = null; telaTitulo(); });

// ─── Início ───────────────────────────────────────────────
$('btn-som').textContent = estaMudo() ? '🔇' : '🔊';
telaTitulo();
