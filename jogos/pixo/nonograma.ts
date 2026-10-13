/**
 * Lógica do nonograma do PIXO, sem DOM — testável.
 *
 * O solver é por propagação de linhas: em cada linha e coluna, considera todas
 * as posições possíveis dos blocos e fixa o que é igual em todas. Repete até
 * não mudar mais. Se termina com a grade inteira conhecida, o desenho tem
 * solução única E se resolve só por dedução — "lógica pura, zero chute".
 */
export const DESCONHECIDA = -1;
export const VAZIA = 0;
export const CHEIA = 1;
export type Celula = typeof DESCONHECIDA | typeof VAZIA | typeof CHEIA;

/** Blocos seguidos de casas pintadas. Linha sem nada → [0]. */
export function pistasDaLinha(linha: boolean[]): number[] {
  const pistas: number[] = [];
  let atual = 0;
  for (const cheia of linha) {
    if (cheia) atual++;
    else if (atual) { pistas.push(atual); atual = 0; }
  }
  if (atual) pistas.push(atual);
  return pistas.length ? pistas : [0];
}

export function pistasDoDesenho(desenho: boolean[][]): { linhas: number[][]; colunas: number[][] } {
  const colunas = desenho[0].map((_, c) => desenho.map((l) => l[c]));
  return { linhas: desenho.map(pistasDaLinha), colunas: colunas.map(pistasDaLinha) };
}

/**
 * Deduz o que der numa linha. Devolve a linha com o que ficou certo, ou
 * null se as pistas não cabem (contradição).
 */
export function resolverLinha(pistas: number[], linha: Celula[]): Celula[] | null {
  const n = linha.length;
  const blocos = pistas[0] === 0 ? [] : pistas;
  let podeCheia = new Array<boolean>(n).fill(false);
  let podeVazia = new Array<boolean>(n).fill(false);
  let algumaSolucao = false;
  const atual = new Array<boolean>(n).fill(false);

  // Mínimo de casas que os blocos de k em diante ocupam (com 1 de espaço entre eles).
  const resto = new Array<number>(blocos.length + 1).fill(0);
  for (let k = blocos.length - 1; k >= 0; k--) resto[k] = blocos[k] + (k < blocos.length - 1 ? 1 : 0) + resto[k + 1];

  const memo = new Map<string, boolean>();

  // Tenta pôr o bloco k a partir da posição p; marca cheia/vazia possíveis.
  const colocar = (k: number, p: number): boolean => {
    const chave = `${k},${p}`;
    if (memo.has(chave) && !memo.get(chave)) return false;
    if (k === blocos.length) {
      for (let i = p; i < n; i++) if (linha[i] === CHEIA) { memo.set(chave, false); return false; }
      for (let i = 0; i < n; i++) {
        if (i >= p) atual[i] = false;
        if (atual[i]) podeCheia[i] = true; else podeVazia[i] = true;
      }
      algumaSolucao = true;
      return true;
    }
    let deu = false;
    const tam = blocos[k];
    for (let ini = p; ini + resto[k] <= n; ini++) {
      // Casas puladas antes do bloco precisam poder ser vazias.
      if (ini > p && linha[ini - 1] === CHEIA) break;
      let cabe = true;
      for (let i = ini; i < ini + tam; i++) if (linha[i] === VAZIA) { cabe = false; break; }
      if (!cabe) continue;
      const fim = ini + tam;
      if (fim < n && linha[fim] === CHEIA) continue;
      for (let i = p; i < ini; i++) atual[i] = false;
      for (let i = ini; i < fim; i++) atual[i] = true;
      if (fim < n) atual[fim] = false;
      if (colocar(k + 1, Math.min(n, fim + 1))) deu = true;
    }
    memo.set(chave, deu);
    return deu;
  };

  colocar(0, 0);
  if (!algumaSolucao) return null;
  const nova = linha.slice() as Celula[];
  for (let i = 0; i < n; i++) {
    if (podeCheia[i] && !podeVazia[i]) nova[i] = CHEIA;
    else if (!podeCheia[i] && podeVazia[i]) nova[i] = VAZIA;
  }
  podeCheia = []; podeVazia = [];
  return nova;
}

export interface Resolucao {
  resolvido: boolean;
  contradicao: boolean;
  grade: Celula[][];
  /** Quantas passadas completas foram necessárias (≈ dificuldade). */
  passadas: number;
}

export function resolver(linhas: number[][], colunas: number[][]): Resolucao {
  const altura = linhas.length;
  const largura = colunas.length;
  const grade: Celula[][] = Array.from({ length: altura }, () => new Array<Celula>(largura).fill(DESCONHECIDA));
  let passadas = 0;
  let mudou = true;
  while (mudou) {
    mudou = false;
    passadas++;
    for (let r = 0; r < altura; r++) {
      const nova = resolverLinha(linhas[r], grade[r]);
      if (!nova) return { resolvido: false, contradicao: true, grade, passadas };
      for (let c = 0; c < largura; c++) if (nova[c] !== grade[r][c]) { grade[r][c] = nova[c]; mudou = true; }
    }
    for (let c = 0; c < largura; c++) {
      const col = grade.map((l) => l[c]);
      const nova = resolverLinha(colunas[c], col);
      if (!nova) return { resolvido: false, contradicao: true, grade, passadas };
      for (let r = 0; r < altura; r++) if (nova[r] !== grade[r][c]) { grade[r][c] = nova[r]; mudou = true; }
    }
  }
  const resolvido = grade.every((l) => l.every((c) => c !== DESCONHECIDA));
  return { resolvido, contradicao: false, grade, passadas };
}
