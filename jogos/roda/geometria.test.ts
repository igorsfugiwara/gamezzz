import { describe, it, expect } from 'vitest';
import { cruzamento, pontoNoPoligono, areaPoligono, detectarRoda, type Ponto } from './geometria';

describe('cruzamento', () => {
  it('acha o ponto onde dois segmentos se cruzam', () => {
    const p = cruzamento({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 });
    expect(p).toEqual({ x: 5, y: 5 });
  });
  it('paralelos ou separados não cruzam', () => {
    expect(cruzamento({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 1 }, { x: 10, y: 1 })).toBeNull();
    expect(cruzamento({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 5, y: 0 }, { x: 6, y: -1 })).toBeNull();
  });
});

describe('pontoNoPoligono', () => {
  const quadrado: Ponto[] = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  it('dentro e fora', () => {
    expect(pontoNoPoligono({ x: 5, y: 5 }, quadrado)).toBe(true);
    expect(pontoNoPoligono({ x: 15, y: 5 }, quadrado)).toBe(false);
  });
  it('área', () => {
    expect(areaPoligono(quadrado)).toBe(100);
  });
});

describe('detectarRoda', () => {
  // Rastro que dá a volta num quadrado e cruza o próprio começo.
  const volta: Ponto[] = [];
  for (let x = 0; x <= 40; x += 2) volta.push({ x, y: 0 });
  for (let y = 2; y <= 40; y += 2) volta.push({ x: 40, y });
  for (let x = 38; x >= 0; x -= 2) volta.push({ x, y: 40 });
  for (let y = 39; y >= -1; y -= 2) volta.push({ x: 11, y }); // para logo depois de cruzar, como no jogo

  it('fecha a roda quando a cabeça cruza o rastro e devolve o polígono', () => {
    const r = detectarRoda(volta, 0, 30);
    expect(r).not.toBeNull();
    expect(pontoNoPoligono({ x: 25, y: 20 }, r!.poligono)).toBe(true);
    expect(pontoNoPoligono({ x: 5, y: 20 }, r!.poligono)).toBe(false);
  });

  it('não conta o rastro antes de `desde` (a roda anterior já foi cobrada)', () => {
    expect(detectarRoda(volta, volta.length - 10, 30)).toBeNull();
  });

  it('roda pequena demais (tremida do dedo) não conta', () => {
    const tremida: Ponto[] = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }, { x: 1, y: -1 }];
    expect(detectarRoda(tremida, 0, 50)).toBeNull();
  });
});
