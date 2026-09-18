import { posicaoInicial, daFEN, perft, lancesLegais, aplicar, paraSAN, estadoFim } from './xadrez-nucleo.mjs';

const casos = [
  { nome: 'Inicial',   fen: null, esperado: [20, 400, 8902, 197281] },
  { nome: 'Kiwipete',  fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', esperado: [48, 2039, 97862] },
  { nome: 'Posição 3', fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', esperado: [14, 191, 2812, 43238] },
  { nome: 'Posição 4', fen: 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', esperado: [6, 264, 9467] },
  { nome: 'Posição 5', fen: 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', esperado: [44, 1486, 62379] },
];

let falhou = false;
for (const c of casos) {
  const e = c.fen ? daFEN(c.fen) : posicaoInicial();
  const obtido = [];
  for (let d = 1; d <= c.esperado.length; d++) {
    const t0 = Date.now();
    const n = perft(e, d);
    obtido.push(n);
    const ok = n === c.esperado[d - 1];
    if (!ok) falhou = true;
    console.log(`${ok ? '✅' : '❌'} ${c.nome} d${d}: ${n}${ok ? '' : ` (esperado ${c.esperado[d-1]})`} — ${Date.now() - t0}ms`);
  }
}

// SAN e desambiguação
const e = posicaoInicial();
const sans = lancesLegais(e).map(m => paraSAN(e, m)).sort();
console.log('\nSAN inicial:', sans.join(' '));

// Mate do pastor: 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? 4.Qxf7#
let jogo = posicaoInicial();
const sequencia = ['e4','e5','Bc4','Nc6','Qh5','Nf6','Qxf7#'];
const traduz = { 'Bc4':'Bc4', 'Nc6':'Cc6', 'Qh5':'Dh5', 'Nf6':'Cf6', 'Qxf7#':'Dxf7#' };
for (const alvo of sequencia) {
  const querido = traduz[alvo] || alvo;
  const m = lancesLegais(jogo).find(x => paraSAN(jogo, x) === querido);
  if (!m) { console.log('❌ não achou o lance', querido); falhou = true; break; }
  jogo = aplicar(jogo, m);
}
const fim = estadoFim(jogo);
console.log('mate do pastor:', fim.tipo, '| vencedor:', fim.vencedor);
if (fim.tipo !== 'mate') falhou = true;

// Afogamento clássico: rei preto em a8, dama branca c7... posição de stalemate
const afogado = daFEN('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
const fa = estadoFim(afogado);
console.log('afogamento:', fa.tipo);
if (fa.tipo !== 'afogamento') falhou = true;

console.log(falhou ? '\n❌ HÁ FALHAS' : '\n✅ Núcleo do xadrez validado');
