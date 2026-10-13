import '../compartilhado/base.css';
import './estilo.css';
import * as M from './motor';
import { Cena, desenharBanda, desenharIntegrante } from './cena';
import { desenharZine, exportarZine } from './zine';
import { ler, gravar } from '../compartilhado/salvar';
import { compartilhar, urlDoJogo } from '../compartilhado/compartilhar';
import { evento as registrar } from '../compartilhado/eventos';
import { nota, acorde, arpejo, ruido, vibrar, destravarAudio, setMudo, estaMudo, PENTATONICA } from '../compartilhado/som';

const JOGO = 'faca';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

interface Registro { seed: string; fim: string; noite: number; shows: number; data: string }

let t: M.Turne | null = null;
let show: M.Show | null = null;
let anteriores: Partial<Record<M.Recurso, number>> = {};
let tutorial = ler<Registro[]>(JOGO, 'caderno', []).length === 0;
const cena = new Cena($<HTMLCanvasElement>('cena'));
setMudo(ler(JOGO, 'mudo', false));

// ─── Som ──────────────────────────────────────────────────
const sons = {
  musica(energia: number) {
    const k = 1 + Math.min(1, energia / 20);
    acorde([110 * k, 165 * k, 220 * k], 0.22, 'sawtooth', 0.035);
    ruido(0.06, 0.1, 900);
  },
  fala() { arpejo([523, 659, 784], 0.05, 'square', 0.04); },
  acao() { ruido(0.18, 0.06, 3000); nota(330, 0.1, 'square', 0.04); },
  microfonia() { nota(2093, 0.35, 'sine', 0.05); nota(2217, 0.3, 'sine', 0.035, 0.05); },
  mosh() { ruido(0.6, 0.12, 900); arpejo(PENTATONICA.slice(3, 10), 0.04, 'square', 0.05); },
  desabou() { ruido(1.1, 0.16, 380); nota(55, 0.8, 'sawtooth', 0.06); },
  acertou() { acorde([196, 247, 294, 392, 494], 1.2, 'triangle', 0.06); },
  clique() { nota(440, 0.05, 'square', 0.035); },
  virada() { [0, 0.07, 0.14, 0.21].forEach((a, i) => nota(180 - i * 25, 0.06, 'triangle', 0.06, a)); ruido(0.1, 0.08, 1400); },
  van() { ruido(0.4, 0.07, 500); nota(90, 0.3, 'sawtooth', 0.04); },
};

// ─── Telas ────────────────────────────────────────────────
const TELAS = ['titulo', 'mapa', 'folha', 'show', 'resultado', 'fim'] as const;
type Tela = (typeof TELAS)[number];

function mostrar(tela: Tela) {
  for (const id of TELAS) $(id).hidden = id !== tela;
  const comHud = tela === 'mapa' || tela === 'folha';
  $('hud').hidden = !comHud;
  if (tela !== 'show') { cena.parar(); $('dica').hidden = true; }
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

async function avisos(lista: string[]) {
  for (const a of lista) {
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
  if (!t) return mostrar('titulo');
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

// ─── Título ───────────────────────────────────────────────
let tituloTimer = 0;
function animarTitulo() {
  const c = $<HTMLCanvasElement>('titulo-banda');
  const ctx = c.getContext('2d')!;
  const desenhar = () => {
    ctx.clearRect(0, 0, c.width, c.height);
    desenharBanda(ctx, 2, 4, M.ORDEM_BANDA, true, performance.now() / 1000);
  };
  desenhar();
  clearInterval(tituloTimer);
  tituloTimer = window.setInterval(desenhar, 140);
}
function pararTitulo() { clearInterval(tituloTimer); }

const seedDaUrl = M.normalizarSeed(new URLSearchParams(location.search).get('seed') ?? '');

function telaTitulo() {
  const salvo = ler<M.Turne | null>(JOGO, 'turne', null);
  const continuar = $<HTMLButtonElement>('btn-continuar');
  continuar.hidden = !salvo || salvo.versao !== 1;
  if (salvo) continuar.textContent = `Continuar turnê (noite ${Math.max(1, salvo.noite)})`;
  const amigo = $<HTMLButtonElement>('btn-amigo');
  amigo.hidden = !seedDaUrl;
  if (seedDaUrl) amigo.textContent = `Topar a turnê ${seedDaUrl}`;
  const caderno = ler<Registro[]>(JOGO, 'caderno', []);
  const completas = caderno.filter((r) => r.fim === 'completa').length;
  $('caderno').textContent = caderno.length
    ? `Caderno de turnê: ${caderno.length} turnê${caderno.length > 1 ? 's' : ''}, ${completas} completa${completas === 1 ? '' : 's'}`
    : 'Dez noites. Volte com a banda inteira.';
  mostrar('titulo');
}

function comecar(seed: string) {
  destravarAudio();
  t = M.novaTurne(seed);
  anteriores = {};
  registrar(JOGO, 'turne_inicio', { seed, amigo: seed === seedDaUrl });
  sons.van();
  seguir();
}

$('btn-nova').addEventListener('click', () => comecar(M.novaSeed()));
$('btn-amigo').addEventListener('click', () => seedDaUrl && comecar(seedDaUrl));
$('btn-continuar').addEventListener('click', () => {
  destravarAudio();
  t = ler<M.Turne | null>(JOGO, 'turne', null);
  anteriores = {};
  seguir();
});

// ─── HUD ──────────────────────────────────────────────────
const RECURSOS: { r: M.Recurso; icone: string; nome: string; zero: string; baixo: (t: M.Turne) => boolean; fmt: (v: number) => string }[] = [
  { r: 'grana', icone: '💸', nome: 'Grana', zero: 'sem grana a van não abastece e a próxima noite é perdida', baixo: (t) => t.grana < 15, fmt: (v) => `R$ ${v}` },
  { r: 'gasolina', icone: '⛽', nome: 'Gasolina', zero: 'a van para na estrada e o resgate custa caro', baixo: (t) => t.gasolina < M.custoGasolina(t), fmt: (v) => `${v} L` },
  { r: 'clima', icone: '🤝', nome: 'Clima da banda', zero: 'alguém sai da banda; duas saídas e acabou', baixo: (t) => t.clima <= 2, fmt: (v) => `${v}` },
  { r: 'voz', icone: '🎤', nome: 'Voz', zero: 'cartas do vocal ficam bloqueadas no próximo show', baixo: (t) => t.voz <= 1, fmt: (v) => `${v}` },
  { r: 'hype', icone: '🔥', nome: 'Hype', zero: 'menos público e cachê menor', baixo: (t) => t.hype <= 1, fmt: (v) => `${v}` },
];

function renderHud() {
  if (!t) return;
  const box = $('recursos');
  box.replaceChildren();
  for (const def of RECURSOS) {
    const v = t[def.r];
    const el = document.createElement('span');
    el.className = `recurso${def.baixo(t) ? ' recurso--baixo' : ''}`;
    el.title = `${def.nome} — se zerar: ${def.zero}`;
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
    const m = M.BANDA[quem];
    const el = document.createElement('span');
    const saiu = !t.banda.includes(quem);
    el.className = `membro${saiu ? ' membro--saiu' : ''}`;
    el.title = saiu ? `${m.nome} saiu da banda` : `${m.nome}, ${m.papel.toLowerCase()} — ${m.habilidade}. Defeito: ${m.defeito.toLowerCase()}.`;
    const c = document.createElement('canvas');
    c.width = 12;
    c.height = 14;
    c.className = 'pixel';
    desenharIntegrante(c.getContext('2d')!, quem, 0, 0);
    el.append(c, m.nome);
    banda.appendChild(el);
  }
}

// ─── Mapa ─────────────────────────────────────────────────
const ICONES: Record<M.TipoNo, string> = { show: '🎸', evento: '📣', estrada: '🛣️', descanso: '🛏️' };
const NOMES_NO: Record<M.TipoNo, string> = { show: 'Show', evento: 'Cidade', estrada: 'Estrada', descanso: 'Descanso' };

function telaMapa() {
  if (!t) return;
  const tt = t;
  const livres = M.caminhos(tt);
  const lista = $('noites');
  lista.replaceChildren();
  let atual: HTMLElement | null = null;
  tt.mapa.forEach((linha, idx) => {
    const n = idx + 1;
    const li = document.createElement('li');
    li.className = `noite${n === tt.noite + 1 ? ' noite--atual' : ''}`;
    const rot = document.createElement('span');
    rot.className = 'noite__rotulo';
    rot.textContent = `NOITE ${n}`;
    const nos = document.createElement('div');
    nos.className = 'noite__nos';
    linha.forEach((no, f) => {
      const b = document.createElement('button');
      const [lugar, cidade] = no.lugar.split(' · ');
      const feito = n <= tt.noite && tt.rota[idx] === f;
      const livre = n === tt.noite + 1 && livres.includes(f);
      b.className = `no${feito ? ' no--feito' : ''}${livre ? ' no--livre' : ''}${n <= tt.noite && !feito ? ' no--passou' : ''}${no.final ? ' no--final' : ''}`;
      b.disabled = !livre;
      const icone = document.createElement('span');
      icone.className = 'no__icone';
      icone.textContent = no.final ? '⭐' : ICONES[no.tipo];
      const nome = document.createElement('b');
      nome.textContent = no.final ? 'Festival' : NOMES_NO[no.tipo];
      const sub = document.createElement('span');
      sub.textContent = no.tipo === 'show' ? `${lugar}, ${cidade}` : cidade;
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
    lista.appendChild(li);
    if (n === tt.noite + 1) atual = li;
  });
  const abastecer = $<HTMLButtonElement>('btn-abastecer');
  abastecer.textContent = `⛽ +${M.ABASTECER.gasolina} L por R$ ${M.ABASTECER.grana}`;
  abastecer.disabled = !M.podeAbastecer(tt);
  $('btn-baralho').textContent = `🃏 Baralho (${tt.baralho.length})`;
  mostrar('mapa');
  requestAnimationFrame(() => (atual as HTMLElement | null)?.scrollIntoView({ block: 'center' }));
}

$('btn-abastecer').addEventListener('click', () => {
  if (!t) return;
  M.abastecer(t);
  arpejo([262, 330, 392], 0.05, 'square', 0.04);
  salvar();
  renderHud();
  telaMapa();
});
$('btn-baralho').addEventListener('click', () => t && abrirBaralho('Baralho', null));
$('btn-som').addEventListener('click', () => {
  setMudo(!estaMudo());
  gravar(JOGO, 'mudo', estaMudo());
  $('btn-som').textContent = estaMudo() ? '🔇' : '🔊';
});
$('btn-sair').addEventListener('click', () => { salvar(); t = null; telaTitulo(); });

// ─── Cartas (DOM) ─────────────────────────────────────────
const TIPOS: Record<M.TipoCarta, string> = { abertura: 'abertura', musica: 'música', fala: 'fala', acao: 'ação', problema: 'problema' };

function elementoCarta(id: string, tag: 'button' | 'div' = 'button', extra?: { temp?: boolean; custo?: number }): HTMLElement {
  const c = M.carta(id);
  const el = document.createElement(tag);
  el.className = `carta carta--${c.tipo}${c.raridade === 'rara' ? ' carta--rara' : ''}${extra?.temp ? ' carta--temp' : ''}`;
  const custo = extra?.custo ?? c.folego;
  if (custo !== null) {
    const k = document.createElement('span');
    k.className = `carta__custo${extra?.custo !== undefined && extra.custo < (c.folego ?? 0) ? ' carta__custo--barato' : ''}`;
    k.textContent = String(custo);
    el.appendChild(k);
  }
  const nome = document.createElement('span');
  nome.className = 'carta__nome';
  nome.textContent = c.nome;
  const tipo = document.createElement('span');
  tipo.className = 'carta__tipo';
  tipo.textContent = TIPOS[c.tipo] + (c.raridade === 'rara' ? ' · rara' : '');
  const efeito = document.createElement('span');
  efeito.className = 'carta__efeito';
  efeito.textContent = c.efeito;
  const texto = document.createElement('span');
  texto.className = 'carta__texto';
  texto.textContent = `“${c.texto}”`;
  el.append(nome, tipo, efeito, texto);
  el.title = `${c.nome} — ${c.efeito}. “${c.texto}”`;
  return el;
}

/** Modal do baralho; com `aoEscolher`, vira seletor de carta para tirar. */
function abrirBaralho(titulo: string, aoEscolher: ((indice: number) => void) | null) {
  if (!t) return;
  $('baralho-titulo').textContent = titulo;
  const lista = $('baralho-lista');
  lista.replaceChildren();
  const ordem = t.baralho.map((id, i) => ({ id, i })).sort((a, b) => M.carta(a.id).tipo.localeCompare(M.carta(b.id).tipo) || a.id.localeCompare(b.id));
  for (const { id, i } of ordem) {
    const el = elementoCarta(id, aoEscolher ? 'button' : 'div');
    if (aoEscolher) el.addEventListener('click', () => { fecharBaralho(); aoEscolher(i); });
    lista.appendChild(el);
  }
  $('modal-baralho').hidden = false;
}
function fecharBaralho() { $('modal-baralho').hidden = true; }
$('btn-fechar-baralho').addEventListener('click', fecharBaralho);

// ─── Folha: evento, descanso, nó perdido ──────────────────
function folha(onde: string, titulo: string, texto: string) {
  $('folha-onde').textContent = onde;
  $('folha-titulo').textContent = titulo;
  $('folha-texto').textContent = texto;
  $('folha-escolhas').replaceChildren();
  $('folha-escolhas').hidden = false;
  $('folha-desfecho').hidden = true;
  const papel = $('papel');
  papel.style.animation = 'none';
  void papel.offsetWidth;
  papel.style.animation = '';
  mostrar('folha');
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

function desfecho(texto: string, efeitos: string, lista: string[], botao = 'Seguir viagem') {
  $('folha-escolhas').hidden = true;
  $('desfecho-texto').textContent = texto;
  $('desfecho-efeitos').textContent = efeitos;
  $('btn-seguir').textContent = botao;
  $('folha-desfecho').hidden = false;
  renderHud();
  void avisos(lista);
}
$('btn-seguir').addEventListener('click', () => { sons.clique(); seguir(); });

function onde(): string {
  if (!t || !t.noite) return '';
  const no = M.noAtual(t);
  const [lugar, cidade] = no.lugar.split(' · ');
  return `Noite ${t.noite} · ${no.tipo === 'estrada' ? `${lugar} rumo a ${cidade}` : cidade}`;
}

function telaEvento() {
  if (!t || t.fase.tipo !== 'evento') return;
  const tt = t;
  const fase = t.fase;
  const ev = M.evento(fase.id);
  folha(onde(), ev.titulo, ev.texto);
  if (ev.momento === 'van') sons.van();
  ev.escolhas.forEach((e, i) => {
    const partes = [M.descreverEfeitos(e.efeitos)];
    if (e.carta) partes.push(`ganha a carta ${M.carta(e.carta).nome}`);
    if (e.remover) partes.push(`tira ${M.carta(e.remover).nome} do baralho`);
    if (e.requer === 'conserto') partes.push('usa o conserto da turnê');
    if (e.sorte) partes.push('arriscado');
    botaoEscolha(e.texto, partes.filter(Boolean).join(' · '), M.escolhaDisponivel(tt, ev, i, fase.bloqueada), () => {
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
  folha(onde(), 'Noite de folga', 'Sem show hoje. O que a banda faz com a noite?');
  (Object.keys(M.DESCANSOS) as M.Descanso[]).forEach((tipo) => {
    const d = M.DESCANSOS[tipo];
    const motivo = M.descansoDisponivel(tt, tipo) ? null : tipo === 'dormir' ? 'Sem grana pra pousada' : 'Baralho já está enxuto';
    botaoEscolha(d.titulo, `${d.texto} ${M.descreverEfeitos(d.efeitos)}`, motivo, () => {
      sons.clique();
      if (tipo === 'ensaiar') {
        abrirBaralho('Qual carta sai do repertório?', (i) => {
          const nome = M.carta(tt.baralho[i]).nome;
          const av = M.descansar(tt, 'ensaiar', i);
          if (!av) return;
          salvar();
          desfecho(`${nome} saiu do repertório. A discussão foi longa.`, M.descreverEfeitos(d.efeitos), av);
        });
        return;
      }
      const av = M.descansar(tt, tipo);
      if (!av) return;
      salvar();
      desfecho(d.texto, M.descreverEfeitos(d.efeitos), av);
    });
  });
}

function telaPerdida() {
  if (!t || t.fase.tipo !== 'perdida') return;
  const grana = t.fase.motivo === 'grana';
  folha(onde(), 'Noite perdida', grana
    ? 'Sem um real no bolso. A noite foi atrás de grana pra comer, e o clima azedou.'
    : 'O stage dive cobrou a conta: noite inteira no posto de saúde.');
  M.seguirDepoisDePerdida(t);
  salvar();
  desfecho(grana ? 'Ninguém tocou nada hoje.' : 'Tala no braço, mas a turnê continua.', grana ? '−1 clima' : '−R$ 10', []);
}

// ─── Show ─────────────────────────────────────────────────
function comecarShow() {
  if (!t) return;
  const tt = t;
  const { show: s, avisos: av } = M.iniciarShow(tt);
  show = s;
  const no = M.noAtual(tt);
  const [lugar, cidade] = no.lugar.split(' · ');
  $('show-lugar').textContent = no.final ? `⭐ Festival de quintal · ${cidade}` : `${lugar} · ${cidade}`;
  cena.banda = [...tt.banda];
  cena.mascote = !!tt.flags.mascote;
  cena.preparar(6 + tt.hype * 3, tt.noite * 7919 + tt.seed.charCodeAt(0));
  mostrar('show');
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
  $('show-bloco').textContent = `MÚSICA ${Math.min(s.bloco, M.BLOCOS)}/${M.BLOCOS}`;
  $('show-voz').textContent = `🎤 ${tt.voz}${s.cantaJunto ? ' · plateia canta' : ''}`;
  // VU: o alvo fica no meio; acima do dobro, o palco desaba.
  const segs = $('vu-segs');
  if (!segs.children.length) for (let i = 0; i < 24; i++) segs.appendChild(document.createElement('i'));
  const cheios = Math.min(24, Math.round((s.energia / (s.alvo * 2)) * 24));
  [...segs.children].forEach((el, i) => {
    el.className = i < cheios ? `on${i >= 12 ? ' quente' : ''}${i >= 20 ? ' pico' : ''}` : '';
  });
  $('vu').classList.toggle('vu--batido', s.energia >= s.alvo);
  $('vu-num').textContent = `${s.energia}/${s.alvo}`;
  cena.razao = s.energia / s.alvo;

  const folego = $('folego');
  folego.replaceChildren();
  for (let i = 0; i < Math.max(M.FOLEGO, s.folego); i++) {
    const p = document.createElement('i');
    if (i < s.folego) p.className = 'cheio';
    folego.appendChild(p);
  }
  const prox = M.espiar(tt, s);
  $('espiar').textContent = prox ? `${M.BANDA.guitarra.nome} espia: vem ${M.carta(prox).nome}` : '';

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
  $('btn-bloco').textContent = s.bloco >= M.BLOCOS ? 'Encerrar o show ■' : 'Próxima música ▶';
  posicionarDica();
}

/** Tutorial sem texto: a mãozinha aponta para o que fazer no primeiro show. */
function posicionarDica() {
  const dica = $('dica');
  if (!tutorial || !t || !show) { dica.hidden = true; return; }
  // Aponta para a carta jogável que mais levanta o público.
  const cartas = [...$('mao').children] as HTMLElement[];
  const melhor = show.mao
    .map((m, i) => ({ i, e: M.carta(m.id).energia }))
    .filter(({ i, e }) => e > 0 && !('off' in (cartas[i]?.dataset ?? {})))
    .sort((a, b) => b.e - a.e)[0];
  const alvo = melhor ? cartas[melhor.i] : $('btn-bloco');
  if (!alvo) { dica.hidden = true; return; }
  requestAnimationFrame(() => {
    const r = alvo.getBoundingClientRect();
    const base = $('app').getBoundingClientRect();
    dica.style.left = `${r.left - base.left + r.width / 2}px`;
    dica.style.top = `${r.top - base.top - 44}px`;
    dica.hidden = false;
  });
}

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
    aviso(motivo, 1200);
    return;
  }
  const c = M.carta(s.mao[i].id);
  const j = M.jogar(tt, s, i);
  if (!j) return;
  // Retorno imediato: som, VU e cena no mesmo quadro do toque.
  el.classList.add('carta--batendo');
  vibrar(c.tipo === 'musica' ? 18 : 10);
  if (j.momento === 'mosh') sons.mosh();
  else if (j.momento === 'desabou') sons.desabou();
  else if (c.tipo === 'musica') sons.musica(j.energia);
  else if (c.tipo === 'fala') sons.fala();
  else if (c.tipo === 'problema') sons.virada();
  else sons.acao();
  if (j.microfonias) setTimeout(sons.microfonia, 120);
  cena.momento(j.momento ?? 'carta');
  cena.razao = s.energia / s.alvo;
  if (j.energia > 0) pop(`+${j.energia}`, j.energia >= 10 ? 'pop--grande' : '');
  else if (j.energia < 0) pop(`${j.energia}`, 'pop--menos');
  if (j.momento === 'mosh') { pop('MOSH!', 'pop--grande'); aviso('O público subiu no palco!'); }
  if (j.momento === 'desabou') { pop('O PALCO DESABOU!', 'pop--grande'); aviso('O palco desabou! Cachê dobrado de indenização.', 3000); }
  if (j.momento === 'pit') pop('RODA!', 'pop--grande');
  if (j.momento === 'parede') pop('PAREDE!', 'pop--grande');
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
  aviso(`Música ${s.bloco}`, 900);
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
  tutorial = false;
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
  const titulo = r.desabou ? 'O palco desabou!' : !r.sucesso ? 'Show morno' : r.energia >= r.alvo * 1.5 ? 'Casa abaixo!' : 'Show bom!';
  $('res-titulo').textContent = titulo;
  $('res-texto').textContent = r.desabou
    ? 'Ninguém se machucou. O dono pagou o cachê em dobro pra vocês não postarem nada.'
    : r.sucesso
      ? 'O público pediu mais uma. A van vai mais leve hoje.'
      : 'Metade do cachê e alguém vai dormir na van de cara fechada.';
  const numeros = [
    `⚡ ${r.energia}/${r.alvo}`,
    `💸 cachê R$ ${r.cache}`,
    ...(r.merch ? [`👕 merch R$ ${r.merch}`] : []),
    ...(r.extra ? [`🎤 extra R$ ${r.extra}`] : []),
    `👥 ${r.publico} pessoas`,
  ];
  const ul = $('res-numeros');
  ul.replaceChildren(...numeros.map((n) => Object.assign(document.createElement('li'), { textContent: n })));
  $('res-escolha').textContent = opcoes.length ? 'Uma música nova pro repertório:' : '';
  const box = $('recompensas');
  box.replaceChildren();
  for (const id of opcoes) {
    const el = elementoCarta(id);
    el.addEventListener('click', () => {
      M.escolherRecompensa(tt, id);
      arpejo([392, 494, 587, 784], 0.05, 'square', 0.04);
      aviso(`${M.carta(id).nome} entrou no repertório.`, 1400);
      seguir();
    });
    box.appendChild(el);
  }
  $('btn-pular').textContent = opcoes.length ? 'Seguir sem carta nova' : 'Seguir viagem';
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
  $('fim-retorno').textContent = '';
  void desenharZine($<HTMLCanvasElement>('zine'), tt);
  if (tt.fim === 'completa') setTimeout(sons.acertou, 200);
}

$('btn-zine').addEventListener('click', async () => {
  if (!t) return;
  const r = await exportarZine($<HTMLCanvasElement>('zine'), t);
  registrar(JOGO, 'compartilhar', { tipo: 'zine' });
  $('fim-retorno').textContent = r === 'baixado' ? 'Zine salvo. Bota nos stories!' : r === 'falhou' ? 'Não deu pra gerar a imagem.' : '';
});

$('btn-desafio').addEventListener('click', async () => {
  if (!t) return;
  const resultado = t.fim === 'completa' ? `voltei com ${t.banda.length === 4 ? 'a banda inteira' : `${t.banda.length} de 4`}` : `a banda acabou na noite ${t.noite}`;
  const texto = `Faça Você Mesmo, turnê ${t.seed}: ${resultado}. Faz essa turnê aí e vê se volta vivo.`;
  const r = await compartilhar(texto, `${urlDoJogo()}?seed=${t.seed}`);
  registrar(JOGO, 'compartilhar', { tipo: 'seed' });
  $('fim-retorno').textContent = r === 'copiado' ? 'Link da turnê copiado!' : r === 'falhou' ? 'Não deu pra compartilhar.' : '';
});

$('btn-denovo').addEventListener('click', () => { t = null; telaTitulo(); });

// ─── Início ───────────────────────────────────────────────
$('btn-som').textContent = estaMudo() ? '🔇' : '🔊';
telaTitulo();
