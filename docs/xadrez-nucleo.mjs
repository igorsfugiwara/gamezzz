/**
 * Núcleo do xadrez — regras puras. Este arquivo é a fonte da verdade:
 * é validado por perft aqui e depois embutido no HTML do jogo.
 *
 * Tabuleiro: array de 64, índice 0 = a8, 63 = h1 (linha 0 = 8ª fileira).
 * Peça: string de 2 letras — cor ('b'|'p') + tipo ('P','C','B','T','D','R').
 * Vazio: null.
 */

const BRANCA = 'b', PRETA = 'p';
const inverso = (c) => (c === BRANCA ? PRETA : BRANCA);

const DIR = {
  C: [-17, -15, -10, -6, 6, 10, 15, 17],          // cavalo
  B: [-9, -7, 7, 9],                               // bispo
  T: [-8, -1, 1, 8],                               // torre
  D: [-9, -8, -7, -1, 1, 7, 8, 9],                 // dama
  R: [-9, -8, -7, -1, 1, 7, 8, 9],                 // rei
};

const linha = (i) => i >> 3;
const coluna = (i) => i & 7;
const dentro = (i) => i >= 0 && i < 64;

/** Distância de Chebyshev — barra o "wrap" de borda a borda no array linear. */
function vizinho(de, para) {
  return Math.abs(coluna(de) - coluna(para)) <= 2 && Math.abs(linha(de) - linha(para)) <= 2;
}

function posicaoInicial() {
  const t = new Array(64).fill(null);
  const ordem = ['T', 'C', 'B', 'D', 'R', 'B', 'C', 'T'];
  for (let c = 0; c < 8; c++) {
    t[c] = 'p' + ordem[c];
    t[8 + c] = 'pP';
    t[48 + c] = 'bP';
    t[56 + c] = 'b' + ordem[c];
  }
  return {
    casas: t,
    vez: BRANCA,
    roque: { bR: true, bD: true, pR: true, pD: true },   // rei/dama por cor
    enPassant: null,      // índice da casa de captura, ou null
    meioLances: 0,        // para a regra dos 50 lances
    lance: 1,
  };
}

function clonar(e) {
  return {
    casas: e.casas.slice(),
    vez: e.vez,
    roque: { ...e.roque },
    enPassant: e.enPassant,
    meioLances: e.meioLances,
    lance: e.lance,
  };
}

/** A casa `alvo` está atacada por alguma peça da cor `porCor`? */
function atacada(casas, alvo, porCor) {
  for (let i = 0; i < 64; i++) {
    const p = casas[i];
    if (!p || p[0] !== porCor) continue;
    const tipo = p[1];

    if (tipo === 'P') {
      const dir = porCor === BRANCA ? -8 : 8;
      for (const lado of [-1, 1]) {
        const d = i + dir + lado;
        if (dentro(d) && Math.abs(coluna(i) - coluna(d)) === 1 && d === alvo) return true;
      }
      continue;
    }

    if (tipo === 'C') {
      for (const off of DIR.C) {
        const d = i + off;
        if (dentro(d) && vizinho(i, d) && d === alvo) return true;
      }
      continue;
    }

    if (tipo === 'R') {
      for (const off of DIR.R) {
        const d = i + off;
        if (dentro(d) && vizinho(i, d) && d === alvo) return true;
      }
      continue;
    }

    // deslizantes: bispo, torre, dama
    const dirs = tipo === 'B' ? DIR.B : tipo === 'T' ? DIR.T : DIR.D;
    for (const off of dirs) {
      let d = i;
      while (true) {
        const ant = d;
        d += off;
        if (!dentro(d) || !vizinho(ant, d)) break;
        if (d === alvo) return true;
        if (casas[d]) break;
      }
    }
  }
  return false;
}

function acharRei(casas, cor) {
  for (let i = 0; i < 64; i++) if (casas[i] === cor + 'R') return i;
  return -1;
}

const emXeque = (e, cor) => {
  const rei = acharRei(e.casas, cor);
  return rei >= 0 && atacada(e.casas, rei, inverso(cor));
};

/** Lances pseudo-legais (podem deixar o próprio rei em xeque). */
function lancesPseudo(e, cor) {
  const out = [];
  const { casas } = e;

  const add = (de, para, extra) => out.push({ de, para, ...extra });

  for (let i = 0; i < 64; i++) {
    const p = casas[i];
    if (!p || p[0] !== cor) continue;
    const tipo = p[1];

    if (tipo === 'P') {
      const dir = cor === BRANCA ? -8 : 8;
      const inicial = cor === BRANCA ? 6 : 1;
      const promo = cor === BRANCA ? 0 : 7;

      const frente = i + dir;
      if (dentro(frente) && !casas[frente]) {
        if (linha(frente) === promo) {
          for (const q of ['D', 'T', 'B', 'C']) add(i, frente, { promocao: q });
        } else {
          add(i, frente, {});
          const duplo = i + dir * 2;
          if (linha(i) === inicial && !casas[duplo]) add(i, duplo, { duplo: true });
        }
      }

      for (const lado of [-1, 1]) {
        const d = i + dir + lado;
        if (!dentro(d) || Math.abs(coluna(i) - coluna(d)) !== 1) continue;
        const alvo = casas[d];
        if (alvo && alvo[0] !== cor) {
          if (linha(d) === promo) {
            for (const q of ['D', 'T', 'B', 'C']) add(i, d, { promocao: q, captura: alvo });
          } else add(i, d, { captura: alvo });
        } else if (!alvo && d === e.enPassant) {
          add(i, d, { enPassant: true, captura: inverso(cor) + 'P' });
        }
      }
      continue;
    }

    if (tipo === 'C' || tipo === 'R') {
      for (const off of (tipo === 'C' ? DIR.C : DIR.R)) {
        const d = i + off;
        if (!dentro(d) || !vizinho(i, d)) continue;
        const alvo = casas[d];
        if (!alvo) add(i, d, {});
        else if (alvo[0] !== cor) add(i, d, { captura: alvo });
      }

      if (tipo === 'R') {
        // Roque: rei e torre parados, caminho livre, e o rei não passa por xeque
        const base = cor === BRANCA ? 56 : 0;
        if (i === base + 4 && !emXeque(e, cor)) {
          if (e.roque[cor + 'R'] && !casas[base + 5] && !casas[base + 6] &&
              casas[base + 7] === cor + 'T' &&
              !atacada(casas, base + 5, inverso(cor)) &&
              !atacada(casas, base + 6, inverso(cor))) {
            add(i, base + 6, { roque: 'R' });
          }
          if (e.roque[cor + 'D'] && !casas[base + 3] && !casas[base + 2] && !casas[base + 1] &&
              casas[base] === cor + 'T' &&
              !atacada(casas, base + 3, inverso(cor)) &&
              !atacada(casas, base + 2, inverso(cor))) {
            add(i, base + 2, { roque: 'D' });
          }
        }
      }
      continue;
    }

    const dirs = tipo === 'B' ? DIR.B : tipo === 'T' ? DIR.T : DIR.D;
    for (const off of dirs) {
      let d = i;
      while (true) {
        const ant = d;
        d += off;
        if (!dentro(d) || !vizinho(ant, d)) break;
        const alvo = casas[d];
        if (!alvo) add(i, d, {});
        else {
          if (alvo[0] !== cor) add(i, d, { captura: alvo });
          break;
        }
      }
    }
  }
  return out;
}

/** Aplica o lance e devolve um NOVO estado (não muta o recebido). */
function aplicar(e, m) {
  const n = clonar(e);
  const peca = n.casas[m.de];
  const cor = peca[0];
  const tipo = peca[1];

  n.casas[m.para] = m.promocao ? cor + m.promocao : peca;
  n.casas[m.de] = null;

  if (m.enPassant) {
    // O peão capturado está na casa ao lado, não na de destino
    n.casas[m.para + (cor === BRANCA ? 8 : -8)] = null;
  }

  if (m.roque) {
    const base = cor === BRANCA ? 56 : 0;
    if (m.roque === 'R') { n.casas[base + 5] = cor + 'T'; n.casas[base + 7] = null; }
    else                 { n.casas[base + 3] = cor + 'T'; n.casas[base] = null; }
  }

  // Direitos de roque: perdidos ao mover rei/torre, ou ao ter a torre capturada
  if (tipo === 'R') { n.roque[cor + 'R'] = false; n.roque[cor + 'D'] = false; }
  if (tipo === 'T') {
    const base = cor === BRANCA ? 56 : 0;
    if (m.de === base + 7) n.roque[cor + 'R'] = false;
    if (m.de === base)     n.roque[cor + 'D'] = false;
  }
  const outro = inverso(cor), baseO = outro === BRANCA ? 56 : 0;
  if (m.para === baseO + 7) n.roque[outro + 'R'] = false;
  if (m.para === baseO)     n.roque[outro + 'D'] = false;

  n.enPassant = m.duplo ? (m.de + m.para) / 2 : null;
  n.meioLances = (tipo === 'P' || m.captura) ? 0 : n.meioLances + 1;
  if (cor === PRETA) n.lance++;
  n.vez = outro;
  return n;
}

/** Lances legais: pseudo-legais que não deixam o próprio rei em xeque. */
function lancesLegais(e, cor = e.vez) {
  const saida = [];
  for (const m of lancesPseudo(e, cor)) {
    const depois = aplicar(e, m);
    if (!emXeque(depois, cor)) saida.push(m);
  }
  return saida;
}

// --------------------------------------------------------------- fim de jogo
function materialInsuficiente(casas) {
  const pecas = [];
  for (let i = 0; i < 64; i++) if (casas[i] && casas[i][1] !== 'R') pecas.push({ p: casas[i], i });
  if (pecas.length === 0) return true;                                   // R x R
  if (pecas.length === 1 && 'BC'.includes(pecas[0].p[1])) return true;    // R+B ou R+C
  if (pecas.length === 2 && pecas.every((x) => x.p[1] === 'B')) {
    // dois bispos: só é empate se estiverem na mesma cor de casa
    const cor = (x) => (linha(x.i) + coluna(x.i)) % 2;
    return pecas[0].p[0] !== pecas[1].p[0] && cor(pecas[0]) === cor(pecas[1]);
  }
  return false;
}

function chaveRepeticao(e) {
  return e.casas.join('') + '|' + e.vez + '|' +
    (e.roque.bR ? 'K' : '') + (e.roque.bD ? 'Q' : '') +
    (e.roque.pR ? 'k' : '') + (e.roque.pD ? 'q' : '') + '|' + e.enPassant;
}

function estadoFim(e, historicoChaves = []) {
  const legais = lancesLegais(e);
  if (legais.length === 0) {
    return emXeque(e, e.vez)
      ? { fim: true, tipo: 'mate', vencedor: inverso(e.vez) }
      : { fim: true, tipo: 'afogamento' };
  }
  if (e.meioLances >= 100) return { fim: true, tipo: '50lances' };
  if (materialInsuficiente(e.casas)) return { fim: true, tipo: 'material' };
  const chave = chaveRepeticao(e);
  if (historicoChaves.filter((k) => k === chave).length >= 3) return { fim: true, tipo: 'repeticao' };
  return { fim: false, legais };
}

// --------------------------------------------------------------- notação
const COLUNAS = 'abcdefgh';
const nomeCasa = (i) => COLUNAS[coluna(i)] + (8 - linha(i));

function paraSAN(e, m) {
  if (m.roque) return m.roque === 'R' ? 'O-O' : 'O-O-O';
  const peca = e.casas[m.de];
  const tipo = peca[1];
  let san = '';

  if (tipo === 'P') {
    if (m.captura) san += COLUNAS[coluna(m.de)] + 'x';
    san += nomeCasa(m.para);
    if (m.promocao) san += '=' + m.promocao;
  } else {
    san += tipo;
    // Desambiguação: outras peças do mesmo tipo que também alcançam o destino
    const rivais = lancesLegais(e, peca[0]).filter(
      (o) => o.para === m.para && o.de !== m.de && e.casas[o.de] === peca
    );
    if (rivais.length) {
      const mesmaColuna = rivais.some((o) => coluna(o.de) === coluna(m.de));
      const mesmaLinha = rivais.some((o) => linha(o.de) === linha(m.de));
      if (!mesmaColuna) san += COLUNAS[coluna(m.de)];
      else if (!mesmaLinha) san += String(8 - linha(m.de));
      else san += nomeCasa(m.de);
    }
    if (m.captura) san += 'x';
    san += nomeCasa(m.para);
  }

  const depois = aplicar(e, m);
  if (emXeque(depois, depois.vez)) {
    san += lancesLegais(depois).length === 0 ? '#' : '+';
  }
  return san;
}

// --------------------------------------------------------------- FEN (testes)
function daFEN(fen) {
  const [pos, vez, roque, ep, meio, cheio] = fen.split(' ');
  const casas = new Array(64).fill(null);
  let i = 0;
  for (const ch of pos) {
    if (ch === '/') continue;
    if (/\d/.test(ch)) { i += Number(ch); continue; }
    const cor = ch === ch.toUpperCase() ? BRANCA : PRETA;
    const mapa = { p: 'P', n: 'C', b: 'B', r: 'T', q: 'D', k: 'R' };
    casas[i++] = cor + mapa[ch.toLowerCase()];
  }
  return {
    casas,
    vez: vez === 'w' ? BRANCA : PRETA,
    roque: {
      bR: roque.includes('K'), bD: roque.includes('Q'),
      pR: roque.includes('k'), pD: roque.includes('q'),
    },
    enPassant: ep === '-' ? null : COLUNAS.indexOf(ep[0]) + (8 - Number(ep[1])) * 8,
    meioLances: Number(meio ?? 0),
    lance: Number(cheio ?? 1),
  };
}

function perft(e, profundidade) {
  if (profundidade === 0) return 1;
  const legais = lancesLegais(e);
  if (profundidade === 1) return legais.length;
  let total = 0;
  for (const m of legais) total += perft(aplicar(e, m), profundidade - 1);
  return total;
}

export {
  BRANCA, PRETA, inverso, posicaoInicial, clonar, aplicar, lancesLegais, lancesPseudo,
  emXeque, atacada, estadoFim, paraSAN, nomeCasa, linha, coluna, acharRei,
  materialInsuficiente, chaveRepeticao, daFEN, perft,
};
