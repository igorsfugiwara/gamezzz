/**
 * Save em localStorage, por jogo. Iframe de terceiro, aba anônima e Safari
 * com bloqueio podem negar o storage: tudo em try/catch, e o jogo funciona
 * sem — só não lembra.
 */
const PREFIXO = 'portal';

export function ler<T>(jogo: string, chave: string, padrao: T): T {
  try {
    const bruto = localStorage.getItem(`${PREFIXO}.${jogo}.${chave}`);
    return bruto === null ? padrao : (JSON.parse(bruto) as T);
  } catch {
    return padrao;
  }
}

export function gravar<T>(jogo: string, chave: string, valor: T): void {
  try {
    localStorage.setItem(`${PREFIXO}.${jogo}.${chave}`, JSON.stringify(valor));
  } catch {
    /* sem storage: segue sem lembrar */
  }
}
