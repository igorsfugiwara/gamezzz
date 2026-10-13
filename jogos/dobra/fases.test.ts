import { describe, it, expect } from 'vitest';
import { FASES } from './fases';
import { resolverFase, estadoInicial } from './motor';

describe('mundo 1', () => {
  it('tem 15 fases com ids em ordem', () => {
    expect(FASES.map((f) => f.id)).toEqual(Array.from({ length: 15 }, (_, i) => `1-${i + 1}`));
  });

  it.each(FASES.map((f) => [f.id, f] as const))('%s: o mínimo gravado bate com o solver', (_id, f) => {
    expect(resolverFase(f)?.dobras).toBe(f.minimo);
  });

  it.each(FASES.map((f) => [f.id, f] as const))('%s: peças dentro da grade e sem duas na mesma casa', (_id, f) => {
    const casas = new Set<string>([`${f.cao.x},${f.cao.y}`]);
    for (const p of f.pecas) {
      expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThan(f.largura);
      expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThan(f.altura);
      const k = `${p.x},${p.y}`;
      expect(casas.has(k)).toBe(false);
      casas.add(k);
    }
  });

  it.each(FASES.map((f) => [f.id, f] as const))('%s: tem vinco e o petisco não começa na boca', (_id, f) => {
    expect(f.vincosV.length + f.vincosH.length).toBeGreaterThan(0);
    expect(estadoInicial(f).celulas[f.cao.y][f.cao.x]).toBeNull();
  });

  it('a curva sobe: o mínimo de dobras nunca cai mais de 1 de uma fase para a seguinte', () => {
    for (let i = 1; i < FASES.length; i++) expect(FASES[i].minimo).toBeGreaterThanOrEqual(FASES[i - 1].minimo - 1);
  });
});
