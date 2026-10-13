/**
 * Fases do RODA. MVP do PRD: fases 1 e 2 com chefes.
 * Mapas desenhados por código (asfalto, calçada, faixa, neon) — sem Tiled no MVP.
 */
import { PALETA as P } from '../compartilhado/paleta';

export type TipoAlvo = 'catraca' | 'viatura' | 'predio';
export type Chefe = 'proprietario' | 'algoritmo';

export interface FaseRoda {
  numero: number;
  bairro: string;
  chefe: Chefe;
  nomeChefe: string;
  fala: string;
  queda: string;
  arena: { w: number; h: number };
  cores: { asfalto: string; calcada: string; faixa: string; neon: string; ceu: string };
  alvos: { tipo: TipoAlvo; x: number; y: number }[];
  povo: number;
  segurancasMax: number;
}

export const VIDA_ALVO: Record<TipoAlvo, number> = { catraca: 18, viatura: 36, predio: 70 };

export const FASES_RODA: FaseRoda[] = [
  {
    numero: 1,
    bairro: 'Centro',
    chefe: 'proprietario',
    nomeChefe: 'O Proprietário',
    fala: 'Reajuste anual. Ou mensal. Tanto faz.',
    queda: 'O prédio dele desabou… e virou ocupação.',
    arena: { w: 520, h: 340 },
    cores: { asfalto: P.asfalto, calcada: P.concreto, faixa: P.papel, neon: P.neon_rosa, ceu: P.noite },
    alvos: [
      { tipo: 'catraca', x: 110, y: 90 },
      { tipo: 'catraca', x: 400, y: 250 },
      { tipo: 'viatura', x: 380, y: 95 },
      { tipo: 'viatura', x: 130, y: 260 },
      { tipo: 'predio', x: 260, y: 170 },
    ],
    povo: 70,
    segurancasMax: 9,
  },
  {
    numero: 2,
    bairro: 'Zona Sul',
    chefe: 'algoritmo',
    nomeChefe: 'O Algoritmo',
    fala: 'Sua taxa foi ajustada para melhor atendê-lo.',
    queda: 'Tela azul. Todo celular da cidade: "Você está offline". Todo mundo sorri.',
    arena: { w: 580, h: 380 },
    cores: { asfalto: '#2a2f3f', calcada: '#3e4a5e', faixa: P.amarelo, neon: P.neon_ciano, ceu: P.marinho },
    alvos: [
      { tipo: 'predio', x: 150, y: 120 },
      { tipo: 'predio', x: 430, y: 260 },
      { tipo: 'catraca', x: 430, y: 100 },
      { tipo: 'catraca', x: 150, y: 280 },
      { tipo: 'viatura', x: 290, y: 190 },
      { tipo: 'catraca', x: 290, y: 60 },
    ],
    povo: 90,
    segurancasMax: 14,
  },
];
