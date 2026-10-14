/**
 * Tutorial jogado: balão curto + mãozinha mostrando o gesto em cima do
 * alvo, sem travar o jogo. Cada passo só avança quando a pessoa faz a ação
 * de verdade (`ok`), então a primeira fase vira a aula.
 *
 * Mesma família visual em todos os jogos do portal: os HTML avulsos de
 * public/games usam este mesmo código via tutorial.js (npm run
 * build:tutorial). Uma vez concluído ou pulado, não volta — a não ser com
 * `?tutorial` na URL.
 */
import { ler, gravar } from './salvar';
import { evento } from './eventos';

export interface Retangulo { x: number; y: number; w: number; h: number }
export type Alvo = () => Retangulo | Element | null;
export type Gesto = 'toque' | 'arrastar' | 'circulo' | 'segurar' | 'nenhum';

export interface Passo {
  id: string;
  /** Texto fixo ou função (para jogos com troca de idioma). */
  texto: string | (() => string);
  /** Onde a mão aponta (coordenadas da janela). */
  alvo?: Alvo;
  gesto?: Gesto;
  /** Fim do arrasto, quando `gesto` é 'arrastar'. */
  destino?: Alvo;
  /** Escurece o resto da tela em volta do alvo. */
  luz?: boolean;
  /** Condição para seguir; checada a cada quadro. */
  ok?: () => boolean;
  /** Segue sozinho depois de N segundos (passos só de leitura). */
  segundos?: number;
  /** Não mostra nada enquanto for falso (ex.: espera o segurança aparecer). */
  quando?: () => boolean;
  /** Onde fica o balão: junto do alvo (padrão) ou preso no topo/base da tela. */
  lugar?: 'auto' | 'topo' | 'base';
}

/** Estilo embutido: vale igual nos jogos do Vite e nos HTML avulsos. */
const ESTILO = `
.tut { position: fixed; inset: 0; z-index: 900; pointer-events: none; }
.tut, .tut * { box-sizing: border-box; letter-spacing: normal; text-transform: none; text-shadow: none; }
.tut[hidden], .tut--espera { display: none; }
.tut__luz { position: fixed; border-radius: 12px; box-shadow: 0 0 0 200vmax rgba(13, 11, 20, 0.55); transition: left 160ms, top 160ms, width 160ms, height 160ms; }
.tut__bolha {
  position: fixed;
  width: max-content;
  max-width: min(300px, calc(100vw - 16px));
  padding: 10px 12px 8px;
  border-radius: 6px;
  background: #f4f1ea;
  color: #0d0b14;
  border: 2px solid #0d0b14;
  box-shadow: 4px 4px 0 #ff4fa3;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  pointer-events: auto;
}
.tut__bolha--entra { animation: tutEntra 220ms ease-out; }
@keyframes tutEntra { from { opacity: 0; transform: translateY(6px) scale(0.96); } }
.tut__bolha p { margin: 0; padding: 0; color: #0d0b14; font: 800 16px/1.3 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
.tut__rodape { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 6px; }
.tut__contador { font: 700 12px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #6f6b7d; }
.tut__pular { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; min-height: 32px; padding: 0 6px; cursor: pointer; font: 700 13px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #6f6b7d; text-decoration: underline; }
.tut__pular:focus-visible { outline: 2px solid #3df0e6; }
.tut__mao { position: fixed; font-size: 38px; line-height: 1; transform: translate(-50%, 0); filter: drop-shadow(2px 3px 0 rgba(13, 11, 20, 0.7)); }
.tut__mao[hidden] { display: none; }
.tut__mao--toque { animation: tutToque 1s ease-in-out infinite; }
@keyframes tutToque { 0%, 100% { translate: 0 14px; } 45% { translate: 0 0; scale: 1; } 55% { translate: 0 0; scale: 0.88; } }
.tut__mao--segurar { animation: tutSegura 1.6s ease-in-out infinite; }
@keyframes tutSegura { 0%, 100% { translate: 0 14px; scale: 1; } 25%, 75% { translate: 0 0; scale: 0.86; } }
.tut__mao--arrastar { animation: tutArrasta 1.6s ease-in-out infinite; }
@keyframes tutArrasta { 0% { translate: 0 0; opacity: 0; } 12% { opacity: 1; translate: 0 0; } 75% { translate: var(--dx) var(--dy); opacity: 1; } 100% { translate: var(--dx) var(--dy); opacity: 0; } }
.tut__mao--circulo { animation: tutCirculo 1.8s linear infinite; }
@keyframes tutCirculo {
  0% { translate: 36px 0; } 12.5% { translate: 25px 25px; } 25% { translate: 0 36px; } 37.5% { translate: -25px 25px; }
  50% { translate: -36px 0; } 62.5% { translate: -25px -25px; } 75% { translate: 0 -36px; } 87.5% { translate: 25px -25px; } 100% { translate: 36px 0; }
}
@media (prefers-reduced-motion: reduce) { .tut__mao { animation: none !important; } }
`;

function garantirEstilo() {
  if (document.getElementById('tut-estilo')) return;
  const st = document.createElement('style');
  st.id = 'tut-estilo';
  st.textContent = ESTILO;
  document.head.appendChild(st);
}

const forcado = (() => {
  try { return new URLSearchParams(location.search).has('tutorial') || location.hash.includes('tutorial'); } catch { return false; }
})();

function retangulo(a: Alvo | undefined): Retangulo | null {
  const r = a?.();
  if (!r) return null;
  if (r instanceof Element) {
    const b = r.getBoundingClientRect();
    if (!b.width && !b.height) return null;
    return { x: b.left, y: b.top, w: b.width, h: b.height };
  }
  return r;
}

export class Tutorial {
  ativo: boolean;
  private indice = -1;
  private inicio = 0;
  private raf = 0;
  private raiz: HTMLDivElement | null = null;
  private bolha!: HTMLDivElement;
  private texto!: HTMLParagraphElement;
  private contador!: HTMLSpanElement;
  private mao!: HTMLDivElement;
  private luz!: HTMLDivElement;
  private pular!: HTMLButtonElement;
  private dicaAtual: Passo | null = null;
  /** Dica pedida enquanto outra coisa ocupava o balão; sai logo depois. */
  private dicaPendente: Passo | null = null;

  constructor(
    private jogo: string,
    private passos: Passo[],
    private aoFim?: (pulou: boolean) => void,
    private rotulos: () => { pular: string; entendi: string; de: string } = () => ({ pular: 'Pular tutorial', entendi: 'Entendi', de: 'de' }),
  ) {
    this.ativo = forcado || !ler<boolean>(jogo, 'tutorial', false);
  }

  /** Id do passo na tela (ou null). */
  get passo(): string | null {
    return this.indice >= 0 && this.ativo ? this.passos[this.indice]?.id ?? null : null;
  }

  /** Já passou do passo `id`? (para liberar coisas aos poucos, ex.: seguranças) */
  passou(id: string): boolean {
    if (!this.ativo) return true;
    const k = this.passos.findIndex((p) => p.id === id);
    return k >= 0 && this.indice > k;
  }

  iniciar(): void {
    if (!this.ativo || this.indice >= 0) return;
    evento(this.jogo, 'tutorial_inicio');
    this.montar();
    this.ir(0);
  }

  /** Avança; com `id`, só se esse for o passo atual. */
  avancar(id?: string): void {
    if (!this.ativo || this.indice < 0) return;
    if (id && this.passos[this.indice]?.id !== id) return;
    if (this.indice + 1 >= this.passos.length) this.concluir(false);
    else this.ir(this.indice + 1);
  }

  concluir(pulou = false): void {
    if (!this.ativo) return;
    this.ativo = false;
    gravar(this.jogo, 'tutorial', true);
    evento(this.jogo, pulou ? 'tutorial_pulado' : 'tutorial_concluido', { passo: this.passos[this.indice]?.id ?? '' });
    this.indice = -1;
    if (!this.dicaAtual) this.desmontar();
    this.aoFim?.(pulou);
    this.soltarPendente();
  }

  /** Esconde sem concluir (ex.: saiu para o menu no meio). */
  pausar(): void {
    if (this.raiz) this.raiz.hidden = true;
  }
  retomar(): void {
    if (this.raiz) this.raiz.hidden = false;
  }

  /**
   * Dica de primeira vez, fora da sequência: aparece uma vez na vida
   * (fica guardada) e some com `ok` ou depois de `segundos`.
   */
  dica(p: Passo): void {
    const chave = `dica.${p.id}`;
    if (!forcado && ler<boolean>(this.jogo, chave, false)) return;
    if (this.dicaAtual || (this.ativo && this.indice >= 0)) {
      if (this.dicaAtual?.id !== p.id) this.dicaPendente = p;
      return;
    }
    gravar(this.jogo, chave, true);
    this.dicaAtual = { segundos: 4, ...p };
    this.montar();
    this.inicio = performance.now();
    this.mostrar(this.dicaAtual, '');
  }

  // ─── DOM ────────────────────────────────────────────────

  private montar() {
    if (this.raiz) { this.raiz.hidden = false; return; }
    garantirEstilo();
    const raiz = document.createElement('div');
    raiz.className = 'tut';
    raiz.setAttribute('aria-live', 'polite');
    this.luz = document.createElement('div');
    this.luz.className = 'tut__luz';
    this.mao = document.createElement('div');
    this.mao.className = 'tut__mao';
    this.mao.textContent = '👆';
    this.mao.setAttribute('aria-hidden', 'true');
    this.bolha = document.createElement('div');
    this.bolha.className = 'tut__bolha';
    this.texto = document.createElement('p');
    this.contador = document.createElement('span');
    this.contador.className = 'tut__contador';
    const pular = document.createElement('button');
    this.pular = pular;
    pular.className = 'tut__pular';
    pular.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.dicaAtual) this.fecharDica();
      else this.concluir(true);
    });
    const rodape = document.createElement('div');
    rodape.className = 'tut__rodape';
    rodape.append(this.contador, pular);
    this.bolha.append(this.texto, rodape);
    raiz.append(this.luz, this.mao, this.bolha);
    document.body.appendChild(raiz);
    this.raiz = raiz;
    const laco = () => {
      this.quadro();
      this.raf = requestAnimationFrame(laco);
    };
    this.raf = requestAnimationFrame(laco);
  }

  private desmontar() {
    cancelAnimationFrame(this.raf);
    this.raiz?.remove();
    this.raiz = null;
  }

  private fecharDica() {
    this.dicaAtual = null;
    if (!this.ativo || this.indice < 0) this.desmontar();
    else this.mostrar(this.passos[this.indice], this.rotulo());
    this.soltarPendente();
  }

  private soltarPendente() {
    const p = this.dicaPendente;
    this.dicaPendente = null;
    if (p) this.dica(p);
  }

  private rotulo() {
    return `${this.indice + 1} ${this.rotulos().de} ${this.passos.length}`;
  }

  private ir(i: number) {
    this.indice = i;
    this.inicio = performance.now();
    this.mostrar(this.passos[i], this.rotulo());
  }

  private mostrar(p: Passo, rotulo: string) {
    this.texto.textContent = typeof p.texto === 'function' ? p.texto() : p.texto;
    this.contador.textContent = rotulo;
    // Na dica avulsa o botão só fecha; na sequência, pula o tutorial todo.
    this.pular.textContent = p === this.dicaAtual ? this.rotulos().entendi : this.rotulos().pular;
    this.mao.className = `tut__mao tut__mao--${p.gesto ?? 'toque'}`;
    // Reinicia a animação do balão a cada passo.
    this.bolha.classList.remove('tut__bolha--entra');
    void this.bolha.offsetWidth;
    this.bolha.classList.add('tut__bolha--entra');
    this.quadro();
  }

  private quadro() {
    const p = this.dicaAtual ?? (this.ativo && this.indice >= 0 ? this.passos[this.indice] : null);
    if (!p || !this.raiz) return;
    // Feito é feito, mesmo fora da tela do passo (ex.: já saiu do mapa).
    const visivel = !p.quando || p.quando();
    const passouTempo = visivel && p.segundos !== undefined && performance.now() - this.inicio > p.segundos * 1000;
    if (p.ok?.() || passouTempo) {
      if (this.dicaAtual) this.fecharDica();
      else this.avancar();
      return;
    }
    this.raiz.classList.toggle('tut--espera', !visivel);
    if (!visivel) { this.inicio = performance.now(); return; }

    const r = retangulo(p.alvo);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gesto = p.gesto ?? 'toque';
    this.mao.hidden = !r || gesto === 'nenhum';
    this.luz.hidden = !r || !p.luz;
    if (r) {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      this.mao.style.left = `${cx}px`;
      this.mao.style.top = `${cy}px`;
      const d = retangulo(p.destino);
      this.mao.style.setProperty('--dx', `${d ? d.x + d.w / 2 - cx : 70}px`);
      this.mao.style.setProperty('--dy', `${d ? d.y + d.h / 2 - cy : 0}px`);
      if (p.luz) {
        const folga = 8;
        Object.assign(this.luz.style, { left: `${r.x - folga}px`, top: `${r.y - folga}px`, width: `${r.w + folga * 2}px`, height: `${r.h + folga * 2}px` });
      }
    }
    // Balão acima do alvo se couber; senão abaixo (deixando espaço para a mão).
    const bw = this.bolha.offsetWidth;
    const bh = this.bolha.offsetHeight;
    let top: number;
    if (p.lugar === 'topo') top = 64;
    else if (p.lugar === 'base') top = vh - bh - 96;
    else if (!r) top = vh * 0.18;
    else if (r.y - bh - 16 > 8) top = r.y - bh - 16;
    else top = Math.min(vh - bh - 8, r.y + r.h + 64);
    const cx = r ? r.x + r.w / 2 : vw / 2;
    const left = Math.max(8, Math.min(vw - bw - 8, cx - bw / 2));
    this.bolha.style.left = `${left}px`;
    this.bolha.style.top = `${Math.max(8, top)}px`;
  }
}

/** Retângulo de um ponto (útil para canvas). */
export function ponto(x: number, y: number, raio = 12): Retangulo {
  return { x: x - raio, y: y - raio, w: raio * 2, h: raio * 2 };
}
