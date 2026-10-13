import { describe, it, expect } from 'vitest';
import { pistasDaLinha, resolverLinha, resolver, pistasDoDesenho, DESCONHECIDA, VAZIA, CHEIA } from './nonograma';

describe('pistasDaLinha', () => {
  it('conta os blocos seguidos', () => {
    expect(pistasDaLinha([true, true, false, true, false, true, true, true])).toEqual([2, 1, 3]);
  });
  it('linha vazia tem pista 0', () => {
    expect(pistasDaLinha([false, false, false])).toEqual([0]);
  });
});

describe('resolverLinha', () => {
  const D = DESCONHECIDA, V = VAZIA, C = CHEIA;

  it('bloco que ocupa a linha inteira pinta tudo', () => {
    expect(resolverLinha([5], [D, D, D, D, D])).toEqual([C, C, C, C, C]);
  });
  it('sobreposição: bloco de 4 em 5 casas pinta as 3 do meio', () => {
    expect(resolverLinha([4], [D, D, D, D, D])).toEqual([D, C, C, C, D]);
  });
  it('pista 0 esvazia a linha', () => {
    expect(resolverLinha([0], [D, D, D])).toEqual([V, V, V]);
  });
  it('usa o que já se sabe da linha', () => {
    expect(resolverLinha([1, 1], [C, D, D, D, C])).toEqual([C, V, V, V, C]);
  });
  it('contradição devolve null', () => {
    expect(resolverLinha([3], [V, C, V, D, D])).toBeNull();
  });
});

describe('resolver', () => {
  it('resolve só com dedução quando a solução é única', () => {
    const desenho = [
      [false, true, false],
      [true, true, true],
      [false, true, false],
    ];
    const { linhas, colunas } = pistasDoDesenho(desenho);
    const r = resolver(linhas, colunas);
    expect(r.resolvido).toBe(true);
    expect(r.grade.map((l) => l.map((c) => c === CHEIA))).toEqual(desenho);
  });

  it('não resolve quando precisaria chutar (duas soluções)', () => {
    // Diagonal 2×2: as pistas são as mesmas da outra diagonal.
    const { linhas, colunas } = pistasDoDesenho([[true, false], [false, true]]);
    expect(resolver(linhas, colunas).resolvido).toBe(false);
  });
});
