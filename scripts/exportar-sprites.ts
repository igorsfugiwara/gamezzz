/**
 * Exporta os bonecos (grades de cor) para as miniaturas do portal:
 *   npx vite-node scripts/exportar-sprites.ts
 * Gera scripts/sprites.json, lido por scripts/miniaturas_portal.py.
 */
import { writeFileSync } from 'node:fs';
import { bonecoHD as boneco, bonecoDoPovo } from '../jogos/compartilhado/boneco';
import { integranteHD as integrante } from '../jogos/faca/visual';
import { VISUAL as ESCOMBRO, GIRO_LUTA, gradePato } from '../jogos/escombro/sprites';

const banda = Object.fromEntries((['vocal', 'guitarra', 'baixo', 'bateria'] as const).map((q) => [q, integrante(q, q === 'vocal' ? { pose: 'microfone', grito: true } : q === 'guitarra' ? { quadro: 2 } : { quadro: 1 })]));
const publico = Array.from({ length: 14 }, (_, i) => boneco(bonecoDoPovo(i * 37 + 11, 'povo', { pose: i % 3 === 0 ? 'maos' : 'chifres', grito: i % 2 === 0 })));
const roda = {
  vocal: boneco({ ...bonecoDoPovo(1), estilo: 'bone', cobertura: ['#b6ff3d', '#4fa64a', '#2e6b3a'], cabelo: ['#4a4657', '#2b2838', '#1b1726'], roupa: ['#f2762e', '#d6353f', '#8a1f36'], calca: ['#4a4657', '#2b2838', '#1b1726'], bau: ['#f7a868', '#f2762e', '#d6353f'], pose: 'microfone', grito: true, jaqueta: false, estampa: false }),
  povo: Array.from({ length: 16 }, (_, i) => boneco(bonecoDoPovo(i * 53 + 7, i % 5 === 0 ? 'motoboy' : i % 7 === 0 ? 'tia' : 'povo', { quadro: (i % 4) as 0 | 1 | 2 | 3, passo: ((i + 1) % 4) as 0 | 1 | 2 | 3 }))),
};
const escombro = {
  banda: (['vocal', 'pucci', 'igor', 'renato'] as const).map((q) => boneco({ ...ESCOMBRO[q], giro: GIRO_LUTA, pose: 'guarda' })),
  pato: gradePato(3),
};
writeFileSync(new URL('./sprites.json', import.meta.url), JSON.stringify({ banda, publico, roda, escombro }));
console.log('ok scripts/sprites.json');
