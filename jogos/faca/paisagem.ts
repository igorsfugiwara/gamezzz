/**
 * Ilustrações das paradas da turnê (topo da tela de evento), com cara de
 * interior do Brasil: estrada com Kombi, coqueiro e placa verde de BR; rua
 * com padaria, boteco, orelhão e fiação embolada; pousada com rede na
 * varanda. O cenário é desenhado em 480×180 e ampliado com Scale2x; as
 * pessoas entram depois, já em HD.
 */
import { PALETA as P } from '../compartilhado/paleta';
import { bonecoDoPovo, bonecoHD, BONECO_A, BONECO_L } from '../compartilhado/boneco';
import { emCache, ampliarCanvas, desenharHD } from '../compartilhado/canvas';
import { integranteHD } from './visual';
import type { Integrante } from './motor';

export const PAISAGEM_L = 480;
export const PAISAGEM_A = 180;
export type Parada = 'estrada' | 'cidade' | 'pousada';

function aleatorio(semente: number) {
  let s = semente || 7;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/**
 * Textos ficam para depois da ampliação: o Scale2x deforma letra
 * (o S vira 6). Enquanto `pendentes` existe, `texto` só anota.
 */
let pendentes: ((c: CanvasRenderingContext2D) => void)[] | null = null;

function texto(b: CanvasRenderingContext2D, t: string, x: number, y: number, tam: number, cor: string, max = 999) {
  if (pendentes) { pendentes.push((c) => escrever(c, t, x, y, tam, cor, max)); return; }
  escrever(b, t, x, y, tam, cor, max);
}

function escrever(b: CanvasRenderingContext2D, t: string, x: number, y: number, tam: number, cor: string, max: number) {
  b.font = `${tam}px "Press Start 2P", monospace`;
  b.textAlign = 'center';
  b.textBaseline = 'middle';
  const esc = Math.min(1, max / Math.max(1, b.measureText(t).width));
  b.save(); b.translate(x, y); b.scale(esc, 1);
  b.fillStyle = cor; b.fillText(t, 0, 0);
  b.restore();
}

function ceu(b: CanvasRenderingContext2D, r: () => number, ate: number) {
  const g = b.createLinearGradient(0, 0, 0, ate);
  g.addColorStop(0, P.preto);
  g.addColorStop(0.6, P.marinho);
  g.addColorStop(1, P.neon_roxo);
  b.fillStyle = g;
  b.fillRect(0, 0, PAISAGEM_L, ate);
  for (let i = 0; i < 80; i++) {
    b.fillStyle = r() < 0.8 ? P.neblina : P.branco;
    b.fillRect(Math.floor(r() * PAISAGEM_L), Math.floor(r() * ate * 0.6), 1, 1);
  }
  b.fillStyle = P.papel; b.beginPath(); b.arc(404, 30, 13, 0, Math.PI * 2); b.fill();
  b.fillStyle = P.neblina; b.fillRect(398, 25, 4, 3); b.fillRect(407, 34, 3, 3); b.fillRect(400, 36, 2, 2);
}

/** A Kombi da banda, de lado: duas cores, janelinhas, estepe na frente e o nome pintado. */
export function desenharVan(b: CanvasRenderingContext2D, x: number, y: number, nomeBanda: string, farol = true) {
  // Carroceria com cantos arredondados.
  b.fillStyle = P.preto;
  b.beginPath(); b.roundRect(x, y, 120, 46, 9); b.fill();
  b.fillStyle = P.branco;
  b.beginPath(); b.roundRect(x + 2, y + 2, 116, 22, 8); b.fill();
  b.fillStyle = P.ceu; b.fillRect(x + 2, y + 22, 116, 22);
  b.fillStyle = P.azul; b.fillRect(x + 2, y + 38, 116, 6);
  b.fillStyle = P.branco; b.fillRect(x + 2, y + 22, 116, 2);
  // Janelas: três de passageiro e o para-brisa da frente.
  for (let i = 0; i < 3; i++) {
    b.fillStyle = P.preto; b.fillRect(x + 8 + i * 22, y + 6, 18, 12);
    b.fillStyle = P.marinho; b.fillRect(x + 9 + i * 22, y + 7, 16, 10);
    b.fillStyle = P.pastel_azul; b.fillRect(x + 10 + i * 22, y + 8, 5, 3);
  }
  b.fillStyle = P.preto; b.fillRect(x + 78, y + 6, 32, 13);
  b.fillStyle = P.marinho; b.fillRect(x + 79, y + 7, 30, 11);
  b.fillStyle = P.pastel_azul; b.fillRect(x + 80, y + 8, 8, 3);
  // O "V" da frente da Kombi e o para-choque.
  b.fillStyle = P.branco; b.beginPath(); b.moveTo(x + 112, y + 22); b.lineTo(x + 118, y + 34); b.lineTo(x + 118, y + 22); b.fill();
  b.fillStyle = P.neblina; b.fillRect(x + 108, y + 40, 14, 3);
  // Nome da banda na lateral.
  texto(b, nomeBanda.toUpperCase().slice(0, 12), x + 46, y + 31, 7, P.preto, 80);
  // Rodas com calota.
  for (const rx of [x + 20, x + 96]) {
    b.fillStyle = P.preto; b.beginPath(); b.arc(rx, y + 46, 10, 0, Math.PI * 2); b.fill();
    b.fillStyle = P.branco; b.beginPath(); b.arc(rx, y + 46, 5, 0, Math.PI * 2); b.fill();
    b.fillStyle = P.cimento; b.fillRect(rx - 1, y + 45, 2, 2);
  }
  // Farol redondo, lanterna e bagageiro no teto com amplificador amarrado.
  b.fillStyle = P.amarelo; b.beginPath(); b.arc(x + 116, y + 30, 3, 0, Math.PI * 2); b.fill();
  b.fillStyle = P.vermelho; b.fillRect(x + 1, y + 28, 3, 6);
  b.fillStyle = P.cimento; b.fillRect(x + 20, y - 4, 70, 2); b.fillRect(x + 22, y - 4, 2, 4); b.fillRect(x + 86, y - 4, 2, 4);
  b.fillStyle = P.preto; b.fillRect(x + 34, y - 14, 26, 11); b.fillRect(x + 62, y - 10, 18, 7);
  b.fillStyle = P.asfalto; b.fillRect(x + 35, y - 13, 24, 9);
  b.fillStyle = P.mostarda; b.fillRect(x + 32, y - 9, 30, 1);
  if (farol) {
    b.globalAlpha = 0.18; b.fillStyle = P.amarelo;
    b.beginPath(); b.moveTo(x + 119, y + 30); b.lineTo(x + 230, y + 14); b.lineTo(x + 230, y + 56); b.closePath(); b.fill();
    b.globalAlpha = 1;
  }
}

function placaVerde(b: CanvasRenderingContext2D, x: number, y: number, linha1: string, linha2: string) {
  b.fillStyle = P.cimento; b.fillRect(x + 8, y + 24, 3, 46); b.fillRect(x + 58, y + 24, 3, 46);
  b.fillStyle = P.branco; b.fillRect(x - 1, y - 1, 72, 28);
  b.fillStyle = P.musgo; b.fillRect(x, y, 70, 26);
  // Escudo da BR.
  b.fillStyle = P.branco; b.beginPath(); b.moveTo(x + 4, y + 4); b.lineTo(x + 18, y + 4); b.lineTo(x + 18, y + 15); b.lineTo(x + 11, y + 21); b.lineTo(x + 4, y + 15); b.fill();
  texto(b, 'BR', x + 11, y + 9, 4, P.preto);
  texto(b, '116', x + 11, y + 15, 4, P.preto);
  texto(b, linha1, x + 44, y + 9, 5, P.branco, 46);
  texto(b, linha2, x + 44, y + 18, 5, P.amarelo, 46);
}

function coqueiro(b: CanvasRenderingContext2D, x: number, chao: number, alto: number) {
  for (let i = 0; i < alto; i++) {
    const cx = x + Math.sin(i / alto * 1.4) * 8;
    b.fillStyle = i % 4 === 0 ? P.chocolate : P.ruga;
    b.fillRect(Math.round(cx), chao - i, 4, 1);
  }
  const tx = x + Math.sin(1.4) * 8 + 2, ty = chao - alto;
  b.fillStyle = P.musgo;
  for (const [dx, dy] of [[-18, 6], [18, 6], [-14, -6], [14, -6], [0, -10], [-22, 12], [22, 12]]) {
    b.beginPath(); b.moveTo(tx, ty); b.quadraticCurveTo(tx + dx / 2, ty + dy - 8, tx + dx, ty + dy); b.lineTo(tx + dx * 0.9, ty + dy + 3); b.quadraticCurveTo(tx + dx / 2, ty + dy - 4, tx, ty + 2); b.fill();
  }
  b.fillStyle = P.chocolate; b.fillRect(tx - 3, ty + 1, 3, 3); b.fillRect(tx + 1, ty + 2, 3, 3);
}

function ipe(b: CanvasRenderingContext2D, x: number, chao: number, r: () => number) {
  b.fillStyle = P.chocolate; b.fillRect(x, chao - 34, 4, 34); b.fillRect(x - 6, chao - 30, 7, 2); b.fillRect(x + 3, chao - 26, 8, 2);
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = r() * 18;
    b.fillStyle = r() < 0.7 ? P.amarelo : P.mostarda;
    b.fillRect(Math.round(x + 2 + Math.cos(a) * d * 1.3), Math.round(chao - 44 + Math.sin(a) * d * 0.8), 2, 2);
  }
}

function poste(b: CanvasRenderingContext2D, x: number, topo: number, chao: number) {
  b.fillStyle = P.cimento; b.fillRect(x, topo, 4, chao - topo); b.fillRect(x - 10, topo + 4, 24, 2);
  b.fillStyle = P.concreto; b.fillRect(x + 3, topo, 1, chao - topo);
  b.fillStyle = P.amarelo; b.fillRect(x + 10, topo + 6, 5, 3);
}

/** Fiação embolada de poste em poste (os "gatos"). */
function fios(b: CanvasRenderingContext2D, x0: number, x1: number, y: number, r: () => number) {
  b.strokeStyle = P.preto;
  b.lineWidth = 1;
  for (let k = 0; k < 5; k++) {
    b.beginPath(); b.moveTo(x0, y + k * 2); b.quadraticCurveTo((x0 + x1) / 2, y + 12 + k * 3 + r() * 6, x1, y + k * 2); b.stroke();
  }
  // Novelo de fio no meio.
  b.fillStyle = P.preto;
  for (let i = 0; i < 18; i++) b.fillRect(Math.round((x0 + x1) / 2 - 6 + r() * 12), Math.round(y + 10 + r() * 8), 2, 1);
}

function estrada(b: CanvasRenderingContext2D, r: () => number, cidade: string, nomeBanda: string, rumo: string) {
  ceu(b, r, 120);
  for (const [cor, base, amp] of [[P.noite, 104, 26], [P.asfalto, 116, 16]] as const) {
    b.fillStyle = cor;
    b.beginPath(); b.moveTo(0, 120);
    for (let x = 0; x <= PAISAGEM_L; x += 16) b.lineTo(x, base - Math.abs(Math.sin(x / 47 + base)) * amp - r() * 6);
    b.lineTo(PAISAGEM_L, 120); b.closePath(); b.fill();
  }
  // Mato na beira, coqueiros e ipê.
  b.fillStyle = P.musgo; b.fillRect(0, 116, PAISAGEM_L, 6);
  coqueiro(b, 18, 120, 58);
  coqueiro(b, 330, 120, 48);
  ipe(b, 290, 120, r);
  // Asfalto com faixa amarela dupla.
  b.fillStyle = P.concreto; b.fillRect(0, 120, PAISAGEM_L, 60);
  b.fillStyle = P.asfalto; b.fillRect(0, 124, PAISAGEM_L, 52);
  b.fillStyle = P.amarelo; for (let x = 6; x < PAISAGEM_L; x += 28) { b.fillRect(x, 148, 14, 1); b.fillRect(x, 151, 14, 1); }
  b.fillStyle = P.branco; b.fillRect(0, 126, PAISAGEM_L, 1); b.fillRect(0, 173, PAISAGEM_L, 1);
  b.fillStyle = P.cimento; b.fillRect(0, 176, PAISAGEM_L, 4);
  desenharVan(b, 150, 100, nomeBanda);
  placaVerde(b, 396, 60, cidade, rumo);
}

function cidade(b: CanvasRenderingContext2D, r: () => number, nome: string): [number, number][] {
  ceu(b, r, 90);
  const fachadas: [number, number, number, string, string, string, string][] = [
    [0, 50, 112, P.pastel_rosa, 'PADARIA', P.vinho, P.papel],
    [114, 40, 104, P.amarelo, 'BAR DO ZÉ', P.vermelho, P.branco],
    [220, 60, 112, P.pastel_verde, 'DISCOS', P.marinho, P.branco],
    [334, 44, 146, P.pastel_azul, 'PASTEL', P.vermelho, P.amarelo],
  ];
  for (const [x, topo, w, cor, letreiro, tinta, fundoLetreiro] of fachadas) {
    b.fillStyle = P.preto; b.fillRect(x, topo - 2, w, 150 - topo + 2);
    b.fillStyle = cor; b.fillRect(x + 2, topo, w - 4, 150 - topo);
    b.fillStyle = 'rgba(0,0,0,0.18)'; b.fillRect(x + w - 10, topo, 8, 150 - topo);
    // Platibanda e janelas com grade.
    b.fillStyle = 'rgba(255,255,255,0.25)'; b.fillRect(x + 2, topo, w - 4, 3);
    for (let jy = topo + 8; jy < 92; jy += 18) for (let jx = x + 10; jx < x + w - 18; jx += 24) {
      b.fillStyle = P.preto; b.fillRect(jx - 1, jy - 1, 14, 12);
      b.fillStyle = r() < 0.55 ? P.amarelo : P.noite; b.fillRect(jx, jy, 12, 10);
      b.fillStyle = P.cimento; for (let g = 2; g < 12; g += 3) b.fillRect(jx + g, jy, 1, 10);
    }
    // Toldo listrado.
    for (let tx = x + 4; tx < x + w - 4; tx += 6) {
      b.fillStyle = (tx / 6) % 2 < 1 ? tinta : P.branco;
      b.fillRect(tx, 104, 6, 6);
    }
    b.fillStyle = P.preto; b.fillRect(x + 4, 110, w - 8, 1);
    // Porta de aço meio aberta.
    b.fillStyle = P.cimento; b.fillRect(x + 12, 112, w - 30, 24);
    b.fillStyle = P.concreto; for (let ly = 113; ly < 136; ly += 3) b.fillRect(x + 12, ly, w - 30, 1);
    b.fillStyle = P.amarelo; b.fillRect(x + 12, 136, w - 30, 14);
    // Letreiro pintado.
    b.fillStyle = P.preto; b.fillRect(x + w / 2 - 38, 91, 76, 12);
    b.fillStyle = fundoLetreiro; b.fillRect(x + w / 2 - 37, 92, 74, 10);
    texto(b, letreiro, x + w / 2, 97, 6, tinta, 70);
  }
  // Pichação nas paredes.
  b.strokeStyle = P.preto; b.lineWidth = 1;
  for (const [x, y] of [[30, 70], [250, 80], [372, 66]]) {
    b.beginPath(); b.moveTo(x, y); for (let i = 1; i < 8; i++) b.lineTo(x + i * 4, y + (i % 2 ? -7 : 0)); b.stroke();
  }
  // Calçada de pedra portuguesa em ondas.
  b.fillStyle = P.branco; b.fillRect(0, 150, PAISAGEM_L, 14);
  b.fillStyle = P.preto;
  for (let x = 0; x < PAISAGEM_L; x++) {
    const y = 156 + Math.round(Math.sin(x / 9) * 4);
    b.fillRect(x, y, 1, 2);
  }
  b.fillStyle = P.asfalto; b.fillRect(0, 164, PAISAGEM_L, 16);
  b.fillStyle = P.amarelo; b.fillRect(0, 164, PAISAGEM_L, 2);
  // Mesa de plástico do boteco, engradado e orelhão.
  b.fillStyle = P.vermelho; b.fillRect(124, 138, 22, 3); b.fillRect(126, 141, 2, 9); b.fillRect(142, 141, 2, 9);
  b.fillStyle = P.amarelo; b.fillRect(150, 140, 10, 2); b.fillRect(151, 142, 1, 8); b.fillRect(158, 142, 1, 8);
  b.fillStyle = P.mostarda; b.fillRect(186, 140, 18, 10); b.fillStyle = P.chocolate; for (let i = 0; i < 4; i++) b.fillRect(188 + i * 4, 136, 2, 4);
  // Orelhão (concha azul).
  b.fillStyle = P.cimento; b.fillRect(458, 104, 3, 46);
  b.fillStyle = P.preto; b.beginPath(); b.ellipse(459, 108, 13, 15, 0, Math.PI, 0); b.fill();
  b.fillStyle = P.azul; b.beginPath(); b.ellipse(459, 108, 12, 14, 0, Math.PI, 0); b.fill();
  b.fillStyle = P.ceu; b.fillRect(449, 100, 4, 6);
  b.fillStyle = P.neblina; b.fillRect(455, 104, 8, 10);
  // Postes e fiação.
  poste(b, 108, 20, 150); poste(b, 330, 26, 150);
  fios(b, 0, 110, 22, r); fios(b, 110, 332, 24, r); fios(b, 332, 480, 28, r);
  texto(b, nome.toUpperCase(), 240, 10, 6, P.papel, 200);
  // Onde as pessoas ficam (desenhadas depois, em HD).
  return [[60, 162], [214, 160], [292, 162], [420, 161]];
}

function pousada(b: CanvasRenderingContext2D, r: () => number, letreiro: string) {
  ceu(b, r, 120);
  coqueiro(b, 130, 152, 70);
  // Pousada térrea, varanda com rede e portas coloridas.
  b.fillStyle = P.preto; b.fillRect(150, 66, 330, 86);
  b.fillStyle = P.pastel_creme; b.fillRect(152, 68, 326, 84);
  b.fillStyle = P.ruga; b.beginPath(); b.moveTo(140, 70); b.lineTo(480, 70); b.lineTo(480, 56); b.lineTo(170, 56); b.closePath(); b.fill(); // telhado de telha
  b.fillStyle = P.chocolate; for (let x = 172; x < 480; x += 8) b.fillRect(x, 56, 1, 14);
  for (let i = 0; i < 5; i++) {
    const x = 170 + i * 62;
    b.fillStyle = P.preto; b.fillRect(x - 1, 99, 22, 53);
    b.fillStyle = [P.azul, P.folha, P.vermelho, P.mostarda, P.neon_roxo][i]; b.fillRect(x, 100, 20, 52);
    b.fillStyle = P.amarelo; b.fillRect(x + 16, 126, 2, 2);
    texto(b, String(i + 1), x + 10, 108, 5, P.branco);
    b.fillStyle = P.preto; b.fillRect(x + 26, 80, 20, 14);
    b.fillStyle = r() < 0.5 ? P.amarelo : P.noite; b.fillRect(x + 27, 81, 18, 12);
  }
  // Varanda: pilares de madeira e a rede listrada.
  b.fillStyle = P.chocolate; b.fillRect(158, 70, 3, 82); b.fillRect(236, 70, 3, 82);
  for (let x = 162; x < 236; x++) {
    const y = 104 + Math.round(Math.sin(((x - 162) / 74) * Math.PI) * 14);
    b.fillStyle = [P.vermelho, P.amarelo, P.folha, P.azul][Math.floor((x - 162) / 6) % 4];
    b.fillRect(x, y, 1, 4);
  }
  // Bananeira.
  b.fillStyle = P.musgo; b.fillRect(462, 100, 5, 52);
  b.fillStyle = P.folha;
  for (const [dx, dy] of [[-18, -6], [16, -4], [-12, -16], [12, -18]]) { b.beginPath(); b.ellipse(464 + dx / 2, 98 + dy / 2, 12, 4, Math.atan2(dy, dx), 0, Math.PI * 2); b.fill(); }
  // Letreiro de neon com uma letra queimada.
  b.fillStyle = P.concreto; b.fillRect(70, 30, 4, 122);
  b.fillStyle = P.preto; b.fillRect(14, 16, 120, 30);
  b.fillStyle = P.noite; b.fillRect(16, 18, 116, 26);
  b.font = '10px "Press Start 2P", monospace'; b.textAlign = 'center'; b.textBaseline = 'middle';
  const letras = letreiro.toUpperCase().slice(0, 9);
  const queimada = Math.floor(r() * letras.length);
  [...letras].forEach((ch, i) => {
    b.fillStyle = i === queimada ? P.concreto : P.neon_rosa;
    b.fillText(ch, 74 - ((letras.length - 1) * 11) / 2 + i * 11, 31);
  });
  b.globalAlpha = 0.18; b.fillStyle = P.neon_rosa; b.fillRect(8, 10, 132, 42); b.globalAlpha = 1;
  b.fillStyle = P.asfalto; b.fillRect(0, 152, PAISAGEM_L, 28);
  b.fillStyle = P.chocolate; for (let x = 0; x < PAISAGEM_L; x += 7) b.fillRect(x, 152 + (x % 3), 3, 1); // chão de terra batida
}

/** Ilustração da parada; mesma parada e cidade = mesma imagem. */
export function desenharParada(canvas: HTMLCanvasElement, tipo: Parada, opcoes: { cidade: string; nomeBanda: string; banda: Integrante[]; letreiro: string; rumo: string }) {
  const base = document.createElement('canvas');
  base.width = PAISAGEM_L;
  base.height = PAISAGEM_A;
  const b = base.getContext('2d')!;
  let h = 0;
  for (const ch of opcoes.cidade + tipo) h = (h * 31 + ch.charCodeAt(0)) % 2147483647;
  const r = aleatorio(h);
  let gente: [number, number][] = [];
  pendentes = [];
  if (tipo === 'estrada') estrada(b, r, opcoes.cidade, opcoes.nomeBanda, opcoes.rumo);
  else if (tipo === 'cidade') gente = cidade(b, r, opcoes.cidade);
  else pousada(b, r, opcoes.letreiro);
  if (tipo === 'pousada') desenharVan(b, 4, 120, opcoes.nomeBanda, false);

  // Amplia o cenário (Scale2x) e põe as pessoas por cima, em HD.
  const textos = pendentes;
  pendentes = null;
  const hd = ampliarCanvas(base);
  canvas.width = hd.width;
  canvas.height = hd.height;
  const c = canvas.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  c.drawImage(hd, 0, 0);
  c.setTransform(2, 0, 0, 2, 0, 0);
  for (const t of textos) t(c);
  gente.forEach(([x, chao], i) => {
    const s = emCache(`pais-povo-${(h + i * 7) % 64}`, () => bonecoHD(bonecoDoPovo((h + i * 7) % 64, i === 1 ? 'tia' : 'povo', { passo: (i % 4) as 0 | 1 | 2 | 3, giro: i % 2 ? -0.55 : 0.55 })));
    desenharHD(c, s, x - BONECO_L / 2, chao - BONECO_A + 4);
  });
  if (tipo === 'pousada') {
    opcoes.banda.slice(0, 3).forEach((quem, i) => {
      const s = emCache(`pais-${quem}`, () => integranteHD(quem, { extra: undefined, instrumento: undefined, pose: quem === 'bateria' ? 'parado' : undefined }));
      desenharHD(c, s, 244 + i * 34 - BONECO_L / 2, 176 - BONECO_A + 4);
    });
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
}
