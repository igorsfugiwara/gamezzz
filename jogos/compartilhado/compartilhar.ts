/**
 * Botão de compartilhar comum: menu do celular quando existe, senão copia.
 * Devolve o que aconteceu para o jogo dar o retorno certo na tela.
 */
export type ResultadoCompartilhar = 'compartilhado' | 'copiado' | 'cancelado' | 'falhou';

export async function compartilhar(texto: string, url = urlDoJogo()): Promise<ResultadoCompartilhar> {
  if (navigator.share) {
    try {
      await navigator.share({ text: texto, url });
      return 'compartilhado';
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return 'cancelado';
    }
  }
  try {
    await navigator.clipboard.writeText(`${texto}\n${url}`);
    return 'copiado';
  } catch {
    return 'falhou';
  }
}

/** Endereço da página do jogo no portal (fora do iframe), para o link compartilhado levar até ele. */
export function urlDoJogo(): string {
  const slug = location.pathname.match(/portal\/([^/]+)\//)?.[1];
  return slug ? `${location.origin}/jogos/${slug}` : location.href;
}
