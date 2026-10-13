/**
 * Motor do Faça Você Mesmo: regras puras, sem DOM. Todo sorteio passa pelo
 * `rng` guardado na turnê — mesma seed + mesmas escolhas = mesma turnê, e o
 * save automático a cada nó continua de onde parou sem "re-rolar" nada.
 */
import CARTAS_JSON from './dados/cartas.json';
import EVENTOS_JSON from './dados/eventos.json';

// ─── Tipos ────────────────────────────────────────────────

export type Recurso = 'grana' | 'gasolina' | 'clima' | 'voz' | 'hype';
export type Efeitos = Partial<Record<Recurso, number>>;
export type TipoCarta = 'abertura' | 'musica' | 'fala' | 'acao' | 'problema';

export interface Especial {
  desconto?: number;
  dobra?: boolean;
  combo?: { apos: string[]; energia: number; momento: string };
  aleatoria?: number[];
  semCombo?: boolean;
  hype?: number;
  risco?: { chance: number; clima: number };
  grana?: number;
  encerra?: boolean;
  machuca?: number;
  ocupa?: boolean;
  aoComprar?: number;
  choque?: number;
  cantaJunto?: boolean;
  emSequencia?: number;
  bis?: boolean;
  clima?: number;
  compra?: number;
  folego?: number;
  fuzz?: number;
}

export interface Carta {
  id: string;
  nome: string;
  tipo: TipoCarta;
  folego: number | null;
  energia: number;
  voz?: number;
  vocal?: boolean;
  efeito: string;
  texto: string;
  raridade: 'inicial' | 'comum' | 'rara';
  especial?: Especial;
}

export interface Escolha {
  texto: string;
  efeitos: Efeitos;
  resultado: string;
  requer?: string;
  sorte?: { chance: number; efeitos: Efeitos; resultado: string };
  carta?: string;
  remover?: string;
  flag?: string;
}

export interface Evento {
  id: string;
  onde: string;
  titulo: string;
  texto: string;
  escolhas: Escolha[];
  minNoite?: number;
  raro?: boolean;
  momento?: string;
}

export const CARTAS: Carta[] = CARTAS_JSON as Carta[];
export const EVENTOS: Evento[] = EVENTOS_JSON as Evento[];
const POR_ID = new Map(CARTAS.map((c) => [c.id, c]));
export function carta(id: string): Carta {
  const c = POR_ID.get(id);
  if (!c) throw new Error(`Carta desconhecida: ${id}`);
  return c;
}

export type Integrante = 'vocal' | 'guitarra' | 'baixo' | 'bateria';

export const BANDA: Record<Integrante, { papel: string; nome: string; habilidade: string; defeito: string }> = {
  vocal: { papel: 'Vocal', nome: 'Lia', habilidade: 'Um Discurso grátis em todo show', defeito: 'Perde 1 de voz por show' },
  guitarra: { papel: 'Guitarra', nome: 'Téo', habilidade: 'Vê a próxima carta do baralho', defeito: 'Briga por afinação derruba o clima' },
  baixo: { papel: 'Baixo', nome: 'Duda', habilidade: 'Gasta 20% menos gasolina', defeito: 'Dorme no meio dos eventos' },
  bateria: { papel: 'Bateria', nome: 'Caco', habilidade: 'Conserta a van uma vez por turnê', defeito: 'Quebra baqueta e gasta grana' },
};
export const ORDEM_BANDA: Integrante[] = ['vocal', 'guitarra', 'baixo', 'bateria'];
/** "do vocal", "da bateria"... para as manchetes. */
export const DO: Record<Integrante, string> = { vocal: 'do vocal', guitarra: 'da guitarra', baixo: 'do baixo', bateria: 'da bateria' };

export type TipoNo = 'show' | 'evento' | 'estrada' | 'descanso';
export interface No { tipo: TipoNo; lugar: string; final?: boolean }

export interface Causo { noite: number; texto: string; peso: number }

export type Fase =
  | { tipo: 'mapa' }
  | { tipo: 'evento'; id: string; bloqueada: number | null; depois: boolean }
  | { tipo: 'show' }
  | { tipo: 'recompensa'; opcoes: string[]; resumo: ResultadoShow }
  | { tipo: 'descanso' }
  | { tipo: 'perdida'; motivo: 'grana' | 'machucado' }
  | { tipo: 'fim' };

export interface Turne {
  versao: 1;
  seed: string;
  rng: number;
  noite: number;
  faixa: number;
  /** Faixa escolhida em cada noite já visitada. */
  rota: number[];
  mapa: No[][];
  grana: number;
  gasolina: number;
  clima: number;
  voz: number;
  hype: number;
  banda: Integrante[];
  saidas: Integrante[];
  baralho: string[];
  eventosVistos: string[];
  flags: { vendido?: boolean; mascote?: boolean; conserto?: boolean; machucado?: boolean; mosh?: boolean; sharpeiVisto?: boolean };
  causos: Causo[];
  stats: { publico: number; shows: number; sucessos: number; bombados: number; maiorEnergia: number; cache: number };
  /** Noites seguidas sem descanso; a cada 3, o clima cai. */
  cansaco: number;
  fim: null | 'completa' | 'acabou';
  fase: Fase;
}

// ─── Constantes de balanceamento ──────────────────────────

export const NOITES = 10;
export const MAXIMO: Record<Recurso, number> = { grana: 999, gasolina: 100, clima: 10, voz: 5, hype: 10 };
export const INICIO: Record<Recurso, number> = { grana: 40, gasolina: 60, clima: 5, voz: 5, hype: 3 };
export const GASOLINA_POR_VIAGEM = 15;
export const COMIDA_POR_NOITE = 5;
export const ABASTECER = { grana: 10, gasolina: 20 };
export const FOLEGO = 3;
export const BLOCOS = 3;
export const MAO = 5;
export const MAO_MAXIMA = 7;
export const CLIMA_DEPOIS_DE_SAIDA = 3;
export const NOITES_ATE_CANSAR = 2;

export const BARALHO_INICIAL = CARTAS.filter((c) => c.raridade === 'inicial').map((c) => c.id);

export const DESCANSOS = {
  dormir: { titulo: 'Pousada de beira de estrada', texto: 'Cama de verdade, chuveiro quente.', efeitos: { voz: 2, clima: 2, grana: -10 } as Efeitos },
  ensaiar: { titulo: 'Ensaio no quintal', texto: 'Tira uma carta do baralho. Ensaio sempre termina em discussão.', efeitos: { clima: -1 } as Efeitos },
  live: { titulo: 'Live no celular', texto: 'Uma música, três desafinadas, mil visualizações.', efeitos: { hype: 2, voz: -1 } as Efeitos },
} as const;
export type Descanso = keyof typeof DESCANSOS;

const CIDADES = [
  'Vila Ferrugem', 'São Bento do Barro', 'Lagoa Torta', 'Poeirão', 'Ribeirão Desligado', 'Santa Rita do Fuzz',
  'Pedra Rachada', 'Vale do Escapamento', 'Morro do Cabo', 'Itaquerinha do Norte', 'Barro Branco', 'Campo do Feedback',
  'Nova Distorção', 'Porto Microfonia', 'Serra da Palheta', 'Jardim Amplificador',
];
const LUGARES: Record<TipoNo, string[]> = {
  show: ['porão', 'centro cultural', 'garagem', 'sindicato', 'pizzaria com palco', 'skate park', 'casa ocupada', 'bar do Zé'],
  evento: ['praça', 'rodoviária', 'feira', 'centro'],
  estrada: ['BR', 'estrada de terra', 'rodovia', 'serra'],
  descanso: ['quintal', 'pousada', 'casa de amigo'],
};

// ─── Aleatório com seed ───────────────────────────────────

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function novaSeed(aleatorio = Math.random): string {
  return Array.from({ length: 6 }, () => ALFABETO[Math.floor(aleatorio() * ALFABETO.length)]).join('');
}

export function normalizarSeed(s: string): string | null {
  const limpa = s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return limpa.length >= 3 ? limpa : null;
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** mulberry32 com o estado dentro da turnê. */
export function sortear(t: { rng: number }): number {
  t.rng = (t.rng + 0x6d2b79f5) >>> 0;
  let z = t.rng;
  z = Math.imul(z ^ (z >>> 15), z | 1);
  z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
  return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
}
function inteiro(t: { rng: number }, a: number, b: number): number {
  return a + Math.floor(sortear(t) * (b - a + 1));
}
function escolher<T>(t: { rng: number }, lista: readonly T[]): T {
  return lista[Math.floor(sortear(t) * lista.length)];
}
function embaralhar<T>(t: { rng: number }, lista: T[]): T[] {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(sortear(t) * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

// ─── Turnê ────────────────────────────────────────────────

export function novaTurne(seed: string): Turne {
  const t: Turne = {
    versao: 1,
    seed,
    rng: hashSeed(seed),
    noite: 0,
    faixa: 0,
    rota: [],
    mapa: [],
    ...INICIO,
    banda: [...ORDEM_BANDA],
    saidas: [],
    baralho: [...BARALHO_INICIAL],
    eventosVistos: [],
    flags: {},
    causos: [],
    stats: { publico: 0, shows: 0, sucessos: 0, bombados: 0, maiorEnergia: 0, cache: 0 },
    cansaco: 0,
    fim: null,
    fase: { tipo: 'mapa' },
  };
  t.mapa = gerarMapa(t);
  return t;
}

function gerarMapa(t: Turne): No[][] {
  const cidades = embaralhar(t, [...CIDADES]);
  const lugar = (tipo: TipoNo, n: number) => `${escolher(t, LUGARES[tipo])} · ${cidades[n % cidades.length]}`;
  const mapa: No[][] = [];
  for (let n = 1; n <= NOITES; n++) {
    if (n === 1) { mapa.push([{ tipo: 'show', lugar: lugar('show', 0) }]); continue; }
    if (n === NOITES) { mapa.push([{ tipo: 'show', final: true, lugar: `festival de quintal · ${cidades[n % cidades.length]}` }]); continue; }
    const linha: No[] = [];
    for (let f = 0; f < 3; f++) {
      const r = sortear(t);
      const tipo: TipoNo = r < 0.4 ? 'show' : r < 0.68 ? 'evento' : r < 0.84 ? 'estrada' : 'descanso';
      linha.push({ tipo, lugar: lugar(tipo, n) });
    }
    // Toda noite tem pelo menos um show e nunca três nós iguais.
    if (!linha.some((no) => no.tipo === 'show')) linha[inteiro(t, 0, 2)] = { tipo: 'show', lugar: lugar('show', n) };
    if (linha.every((no) => no.tipo === linha[0].tipo)) {
      const outro: TipoNo = linha[0].tipo === 'descanso' ? 'evento' : 'descanso';
      linha[1] = { tipo: outro, lugar: lugar(outro, n) };
    }
    mapa.push(linha);
  }
  return mapa;
}

/** Faixas alcançáveis na próxima noite a partir da posição atual. */
export function caminhos(t: Turne): number[] {
  if (t.noite >= NOITES) return [];
  const proxima = t.mapa[t.noite];
  if (proxima.length === 1) return [0];
  if (t.noite === 0 || t.mapa[t.noite - 1].length === 1) return proxima.map((_, i) => i);
  return [t.faixa - 1, t.faixa, t.faixa + 1].filter((f) => f >= 0 && f < proxima.length);
}

export function noAtual(t: Turne): No {
  return t.mapa[t.noite - 1][t.faixa];
}

export function custoGasolina(t: Turne): number {
  return t.banda.includes('baixo') ? Math.round(GASOLINA_POR_VIAGEM * 0.8) : GASOLINA_POR_VIAGEM;
}

function causo(t: Turne, texto: string, peso: number) {
  t.causos.push({ noite: Math.max(1, t.noite), texto, peso });
}

function cidadeAtual(t: Turne): string {
  return t.noite ? noAtual(t).lugar.split(' · ')[1] : 'casa';
}

/** Aplica efeitos com limites; clima zerado tira alguém da banda. Devolve avisos. */
export function aplicar(t: Turne, efeitos: Efeitos): string[] {
  const avisos: string[] = [];
  for (const [r, v] of Object.entries(efeitos) as [Recurso, number][]) {
    let teto = MAXIMO[r];
    if (r === 'hype' && t.flags.vendido) teto = 6;
    t[r] = Math.max(0, Math.min(teto, t[r] + v));
  }
  while (t.clima <= 0 && !t.fim) {
    const quem = escolher(t, t.banda);
    t.banda = t.banda.filter((b) => b !== quem);
    t.saidas.push(quem);
    const m = BANDA[quem];
    avisos.push(`${m.nome}, ${DO[quem]}, saiu da banda.`);
    if (t.saidas.length >= 2) {
      t.fim = 'acabou';
      t.fase = { tipo: 'fim' };
      causo(t, `Banda acaba em ${cidadeAtual(t)}: ${m.nome}, ${DO[quem]}, desce da van de vez`, 9);
    } else {
      t.clima = CLIMA_DEPOIS_DE_SAIDA;
      causo(t, `${m.nome}, ${DO[quem]}, larga a turnê no meio e volta de ônibus`, 6);
    }
  }
  return avisos;
}

export function podeAbastecer(t: Turne): boolean {
  return t.grana >= ABASTECER.grana && t.gasolina < MAXIMO.gasolina;
}

export function abastecer(t: Turne): void {
  if (!podeAbastecer(t)) return;
  aplicar(t, { grana: -ABASTECER.grana, gasolina: ABASTECER.gasolina });
}

const SEM_GASOLINA: Evento = {
  id: 'sem-gasolina',
  onde: 'sistema',
  momento: 'van',
  titulo: 'A van secou',
  texto: 'O ponteiro bateu no zero no meio da estrada. Ninguém tinha olhado.',
  escolhas: [
    { texto: 'Chamar o guincho', efeitos: { grana: -20, gasolina: 20 }, resultado: 'O guincheiro cobrou caro e ainda pediu um CD.' },
    { texto: 'Empurrar até o posto', efeitos: { clima: -2, voz: -1, gasolina: 15 }, resultado: 'Três quilômetros empurrando. Ninguém disse uma palavra.' },
  ],
};

export function evento(id: string): Evento {
  if (id === SEM_GASOLINA.id) return SEM_GASOLINA;
  const e = EVENTOS.find((ev) => ev.id === id);
  if (!e) throw new Error(`Evento desconhecido: ${id}`);
  return e;
}

/** Sai da noite atual para a faixa escolhida da próxima. */
export function viajar(t: Turne, faixa: number): void {
  if (t.fase.tipo !== 'mapa' || !caminhos(t).includes(faixa)) return;
  const custo = t.noite === 0 ? 0 : custoGasolina(t);
  t.noite += 1;
  t.faixa = faixa;
  t.rota.push(faixa);
  if (t.noite > 1) {
    aplicar(t, { grana: -COMIDA_POR_NOITE });
    t.cansaco++;
    if (t.cansaco >= NOITES_ATE_CANSAR) {
      t.cansaco = 0;
      aplicar(t, { clima: -1 });
    }
  }
  if (custo > t.gasolina) {
    t.gasolina = 0;
    causo(t, `Van seca na estrada antes de ${cidadeAtual(t)}`, 3);
    t.fase = abrirEvento(t, SEM_GASOLINA, true);
    return;
  }
  t.gasolina -= custo;
  entrarNo(t);
}

/** Resolve a chegada no nó atual (depois da viagem e de um eventual resgate). */
export function entrarNo(t: Turne): void {
  if (t.fim) return;
  const no = noAtual(t);
  if (!no.final && t.flags.machucado) {
    t.flags.machucado = false;
    aplicar(t, { grana: -10 });
    t.fase = { tipo: 'perdida', motivo: 'machucado' };
    return;
  }
  if (!no.final && t.grana <= 0) {
    aplicar(t, { clima: -1 });
    t.fase = t.fim ? { tipo: 'fim' } : { tipo: 'perdida', motivo: 'grana' };
    return;
  }
  if (no.tipo === 'show') t.fase = { tipo: 'show' };
  else if (no.tipo === 'descanso') t.fase = { tipo: 'descanso' };
  else {
    if (no.tipo === 'estrada') aplicar(t, { voz: 1 });
    const ev = sortearEvento(t, no.tipo === 'estrada' ? 'estrada' : 'cidade');
    t.fase = abrirEvento(t, ev, false);
  }
}

/** Depois de um nó perdido, volta para o mapa. */
export function seguirDepoisDePerdida(t: Turne): void {
  if (t.fase.tipo === 'perdida') t.fase = { tipo: 'mapa' };
}

function sortearEvento(t: Turne, onde: 'cidade' | 'estrada'): Evento {
  const elegiveis = (vistos: boolean) =>
    EVENTOS.filter((e) => e.onde === onde && !e.raro && (e.minNoite ?? 0) <= t.noite && (vistos || !t.eventosVistos.includes(e.id)));
  const lista = elegiveis(false).length ? elegiveis(false) : elegiveis(true);
  return escolher(t, lista);
}

function abrirEvento(t: Turne, ev: Evento, depois: boolean): Fase {
  if (!t.eventosVistos.includes(ev.id)) t.eventosVistos.push(ev.id);
  let bloqueada: number | null = null;
  // Defeito do baixo: dorme no meio da conversa e uma opção some.
  const livres = ev.escolhas.map((_, i) => i).filter((i) => escolhaDisponivel(t, ev, i, null) === null);
  if (t.banda.includes('baixo') && livres.length >= 3 && sortear(t) < 0.3) bloqueada = escolher(t, livres);
  return { tipo: 'evento', id: ev.id, bloqueada, depois };
}

/** null = pode escolher; senão, o motivo. */
export function escolhaDisponivel(t: Turne, ev: Evento, i: number, bloqueada: number | null): string | null {
  const e = ev.escolhas[i];
  if (i === bloqueada) return `${BANDA.baixo.nome} dormiu no meio da conversa`;
  if (e.requer === 'conserto' && (!t.banda.includes('bateria') || t.flags.conserto)) {
    return t.banda.includes('bateria') ? 'O conserto da turnê já foi usado' : 'Sem baterista na banda';
  }
  if ((e.efeitos.grana ?? 0) < 0 && t.grana < -(e.efeitos.grana ?? 0)) return 'Sem grana';
  return null;
}

export interface Desfecho { texto: string; avisos: string[]; efeitos: Efeitos }

export function escolherNoEvento(t: Turne, i: number): Desfecho | null {
  if (t.fase.tipo !== 'evento') return null;
  const fase = t.fase;
  const ev = evento(fase.id);
  if (escolhaDisponivel(t, ev, i, fase.bloqueada) !== null) return null;
  const e = ev.escolhas[i];
  const total: Efeitos = { ...e.efeitos };
  let texto = e.resultado;
  if (e.sorte && sortear(t) < e.sorte.chance) {
    texto = e.sorte.resultado;
    for (const [r, v] of Object.entries(e.sorte.efeitos) as [Recurso, number][]) total[r] = (total[r] ?? 0) + v;
  }
  if (e.requer === 'conserto') {
    t.flags.conserto = true;
    causo(t, `${BANDA.bateria.nome} conserta a van no acostamento com arame e fita`, 4);
  }
  if (e.carta) t.baralho.push(e.carta);
  if (e.remover) {
    const k = t.baralho.indexOf(e.remover);
    if (k >= 0) t.baralho.splice(k, 1);
  }
  if (e.flag === 'vendido') {
    t.flags.vendido = true;
    causo(t, 'Banda fecha com o Grupo Tudo S.A.; a cena torce o nariz', 7);
  } else if (ev.id === 'grupo-tudo') {
    causo(t, 'Vocalista rasga contrato do Grupo Tudo S.A. no palco', 8);
  }
  if (e.flag === 'mascote') {
    t.flags.mascote = true;
    causo(t, `Shar Pei sobe no palco em ${cidadeAtual(t)} e vira mascote da turnê`, 8);
  }
  if (ev.id === 'correia') causo(t, 'Van quebra às 3 da manhã; banda descobre quem sabe trocar correia', 5);
  const avisos = aplicar(t, total);
  if (!t.fim) {
    if (fase.depois) entrarNo(t);
    else t.fase = t.noite >= NOITES ? { tipo: 'fim' } : { tipo: 'mapa' };
  }
  return { texto, avisos, efeitos: total };
}

export function descansar(t: Turne, tipo: Descanso, remover?: number): string[] | null {
  if (t.fase.tipo !== 'descanso' || !descansoDisponivel(t, tipo)) return null;
  if (tipo === 'ensaiar') {
    if (remover === undefined || remover < 0 || remover >= t.baralho.length) return null;
    t.baralho.splice(remover, 1);
  }
  t.cansaco = 0;
  const avisos = aplicar(t, DESCANSOS[tipo].efeitos);
  if (!t.fim) t.fase = { tipo: 'mapa' };
  return avisos;
}

export function descansoDisponivel(t: Turne, tipo: Descanso): boolean {
  if (tipo === 'dormir') return t.grana >= 10;
  if (tipo === 'ensaiar') return t.baralho.length > 6;
  return true;
}

// ─── Show ─────────────────────────────────────────────────

export interface NaMao { id: string; temp?: boolean }

export interface Show {
  alvo: number;
  energia: number;
  bloco: number;
  folego: number;
  mao: NaMao[];
  pilha: string[];
  descarte: string[];
  ultima: string | null;
  ultimaTipo: TipoCarta | null;
  ultimaMusica: number;
  dobra: boolean;
  choque: number;
  fuzz: number;
  desconto: number;
  cantaJunto: boolean;
  semVoz: boolean;
  grana: number;
  encerrado: boolean;
  desabou: boolean;
  mosh: boolean;
}

export interface Jogada {
  energia: number;
  momento?: 'mosh' | 'pit' | 'parede' | 'machucou' | 'desabou' | 'troca';
  textos: string[];
  microfonias: number;
  avisos: string[];
}

export function alvoDoShow(t: Turne): number {
  const base = 9 + 4 * t.noite;
  return noAtual(t).final ? Math.round(base * 1.25) : base;
}

export function cacheBase(t: Turne): number {
  const base = (6 + 2 * t.noite) * (0.5 + t.hype * 0.05);
  return Math.round(noAtual(t).final ? base * 1.5 : base);
}

export function iniciarShow(t: Turne): { show: Show; avisos: string[] } {
  const avisos: string[] = [];
  const s: Show = {
    alvo: alvoDoShow(t),
    energia: 0,
    bloco: 1,
    folego: FOLEGO,
    mao: [],
    pilha: embaralhar(t, [...t.baralho]),
    descarte: [],
    ultima: null,
    ultimaTipo: null,
    ultimaMusica: 0,
    dobra: false,
    choque: 0,
    fuzz: 0,
    desconto: 0,
    cantaJunto: false,
    semVoz: t.voz <= 0,
    grana: 0,
    encerrado: false,
    desabou: false,
    mosh: false,
  };
  if (s.semVoz) avisos.push('Sem voz: as cartas do vocal estão bloqueadas neste show.');
  if (t.banda.includes('guitarra') && sortear(t) < 0.2) {
    avisos.push(`Briga por afinação antes do show. ${BANDA.guitarra.nome} não olha pra ninguém.`, ...aplicar(t, { clima: -1 }));
  }
  if (t.banda.includes('bateria') && sortear(t) < 0.25 && t.grana >= 5) {
    aplicar(t, { grana: -5 });
    avisos.push(`${BANDA.bateria.nome} quebrou a baqueta na passagem de som: −R$ 5.`);
  }
  if (t.banda.includes('vocal') && !s.semVoz) s.mao.push({ id: 'discurso', temp: true });
  const j = comprar(t, s, MAO - s.mao.length);
  avisos.push(...j.textos);
  return { show: s, avisos };
}

/** Compra até `n` cartas; Microfonia dispara e vai direto pro descarte. */
function comprar(t: Turne, s: Show, n: number): Jogada {
  const j: Jogada = { energia: 0, textos: [], microfonias: 0, avisos: [] };
  // `guarda` evita laço infinito num baralho só de Microfonias.
  for (let k = 0, guarda = 0; k < n && s.mao.length < MAO_MAXIMA && guarda < 40; k++, guarda++) {
    if (!s.pilha.length) {
      if (!s.descarte.length) break;
      s.pilha = embaralhar(t, s.descarte);
      s.descarte = [];
    }
    const id = s.pilha.pop()!;
    const c = carta(id);
    if (c.especial?.aoComprar) {
      const antes = s.energia;
      s.energia = Math.max(0, s.energia + c.especial.aoComprar);
      j.energia += s.energia - antes;
      j.microfonias++;
      j.textos.push(`${c.nome}! “${c.texto}”`);
      s.descarte.push(id);
      k--; // a microfonia não ocupa espaço: compra outra no lugar
      continue;
    }
    s.mao.push({ id });
  }
  return j;
}

/** Próxima carta do baralho (habilidade da guitarra). */
export function espiar(t: Turne, s: Show): string | null {
  if (!t.banda.includes('guitarra')) return null;
  return s.pilha.length ? s.pilha[s.pilha.length - 1] : null;
}

export function custoDe(s: Show, c: Carta): number {
  return Math.max(0, (c.folego ?? 0) - s.desconto);
}

/** null = pode jogar; senão, o motivo. */
export function podeJogar(t: Turne, s: Show, i: number): string | null {
  const m = s.mao[i];
  if (!m || s.encerrado) return 'Show encerrado';
  const c = carta(m.id);
  if (c.folego === null) return 'Não dá pra jogar';
  if (custoDe(s, c) > s.folego) return 'Sem fôlego';
  const gastaVoz = (c.voz ?? 0) < 0 && !s.cantaJunto;
  if ((c.vocal || gastaVoz) && s.semVoz && !s.cantaJunto) return 'Sem voz';
  if (gastaVoz && t.voz + (c.voz ?? 0) < 0) return 'Sem voz';
  return null;
}

export function jogar(t: Turne, s: Show, i: number): Jogada | null {
  if (podeJogar(t, s, i) !== null) return null;
  const m = s.mao[i];
  const c = carta(m.id);
  const esp = c.especial ?? {};
  s.folego -= custoDe(s, c);
  s.desconto = 0;
  s.mao.splice(i, 1);
  if (!m.temp) s.descarte.push(m.id);
  const j: Jogada = { energia: 0, textos: [], microfonias: 0, avisos: [] };

  if (esp.ocupa) {
    j.momento = 'troca';
    j.textos.push('Corda trocada. Bora.');
    return j;
  }

  let e = c.energia;
  if (esp.aleatoria) e = inteiro(t, esp.aleatoria[0], esp.aleatoria[1]);
  if (esp.combo && s.ultima && esp.combo.apos.includes(s.ultima)) {
    e = esp.combo.energia;
    j.momento = esp.combo.momento as Jogada['momento'];
  }
  if (esp.emSequencia && s.ultimaTipo === 'musica') e += esp.emSequencia;
  if (esp.bis) e = s.ultimaMusica;

  // Breakdown, choque e fuzz valem para a próxima música de verdade.
  const recebeBonus = c.tipo === 'musica' && !esp.semCombo && !esp.bis && !esp.dobra;
  if (recebeBonus) {
    if (s.choque) { e += s.choque; s.choque = 0; }
    if (s.fuzz > 0) { e += 2; s.fuzz--; }
    if (s.dobra) { e *= 2; s.dobra = false; }
  }
  if (esp.dobra) s.dobra = true;
  if (esp.choque) { s.choque = esp.choque; j.momento = 'parede'; }

  const antes = s.energia;
  s.energia = Math.max(0, s.energia + e);
  j.energia = s.energia - antes;
  if (c.tipo === 'musica' && e > 0) s.ultimaMusica = e;

  if (j.momento === 'mosh' && !s.mosh) {
    s.mosh = true;
    if (!t.flags.mosh) {
      t.flags.mosh = true;
      causo(t, `Primeiro mosh de verdade em ${cidadeAtual(t)}: alguém perdeu um tênis`, 6);
    }
  }

  if (c.voz && !(c.voz < 0 && s.cantaJunto)) j.avisos.push(...aplicar(t, { voz: c.voz }));
  if (esp.hype) j.avisos.push(...aplicar(t, { hype: esp.hype }));
  if (esp.clima) j.avisos.push(...aplicar(t, { clima: esp.clima }));
  if (esp.risco && sortear(t) < esp.risco.chance) {
    j.textos.push('O discurso dividiu a banda.');
    j.avisos.push(...aplicar(t, { clima: esp.risco.clima }));
  }
  if (esp.grana) { s.grana += esp.grana; j.textos.push(`+R$ ${esp.grana} no cachê`); }
  if (esp.folego) s.folego += esp.folego;
  if (esp.fuzz) s.fuzz = esp.fuzz;
  if (esp.cantaJunto) s.cantaJunto = true;
  if (esp.desconto) s.desconto = esp.desconto;
  if (esp.machuca && sortear(t) < esp.machuca) {
    t.flags.machucado = true;
    j.momento = 'machucou';
    j.textos.push('Ninguém segurou. Amanhã é posto de saúde.');
    causo(t, `Stage dive em ${cidadeAtual(t)} termina no posto de saúde`, 5);
  }
  if (esp.compra) {
    const k = comprar(t, s, esp.compra);
    j.energia += k.energia;
    j.microfonias += k.microfonias;
    j.textos.push(...k.textos);
  }
  if (!s.desabou && s.energia >= s.alvo * 2) {
    s.desabou = true;
    j.momento = 'desabou';
  }
  s.ultima = c.id;
  s.ultimaTipo = c.tipo;
  if (esp.encerra || t.fim) s.encerrado = true;
  return j;
}

/** Fecha o bloco (música) atual: descarta a mão e compra outra. */
export function proximoBloco(t: Turne, s: Show): Jogada {
  for (const m of s.mao) if (!m.temp) s.descarte.push(m.id);
  s.mao = [];
  s.bloco++;
  if (s.bloco > BLOCOS) {
    s.encerrado = true;
    return { energia: 0, textos: [], microfonias: 0, avisos: [] };
  }
  s.folego = FOLEGO;
  s.desconto = 0;
  s.ultima = null;
  s.ultimaTipo = null;
  return comprar(t, s, MAO);
}

export interface ResultadoShow {
  sucesso: boolean;
  energia: number;
  alvo: number;
  cache: number;
  merch: number;
  extra: number;
  desabou: boolean;
  publico: number;
  avisos: string[];
}

export function encerrarShow(t: Turne, s: Show): ResultadoShow {
  const sucesso = s.energia >= s.alvo;
  const no = noAtual(t);
  const base = cacheBase(t);
  let cache = sucesso ? base : Math.ceil(base / 2);
  if (s.desabou) cache *= 2;
  const merch = s.energia >= s.alvo * 1.5 ? 5 + t.hype : 0;
  const publico = 20 + t.hype * 12 + (t.flags.mascote ? 15 : 0);
  const avisos: string[] = [];
  avisos.push(...aplicar(t, { grana: cache + merch + s.grana }));
  avisos.push(...aplicar(t, { hype: sucesso ? 1 + (t.flags.mascote ? 1 : 0) : -1 }));
  if (!sucesso) avisos.push(...aplicar(t, { clima: -1 }));
  if (t.banda.includes('vocal') && !s.cantaJunto) avisos.push(...aplicar(t, { voz: -1 }));

  t.stats.shows++;
  if (sucesso) t.stats.sucessos++;
  t.stats.publico += publico;
  t.stats.cache += cache + merch + s.grana;
  t.stats.maiorEnergia = Math.max(t.stats.maiorEnergia, s.energia);
  if (s.energia >= s.alvo * 1.5) t.stats.bombados++;
  const cidade = cidadeAtual(t);
  if (s.desabou) causo(t, `Palco desaba em ${cidade}; dono paga cachê dobrado de indenização`, 9);
  else if (no.final && sucesso) causo(t, `Festival de quintal em ${cidade} termina com ${publico} pessoas cantando junto`, 7);
  else if (!sucesso && sortear(t) < 0.5) causo(t, `Show morno em ${cidade}: alguém dormiu na van de cara fechada`, 2);

  const res: ResultadoShow = { sucesso, energia: s.energia, alvo: s.alvo, cache, merch, extra: s.grana, desabou: s.desabou, publico, avisos };
  if (t.fim) return res;
  if (no.final) {
    t.fim = 'completa';
    t.fase = { tipo: 'fim' };
    return res;
  }
  t.fase = { tipo: 'recompensa', opcoes: sucesso ? sortearRecompensas(t) : [], resumo: res };
  return res;
}

function sortearRecompensas(t: Turne): string[] {
  const pool = CARTAS.filter((c) => c.raridade !== 'inicial' && c.tipo !== 'problema');
  const opcoes: string[] = [];
  while (opcoes.length < 3) {
    const rara = sortear(t) < 0.2;
    const cand = pool.filter((c) => (c.raridade === 'rara') === rara && !opcoes.includes(c.id));
    if (!cand.length) continue;
    opcoes.push(escolher(t, cand).id);
  }
  return opcoes;
}

/** Fecha a tela de recompensa (id null = não levar nada). */
export function escolherRecompensa(t: Turne, id: string | null): void {
  if (t.fase.tipo !== 'recompensa') return;
  if (id && t.fase.opcoes.includes(id)) t.baralho.push(id);
  const sucesso = t.fase.resumo.sucesso;
  // Evento raro: o Shar Pei aparece num show do interior.
  if (sucesso && !t.flags.sharpeiVisto && t.noite >= 2 && sortear(t) < 0.15) {
    t.flags.sharpeiVisto = true;
    t.fase = abrirEvento(t, evento('sharpei'), false);
    return;
  }
  t.fase = { tipo: 'mapa' };
}

// ─── Fim ──────────────────────────────────────────────────

export function manchetes(t: Turne, n = 4): Causo[] {
  return [...t.causos].sort((a, b) => b.peso - a.peso || a.noite - b.noite).slice(0, n).sort((a, b) => a.noite - b.noite);
}

const NOMES_RECURSO: Record<Recurso, string> = { grana: 'R$', gasolina: 'L', clima: 'clima', voz: 'voz', hype: 'hype' };

export function descreverEfeitos(e: Efeitos): string {
  return (Object.entries(e) as [Recurso, number][])
    .filter(([, v]) => v)
    .map(([r, v]) => {
      const sinal = v > 0 ? '+' : '−';
      if (r === 'grana') return `${sinal}R$ ${Math.abs(v)}`;
      if (r === 'gasolina') return `${sinal}${Math.abs(v)} L`;
      return `${sinal}${Math.abs(v)} ${NOMES_RECURSO[r]}`;
    })
    .join(' · ');
}
