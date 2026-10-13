/**
 * Gerador de candidatas a fase (ferramenta de design, não vai para o jogo).
 *
 *   npx vite-node jogos/dobra/gerador.ts -- <tier> [quantidade] [semente]
 *
 * Sorteia tabuleiros, roda o solver e imprime as que batem com o tier pedido,
 * já em ASCII e em JSON. Critérios do PRD:
 * - nada de fase resolvida com 0 dobras;
 * - "aha!": nas fases de pegadinha, a dobra que parece óbvia (a que leva o
 *   cachorro direto na direção do petisco) é armadilha — sem solução depois dela;
 * - poucas soluções no mínimo de dobras (muitas = atalho não previsto).
 */
import { estadoInicial, dobrar, caminhar, resolverFase, type Fase, type Peca, type Dir, type Eixo } from './motor';

interface Tier { tam: [number, number]; vincosV: [number, number]; vincosH: [number, number]; paredes: [number, number]; almofadas: [number, number]; dobras: [number, number]; pegadinha?: boolean; maxSolucoes: number }

const TIERS: Record<string, Tier> = {
  ensina: { tam: [4, 5], vincosV: [1, 1], vincosH: [0, 1], paredes: [0, 1], almofadas: [0, 0], dobras: [1, 1], maxSolucoes: 1 },
  almofada: { tam: [4, 5], vincosV: [1, 1], vincosH: [1, 1], paredes: [0, 1], almofadas: [1, 1], dobras: [2, 2], maxSolucoes: 1 },
  combina: { tam: [5, 6], vincosV: [1, 2], vincosH: [1, 2], paredes: [1, 2], almofadas: [1, 2], dobras: [2, 3], maxSolucoes: 2 },
  pegadinha: { tam: [6, 6], vincosV: [1, 2], vincosH: [1, 2], paredes: [1, 3], almofadas: [1, 2], dobras: [3, 4], pegadinha: true, maxSolucoes: 2 },
  desafio: { tam: [7, 8], vincosV: [2, 3], vincosH: [2, 3], paredes: [2, 4], almofadas: [2, 3], dobras: [4, 5], maxSolucoes: 2 },
};

let semente = Number(process.argv[4] ?? 7);
const rand = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };
const entre = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));
const escolher = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

function sortear(t: Tier): Fase {
  const largura = entre(t.tam[0], t.tam[1]);
  const altura = entre(t.tam[0], t.tam[1]);
  const vincos = (tam: number, q: number) => {
    const s = new Set<number>();
    while (s.size < q) s.add(entre(1, tam - 1));
    return [...s].sort((a, b) => a - b);
  };
  const ocupadas = new Set<string>();
  const livre = () => { for (;;) { const x = entre(0, largura - 1), y = entre(0, altura - 1); const k = `${x},${y}`; if (!ocupadas.has(k)) { ocupadas.add(k); return { x, y }; } } };
  // Cachorro numa borda, olhando para dentro.
  const lado = escolher<Dir>(['L', 'O', 'N', 'S']);
  const cao = lado === 'L' ? { x: 0, y: entre(0, altura - 1), dir: 'L' as Dir }
    : lado === 'O' ? { x: largura - 1, y: entre(0, altura - 1), dir: 'O' as Dir }
    : lado === 'S' ? { x: entre(0, largura - 1), y: 0, dir: 'S' as Dir }
    : { x: entre(0, largura - 1), y: altura - 1, dir: 'N' as Dir };
  ocupadas.add(`${cao.x},${cao.y}`);
  const pecas: Fase['pecas'] = [{ ...livre(), tipo: 'petisco' }];
  const por = (tipo: Peca, q: number) => { for (let i = 0; i < q; i++) pecas.push({ ...livre(), tipo }); };
  por('parede', entre(...t.paredes));
  por('almofada', entre(...t.almofadas));
  return { id: '?', largura, altura, vincosV: vincos(largura, entre(...t.vincosV)), vincosH: vincos(altura, entre(...t.vincosH)), pecas, cao };
}

/** A primeira dobra "óbvia" leva à derrota? (pegadinha boa) */
function temArmadilha(f: Fase): boolean {
  const e = estadoInicial(f);
  const opcoes: [Eixo, number][] = [...e.vincosV.map((k) => ['v', k] as [Eixo, number]), ...e.vincosH.map((k) => ['h', k] as [Eixo, number])];
  let mortas = 0;
  for (const [eixo, k] of opcoes) {
    const c = caminhar(dobrar(e, eixo, k)!);
    if (c.venceu) return false;
    const resto: Fase = { ...f, largura: c.estado.largura, altura: c.estado.altura, vincosV: c.estado.vincosV, vincosH: c.estado.vincosH, cao: c.estado.cao,
      pecas: c.estado.celulas.flatMap((l, y) => l.map((p, x) => (p ? { x, y, tipo: p } : null)).filter(Boolean) as Fase['pecas']) };
    if (!resolverFase(resto, 6)) mortas++;
  }
  return mortas >= 1 && mortas < opcoes.length;
}

export function ascii(f: Fase): string {
  const g = Array.from({ length: f.altura }, () => new Array(f.largura).fill('.'));
  const simb: Record<Peca, string> = { parede: '#', poca: '~', almofada: 'o', gato: 'g', osso: 'b', petisco: '*' };
  for (const p of f.pecas) g[p.y][p.x] = simb[p.tipo];
  g[f.cao.y][f.cao.x] = { N: '^', S: 'v', L: '>', O: '<' }[f.cao.dir];
  return g.map((l) => l.join(' ')).join('\n') + `\nV:${f.vincosV} H:${f.vincosH}`;
}

if (process.argv[2]) {
  const nome = process.argv[2];
  const t = TIERS[nome];
  const quantas = Number(process.argv[3] ?? 5);
  const achadas: Fase[] = [];
  for (let i = 0; i < 400000 && achadas.length < quantas; i++) {
    const f = sortear(t);
    const s = resolverFase(f, t.dobras[1] + 1);
    if (!s || s.dobras < t.dobras[0] || s.dobras > t.dobras[1] || s.solucoes > t.maxSolucoes) continue;
    if (t.pegadinha && !temArmadilha(f)) continue;
    achadas.push(f);
    console.log(`── ${nome} #${achadas.length}: ${s.dobras} dobras, ${s.solucoes} solução(ões), ${s.sequencia.map(([e, k]) => e + k).join(' ')}`);
    console.log(ascii(f));
    console.log(JSON.stringify({ largura: f.largura, altura: f.altura, vincosV: f.vincosV, vincosH: f.vincosH, cao: f.cao, pecas: f.pecas }));
  }
}
