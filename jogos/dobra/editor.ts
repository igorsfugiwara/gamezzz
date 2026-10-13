/**
 * Editor de fases (PRD 3: ferramentas de design). Abre com #editor na URL.
 * Monta a fase clicando, roda o solver (mínimo de dobras e quantas soluções
 * chegam nele — muitas = atalho não previsto) e exporta o JSON para fases.ts.
 */
import type { Fase, Peca, Dir } from './motor';
import { resolverFase, estadoInicial } from './motor';
import { calcularLayout, desenharPapel, desenharVincos, desenharPecas, desenharCao } from './desenho';

type Ferramenta = Peca | 'cao' | 'apagar';
const FERRAMENTAS: { id: Ferramenta; nome: string }[] = [
  { id: 'petisco', nome: 'Petisco' }, { id: 'parede', nome: 'Parede' }, { id: 'almofada', nome: 'Almofada' },
  { id: 'poca', nome: 'Poça' }, { id: 'gato', nome: 'Gato' }, { id: 'osso', nome: 'Osso' },
  { id: 'cao', nome: 'Cachorro' }, { id: 'apagar', nome: 'Apagar' },
];
const GIRO: Record<Dir, Dir> = { L: 'S', S: 'O', O: 'N', N: 'L' };

export function abrirEditor(testar: (f: Fase) => void): void {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  $('editor').hidden = false;
  const tela = $('ed-tela') as HTMLCanvasElement;
  const ctx = tela.getContext('2d')!;
  let ferramenta: Ferramenta = 'petisco';

  const fase: Fase = {
    id: 'nova', largura: 6, altura: 6, vincosV: [3], vincosH: [3],
    cao: { x: 0, y: 5, dir: 'L' }, pecas: [{ x: 5, y: 0, tipo: 'petisco' }],
  };

  const botoes = $('ed-pecas');
  for (const f of FERRAMENTAS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.textContent = f.nome;
    b.addEventListener('click', () => { ferramenta = f.id; marcar(); });
    b.dataset.id = f.id;
    botoes.appendChild(b);
  }
  const marcar = () => botoes.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === ferramenta)));
  marcar();

  const layoutAtual = () => calcularLayout(fase.largura, fase.altura, tela.width, tela.height, 20);

  function desenhar() {
    const lado = Math.min(tela.parentElement!.clientWidth, 520);
    if (tela.width !== lado) { tela.width = lado; tela.height = lado; }
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, tela.width, tela.height);
    const e = estadoInicial(fase);
    const l = layoutAtual();
    desenharPapel(ctx, e, l);
    desenharVincos(ctx, e, l);
    desenharPecas(ctx, e, l);
    desenharCao(ctx, l.ox + fase.cao.x * l.cel, l.oy + fase.cao.y * l.cel, l.cel, { espelhar: fase.cao.dir === 'O' });
    // Seta da direção do cachorro.
    const seta = { L: '→', O: '←', N: '↑', S: '↓' }[fase.cao.dir];
    ctx.fillStyle = '#ff4fa3';
    ctx.font = `bold ${Math.round(l.cel * 0.35)}px system-ui`;
    ctx.fillText(seta, l.ox + fase.cao.x * l.cel + 2, l.oy + fase.cao.y * l.cel + l.cel * 0.35);
  }

  tela.addEventListener('pointerdown', (ev) => {
    const r = tela.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * tela.width;
    const y = ((ev.clientY - r.top) / r.height) * tela.height;
    const l = layoutAtual();
    const fx = (x - l.ox) / l.cel, fy = (y - l.oy) / l.cel;
    // Perto de uma linha interna da grade → liga/desliga vinco.
    const perto = 0.18;
    const kx = Math.round(fx), ky = Math.round(fy);
    if (Math.abs(fx - kx) < perto && kx > 0 && kx < fase.largura && fy > 0 && fy < fase.altura) {
      fase.vincosV = fase.vincosV.includes(kx) ? fase.vincosV.filter((k) => k !== kx) : [...fase.vincosV, kx].sort((a, b) => a - b);
      return atualizar();
    }
    if (Math.abs(fy - ky) < perto && ky > 0 && ky < fase.altura && fx > 0 && fx < fase.largura) {
      fase.vincosH = fase.vincosH.includes(ky) ? fase.vincosH.filter((k) => k !== ky) : [...fase.vincosH, ky].sort((a, b) => a - b);
      return atualizar();
    }
    const cx = Math.floor(fx), cy = Math.floor(fy);
    if (cx < 0 || cy < 0 || cx >= fase.largura || cy >= fase.altura) return;
    const ehCao = fase.cao.x === cx && fase.cao.y === cy;
    if (ferramenta === 'cao' || ehCao) {
      if (ehCao) fase.cao.dir = GIRO[fase.cao.dir];
      else { fase.pecas = fase.pecas.filter((p) => p.x !== cx || p.y !== cy); fase.cao = { x: cx, y: cy, dir: fase.cao.dir }; }
      return atualizar();
    }
    fase.pecas = fase.pecas.filter((p) => p.x !== cx || p.y !== cy);
    if (ferramenta !== 'apagar') {
      if (ferramenta === 'petisco') fase.pecas = fase.pecas.filter((p) => p.tipo !== 'petisco');
      fase.pecas.push({ x: cx, y: cy, tipo: ferramenta });
    }
    atualizar();
  });

  const redimensionar = () => {
    const w = Math.max(3, Math.min(8, Number(($('ed-larg') as HTMLInputElement).value) || 6));
    const h = Math.max(3, Math.min(8, Number(($('ed-alt') as HTMLInputElement).value) || 6));
    fase.largura = w; fase.altura = h;
    fase.pecas = fase.pecas.filter((p) => p.x < w && p.y < h);
    fase.vincosV = fase.vincosV.filter((k) => k < w);
    fase.vincosH = fase.vincosH.filter((k) => k < h);
    fase.cao = { x: Math.min(fase.cao.x, w - 1), y: Math.min(fase.cao.y, h - 1), dir: fase.cao.dir };
    atualizar();
  };
  $('ed-larg').addEventListener('change', redimensionar);
  $('ed-alt').addEventListener('change', redimensionar);

  function atualizar() {
    $('ed-resultado').textContent = '';
    desenhar();
  }

  $('ed-resolver').addEventListener('click', () => {
    const s = resolverFase(fase, 8);
    const saida = $('ed-resultado');
    if (!s) { saida.textContent = 'Sem solução em até 8 dobras.'; return; }
    const alerta = s.dobras <= 1 ? ' · curta demais para o meio do mundo' : s.solucoes > 2 ? ' · atalho: muitas soluções no mínimo' : '';
    saida.textContent = `Mínimo: ${s.dobras} ${s.dobras === 1 ? 'dobra' : 'dobras'} (${s.sequencia.map(([e, k]) => e + k).join(' ')}) · ${s.solucoes} solução(ões)${alerta}`;
  });
  $('ed-testar').addEventListener('click', () => testar({ ...fase, pecas: fase.pecas.map((p) => ({ ...p })), cao: { ...fase.cao } }));
  $('ed-exportar').addEventListener('click', () => {
    const s = resolverFase(fase, 8);
    const { id: _rascunho, ...resto } = fase;
    const json = { id: 'X-Y', nome: 'Nome da fase', minimo: s?.dobras ?? null, ...resto };
    const area = $('ed-json') as HTMLTextAreaElement;
    area.value = JSON.stringify(json);
    area.select();
  });

  window.addEventListener('resize', desenhar);
  desenhar();
}
