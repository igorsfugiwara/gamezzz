import { describe, expect, it } from 'vitest';
import {
  FASES, INTEGRANTES, INIMIGOS, PROGRESSO_INICIAL, acerta, liberado, concluirFase, danoDoGolpe, formatarTempo, nota, pedacosDaFita,
} from './regras';

describe('acerto de golpe', () => {
  const atk = { x: 100, y: 200, z: 0, dir: 1 as const };
  it('pega quem está na frente, dentro do alcance e na mesma faixa', () => {
    expect(acerta(atk, { x: 125, y: 205, z: 0, dir: -1 }, 34)).toBe(true);
  });
  it('não pega quem está atrás, longe ou em outra faixa', () => {
    expect(acerta(atk, { x: 80, y: 200, z: 0, dir: -1 }, 34)).toBe(false);
    expect(acerta(atk, { x: 140, y: 200, z: 0, dir: -1 }, 34)).toBe(false);
    expect(acerta(atk, { x: 120, y: 230, z: 0, dir: -1 }, 34)).toBe(false);
  });
  it('pulo alto passa por cima do soco', () => {
    expect(acerta(atk, { x: 120, y: 200, z: 60, dir: -1 }, 34)).toBe(false);
  });
  it('virado para a esquerda, pega quem está à esquerda', () => {
    expect(acerta({ ...atk, dir: -1 }, { x: 75, y: 200, z: 0, dir: 1 }, 34)).toBe(true);
  });
});

describe('dano', () => {
  it('o finalizador e a voadora batem mais que o jab', () => {
    expect(danoDoGolpe(1, 2, false)).toBeGreaterThan(danoDoGolpe(1, 0, false));
    expect(danoDoGolpe(1, 0, true)).toBeGreaterThan(danoDoGolpe(1, 0, false));
  });
  it('força multiplica', () => {
    expect(danoDoGolpe(1.35, 0, false)).toBeGreaterThan(danoDoGolpe(0.8, 0, false));
  });
  it('um combo inteiro do mais fraco derruba um PM em poucas sequências', () => {
    const fraco = Math.min(...INTEGRANTES.map((i) => i.forca));
    const combo = danoDoGolpe(fraco, 0, false) + danoDoGolpe(fraco, 1, false) + danoDoGolpe(fraco, 2, false);
    expect(Math.ceil(INIMIGOS.pm.vida / combo)).toBeLessThanOrEqual(2);
  });
});

describe('nota da fase', () => {
  it('sem dano, rápido e com combo é S', () => {
    expect(nota(0, 120, 210, 12)).toBe('S');
  });
  it('apanhar muito e demorar derruba a nota', () => {
    expect(nota(150, 400, 210, 2)).toBe('C');
  });
  it('continue custa nota', () => {
    expect(nota(20, 200, 210, 8, 0)).not.toBe(nota(20, 200, 210, 8, 2));
  });
  it('formata o tempo', () => {
    expect(formatarTempo(125.7)).toBe('2:05');
  });
});

describe('progresso', () => {
  it('concluir libera a próxima fase, guarda o melhor e o arquivo', () => {
    let p = concluirFase(PROGRESSO_INICIAL, 0, { nota: 'A', tempo: 30, pontos: 100 });
    expect(p.liberada).toBe(1);
    p = concluirFase(p, 1, { nota: 'B', tempo: 200, pontos: 5000 });
    expect(p.liberada).toBe(2);
    expect(p.arquivo).toContain(1);
    expect(pedacosDaFita(p)).toBe(1);
    const pior = concluirFase(p, 1, { nota: 'C', tempo: 300, pontos: 100 });
    expect(pior.melhores[1].pontos).toBe(5000);
  });
  it('o Felipeles sai com um S', () => {
    const felipe = INTEGRANTES.find((i) => i.id === 'felipeles')!;
    expect(liberado(felipe, PROGRESSO_INICIAL)).toBe(false);
    expect(liberado(felipe, concluirFase(PROGRESSO_INICIAL, 1, { nota: 'S', tempo: 90, pontos: 9000 }))).toBe(true);
  });
  it('zerar a última fase libera o secreto', () => {
    const ultima = FASES.length - 1;
    const p = concluirFase({ ...PROGRESSO_INICIAL, liberada: ultima }, ultima, { nota: 'S', tempo: 100, pontos: 9000 });
    expect(p.zerou).toBe(true);
    expect(p.liberada).toBe(ultima);
  });
});

describe('fases', () => {
  it('cada fase de rua tem ondas, quebráveis e chefão, com ondas em ordem', () => {
    for (const f of FASES.filter((x) => x.n > 0)) {
      expect(f.chefe).not.toBeNull();
      expect(f.ondas.length).toBeGreaterThanOrEqual(3);
      expect(f.ondas.map((o) => o.x)).toEqual([...f.ondas.map((o) => o.x)].sort((a, b) => a - b));
      expect(Math.max(...f.ondas.map((o) => o.x))).toBeLessThan(f.comprimento - 480);
    }
  });
});
