import { describe, it, expect } from 'vitest';
import { DESENHOS, COLECOES } from './desenhos';
import { solucaoDoDesenho, corDaCelula } from './calendario';
import { pistasDoDesenho, resolver } from './nonograma';

describe('os 30 desenhos', () => {
  it('são 30, 6 por coleção', () => {
    expect(DESENHOS).toHaveLength(30);
    for (const c of COLECOES) expect(DESENHOS.filter((d) => d.colecao === c.id)).toHaveLength(6);
  });

  it('ids únicos', () => {
    expect(new Set(DESENHOS.map((d) => d.id)).size).toBe(30);
  });

  it.each(DESENHOS.map((d) => [d.id, d] as const))('%s: grade quadrada de 10, 12 ou 15', (_id, d) => {
    expect([10, 12, 15]).toContain(d.arte.length);
    for (const linha of d.arte) expect(linha).toHaveLength(d.arte.length);
  });

  it.each(DESENHOS.map((d) => [d.id, d] as const))('%s: toda letra tem cor', (_id, d) => {
    for (const linha of d.arte) for (const ch of linha) if (ch !== '.') expect(corDaCelula(d, ch)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it.each(DESENHOS.map((d) => [d.id, d] as const))('%s: resolve só por dedução', (_id, d) => {
    const { linhas, colunas } = pistasDoDesenho(solucaoDoDesenho(d));
    expect(resolver(linhas, colunas).resolvido).toBe(true);
  });

  it.each(DESENHOS.map((d) => [d.id, d] as const))('%s: tem desenho de verdade (≥ 20% pintado)', (_id, d) => {
    const s = solucaoDoDesenho(d).flat();
    expect(s.filter(Boolean).length / s.length).toBeGreaterThanOrEqual(0.2);
  });
});
