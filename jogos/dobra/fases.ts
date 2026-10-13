/**
 * Mundo 1 — Quarto (parede e almofada). 15 fases, na curva do PRD:
 *   1–3 ensinam a dobra sem como errar · 4–6 apresentam a almofada ·
 *   7–10 combinam (a 7 é a "Almofada fujona" do PRD) · 11–14 pegadinhas,
 *   onde a dobra óbvia é a errada · 15 desafio do mundo, grade 8×8.
 *
 * Saíram do gerador (gerador.ts) e foram escolhidas à mão. `minimo` é o par
 * das 3 estrelas; o teste confere que bate com o solver.
 */
import type { Fase } from './motor';

export interface FaseDoMundo extends Fase { nome: string; minimo: number }

export const MUNDOS = [{ id: 1, nome: 'Quarto', fundo: '#f6e7c1', papel: '#fbf3df' }];

export const FASES: FaseDoMundo[] = [
  { id: '1-1', nome: 'Primeira dobra', minimo: 1, largura: 4, altura: 4, vincosV: [1], vincosH: [],
    cao: { x: 0, y: 0, dir: 'L' }, pecas: [{ x: 1, y: 0, tipo: 'petisco' }, { x: 1, y: 2, tipo: 'parede' }] },
  { id: '1-2', nome: 'De cima pra baixo', minimo: 1, largura: 4, altura: 4, vincosV: [3], vincosH: [1],
    cao: { x: 3, y: 1, dir: 'O' }, pecas: [{ x: 0, y: 0, tipo: 'petisco' }, { x: 1, y: 3, tipo: 'parede' }] },
  { id: '1-3', nome: 'Qual dos dois?', minimo: 1, largura: 4, altura: 5, vincosV: [3], vincosH: [2],
    cao: { x: 3, y: 0, dir: 'O' }, pecas: [{ x: 0, y: 0, tipo: 'petisco' }, { x: 3, y: 1, tipo: 'parede' }] },
  { id: '1-4', nome: 'Almofada nova', minimo: 2, largura: 4, altura: 4, vincosV: [3], vincosH: [1],
    cao: { x: 1, y: 0, dir: 'S' }, pecas: [{ x: 2, y: 1, tipo: 'petisco' }, { x: 1, y: 1, tipo: 'almofada' }] },
  { id: '1-5', nome: 'Curva na almofada', minimo: 2, largura: 5, altura: 4, vincosV: [2], vincosH: [3],
    cao: { x: 1, y: 3, dir: 'N' }, pecas: [{ x: 3, y: 0, tipo: 'petisco' }, { x: 1, y: 0, tipo: 'almofada' }] },
  { id: '1-6', nome: 'Desvio', minimo: 2, largura: 5, altura: 4, vincosV: [1], vincosH: [2],
    cao: { x: 4, y: 1, dir: 'O' }, pecas: [{ x: 1, y: 2, tipo: 'petisco' }, { x: 3, y: 2, tipo: 'parede' }, { x: 4, y: 0, tipo: 'almofada' }] },
  { id: '1-7', nome: 'Almofada fujona', minimo: 2, largura: 6, altura: 6, vincosV: [3], vincosH: [3],
    cao: { x: 0, y: 5, dir: 'L' }, pecas: [{ x: 4, y: 5, tipo: 'parede' }, { x: 2, y: 0, tipo: 'almofada' }, { x: 3, y: 3, tipo: 'petisco' }] },
  { id: '1-8', nome: 'Esquina', minimo: 2, largura: 5, altura: 5, vincosV: [4], vincosH: [2],
    cao: { x: 0, y: 3, dir: 'L' }, pecas: [{ x: 4, y: 2, tipo: 'petisco' }, { x: 3, y: 4, tipo: 'parede' }, { x: 4, y: 0, tipo: 'parede' }, { x: 4, y: 3, tipo: 'almofada' }] },
  { id: '1-9', nome: 'Três passos', minimo: 3, largura: 5, altura: 5, vincosV: [4], vincosH: [1, 3],
    cao: { x: 4, y: 4, dir: 'O' }, pecas: [{ x: 3, y: 2, tipo: 'petisco' }, { x: 1, y: 2, tipo: 'parede' }, { x: 4, y: 1, tipo: 'parede' }, { x: 3, y: 1, tipo: 'almofada' }, { x: 0, y: 1, tipo: 'almofada' }] },
  { id: '1-10', nome: 'Sofá', minimo: 3, largura: 5, altura: 5, vincosV: [3, 4], vincosH: [1, 3],
    cao: { x: 4, y: 4, dir: 'O' }, pecas: [{ x: 2, y: 2, tipo: 'petisco' }, { x: 3, y: 1, tipo: 'parede' }, { x: 2, y: 4, tipo: 'almofada' }] },
  { id: '1-11', nome: 'Parede no meio', minimo: 3, largura: 6, altura: 6, vincosV: [3], vincosH: [2, 3],
    cao: { x: 3, y: 5, dir: 'N' }, pecas: [{ x: 4, y: 3, tipo: 'petisco' }, { x: 0, y: 4, tipo: 'parede' }, { x: 3, y: 3, tipo: 'parede' }, { x: 5, y: 4, tipo: 'parede' }, { x: 3, y: 4, tipo: 'almofada' }] },
  { id: '1-12', nome: 'Não é por aí', minimo: 3, largura: 6, altura: 6, vincosV: [2], vincosH: [2, 3],
    cao: { x: 5, y: 1, dir: 'O' }, pecas: [{ x: 4, y: 3, tipo: 'petisco' }, { x: 1, y: 2, tipo: 'parede' }, { x: 5, y: 3, tipo: 'parede' }, { x: 3, y: 0, tipo: 'almofada' }] },
  { id: '1-13', nome: 'Duas almofadas', minimo: 3, largura: 6, altura: 6, vincosV: [1, 2], vincosH: [2],
    cao: { x: 0, y: 0, dir: 'S' }, pecas: [{ x: 4, y: 2, tipo: 'petisco' }, { x: 3, y: 5, tipo: 'parede' }, { x: 1, y: 2, tipo: 'almofada' }, { x: 0, y: 1, tipo: 'almofada' }] },
  { id: '1-14', nome: 'Origami', minimo: 4, largura: 6, altura: 6, vincosV: [4, 5], vincosH: [2, 4],
    cao: { x: 2, y: 5, dir: 'N' }, pecas: [{ x: 1, y: 5, tipo: 'petisco' }, { x: 5, y: 5, tipo: 'parede' }, { x: 1, y: 3, tipo: 'parede' }, { x: 0, y: 5, tipo: 'almofada' }, { x: 4, y: 5, tipo: 'almofada' }] },
  { id: '1-15', nome: 'O quarto inteiro', minimo: 4, largura: 8, altura: 8, vincosV: [2, 4, 5], vincosH: [2, 3, 6],
    cao: { x: 7, y: 6, dir: 'O' }, pecas: [{ x: 1, y: 2, tipo: 'petisco' }, { x: 2, y: 6, tipo: 'parede' }, { x: 5, y: 0, tipo: 'parede' }, { x: 2, y: 7, tipo: 'parede' }, { x: 1, y: 7, tipo: 'parede' }, { x: 3, y: 4, tipo: 'almofada' }, { x: 1, y: 0, tipo: 'almofada' }, { x: 0, y: 1, tipo: 'almofada' }, { x: 6, y: 3, tipo: 'osso' }] },
];
