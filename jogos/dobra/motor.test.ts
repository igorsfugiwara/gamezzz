import { describe, it, expect } from 'vitest';
import { estadoInicial, dobrar, caminhar, jogar, resolverFase, type Fase } from './motor';

const fase = (o: Partial<Fase>): Fase => ({
  id: 't', largura: 4, altura: 4, vincosV: [], vincosH: [], pecas: [],
  cao: { x: 0, y: 0, dir: 'L' }, ...o,
});

describe('dobrar', () => {
  it('a metade sem o cachorro vira por cima, espelhada no vinco', () => {
    const e = estadoInicial(fase({ largura: 4, altura: 1, vincosV: [2], cao: { x: 0, y: 0, dir: 'L' }, pecas: [{ x: 3, y: 0, tipo: 'parede' }] }));
    const d = dobrar(e, 'v', 2)!;
    expect(d.largura).toBe(2);
    // x=3 espelha no vinco 2: 2·2−1−3 = 0 — cai na casa do cachorro (ele fica por cima).
    expect(d.celulas[0][0]).toBe('parede');
    expect(d.cao.x).toBe(0);
  });

  it('dobrar a metade maior faz o papel passar da borda (a grade cresce para o outro lado)', () => {
    const e = estadoInicial(fase({ largura: 5, altura: 1, vincosV: [1], cao: { x: 0, y: 0, dir: 'L' }, pecas: [{ x: 4, y: 0, tipo: 'petisco' }] }));
    const d = dobrar(e, 'v', 1)!;
    // Direita (x 1..4) dobra sobre a esquerda: espelhos em 0, -1, -2, -3 → grade de largura 4.
    expect(d.largura).toBe(4);
    expect(d.cao.x).toBe(3);
    expect(d.celulas[0][0]).toBe('petisco');
  });

  it('peça da metade dobrada fica por cima da que já estava', () => {
    const e = estadoInicial(fase({
      largura: 2, altura: 1, vincosV: [1], cao: { x: 0, y: 0, dir: 'L' },
      pecas: [{ x: 0, y: 0, tipo: 'osso' }, { x: 1, y: 0, tipo: 'almofada' }],
    }));
    expect(dobrar(e, 'v', 1)!.celulas[0][0]).toBe('almofada');
  });

  it('vincos continuam depois da dobra, nas posições novas', () => {
    const e = estadoInicial(fase({ largura: 6, altura: 2, vincosV: [2, 4], vincosH: [1], cao: { x: 0, y: 0, dir: 'L' } }));
    const d = dobrar(e, 'v', 4)!;
    expect(d.vincosV).toEqual([2]);
    expect(d.vincosH).toEqual([1]);
  });

  it('vinco inexistente não dobra', () => {
    expect(dobrar(estadoInicial(fase({ vincosV: [2] })), 'v', 1)).toBeNull();
  });
});

describe('caminhar', () => {
  const andar = (pecas: Fase['pecas'], dir: 'L' | 'O' | 'N' | 'S' = 'L', largura = 5) =>
    caminhar(estadoInicial(fase({ largura, altura: 1, pecas, cao: { x: 0, y: 0, dir } })));

  it('anda até a borda', () => {
    expect(andar([]).estado.cao.x).toBe(4);
  });
  it('para antes da parede e reclama', () => {
    const r = andar([{ x: 3, y: 0, tipo: 'parede' }]);
    expect(r.estado.cao.x).toBe(2);
    expect(r.reacao).toBe('bateu');
  });
  it('recusa passar pela poça', () => {
    const r = andar([{ x: 2, y: 0, tipo: 'poca' }]);
    expect(r.estado.cao.x).toBe(1);
    expect(r.reacao).toBe('poca');
  });
  it('para na almofada e vira à esquerda (leste → norte)', () => {
    const r = caminhar(estadoInicial(fase({ largura: 5, altura: 3, pecas: [{ x: 2, y: 2, tipo: 'almofada' }], cao: { x: 0, y: 2, dir: 'L' } })));
    expect(r.estado.cao).toEqual({ x: 2, y: 2, dir: 'N' });
  });
  it('o gato assusta e o cachorro volta', () => {
    const r = andar([{ x: 3, y: 0, tipo: 'gato' }], 'L');
    expect(r.estado.cao.dir).toBe('O');
    expect(r.estado.cao.x).toBe(0);
    expect(r.reacao).toBe('susto');
  });
  it('come o petisco e vence', () => {
    const r = andar([{ x: 2, y: 0, tipo: 'petisco' }]);
    expect(r.venceu).toBe(true);
    expect(r.estado.cao.x).toBe(2);
  });
  it('pega o osso no caminho e segue', () => {
    const r = andar([{ x: 1, y: 0, tipo: 'osso' }]);
    expect(r.estado.ossos).toBe(1);
    expect(r.estado.cao.x).toBe(4);
  });
});

describe('fase de exemplo do PRD: a ordem das dobras muda tudo', () => {
  // 6×6, vinco vertical no meio e horizontal na linha 3. Cachorro embaixo à
  // esquerda olhando para a direita; dobrar na vertical primeiro joga a parede
  // na cara dele. Dobrando a horizontal primeiro, a almofada cai na frente,
  // ele para e vira para cima; aí a vertical traz o petisco para a coluna dele.
  const almofadaFujona: Fase = {
    id: '1-7', largura: 6, altura: 6, vincosV: [3], vincosH: [3],
    cao: { x: 0, y: 5, dir: 'L' },
    pecas: [
      { x: 4, y: 5, tipo: 'parede' },
      { x: 2, y: 0, tipo: 'almofada' },
      { x: 3, y: 3, tipo: 'petisco' },
    ],
  };

  it('vertical primeiro: bate na parede', () => {
    const r = jogar(almofadaFujona, [['v', 3]]);
    expect(r.reacao).toBe('bateu');
    expect(r.venceu).toBe(false);
  });

  it('horizontal e depois vertical: vence em 2 dobras', () => {
    expect(jogar(almofadaFujona, [['h', 3], ['v', 3]]).venceu).toBe(true);
  });

  it('o solver acha o mínimo de 2 dobras', () => {
    expect(resolverFase(almofadaFujona)?.dobras).toBe(2);
  });
});
