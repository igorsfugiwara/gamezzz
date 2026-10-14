import '../compartilhado/base.css';
import './estilo.css';
import { FASES, MUNDOS } from './fases';
import { estadoInicial, dobrar, caminhar, estrelas, type Estado, type Eixo, type Caminhada, type Fase } from './motor';
import { calcularLayout, desenharPapel, desenharVincos, desenharPecas, desenharCao, type Layout } from './desenho';
import { desenharSharPei, type Pose } from '../compartilhado/sharpei';
import { ler, gravar } from '../compartilhado/salvar';
import { compartilhar } from '../compartilhado/compartilhar';
import { evento } from '../compartilhado/eventos';
import { nota, acorde, arpejo, ruido, vibrar, destravarAudio, setMudo, estaMudo } from '../compartilhado/som';
import { abrirEditor } from './editor';
import { Tutorial, ponto } from '../compartilhado/tutorial';

const JOGO = 'dobra';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

setMudo(ler<boolean>(JOGO, 'mudo', false));
destravarAudio();

// ─── Progresso ────────────────────────────────────────────
const progresso = ler<Record<string, number>>(JOGO, 'estrelas', {});
const liberada = (i: number) => i === 0 || progresso[FASES[i - 1].id] !== undefined;

// ─── Estado da fase ───────────────────────────────────────
let indice = 0;
let fase: Fase;
let estado: Estado;
let historico: Estado[] = [];
let dobrasFeitas = 0;
let ocupado = false;
let vincoSob: { eixo: Eixo; k: number } | null = null;
let ultimaAcao = performance.now();

// Como o cachorro aparece agora (animações mexem nisto).
const cao = { px: 0, py: 0, pose: 'sentado' as Pose, espelhar: false, squash: 0, tremor: 0 };

const tela = $('tela') as HTMLCanvasElement;
const ctx = tela.getContext('2d')!;
let largura = 0, altura = 0;
let layout: Layout = { ox: 0, oy: 0, cel: 40 };
let confete: { x: number; y: number; vx: number; vy: number; cor: string; vida: number }[] = [];
// Durante a dobra a animação desenha direto na tela; o laço espera.
let animandoDobra = false;

function ajustarCanvas() {
  const r = $('palco').getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  largura = r.width; altura = r.height;
  tela.width = Math.round(r.width * dpr);
  tela.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  if (estado) { layout = calcularLayout(estado.largura, estado.altura, largura, altura); posicionarCao(); }
}

function posicionarCao() {
  cao.px = layout.ox + estado.cao.x * layout.cel;
  cao.py = layout.oy + estado.cao.y * layout.cel;
  if (estado.cao.dir === 'O') cao.espelhar = true;
  if (estado.cao.dir === 'L') cao.espelhar = false;
}

// ─── Tutorial jogado (fase 1) ─────────────────────────────
/** Ponto do papel (coordenadas do layout) na janela. */
function naTela(x: number, y: number, raio = 16) {
  const r = tela.getBoundingClientRect();
  return ponto(r.left + x, r.top + y, raio);
}
function vincoNaTela() {
  if (!estado || ocupado) return null;
  const { ox, oy, cel } = layout;
  const k = estado.vincosV[0];
  if (k !== undefined) return naTela(ox + k * cel, oy + cel * estado.altura * 0.7);
  const h = estado.vincosH[0];
  return h === undefined ? null : naTela(ox + cel * estado.largura * 0.5, oy + h * cel);
}
const tutorial = new Tutorial(JOGO, [
  { id: 'vinco', texto: 'Toque na linha tracejada: o papel dobra.', alvo: vincoNaTela, lugar: 'topo', ok: () => dobrasFeitas > 0, quando: () => indice === 0 && !$('jogo').hidden },
  { id: 'anda', texto: 'Depois de cada dobra, o Shar Pei anda reto até bater em algo.', gesto: 'nenhum', lugar: 'topo', alvo: () => naTela(cao.px + layout.cel / 2, cao.py + layout.cel / 2, layout.cel / 2), ok: () => !$('fim').hidden },
  { id: 'estrelas', texto: 'Chegou no petisco! Menos dobras, mais estrelas.', alvo: () => $('btn-proxima'), ok: () => indice > 0 },
]);

// ─── Desenho ──────────────────────────────────────────────

function desenhar(agora: number) {
  ctx.clearRect(0, 0, largura, altura);
  if (!estado) return;
  desenharPapel(ctx, estado, layout);
  desenharVincos(ctx, estado, layout, ocupado ? null : vincoSob, Math.sin(agora / 180) * 0.5 + 0.5);
  desenharPecas(ctx, estado, layout);
  const tremor = cao.tremor ? Math.sin(agora / 18) * cao.tremor : 0;
  desenharCao(ctx, cao.px + tremor, cao.py, layout.cel, { pose: cao.pose, espelhar: cao.espelhar, squash: cao.squash });
  desenharConfete();
}

function desenharConfete() {
  if (!confete.length) return;
  for (const p of confete) {
    p.vy += 0.12; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.vida--;
    ctx.fillStyle = p.cor;
    ctx.fillRect(p.x, p.y, 5, 3);
  }
  confete = confete.filter((p) => p.vida > 0 && p.y < altura + 10);
}

function laco(agora: number) {
  // Bocejo quando a pessoa demora (PRD: reações do Shar Pei).
  if (!ocupado && estado && !estado.venceu && agora - ultimaAcao > 9000 && cao.pose === 'sentado') {
    cao.pose = 'dormindo';
    nota(120, 0.6, 'sine', 0.03);
  }
  if (!animandoDobra) desenhar(agora);
  requestAnimationFrame(laco);
}
requestAnimationFrame(laco);

// ─── Animações ────────────────────────────────────────────

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function animar(duracao: number, passo: (t: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const ini = performance.now();
    const quadro = (agora: number) => {
      const t = Math.min(1, (agora - ini) / duracao);
      passo(t);
      if (t < 1) requestAnimationFrame(quadro); else resolve();
    };
    requestAnimationFrame(quadro);
  });
}

/**
 * A dobra: a metade sem o cachorro gira sobre o vinco em 6 quadros, com
 * sombra correndo pela folha. Desenhada por cima da tela normal.
 */
async function animarDobra(eixo: Eixo, k: number) {
  const antes = document.createElement('canvas');
  antes.width = tela.width; antes.height = tela.height;
  antes.getContext('2d')!.drawImage(tela, 0, 0);
  const dpr = tela.width / largura;
  const { ox, oy, cel } = layout;
  const vert = eixo === 'v';
  const linha = vert ? ox + k * cel : oy + k * cel;
  const posCao = vert ? estado.cao.x : estado.cao.y;
  const dobradaDepois = posCao < k; // a metade dobrada fica depois do vinco
  const ini = vert ? ox : oy;
  const fimBorda = vert ? ox + estado.largura * cel : oy + estado.altura * cel;
  const a = dobradaDepois ? linha : ini;
  const b = dobradaDepois ? fimBorda : linha;

  ruido(0.22, 0.09, 3200);
  const QUADROS = 6;
  ocupado = true;
  animandoDobra = true;
  await animar(300, (t) => {
    const q = Math.min(QUADROS, Math.floor(t * QUADROS + 0.5)) / QUADROS;
    const s = Math.cos(Math.PI * q); // 1 → −1
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, tela.width, tela.height);
    ctx.drawImage(antes, 0, 0);
    // Apaga a metade que vai dobrar e desenha ela girando.
    if (vert) ctx.clearRect(a * dpr, 0, (b - a) * dpr, tela.height);
    else ctx.clearRect(0, a * dpr, tela.width, (b - a) * dpr);
    // Gira em torno do vinco: s = −1 deixa a metade espelhada do outro lado.
    if (vert) { ctx.translate(linha * dpr, 0); ctx.scale(s, 1); } else { ctx.translate(0, linha * dpr); ctx.scale(1, s); }
    const off = a - linha;
    if (vert) ctx.drawImage(antes, a * dpr, 0, (b - a) * dpr, tela.height, off * dpr, 0, (b - a) * dpr, tela.height);
    else ctx.drawImage(antes, 0, a * dpr, tela.width, (b - a) * dpr, 0, off * dpr, tela.width, (b - a) * dpr);
    // Sombra e verso do papel.
    ctx.fillStyle = `rgba(107, 63, 36, ${0.25 * (1 - Math.abs(s)) + (s < 0 ? 0.12 : 0)})`;
    if (vert) ctx.fillRect(off * dpr, 0, (b - a) * dpr, tela.height); else ctx.fillRect(0, off * dpr, tela.width, (b - a) * dpr);
    ctx.restore();
  });
  animandoDobra = false;
}

async function animarCaminhada(c: Caminhada) {
  cao.pose = 'sentado';
  let x0 = cao.px, y0 = cao.py;
  for (const passo of c.passos) {
    const x1 = layout.ox + passo.x * layout.cel;
    const y1 = layout.oy + passo.y * layout.cel;
    if (passo.dir === 'O') cao.espelhar = true;
    if (passo.dir === 'L') cao.espelhar = false;
    if (passo.evento === 'susto') {
      cao.pose = 'susto'; vibrar(20); nota(660, 0.08, 'square', 0.05); nota(880, 0.08, 'square', 0.05, 0.08);
      await animar(260, (t) => { cao.squash = -Math.sin(t * Math.PI) * 0.8; });
      cao.pose = 'sentado';
      continue;
    }
    await animar(115, (t) => {
      cao.px = x0 + (x1 - x0) * t;
      cao.py = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * layout.cel * 0.12;
      cao.squash = Math.sin(t * Math.PI) * 0.35;
    });
    nota(330 + (passo.x + passo.y) * 20, 0.04, 'triangle', 0.025);
    x0 = x1; y0 = y1;
    if (passo.evento === 'osso') { arpejo([784, 988], 0.05, 'square', 0.04); }
    if (passo.evento === 'almofada') { ruido(0.1, 0.05, 600); await animar(180, (t) => { cao.squash = Math.sin(t * Math.PI) * 0.6; }); }
  }
  cao.squash = 0;
}

async function reagir(c: Caminhada) {
  if (c.reacao === 'bateu') {
    // Bate de cara, senta e olha feio.
    ruido(0.12, 0.12, 400); vibrar(25);
    cao.pose = 'susto'; cao.tremor = 3;
    await esperar(260);
    cao.tremor = 0; cao.pose = 'sentado'; cao.espelhar = !cao.espelhar;
    await esperar(500);
    cao.espelhar = !cao.espelhar;
  } else if (c.reacao === 'poca') {
    nota(220, 0.15, 'sine', 0.05);
    for (let i = 0; i < 3; i++) { cao.espelhar = !cao.espelhar; await esperar(110); }
  } else if (c.reacao === 'susto') {
    cao.pose = 'sentado';
  }
}

async function comemorar() {
  cao.pose = 'feliz';
  acorde([523, 659, 784, 1047], 0.8, 'triangle', 0.05);
  vibrar(30);
  // Estrelas caindo como papel picado.
  const cores = ['#ff4fa3', '#f6c443', '#5aa9e6', '#4fa64a', '#fbf3df'];
  for (let i = 0; i < 70; i++) confete.push({ x: cao.px + layout.cel / 2, y: cao.py, vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 6 - 2, cor: cores[i % cores.length], vida: 90 + Math.random() * 40 });
  // Rebolado ao comer.
  await animar(900, (t) => { cao.squash = Math.sin(t * Math.PI * 6) * 0.4; cao.espelhar = Math.sin(t * Math.PI * 6) > 0; });
  cao.squash = 0;
}

// ─── Jogada ───────────────────────────────────────────────

async function fazerDobra(eixo: Eixo, k: number) {
  if (ocupado || estado.venceu) return;
  const d = dobrar(estado, eixo, k);
  if (!d) return;
  ultimaAcao = performance.now();
  if (cao.pose === 'dormindo') cao.pose = 'sentado';
  ocupado = true;
  vincoSob = null;
  await animarDobra(eixo, k);
  historico.push(estado);
  estado = d;
  dobrasFeitas++;
  atualizarHud();
  layout = calcularLayout(estado.largura, estado.altura, largura, altura);
  posicionarCao();
  // A folha assenta.
  await animar(140, (t) => { cao.squash = Math.sin(t * Math.PI) * -0.3; });
  const c = caminhar(estado);
  await animarCaminhada(c);
  estado = c.estado;
  posicionarCao();
  if (c.venceu) {
    evento(JOGO, 'fase_completa', { fase: fase.id, dobras: dobrasFeitas });
    await comemorar();
    terminarFase();
  } else {
    await reagir(c);
    // Sem vinco e sem petisco: não é derrota, é hora de desfazer.
    const semSaida = estado.vincosV.length + estado.vincosH.length === 0;
    $('btn-desfazer').classList.toggle('botao--pulsa', semSaida);
    if (semSaida || c.reacao === 'bateu') {
      const antes = historico.length;
      tutorial.dica({ id: 'desfazer', texto: 'Errou a ordem? Desfazer volta uma dobra — à vontade.', alvo: () => $('btn-desfazer'), ok: () => historico.length < antes, segundos: 6 });
    }
  }
  ocupado = false;
}

function desfazer() {
  if (ocupado || !historico.length || estado.venceu) return;
  estado = historico.pop()!;
  dobrasFeitas = Math.max(0, dobrasFeitas - 1);
  layout = calcularLayout(estado.largura, estado.altura, largura, altura);
  cao.pose = 'sentado';
  posicionarCao();
  atualizarHud();
  ruido(0.15, 0.06, 2400);
  $('btn-desfazer').classList.remove('botao--pulsa');
  ultimaAcao = performance.now();
}

function reiniciar() {
  if (ocupado) return;
  jogarFase(indice);
}

// ─── Fases e telas ────────────────────────────────────────

function jogarFase(i: number, faseLivre?: Fase) {
  indice = i;
  fase = faseLivre ?? FASES[i];
  estado = estadoInicial(fase);
  historico = [];
  dobrasFeitas = 0;
  ocupado = false;
  confete = [];
  cao.pose = 'sentado'; cao.squash = 0; cao.tremor = 0;
  $('menu').hidden = true;
  $('fim').hidden = true;
  $('editor').hidden = true;
  $('jogo').hidden = false;
  $('btn-desfazer').classList.remove('botao--pulsa');
  ajustarCanvas();
  atualizarHud();
  ultimaAcao = performance.now();
  evento(JOGO, 'fase_inicio', { fase: fase.id });
  if (i === 0 && !faseLivre) tutorial.iniciar();
  const almofada = fase.pecas.find((pc) => pc.tipo === 'almofada');
  if (almofada && !faseLivre) {
    tutorial.dica({ id: 'almofada', texto: 'Almofada: o Shar Pei para nela e vira à esquerda.', gesto: 'nenhum', luz: true, lugar: 'topo', segundos: 5,
      alvo: () => naTela(layout.ox + (almofada.x + 0.5) * layout.cel, layout.oy + (almofada.y + 0.5) * layout.cel, layout.cel / 2), ok: () => dobrasFeitas > 0 });
  }
}

function atualizarHud() {
  const minimo = (fase as { minimo?: number }).minimo;
  $('hud-fase').textContent = fase.id;
  $('hud-nome').textContent = (fase as { nome?: string }).nome ?? '';
  $('hud-dobras').textContent = String(dobrasFeitas);
  $('hud-meta').textContent = minimo ? `/${minimo} ★★★` : '';
}

function terminarFase() {
  const minimo = (fase as { minimo?: number }).minimo ?? dobrasFeitas;
  const n = estrelas(dobrasFeitas, minimo);
  if (FASES[indice]?.id === fase.id) {
    progresso[fase.id] = Math.max(progresso[fase.id] ?? 0, n);
    gravar(JOGO, 'estrelas', progresso);
  }
  $('fim-estrelas').innerHTML = [1, 2, 3].map((i) => `<span class="${i <= n ? '' : 'apagada'}">★</span>`).join('');
  const dobraTxt = dobrasFeitas === 1 ? 'dobra' : 'dobras';
  $('fim-texto').textContent = n === 3 ? `Fase ${fase.id} em ${dobrasFeitas} ${dobraTxt}. Perfeito!` : `Fase ${fase.id} em ${dobrasFeitas} ${dobraTxt}. Dá pra fazer em ${minimo}.`;
  const cv = $('fim-cao') as HTMLCanvasElement;
  const c2 = cv.getContext('2d')!;
  c2.clearRect(0, 0, 96, 96);
  desenharSharPei(c2, 0, 0, 6, { pose: 'feliz', acessorios: n === 3 ? ['chapeu'] : [] });
  $('fim-retorno').textContent = '';
  $('btn-proxima').hidden = indice >= FASES.length - 1 || FASES[indice]?.id !== fase.id;
  $('fim').hidden = false;
  if (indice === FASES.length - 1) evento(JOGO, 'mundo_completo', { mundo: 1 });
}

function abrirMenu() {
  $('jogo').hidden = true;
  $('fim').hidden = true;
  $('editor').hidden = true;
  $('menu').hidden = false;
  $('menu-mundo').textContent = `Mundo ${MUNDOS[0].id} · ${MUNDOS[0].nome}`;
  const lista = $('menu-fases');
  lista.innerHTML = '';
  let atual = -1;
  FASES.forEach((f, i) => {
    const b = document.createElement('button');
    b.className = 'fase-botao';
    b.setAttribute('role', 'listitem');
    const est = progresso[f.id] ?? 0;
    b.innerHTML = `${i + 1}<small>${est ? '★'.repeat(est) + '☆'.repeat(3 - est) : ''}</small>`;
    b.disabled = !liberada(i);
    b.setAttribute('aria-label', `Fase ${f.id}${est ? `, ${est} estrelas` : ''}${b.disabled ? ', bloqueada' : ''}`);
    if (!b.disabled && !est && atual < 0) { atual = i; b.classList.add('fase-botao--atual'); }
    b.addEventListener('click', () => jogarFase(i));
    lista.appendChild(b);
  });
  const total = Object.values(progresso).reduce((a, b) => a + b, 0);
  $('menu-estrelas').textContent = `${total} de ${FASES.length * 3} estrelas`;
  desenharMenuCao();
}

/** Shar Pei roncando no menu. */
let roncoTimer = 0;
function desenharMenuCao() {
  const cv = $('menu-cao') as HTMLCanvasElement;
  const c = cv.getContext('2d')!;
  clearInterval(roncoTimer);
  let t = 0;
  const pinta = () => {
    c.clearRect(0, 0, 96, 96);
    desenharSharPei(c, 0, 8, 5, { pose: 'dormindo', squash: Math.sin(t) * 0.12 });
    c.fillStyle = '#a8693a';
    c.font = 'bold 14px system-ui';
    c.fillText('z', 70 + Math.sin(t) * 2, 22 - (t % 6));
    t += 0.4;
  };
  pinta();
  roncoTimer = window.setInterval(pinta, 160);
}

// ─── Entrada ──────────────────────────────────────────────

/** Vinco mais perto do ponto, dentro de 22 px (área de toque de 44 px). */
function vincoNoPonto(x: number, y: number): { eixo: Eixo; k: number } | null {
  if (!estado) return null;
  const { ox, oy, cel } = layout;
  const dentro = x > ox - 24 && x < ox + estado.largura * cel + 24 && y > oy - 24 && y < oy + estado.altura * cel + 24;
  if (!dentro) return null;
  let melhor: { eixo: Eixo; k: number } | null = null;
  let dist = 22;
  for (const k of estado.vincosV) { const d = Math.abs(x - (ox + k * cel)); if (d < dist) { dist = d; melhor = { eixo: 'v', k }; } }
  for (const k of estado.vincosH) { const d = Math.abs(y - (oy + k * cel)); if (d < dist) { dist = d; melhor = { eixo: 'h', k }; } }
  return melhor;
}

const pontoNaTela = (ev: PointerEvent) => { const r = tela.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top] as const; };

tela.addEventListener('pointermove', (ev) => {
  const [x, y] = pontoNaTela(ev);
  const v = vincoNoPonto(x, y);
  if (v && (v.eixo !== vincoSob?.eixo || v.k !== vincoSob?.k)) nota(1200, 0.02, 'sine', 0.015);
  vincoSob = v;
});
tela.addEventListener('pointerdown', (ev) => {
  const [x, y] = pontoNaTela(ev);
  const v = vincoNoPonto(x, y);
  vincoSob = v;
  if (v) void fazerDobra(v.eixo, v.k);
});
tela.addEventListener('pointerleave', () => { vincoSob = null; });

$('btn-desfazer').addEventListener('click', desfazer);
$('btn-reiniciar').addEventListener('click', reiniciar);
$('btn-menu').addEventListener('click', abrirMenu);
$('btn-repetir').addEventListener('click', () => jogarFase(indice));
$('btn-proxima').addEventListener('click', () => jogarFase(Math.min(indice + 1, FASES.length - 1)));
$('btn-compartilhar').addEventListener('click', async () => {
  const minimo = (fase as { minimo?: number }).minimo ?? dobrasFeitas;
  const n = estrelas(dobrasFeitas, minimo);
  const r = await compartilhar(`Dobra · Fase ${fase.id} em ${dobrasFeitas} ${dobrasFeitas === 1 ? 'dobra' : 'dobras'}, ${'★'.repeat(n)}${'☆'.repeat(3 - n)} 🐶`);
  evento(JOGO, 'compartilhar', { resultado: r });
  $('fim-retorno').textContent = r === 'copiado' ? 'Copiado!' : '';
});
$('btn-som').addEventListener('click', () => {
  setMudo(!estaMudo());
  gravar(JOGO, 'mudo', estaMudo());
  $('btn-som').textContent = estaMudo() ? '🔇' : '🔊';
});
$('btn-som').textContent = estaMudo() ? '🔇' : '🔊';
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); desfazer(); }
  if (e.key === 'r' || e.key === 'R') reiniciar();
});
window.addEventListener('resize', ajustarCanvas);

// ─── Início ───────────────────────────────────────────────
if (location.hash === '#editor') {
  $('menu').hidden = true;
  abrirEditor((f) => jogarFase(0, f));
} else if (!Object.keys(progresso).length) {
  // Primeira vez: direto na fase 1, sem menu — o jogo ensina jogando.
  jogarFase(0);
} else {
  abrirMenu();
}
