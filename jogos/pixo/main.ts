import '../compartilhado/base.css';
import './estilo.css';
import { DESENHOS, COLECOES, type Desenho } from './desenhos';
import { pistasDaLinha, pistasDoDesenho } from './nonograma';
import {
  diaEmBrasilia, numeroDoDia, desenhoDoDia, solucaoDoDesenho, corDaCelula,
  sequencia, formatarTempo, textoDeCompartilhar,
} from './calendario';
import { ler, gravar } from '../compartilhado/salvar';
import { compartilhar } from '../compartilhado/compartilhar';
import { evento } from '../compartilhado/eventos';
import { nota, arpejo, acorde, PENTATONICA, vibrar, destravarAudio, setMudo, estaMudo, ruido } from '../compartilhado/som';
import { sharPeiCanvas } from '../compartilhado/sharpei';

const JOGO = 'pixo';
const VAZIO = 0, CHEIO = 1, MARCADO = 2;
type Estado = typeof VAZIO | typeof CHEIO | typeof MARCADO;

interface Progresso { dia: string; id: string; grade: Estado[][]; segundos: number; dicas: number }
interface Resolvido { id: string; segundos: number; dicas: number }

/** Desafio de boas-vindas: um coração 5×5 que se resolve olhando as duas linhas cheias. */
const TUTORIAL: Desenho = {
  id: 'tutorial', nome: 'Primeiro desenho', colecao: 'boteco',
  cores: { H: '#d6353f' },
  arte: ['.H.H.', 'HHHHH', 'HHHHH', '.HHH.', '..H..'],
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// ─── Estado ───────────────────────────────────────────────

const hoje = diaEmBrasilia();
const resolvidos = ler<Record<string, Resolvido>>(JOGO, 'resolvidos', {});
const tutorialVisto = ler<boolean>(JOGO, 'tutorial', false);

let desenho: Desenho;
let solucao: boolean[][];
let pistasL: number[][];
let pistasC: number[][];
let n = 0;
let grade: Estado[][] = [];
let segundos = 0;
let dicas = 0;
let terminado = false;
let modoTutorial = false;
let ferramenta: 'pintar' | 'x' = 'pintar';
const desfazer: Estado[][][] = [];

let celulas: HTMLElement[][] = [];
let pistasLinhaEl: HTMLElement[] = [];
let pistasColunaEl: HTMLElement[] = [];

setMudo(ler<boolean>(JOGO, 'mudo', false));
destravarAudio();

// ─── Montagem ─────────────────────────────────────────────

function carregar(d: Desenho, progresso?: Progresso) {
  desenho = d;
  solucao = solucaoDoDesenho(d);
  ({ linhas: pistasL, colunas: pistasC } = pistasDoDesenho(solucao));
  n = solucao.length;
  grade = progresso?.grade ?? Array.from({ length: n }, () => new Array<Estado>(n).fill(VAZIO));
  segundos = progresso?.segundos ?? 0;
  dicas = progresso?.dicas ?? 0;
  terminado = false;
  desfazer.length = 0;
  montarTabuleiro();
  atualizarTopo();
  redimensionar();
}

function montarTabuleiro() {
  const tab = $('tabuleiro');
  tab.innerHTML = '';
  tab.style.setProperty('--n', String(n));
  tab.classList.toggle('tabuleiro--tutorial', modoTutorial);

  const canto = document.createElement('div');
  canto.className = 'canto';
  tab.appendChild(canto);

  pistasColunaEl = pistasC.map((p, c) => {
    const el = document.createElement('div');
    el.className = 'pista pista--coluna';
    el.style.gridColumn = String(c + 2);
    el.innerHTML = p.map((v) => `<span>${v}</span>`).join('');
    if (c % 5 === 4 && c < n - 1) el.classList.add('div-direita');
    tab.appendChild(el);
    return el;
  });

  celulas = [];
  pistasLinhaEl = [];
  for (let r = 0; r < n; r++) {
    const pl = document.createElement('div');
    pl.className = 'pista pista--linha';
    pl.style.gridRow = String(r + 2);
    pl.innerHTML = pistasL[r].map((v) => `<span>${v}</span>`).join('');
    if (r % 5 === 4 && r < n - 1) pl.classList.add('div-baixo');
    tab.appendChild(pl);
    pistasLinhaEl.push(pl);

    celulas.push([]);
    for (let c = 0; c < n; c++) {
      const el = document.createElement('div');
      el.className = 'cel';
      el.dataset.r = String(r);
      el.dataset.c = String(c);
      el.style.gridRow = String(r + 2);
      el.style.gridColumn = String(c + 2);
      if (c % 5 === 4 && c < n - 1) el.classList.add('div-direita');
      if (r % 5 === 4 && r < n - 1) el.classList.add('div-baixo');
      tab.appendChild(el);
      celulas[r].push(el);
    }
  }
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) pintarCelula(r, c);
  for (let i = 0; i < n; i++) { conferirLinha(i, false); conferirColuna(i, false); }

  if (modoTutorial) {
    const mao = document.createElement('div');
    mao.className = 'mao';
    mao.setAttribute('aria-hidden', 'true');
    mao.textContent = '👆';
    tab.appendChild(mao);
  }
}

function pintarCelula(r: number, c: number) {
  const el = celulas[r][c];
  const e = grade[r][c];
  el.classList.toggle('cel--cheia', e === CHEIO);
  el.classList.toggle('cel--x', e === MARCADO);
}

/** Tamanho da casa: o maior que cabe na área, contando as pistas. */
function redimensionar() {
  const area = $('area');
  const largura = area.clientWidth - 8;
  const altura = area.clientHeight - 8;
  const maxL = Math.max(...pistasL.map((p) => p.length));
  const maxC = Math.max(...pistasC.map((p) => p.length));
  const cel = Math.floor(Math.min(largura / (n + maxL * 0.62 + 0.4), altura / (n + maxC * 0.72 + 0.4)));
  $('tabuleiro').style.setProperty('--cel', `${Math.max(14, Math.min(cel, 48))}px`);
}

// ─── Interação ────────────────────────────────────────────

type Acao = 'pintar' | 'apagar' | 'marcar' | 'desmarcar';
let arraste: { acao: Acao; r0: number; c0: number; eixo: 'r' | 'c' | null; tocadas: Set<string>; timerLongo: number } | null = null;

function celulaDoPonto(x: number, y: number): [number, number] | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!el?.classList.contains('cel')) return null;
  return [Number(el.dataset.r), Number(el.dataset.c)];
}

function aplicar(acao: Acao, r: number, c: number): boolean {
  const e = grade[r][c];
  let novo: Estado | null = null;
  if (acao === 'pintar' && e === VAZIO) novo = CHEIO;
  else if (acao === 'apagar' && e === CHEIO) novo = VAZIO;
  else if (acao === 'marcar' && e === VAZIO) novo = MARCADO;
  else if (acao === 'desmarcar' && e === MARCADO) novo = VAZIO;
  if (novo === null) return false;
  grade[r][c] = novo;
  pintarCelula(r, c);
  return true;
}

function guardarDesfazer() {
  desfazer.push(grade.map((l) => l.slice()));
  if (desfazer.length > 200) desfazer.shift();
}

function aoPressionar(ev: PointerEvent) {
  if (terminado) return;
  const alvo = celulaDoPonto(ev.clientX, ev.clientY);
  if (!alvo) return;
  ev.preventDefault();
  (ev.target as HTMLElement).releasePointerCapture?.(ev.pointerId);
  const [r, c] = alvo;
  const e = grade[r][c];
  const acao: Acao = ferramenta === 'x'
    ? (e === MARCADO ? 'desmarcar' : 'marcar')
    : (e === CHEIO ? 'apagar' : e === MARCADO ? 'desmarcar' : 'pintar');

  guardarDesfazer();
  arraste = { acao, r0: r, c0: c, eixo: null, tocadas: new Set([`${r},${c}`]), timerLongo: 0 };
  if (aplicar(acao, r, c)) somDaAcao(acao, 0);

  // Toque longo no modo pintar vira X (sem precisar trocar de ferramenta).
  if (acao === 'pintar') {
    arraste.timerLongo = window.setTimeout(() => {
      if (!arraste || arraste.tocadas.size > 1) return;
      grade[r][c] = MARCADO;
      pintarCelula(r, c);
      arraste.acao = 'marcar';
      vibrar(15);
      nota(196, 0.08, 'triangle', 0.05);
    }, 380);
  }
  posAcao();
}

function aoMover(ev: PointerEvent) {
  if (!arraste) return;
  const alvo = celulaDoPonto(ev.clientX, ev.clientY);
  if (!alvo) return;
  const [r, c] = alvo;
  if (!arraste.eixo) {
    if (r === arraste.r0 && c === arraste.c0) return;
    arraste.eixo = Math.abs(r - arraste.r0) >= Math.abs(c - arraste.c0) ? 'c' : 'r';
    clearTimeout(arraste.timerLongo);
  }
  // Arrastar segue uma linha só: pinta tudo entre o início e o dedo.
  const fixo = arraste.eixo === 'r' ? arraste.r0 : arraste.c0;
  const ate = arraste.eixo === 'r' ? c : r;
  const de = arraste.eixo === 'r' ? arraste.c0 : arraste.r0;
  const passo = ate >= de ? 1 : -1;
  let mudou = false;
  for (let i = de; i !== ate + passo; i += passo) {
    const rr = arraste.eixo === 'r' ? fixo : i;
    const cc = arraste.eixo === 'r' ? i : fixo;
    const chave = `${rr},${cc}`;
    if (arraste.tocadas.has(chave)) continue;
    arraste.tocadas.add(chave);
    if (aplicar(arraste.acao, rr, cc)) { somDaAcao(arraste.acao, arraste.tocadas.size - 1); mudou = true; }
  }
  if (mudou) posAcao();
}

function aoSoltar() {
  if (!arraste) return;
  clearTimeout(arraste.timerLongo);
  arraste = null;
  salvarProgresso();
}

function somDaAcao(acao: Acao, passo: number) {
  if (acao === 'pintar') nota(PENTATONICA[Math.min(passo, PENTATONICA.length - 1)], 0.09, 'square', 0.04);
  else if (acao === 'marcar') nota(165, 0.05, 'triangle', 0.04);
  else nota(130, 0.05, 'triangle', 0.03);
}

function posAcao() {
  if (modoTutorial) document.querySelector('.mao')?.remove();
  for (let i = 0; i < n; i++) { conferirLinha(i, true); conferirColuna(i, true); }
  if (venceu()) terminar();
}

function conferirLinha(r: number, animar: boolean) {
  const ok = pistasDaLinha(grade[r].map((e) => e === CHEIO)).join() === pistasL[r].join();
  const el = pistasLinhaEl[r];
  if (ok && !el.classList.contains('pista--ok') && animar) avisarLinhaCompleta(celulas[r]);
  el.classList.toggle('pista--ok', ok);
}

function conferirColuna(c: number, animar: boolean) {
  const ok = pistasDaLinha(grade.map((l) => l[c] === CHEIO)).join() === pistasC[c].join();
  const el = pistasColunaEl[c];
  if (ok && !el.classList.contains('pista--ok') && animar) avisarLinhaCompleta(celulas.map((l) => l[c]));
  el.classList.toggle('pista--ok', ok);
}

function avisarLinhaCompleta(els: HTMLElement[]) {
  els.forEach((el) => { el.classList.remove('cel--pisca'); void el.offsetWidth; el.classList.add('cel--pisca'); });
  vibrar(10);
}

function venceu(): boolean {
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if ((grade[r][c] === CHEIO) !== solucao[r][c]) return false;
  return true;
}

// ─── Ferramentas ──────────────────────────────────────────

function escolherFerramenta(f: 'pintar' | 'x') {
  ferramenta = f;
  $('ft-pintar').classList.toggle('ferramenta--ativa', f === 'pintar');
  $('ft-x').classList.toggle('ferramenta--ativa', f === 'x');
  $('ft-pintar').setAttribute('aria-pressed', String(f === 'pintar'));
  $('ft-x').setAttribute('aria-pressed', String(f === 'x'));
}

function voltar() {
  const anterior = desfazer.pop();
  if (!anterior || terminado) return;
  grade = anterior;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) pintarCelula(r, c);
  for (let i = 0; i < n; i++) { conferirLinha(i, false); conferirColuna(i, false); }
  ruido(0.06, 0.04, 1200);
  salvarProgresso();
}

/** Dica: corrige uma casa errada ou revela uma que falta pintar. */
function darDica() {
  if (terminado) return;
  const erradas: [number, number][] = [];
  const faltando: [number, number][] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const cheia = grade[r][c] === CHEIO;
    if (cheia && !solucao[r][c]) erradas.push([r, c]);
    else if (!cheia && solucao[r][c]) faltando.push([r, c]);
  }
  const lista = erradas.length ? erradas : faltando;
  if (!lista.length) return;
  const [r, c] = lista[Math.floor(Math.random() * lista.length)];
  guardarDesfazer();
  grade[r][c] = solucao[r][c] ? CHEIO : MARCADO;
  pintarCelula(r, c);
  celulas[r][c].classList.add('cel--dica');
  dicas++;
  atualizarTopo();
  arpejo([523, 659, 784], 0.05, 'triangle', 0.04);
  posAcao();
  salvarProgresso();
}

// ─── Tempo, topo e save ───────────────────────────────────

function atualizarTopo() {
  const colecao = COLECOES.find((c) => c.id === desenho.colecao)!;
  $('numero').textContent = modoTutorial ? '' : `#${numeroDoDia(hoje)}`;
  $('colecao').textContent = modoTutorial ? '' : colecao.nome;
  $('colecao').style.setProperty('--destaque', colecao.destaque);
  $('tempo').textContent = formatarTempo(segundos);
  $('dicas-usadas').textContent = dicas ? String(dicas) : '';
}

setInterval(() => {
  if (terminado || modoTutorial || document.hidden || !desenho) return;
  segundos++;
  $('tempo').textContent = formatarTempo(segundos);
  if (segundos % 5 === 0) salvarProgresso();
}, 1000);

function salvarProgresso() {
  if (modoTutorial || terminado) return;
  gravar<Progresso>(JOGO, 'progresso', { dia: hoje, id: desenho.id, grade, segundos, dicas });
}

// ─── Revelação e fim ──────────────────────────────────────

function corDeFundo(d: Desenho): string {
  return COLECOES.find((c) => c.id === d.colecao)!.fundo;
}

function corRevelada(d: Desenho, r: number, c: number): string {
  const ch = d.arte[r][c];
  return ch === '.' ? corDeFundo(d) : corDaCelula(d, ch) ?? corDeFundo(d);
}

function terminar() {
  terminado = true;
  arraste = null;
  // Revelação: a cor se espalha a partir do centro em ~1 segundo.
  const centro = (n - 1) / 2;
  const maxD = Math.hypot(centro, centro);
  $('tabuleiro').classList.add('tabuleiro--revelado');
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const el = celulas[r][c];
    el.style.transitionDelay = `${Math.round((Math.hypot(r - centro, c - centro) / maxD) * 700)}ms`;
    el.style.setProperty('--cor', corRevelada(desenho, r, c));
    el.classList.add('cel--revelada');
  }
  acorde([523, 659, 784, 1047], 0.9, 'triangle', 0.05);
  vibrar(30);

  if (modoTutorial) {
    gravar(JOGO, 'tutorial', true);
    evento(JOGO, 'tutorial_concluido');
    setTimeout(() => { modoTutorial = false; iniciarDoDia(); }, 1600);
    return;
  }

  resolvidos[hoje] = { id: desenho.id, segundos, dicas };
  gravar(JOGO, 'resolvidos', resolvidos);
  gravar(JOGO, 'progresso', null);
  evento(JOGO, 'resolvido', { numero: numeroDoDia(hoje), segundos, dicas });
  setTimeout(mostrarFim, 1300);
}

function desenharNoCanvas(canvas: HTMLCanvasElement, d: Desenho, escala: number) {
  const tam = d.arte.length;
  canvas.width = tam * escala;
  canvas.height = tam * escala;
  const ctx = canvas.getContext('2d')!;
  for (let r = 0; r < tam; r++) for (let c = 0; c < tam; c++) {
    ctx.fillStyle = corRevelada(d, r, c);
    ctx.fillRect(c * escala, r * escala, escala, escala);
  }
}

function mostrarFim() {
  const feito = resolvidos[hoje];
  const d = DESENHOS.find((x) => x.id === feito.id) ?? desenho;
  desenharNoCanvas($('fim-desenho') as HTMLCanvasElement, d, Math.floor(180 / d.arte.length));
  $('fim-nome').textContent = d.nome;
  const seq = sequencia(Object.keys(resolvidos), hoje);
  const dicasTxt = feito.dicas === 0 ? 'sem dicas' : feito.dicas === 1 ? '1 dica' : `${feito.dicas} dicas`;
  $('fim-info').textContent = `${formatarTempo(feito.segundos)} · ${dicasTxt} · sequência de ${seq} ${seq === 1 ? 'dia' : 'dias'}`;

  // O Shar Pei espia a figurinha nova; com 30 dias seguidos, de chapéu de festa.
  const mascote = $('fim-mascote');
  mascote.innerHTML = '';
  mascote.appendChild(sharPeiCanvas(3, { pose: 'feliz', acessorios: seq >= 30 ? ['chapeu'] : [] }));

  $('fim-retorno').textContent = '';
  $('fim').hidden = false;
  atualizarContagem();
}

function atualizarContagem() {
  // Brasília é UTC−3 o ano todo: o próximo desenho sai às 03:00 UTC.
  const agora = Date.now();
  const proximo = new Date(`${hoje}T03:00:00Z`).getTime() + 86_400_000;
  const min = Math.max(0, Math.round((proximo - agora) / 60_000));
  $('fim-amanha').textContent = `Próximo desenho em ${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}
setInterval(() => { if (!$('fim').hidden) atualizarContagem(); }, 30_000);

async function aoCompartilhar() {
  const feito = resolvidos[hoje];
  const d = DESENHOS.find((x) => x.id === feito.id)!;
  const texto = textoDeCompartilhar({
    numero: numeroDoDia(hoje), segundos: feito.segundos, dicas: feito.dicas,
    sequencia: sequencia(Object.keys(resolvidos), hoje), solucao: solucaoDoDesenho(d),
  });
  const r = await compartilhar(texto);
  evento(JOGO, 'compartilhar', { resultado: r });
  $('fim-retorno').textContent = r === 'copiado' ? 'Copiado! É só colar no grupo.' : r === 'falhou' ? texto : '';
}

// ─── Álbum ────────────────────────────────────────────────

function abrirAlbum() {
  const feitos = new Set(Object.values(resolvidos).map((x) => x.id));
  const lista = $('album-lista');
  lista.innerHTML = '';
  for (const col of COLECOES) {
    const doCol = DESENHOS.filter((d) => d.colecao === col.id);
    const qtd = doCol.filter((d) => feitos.has(d.id)).length;
    const sec = document.createElement('section');
    sec.className = 'album__colecao';
    sec.style.setProperty('--destaque', col.destaque);
    sec.innerHTML = `<h3>${col.nome} <small>${qtd}/6</small></h3>`;
    const grid = document.createElement('div');
    grid.className = 'album__grade';
    for (const d of doCol) {
      const slot = document.createElement('div');
      slot.className = 'figurinha';
      if (feitos.has(d.id)) {
        const cv = document.createElement('canvas');
        cv.className = 'pixel';
        desenharNoCanvas(cv, d, Math.floor(60 / d.arte.length));
        slot.appendChild(cv);
        slot.title = d.nome;
        slot.insertAdjacentHTML('beforeend', `<span>${d.nome}</span>`);
      } else {
        slot.classList.add('figurinha--vazia');
        slot.innerHTML = '<b>?</b>';
      }
      grid.appendChild(slot);
    }
    sec.appendChild(grid);
    lista.appendChild(sec);
  }
  $('album').hidden = false;
}

// ─── Início ───────────────────────────────────────────────

function iniciarDoDia() {
  $('tabuleiro').classList.remove('tabuleiro--revelado');
  const d = desenhoDoDia(hoje);
  if (resolvidos[hoje]) {
    carregar(d, { dia: hoje, id: d.id, grade: solucao2grade(d), segundos: resolvidos[hoje].segundos, dicas: resolvidos[hoje].dicas });
    terminado = true;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      celulas[r][c].style.setProperty('--cor', corRevelada(d, r, c));
      celulas[r][c].classList.add('cel--revelada');
    }
    $('tabuleiro').classList.add('tabuleiro--revelado');
    mostrarFim();
    return;
  }
  const salvo = ler<Progresso | null>(JOGO, 'progresso', null);
  carregar(d, salvo && salvo.dia === hoje && salvo.id === d.id ? salvo : undefined);
  evento(JOGO, 'inicio', { numero: numeroDoDia(hoje) });
}

function solucao2grade(d: Desenho): Estado[][] {
  return solucaoDoDesenho(d).map((l) => l.map((v) => (v ? CHEIO : VAZIO)));
}

const tab = $('tabuleiro');
tab.addEventListener('pointerdown', aoPressionar);
window.addEventListener('pointermove', aoMover);
window.addEventListener('pointerup', aoSoltar);
window.addEventListener('pointercancel', aoSoltar);
tab.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('resize', redimensionar);
document.addEventListener('visibilitychange', () => { if (document.hidden) salvarProgresso(); });

$('ft-pintar').addEventListener('click', () => escolherFerramenta('pintar'));
$('ft-x').addEventListener('click', () => escolherFerramenta('x'));
$('ft-desfazer').addEventListener('click', voltar);
$('ft-dica').addEventListener('click', darDica);
$('btn-compartilhar').addEventListener('click', aoCompartilhar);
$('btn-album').addEventListener('click', abrirAlbum);
$('btn-album-fim').addEventListener('click', abrirAlbum);
$('btn-fechar-album').addEventListener('click', () => { $('album').hidden = true; });
$('btn-som').addEventListener('click', () => {
  setMudo(!estaMudo());
  gravar(JOGO, 'mudo', estaMudo());
  $('btn-som').textContent = estaMudo() ? '🔇' : '🔊';
  $('btn-som').setAttribute('aria-label', estaMudo() ? 'Som desligado' : 'Som ligado');
});
$('btn-som').textContent = estaMudo() ? '🔇' : '🔊';
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); voltar(); }
  if (e.key === 'x' || e.key === 'X') escolherFerramenta(ferramenta === 'x' ? 'pintar' : 'x');
  if (e.key === 'Escape') { $('album').hidden = true; }
});

if (!tutorialVisto && !resolvidos[hoje]) {
  modoTutorial = true;
  carregar(TUTORIAL);
} else {
  iniciarDoDia();
}
