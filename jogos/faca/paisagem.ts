/**
 * Ilustrações das paradas da turnê (topo da tela de evento): estrada à
 * noite com a van, rua da cidade e pousada de beira de estrada. Pixel art
 * na mesma densidade do palco, desenhada uma vez por parada.
 */
import { PALETA as P } from '../compartilhado/paleta';
import { boneco, bonecoDoPovo, BONECO_A, BONECO_L } from '../compartilhado/boneco';
import { emCache } from '../compartilhado/canvas';
import { integrante } from './visual';
import type { Integrante } from './motor';

export const PAISAGEM_L = 480;
export const PAISAGEM_A = 180;
export type Parada = 'estrada' | 'cidade' | 'pousada';

function aleatorio(semente: number) {
  let s = semente || 7;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function ceu(b: CanvasRenderingContext2D, r: () => number, ate: number) {
  const g = b.createLinearGradient(0, 0, 0, ate);
  g.addColorStop(0, P.preto);
  g.addColorStop(1, P.marinho);
  b.fillStyle = g;
  b.fillRect(0, 0, PAISAGEM_L, ate);
  for (let i = 0; i < 70; i++) {
    b.fillStyle = r() < 0.8 ? P.neblina : P.branco;
    b.fillRect(Math.floor(r() * PAISAGEM_L), Math.floor(r() * ate * 0.7), 1, 1);
  }
  // Lua com cratera.
  b.fillStyle = P.papel; b.beginPath(); b.arc(404, 34, 14, 0, Math.PI * 2); b.fill();
  b.fillStyle = P.neblina; b.fillRect(398, 28, 4, 3); b.fillRect(408, 38, 3, 3);
  b.fillStyle = P.marinho; b.beginPath(); b.arc(410, 30, 12, 0, Math.PI * 2); b.globalAlpha = 0.25; b.fill(); b.globalAlpha = 1;
}

/** A van da banda, de lado, com o nome pintado na lataria. */
export function desenharVan(b: CanvasRenderingContext2D, x: number, y: number, nomeBanda: string, farol = true) {
  b.fillStyle = P.preto; b.fillRect(x, y, 120, 50);
  b.fillStyle = P.papel; b.fillRect(x + 2, y + 2, 116, 34);
  b.fillStyle = P.branco; b.fillRect(x + 2, y + 2, 116, 4);
  b.fillStyle = P.neblina; b.fillRect(x + 2, y + 30, 116, 6);
  b.fillStyle = P.vinho; b.fillRect(x + 2, y + 36, 116, 12); // saia
  b.fillStyle = P.vermelho; b.fillRect(x + 2, y + 36, 116, 2);
  // Janelas e porta.
  b.fillStyle = P.preto; b.fillRect(x + 86, y + 6, 28, 14); b.fillRect(x + 50, y + 6, 32, 14);
  b.fillStyle = P.azul; b.fillRect(x + 88, y + 8, 24, 10); b.fillRect(x + 52, y + 8, 28, 10);
  b.fillStyle = P.ceu; b.fillRect(x + 89, y + 9, 8, 3); b.fillRect(x + 53, y + 9, 10, 3);
  b.fillStyle = P.cimento; b.fillRect(x + 84, y + 6, 1, 30);
  // Nome da banda na lateral, meio apagado.
  b.font = '7px "Press Start 2P", monospace'; b.textAlign = 'left'; b.textBaseline = 'middle';
  b.fillStyle = P.preto;
  b.fillText(nomeBanda.toUpperCase().slice(0, 10), x + 6, y + 26);
  // Rodas.
  for (const rx of [x + 22, x + 96]) {
    b.fillStyle = P.preto; b.beginPath(); b.arc(rx, y + 48, 10, 0, Math.PI * 2); b.fill();
    b.fillStyle = P.concreto; b.beginPath(); b.arc(rx, y + 48, 5, 0, Math.PI * 2); b.fill();
    b.fillStyle = P.neblina; b.fillRect(rx - 1, y + 46, 2, 2);
  }
  // Farol e lanterna.
  b.fillStyle = P.amarelo; b.fillRect(x + 114, y + 28, 5, 5);
  b.fillStyle = P.vermelho; b.fillRect(x + 1, y + 26, 3, 6);
  if (farol) {
    b.globalAlpha = 0.18; b.fillStyle = P.amarelo;
    b.beginPath(); b.moveTo(x + 119, y + 30); b.lineTo(x + 230, y + 14); b.lineTo(x + 230, y + 56); b.closePath(); b.fill();
    b.globalAlpha = 1;
  }
}

function placaDeCidade(b: CanvasRenderingContext2D, x: number, y: number, texto: string) {
  b.fillStyle = P.cimento; b.fillRect(x + 30, y + 18, 3, 40);
  b.fillStyle = P.preto; b.fillRect(x - 1, y - 1, 66, 22);
  b.fillStyle = P.folha; b.fillRect(x, y, 64, 20);
  b.fillStyle = P.branco; b.fillRect(x + 2, y + 2, 60, 1); b.fillRect(x + 2, y + 17, 60, 1);
  b.font = '6px "Press Start 2P", monospace'; b.textAlign = 'center'; b.textBaseline = 'middle';
  b.fillStyle = P.branco;
  const esc = Math.min(1, 58 / Math.max(1, b.measureText(texto).width));
  b.save(); b.translate(x + 32, y + 10); b.scale(esc, 1); b.fillText(texto, 0, 0); b.restore();
}

function pessoa(b: CanvasRenderingContext2D, x: number, chao: number, semente: number, quem?: Integrante) {
  const s = quem
    ? emCache(`pais-${quem}`, () => integrante(quem, quem === 'bateria' ? { pose: 'parado' } : { extra: undefined }))
    : emCache(`pais-povo-${semente}`, () => boneco(bonecoDoPovo(semente)));
  b.drawImage(s, Math.round(x - BONECO_L / 2), chao - BONECO_A + 4);
}

function estrada(b: CanvasRenderingContext2D, r: () => number, cidade: string, nomeBanda: string, rumo: string) {
  ceu(b, r, 120);
  // Serras em camadas.
  for (const [cor, base, amp] of [[P.noite, 104, 26], [P.asfalto, 116, 16]] as const) {
    b.fillStyle = cor;
    b.beginPath(); b.moveTo(0, 120);
    for (let x = 0; x <= PAISAGEM_L; x += 16) b.lineTo(x, base - Math.abs(Math.sin(x / 47 + base)) * amp - r() * 6);
    b.lineTo(PAISAGEM_L, 120); b.closePath(); b.fill();
  }
  // Asfalto com faixa amarela tracejada.
  b.fillStyle = P.concreto; b.fillRect(0, 120, PAISAGEM_L, 60);
  b.fillStyle = P.asfalto; b.fillRect(0, 124, PAISAGEM_L, 52);
  b.fillStyle = P.amarelo; for (let x = 6; x < PAISAGEM_L; x += 28) b.fillRect(x, 149, 14, 2);
  b.fillStyle = P.cimento; b.fillRect(0, 176, PAISAGEM_L, 4);
  desenharVan(b, 150, 98, nomeBanda);
  placaDeCidade(b, 380, 72, `${cidade} ${rumo}`);
  // Postes de luz passando.
  for (const x of [40, 300]) {
    b.fillStyle = P.concreto; b.fillRect(x, 60, 3, 62); b.fillRect(x, 60, 16, 3);
    b.fillStyle = P.amarelo; b.fillRect(x + 12, 63, 6, 3);
    b.globalAlpha = 0.12; b.fillStyle = P.amarelo; b.beginPath(); b.moveTo(x + 15, 66); b.lineTo(x - 10, 124); b.lineTo(x + 40, 124); b.closePath(); b.fill(); b.globalAlpha = 1;
  }
}

function cidade(b: CanvasRenderingContext2D, r: () => number, nome: string) {
  ceu(b, r, 90);
  // Fachadas: bar, loja de discos, sobrado, farmácia.
  const fachadas: [number, number, number, string, string, string][] = [
    [0, 50, 110, P.vinho, 'BAR', P.neon_rosa],
    [112, 36, 100, P.musgo, 'DISCOS', P.neon_verde],
    [214, 58, 120, P.concreto, '', ''],
    [336, 44, 144, P.marinho, 'PASTEL', P.amarelo],
  ];
  for (const [x, topo, w, cor, letreiro, neon] of fachadas) {
    b.fillStyle = P.preto; b.fillRect(x, topo - 2, w, 150 - topo + 2);
    b.fillStyle = cor; b.fillRect(x + 2, topo, w - 4, 150 - topo);
    b.fillStyle = 'rgba(0,0,0,0.25)'; b.fillRect(x + w - 10, topo, 8, 150 - topo);
    // Janelas acesas/apagadas.
    for (let jy = topo + 8; jy < 100; jy += 18) for (let jx = x + 10; jx < x + w - 18; jx += 22) {
      b.fillStyle = P.preto; b.fillRect(jx - 1, jy - 1, 14, 12);
      b.fillStyle = r() < 0.55 ? P.amarelo : P.noite; b.fillRect(jx, jy, 12, 10);
      b.fillStyle = 'rgba(0,0,0,0.3)'; b.fillRect(jx + 6, jy, 1, 10);
    }
    // Porta de aço e letreiro de neon.
    b.fillStyle = P.cimento; b.fillRect(x + 12, 110, w - 30, 40);
    b.fillStyle = P.concreto; for (let ly = 112; ly < 150; ly += 3) b.fillRect(x + 12, ly, w - 30, 1);
    if (letreiro) {
      b.font = '8px "Press Start 2P", monospace'; b.textAlign = 'center'; b.textBaseline = 'middle';
      b.fillStyle = P.preto; b.fillRect(x + w / 2 - 34, 96, 68, 13);
      b.fillStyle = neon; b.fillText(letreiro, x + w / 2, 103);
      b.globalAlpha = 0.25; b.fillRect(x + w / 2 - 36, 94, 72, 17); b.globalAlpha = 1;
    }
  }
  // Calçada, meio-fio e gente.
  b.fillStyle = P.cimento; b.fillRect(0, 150, PAISAGEM_L, 14);
  b.fillStyle = P.neblina; for (let x = 0; x < PAISAGEM_L; x += 20) b.fillRect(x, 150, 1, 14);
  b.fillStyle = P.asfalto; b.fillRect(0, 164, PAISAGEM_L, 16);
  b.fillStyle = P.concreto; b.fillRect(0, 164, PAISAGEM_L, 2);
  for (let i = 0; i < 4; i++) pessoa(b, 40 + i * 120 + r() * 40, 160, Math.floor(r() * 999));
  placaDeCidade(b, 230, 64, nome);
}

function pousada(b: CanvasRenderingContext2D, r: () => number, nomeBanda: string, banda: Integrante[], letreiro: string) {
  ceu(b, r, 120);
  // Prédio baixo de beira de estrada com portas numeradas.
  b.fillStyle = P.preto; b.fillRect(150, 66, 330, 86);
  b.fillStyle = P.pastel_creme; b.fillRect(152, 68, 326, 84);
  b.fillStyle = P.vinho; b.fillRect(148, 60, 334, 10); // telhado
  b.fillStyle = P.vermelho; b.fillRect(148, 60, 334, 2);
  for (let i = 0; i < 6; i++) {
    const x = 166 + i * 52;
    b.fillStyle = P.preto; b.fillRect(x - 1, 99, 22, 53);
    b.fillStyle = [P.azul, P.folha, P.vinho][i % 3]; b.fillRect(x, 100, 20, 52);
    b.fillStyle = P.amarelo; b.fillRect(x + 16, 126, 2, 2);
    b.font = '6px "Press Start 2P", monospace'; b.textAlign = 'center'; b.fillStyle = P.branco; b.fillText(String(i + 1), x + 10, 108);
    b.fillStyle = P.preto; b.fillRect(x + 24, 80, 18, 14);
    b.fillStyle = r() < 0.5 ? P.amarelo : P.noite; b.fillRect(x + 25, 81, 16, 12);
  }
  // Letreiro de neon no poste, com uma letra queimada.
  b.fillStyle = P.concreto; b.fillRect(70, 30, 4, 122);
  b.fillStyle = P.preto; b.fillRect(20, 16, 108, 30);
  b.fillStyle = P.noite; b.fillRect(22, 18, 104, 26);
  b.font = '10px "Press Start 2P", monospace'; b.textAlign = 'center'; b.textBaseline = 'middle';
  const letras = letreiro.toUpperCase();
  const queimada = Math.floor(r() * letras.length);
  [...letras].forEach((ch, i) => {
    b.fillStyle = i === queimada ? P.concreto : P.neon_rosa;
    b.fillText(ch, 74 - ((letras.length - 1) * 11) / 2 + i * 11, 31);
  });
  b.globalAlpha = 0.18; b.fillStyle = P.neon_rosa; b.fillRect(14, 10, 120, 42); b.globalAlpha = 1;
  // Estacionamento, van e a banda de bobeira.
  b.fillStyle = P.asfalto; b.fillRect(0, 152, PAISAGEM_L, 28);
  b.fillStyle = P.papel; for (let x = 10; x < PAISAGEM_L; x += 60) b.fillRect(x, 160, 2, 20);
  desenharVan(b, 4, 118, nomeBanda, false);
  banda.slice(0, 3).forEach((quem, i) => pessoa(b, 160 + i * 34, 176, 0, quem));
}

/** Ilustração da parada; mesma parada e cidade = mesma imagem. */
export function desenharParada(canvas: HTMLCanvasElement, tipo: Parada, opcoes: { cidade: string; nomeBanda: string; banda: Integrante[]; letreiro: string; rumo: string }) {
  canvas.width = PAISAGEM_L;
  canvas.height = PAISAGEM_A;
  const b = canvas.getContext('2d')!;
  b.imageSmoothingEnabled = false;
  let h = 0;
  for (const ch of opcoes.cidade + tipo) h = (h * 31 + ch.charCodeAt(0)) % 2147483647;
  const r = aleatorio(h);
  if (tipo === 'estrada') estrada(b, r, opcoes.cidade, opcoes.nomeBanda, opcoes.rumo);
  else if (tipo === 'cidade') cidade(b, r, opcoes.cidade);
  else pousada(b, r, opcoes.nomeBanda, opcoes.banda, opcoes.letreiro);
}
