/**
 * Qual desenho é o de hoje, sequência de dias e o texto de compartilhar.
 * Sem DOM — testável.
 *
 * O dia vira no fuso de Brasília, não no do aparelho: todo mundo joga o
 * mesmo desenho, e ninguém perde a sequência por estar viajando.
 */
import { DESENHOS, type Desenho } from './desenhos';

/** Primeiro PIXO. #1 = este dia. */
export const LANCAMENTO = '2026-10-13';

/** "AAAA-MM-DD" em America/Sao_Paulo. */
export function diaEmBrasilia(agora: Date = new Date()): string {
  // en-CA formata como AAAA-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
}

const MS_DIA = 86_400_000;
const paraUTC = (dia: string) => Date.UTC(+dia.slice(0, 4), +dia.slice(5, 7) - 1, +dia.slice(8, 10));

/** Dias entre duas datas "AAAA-MM-DD" (b − a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((paraUTC(b) - paraUTC(a)) / MS_DIA);
}

/** Número do PIXO (1, 2, 3…) de um dia. */
export function numeroDoDia(dia: string): number {
  return Math.max(1, diasEntre(LANCAMENTO, dia) + 1);
}

/** O desenho de um dia: a lista de 30 gira, uma coleção a cada 6 dias. */
export function desenhoDoDia(dia: string): Desenho {
  return DESENHOS[(numeroDoDia(dia) - 1) % DESENHOS.length];
}

/** Grade de verdadeiro/falso do desafio: maiúscula é pintada. */
export function solucaoDoDesenho(d: Desenho): boolean[][] {
  return d.arte.map((linha) => [...linha].map((ch) => ch !== '.' && ch === ch.toUpperCase()));
}

/** Cor de uma letra na revelação; minúscula herda a da maiúscula se não tiver a sua. */
export function corDaCelula(d: Desenho, ch: string): string | undefined {
  return d.cores[ch] ?? d.cores[ch.toUpperCase()];
}

/**
 * Sequência: quantos dias seguidos, terminando hoje (ou ontem — quem ainda
 * não jogou hoje não perdeu a sequência).
 */
export function sequencia(diasResolvidos: string[], hoje: string): number {
  const feitos = new Set(diasResolvidos);
  let dia = feitos.has(hoje) ? hoje : null;
  if (!dia) {
    const ontem = new Date(paraUTC(hoje) - MS_DIA).toISOString().slice(0, 10);
    if (!feitos.has(ontem)) return 0;
    dia = ontem;
  }
  let n = 0;
  let t = paraUTC(dia);
  while (feitos.has(new Date(t).toISOString().slice(0, 10))) { n++; t -= MS_DIA; }
  return n;
}

export function formatarTempo(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Mini grade 5×5 de emojis, BORRADA: mostra só a densidade de cada região,
 * para o resultado não estragar o desenho de quem ainda vai jogar.
 */
export function silhuetaBorrada(solucao: boolean[][]): string {
  const n = solucao.length;
  const linhas: string[] = [];
  for (let r = 0; r < 5; r++) {
    let linha = '';
    for (let c = 0; c < 5; c++) {
      const r0 = Math.floor((r * n) / 5), r1 = Math.floor(((r + 1) * n) / 5);
      const c0 = Math.floor((c * n) / 5), c1 = Math.floor(((c + 1) * n) / 5);
      let cheias = 0, total = 0;
      for (let i = r0; i < r1; i++) for (let j = c0; j < c1; j++) { total++; if (solucao[i][j]) cheias++; }
      const d = total ? cheias / total : 0;
      linha += d > 0.6 ? '🟧' : d > 0.25 ? '🟨' : '⬛';
    }
    linhas.push(linha);
  }
  return linhas.join('\n');
}

export function textoDeCompartilhar(o: { numero: number; segundos: number; dicas: number; sequencia: number; solucao: boolean[][] }): string {
  const dicas = o.dicas === 0 ? 'sem dicas' : o.dicas === 1 ? '1 dica' : `${o.dicas} dicas`;
  const seq = o.sequencia > 1 ? `, sequência de ${o.sequencia} dias` : '';
  return `PIXO #${o.numero} · ${formatarTempo(o.segundos)}, ${dicas}${seq}\n${silhuetaBorrada(o.solucao)}`;
}
