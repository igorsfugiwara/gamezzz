/**
 * Eventos de analytics. O jogo roda num iframe: avisa a página do portal por
 * postMessage, e ela decide para onde mandar. Sem nenhum dado pessoal.
 */
export function evento(jogo: string, nome: string, dados: Record<string, string | number | boolean> = {}): void {
  try {
    window.parent?.postMessage({ tipo: 'portal-evento', jogo, nome, dados }, '*');
  } catch {
    /* sem parent acessível: ignora */
  }
}
