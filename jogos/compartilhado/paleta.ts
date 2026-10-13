/**
 * Paleta do portal — 32 cores para os quatro jogos terem cara de família.
 * São Paulo exagerada: concreto, neon de bar, pôr do sol laranja, papel e
 * o caramelo do Shar Pei. Nenhum jogo inventa cor fora daqui.
 */
export const PALETA = {
  // Neutros (concreto e papel)
  preto: '#0d0b14',
  noite: '#1b1726',
  asfalto: '#2b2838',
  concreto: '#4a4657',
  cimento: '#6f6b7d',
  neblina: '#9c98a8',
  papel: '#d9d4c7',
  branco: '#f4f1ea',

  // Shar Pei e madeira
  caramelo: '#d99a5b',
  caramelo_claro: '#f0c08a',
  ruga: '#a8693a',
  chocolate: '#6b3f24',

  // Quentes (pôr do sol, boteco, feira)
  vermelho: '#d6353f',
  vinho: '#8a1f36',
  laranja: '#f2762e',
  pessego: '#f7a868',
  amarelo: '#f6c443',
  mostarda: '#c99a1c',

  // Verdes e azuis (praça, garoa, céu)
  folha: '#4fa64a',
  musgo: '#2e6b3a',
  menta: '#8fd6a4',
  ceu: '#5aa9e6',
  azul: '#2f5fbf',
  marinho: '#22306b',

  // Neon de bar
  neon_rosa: '#ff4fa3',
  neon_roxo: '#9b5cff',
  neon_ciano: '#3df0e6',
  neon_verde: '#b6ff3d',

  // Pastéis (Dobra)
  pastel_rosa: '#f2b8c6',
  pastel_azul: '#b8d4f2',
  pastel_verde: '#c8ebc0',
  pastel_creme: '#f6e7c1',
} as const;

export type Cor = keyof typeof PALETA;
