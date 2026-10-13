/**
 * Motor do Dobra — lógica de grade pura, sem DOM (PRD 3).
 *
 * Regras (as que o PRD deixa em aberto estão decididas aqui):
 * - Tocar num vinco dobra a metade SEM o cachorro por cima da metade COM ele,
 *   espelhando no vinco. Dobrar a metade maior faz o papel passar da borda:
 *   a grade cresce para o outro lado, como papel de verdade.
 * - Peças das duas metades se sobrepõem; a da metade dobrada fica por cima e
 *   é a que vale.
 * - Depois de cada dobra o cachorro anda reto até:
 *     borda → para · parede → para antes ("bateu") · poça → recusa, para antes
 *     almofada → para em cima e vira à esquerda · gato → susto, meia-volta
 *     osso → pega e segue · petisco → come e vence.
 * - O vinco usado vira borda; os outros continuam, nas posições novas.
 */

export type Peca = 'parede' | 'poca' | 'almofada' | 'gato' | 'osso' | 'petisco';
export type Dir = 'N' | 'S' | 'L' | 'O';
export type Eixo = 'v' | 'h';

export interface Fase {
  id: string;
  nome?: string;
  largura: number;
  altura: number;
  /** Vincos verticais: o número k é a linha entre as colunas k-1 e k. */
  vincosV: number[];
  /** Vincos horizontais: k é a linha entre as linhas k-1 e k. */
  vincosH: number[];
  pecas: { x: number; y: number; tipo: Peca }[];
  cao: { x: number; y: number; dir: Dir };
}

export interface Estado {
  largura: number;
  altura: number;
  celulas: (Peca | null)[][]; // [y][x]
  vincosV: number[];
  vincosH: number[];
  cao: { x: number; y: number; dir: Dir };
  ossos: number;
  venceu: boolean;
}

export type Reacao = 'parou' | 'bateu' | 'poca' | 'almofada' | 'susto' | 'comeu' | 'parado';

export interface Passo { x: number; y: number; dir: Dir; evento?: 'osso' | 'almofada' | 'susto' }

export interface Caminhada { estado: Estado; passos: Passo[]; reacao: Reacao; venceu: boolean }

const DELTA: Record<Dir, [number, number]> = { N: [0, -1], S: [0, 1], L: [1, 0], O: [-1, 0] };
const ESQUERDA: Record<Dir, Dir> = { L: 'N', N: 'O', O: 'S', S: 'L' };
const OPOSTO: Record<Dir, Dir> = { L: 'O', O: 'L', N: 'S', S: 'N' };

export function estadoInicial(f: Fase): Estado {
  const celulas: (Peca | null)[][] = Array.from({ length: f.altura }, () => new Array<Peca | null>(f.largura).fill(null));
  for (const p of f.pecas) celulas[p.y][p.x] = p.tipo;
  return {
    largura: f.largura,
    altura: f.altura,
    celulas,
    vincosV: [...f.vincosV].sort((a, b) => a - b),
    vincosH: [...f.vincosH].sort((a, b) => a - b),
    cao: { ...f.cao },
    ossos: 0,
    venceu: false,
  };
}

/**
 * Dobra no vinco `k` do eixo. Devolve o estado novo (sem caminhar) ou null
 * se não existe esse vinco.
 */
export function dobrar(e: Estado, eixo: Eixo, k: number): Estado | null {
  const vincos = eixo === 'v' ? e.vincosV : e.vincosH;
  if (!vincos.includes(k)) return null;

  const tam = eixo === 'v' ? e.largura : e.altura;
  const posCao = eixo === 'v' ? e.cao.x : e.cao.y;
  const caoAntes = posCao < k; // cachorro do lado de "cima/esquerda" do vinco
  const fica = (i: number) => (caoAntes ? i < k : i >= k);
  const espelho = (i: number) => 2 * k - 1 - i;
  // Posição final de cada índice do eixo (antes de normalizar).
  const destino = (i: number) => (fica(i) ? i : espelho(i));

  let min = Infinity, max = -Infinity;
  for (let i = 0; i < tam; i++) { const d = destino(i); if (d < min) min = d; if (d > max) max = d; }
  const novoTam = max - min + 1;
  const mapa = (i: number) => destino(i) - min;

  const largura = eixo === 'v' ? novoTam : e.largura;
  const altura = eixo === 'h' ? novoTam : e.altura;
  const celulas: (Peca | null)[][] = Array.from({ length: altura }, () => new Array<Peca | null>(largura).fill(null));

  // Primeiro a metade que fica (embaixo), depois a dobrada (por cima).
  for (const dobrada of [false, true]) {
    for (let y = 0; y < e.altura; y++) for (let x = 0; x < e.largura; x++) {
      const i = eixo === 'v' ? x : y;
      if (fica(i) === dobrada) continue;
      const peca = e.celulas[y][x];
      if (!peca) continue;
      const nx = eixo === 'v' ? mapa(x) : x;
      const ny = eixo === 'h' ? mapa(y) : y;
      celulas[ny][nx] = peca;
    }
  }

  // Vincos do mesmo eixo: o da metade que fica continua; o da dobrada espelha
  // (vinco j entre j-1 e j vai para 2k-j). O dobrado vira borda.
  const transformarVinco = (j: number) => {
    const ladoFica = caoAntes ? j < k : j > k;
    const pos = ladoFica ? j : 2 * k - j;
    return pos - min;
  };
  const mesmos = [...new Set(vincos.filter((j) => j !== k).map(transformarVinco))]
    .filter((j) => j > 0 && j < novoTam)
    .sort((a, b) => a - b);

  const cao = { ...e.cao };
  if (eixo === 'v') cao.x = mapa(e.cao.x); else cao.y = mapa(e.cao.y);

  return {
    largura,
    altura,
    celulas,
    vincosV: eixo === 'v' ? mesmos : e.vincosV.slice(),
    vincosH: eixo === 'h' ? mesmos : e.vincosH.slice(),
    cao,
    ossos: e.ossos,
    venceu: false,
  };
}

/** O cachorro anda reto até algo pará-lo. Não altera `e`. */
export function caminhar(e: Estado): Caminhada {
  const celulas = e.celulas.map((l) => l.slice());
  const cao = { ...e.cao };
  let ossos = e.ossos;
  const passos: Passo[] = [];
  const fim = (reacao: Reacao, venceu = false): Caminhada => ({
    estado: { ...e, celulas, cao, ossos, venceu }, passos, reacao, venceu,
  });

  // Petisco caiu em cima dele na dobra.
  if (celulas[cao.y][cao.x] === 'petisco') { celulas[cao.y][cao.x] = null; return fim('comeu', true); }

  let sustos = 0;
  for (let guarda = 0; guarda < 200; guarda++) {
    const [dx, dy] = DELTA[cao.dir];
    const nx = cao.x + dx, ny = cao.y + dy;
    if (nx < 0 || ny < 0 || nx >= e.largura || ny >= e.altura) return fim(sustos ? 'susto' : passos.length ? 'parou' : 'parado');
    const peca = celulas[ny][nx];
    if (peca === 'parede') return fim('bateu');
    if (peca === 'poca') return fim('poca');
    if (peca === 'gato') {
      // Assusta e dá meia-volta; dois gatos em sequência o deixam parado.
      if (++sustos > 2) return fim('susto');
      cao.dir = OPOSTO[cao.dir];
      passos.push({ x: cao.x, y: cao.y, dir: cao.dir, evento: 'susto' });
      continue;
    }
    cao.x = nx; cao.y = ny;
    if (peca === 'petisco') { celulas[ny][nx] = null; passos.push({ x: nx, y: ny, dir: cao.dir }); return fim('comeu', true); }
    if (peca === 'osso') { celulas[ny][nx] = null; ossos++; passos.push({ x: nx, y: ny, dir: cao.dir, evento: 'osso' }); continue; }
    if (peca === 'almofada') {
      cao.dir = ESQUERDA[cao.dir];
      passos.push({ x: nx, y: ny, dir: cao.dir, evento: 'almofada' });
      return fim('almofada');
    }
    passos.push({ x: nx, y: ny, dir: cao.dir });
  }
  return fim('parou');
}

/** Joga uma sequência de dobras a partir da fase. */
export function jogar(f: Fase, dobras: [Eixo, number][]): Caminhada & { dobras: number } {
  let e = estadoInicial(f);
  let ultima: Caminhada = { estado: e, passos: [], reacao: 'parado', venceu: false };
  for (const [eixo, k] of dobras) {
    const d = dobrar(e, eixo, k);
    if (!d) break;
    ultima = caminhar(d);
    e = ultima.estado;
    if (ultima.venceu) break;
  }
  return { ...ultima, dobras: dobras.length };
}

const chave = (e: Estado) =>
  `${e.largura}x${e.altura}|${e.celulas.map((l) => l.map((p) => (p ? p[0] + p[1] : '__')).join('')).join('/')}|${e.vincosV}|${e.vincosH}|${e.cao.x},${e.cao.y},${e.cao.dir}`;

export interface Solucao { dobras: number; sequencia: [Eixo, number][]; solucoes: number }

/**
 * Busca em largura: menor número de dobras até o petisco. `solucoes` conta
 * quantos caminhos distintos chegam no mínimo — com muitos, a fase tem atalho.
 */
export function resolverFase(f: Fase, maxDobras = 8): Solucao | null {
  let fronteira: { e: Estado; seq: [Eixo, number][] }[] = [{ e: estadoInicial(f), seq: [] }];
  const vistos = new Set<string>([chave(fronteira[0].e)]);
  for (let prof = 1; prof <= maxDobras; prof++) {
    const proxima: typeof fronteira = [];
    const achadas: [Eixo, number][][] = [];
    for (const { e, seq } of fronteira) {
      const opcoes: [Eixo, number][] = [...e.vincosV.map((k) => ['v', k] as [Eixo, number]), ...e.vincosH.map((k) => ['h', k] as [Eixo, number])];
      for (const [eixo, k] of opcoes) {
        const d = dobrar(e, eixo, k);
        if (!d) continue;
        const c = caminhar(d);
        const nova = [...seq, [eixo, k] as [Eixo, number]];
        if (c.venceu) { achadas.push(nova); continue; }
        const ch = chave(c.estado);
        if (vistos.has(ch)) continue;
        vistos.add(ch);
        proxima.push({ e: c.estado, seq: nova });
      }
    }
    if (achadas.length) return { dobras: prof, sequencia: achadas[0], solucoes: achadas.length };
    fronteira = proxima;
    if (!fronteira.length) return null;
  }
  return null;
}

/** Estrelas: 3 no mínimo de dobras, 2 com uma a mais, 1 com mais que isso. */
export function estrelas(dobras: number, minimo: number): 1 | 2 | 3 {
  return dobras <= minimo ? 3 : dobras === minimo + 1 ? 2 : 1;
}
