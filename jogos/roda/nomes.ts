/**
 * Nomes dos créditos: cada pessoa recrutada vira "Dona Cida, feirante".
 * Determinístico pelo índice — a mesma partida gera os mesmos créditos.
 * A profissão concorda com o nome (Gilberto, enfermeiro · Dona Cida, pedreira).
 */
type Genero = 'f' | 'm';

const NOMES: [string, Genero][] = [
  ['Dona Cida', 'f'], ['Seu Zé', 'm'], ['Tia Neide', 'f'], ['Jéssica', 'f'], ['Wellington', 'm'], ['Dona Lurdes', 'f'],
  ['Kauã', 'm'], ['Rosângela', 'f'], ['Seu Jorge', 'm'], ['Thaís', 'f'], ['Edson', 'm'], ['Vanessa', 'f'],
  ['Dona Benê', 'f'], ['Matheus', 'm'], ['Cleide', 'f'], ['Juninho', 'm'], ['Marlene', 'f'], ['Gilberto', 'm'],
  ['Bruna', 'f'], ['Seu Valdir', 'm'], ['Patrícia', 'f'], ['Diego', 'm'], ['Dona Fátima', 'f'], ['Raí', 'm'],
  ['Luana', 'f'], ['Seu Antônio', 'm'], ['Kelly', 'f'], ['Ronaldo', 'm'], ['Tati', 'f'], ['Dona Zilda', 'f'],
  ['Cauê', 'm'], ['Simone', 'f'],
];

/** [masculino, feminino] */
const PROFISSOES: [string, string][] = [
  ['feirante', 'feirante'], ['motoboy', 'motogirl'], ['cobrador', 'cobradora'], ['estudante', 'estudante'],
  ['pedreiro', 'pedreira'], ['manicure', 'manicure'], ['porteiro', 'porteira'], ['professor', 'professora'],
  ['entregador', 'entregadora'], ['costureiro', 'costureira'], ['camelô', 'camelô'], ['enfermeiro', 'enfermeira'],
  ['vigia noturno', 'vigia noturna'], ['diarista', 'diarista'], ['garçom', 'garçonete'], ['baterista', 'baterista'],
  ['cozinheiro', 'cozinheira'], ['motorista de app', 'motorista de app'], ['caixa de mercado', 'caixa de mercado'],
  ['ambulante', 'ambulante'], ['eletricista', 'eletricista'], ['operador de telemarketing', 'operadora de telemarketing'],
];

export function nomeDoRecruta(i: number, tipo?: 'motoboy' | 'tia' | 'povo'): string {
  // Tia da feira é sempre uma tia; o resto gira pela lista.
  const lista = tipo === 'tia' ? NOMES.filter(([, g]) => g === 'f') : NOMES;
  const [nome, genero] = lista[(i * 7 + 3) % lista.length];
  const par: [string, string] = tipo === 'motoboy' ? ['motoboy', 'motogirl'] : tipo === 'tia' ? ['feirante', 'feirante'] : PROFISSOES[(i * 5 + 1) % PROFISSOES.length];
  return `${nome}, ${genero === 'f' ? par[1] : par[0]}`;
}
