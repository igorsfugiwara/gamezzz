/**
 * Bot simples que joga turnês inteiras — base da "planilha de simulação" do
 * PRD: roda nos testes para o balanceamento não quebrar sem ninguém ver.
 * Joga de forma razoável, não ótima: um humano atento vai melhor.
 */
import {
  type Turne, type Show, novaTurne, caminhos, viajar, abastecer, podeAbastecer, custoGasolina, escolherNoEvento, evento,
  escolhaDisponivel, descansar, descansoDisponivel, iniciarShow, podeJogar, jogar, proximoBloco, encerrarShow,
  escolherRecompensa, seguirDepoisDePerdida, carta, custoDe, CARTAS, type Efeitos,
} from './motor';

function valorEfeitos(t: Turne, e: Efeitos): number {
  const peso = {
    grana: t.grana < 20 ? 0.5 : 0.2,
    gasolina: t.gasolina < 30 ? 0.2 : 0.05,
    clima: t.clima <= 3 ? 3 : 1.2,
    voz: t.voz <= 1 ? 2 : 0.8,
    hype: 1,
  };
  return Object.entries(e).reduce((s, [r, v]) => s + (v ?? 0) * peso[r as keyof typeof peso], 0);
}

function tocar(t: Turne, s: Show): void {
  while (!s.encerrado) {
    let melhor = -1;
    let nota = -Infinity;
    s.mao.forEach((m, i) => {
      if (podeJogar(t, s, i) !== null) return;
      const c = carta(m.id);
      let v = c.energia + (c.especial?.aleatoria ? 5 : 0);
      if (c.especial?.dobra) v = s.mao.some((o) => o.id === 'mosh' || o.id === 'pit') ? 20 : 4;
      if (c.especial?.combo && s.ultima && c.especial.combo.apos.includes(s.ultima)) v = c.especial.combo.energia * 2;
      if (c.especial?.encerra) v = s.energia >= s.alvo ? 50 : -50;
      if (c.especial?.ocupa) v = 1;
      if (c.especial?.folego || c.especial?.compra || c.especial?.desconto) v = 6;
      if (c.especial?.hype) v = s.energia >= s.alvo ? 3 : 1;
      if ((c.voz ?? 0) < 0 && t.voz <= 1) v -= 4;
      v = v / Math.max(1, custoDe(s, c)) + (custoDe(s, c) === 0 ? 1 : 0);
      if (v > nota) { nota = v; melhor = i; }
    });
    if (melhor < 0 || nota <= 0) proximoBloco(t, s);
    else jogar(t, s, melhor);
  }
}

export function jogarTurne(seed: string): Turne {
  const t = novaTurne(seed);
  for (let passos = 0; passos < 200 && !t.fim; passos++) {
    const f = t.fase;
    if (f.tipo === 'mapa') {
      while (t.gasolina < custoGasolina(t) * 2 && podeAbastecer(t) && t.grana > 20) abastecer(t);
      const opcoes = caminhos(t);
      const tipo = (i: number) => t.mapa[t.noite][i].tipo;
      const quer = t.clima <= 3 || t.voz <= 1 ? ['descanso', 'evento', 'estrada', 'show'] : ['show', 'evento', 'estrada', 'descanso'];
      const faixa = [...opcoes].sort((a, b) => quer.indexOf(tipo(a)) - quer.indexOf(tipo(b)))[0];
      viajar(t, faixa);
    } else if (f.tipo === 'evento') {
      const ev = evento(f.id);
      const livres = ev.escolhas.map((_, i) => i).filter((i) => escolhaDisponivel(t, ev, i, f.bloqueada) === null);
      const melhor = livres.sort((a, b) => valorEfeitos(t, ev.escolhas[b].efeitos) - valorEfeitos(t, ev.escolhas[a].efeitos))[0];
      escolherNoEvento(t, melhor ?? 0);
    } else if (f.tipo === 'descanso') {
      if (t.clima <= 4 && descansoDisponivel(t, 'dormir')) descansar(t, 'dormir');
      else if (t.baralho.includes('corda') && t.clima > 3) descansar(t, 'ensaiar', t.baralho.indexOf('corda'));
      else if (t.baralho.includes('microfonia') && t.clima > 3) descansar(t, 'ensaiar', t.baralho.indexOf('microfonia'));
      else if (descansoDisponivel(t, 'dormir')) descansar(t, 'dormir');
      else descansar(t, 'live');
    } else if (f.tipo === 'show') {
      const { show } = iniciarShow(t);
      tocar(t, show);
      encerrarShow(t, show);
    } else if (f.tipo === 'recompensa') {
      const ordem = (id: string) => CARTAS.findIndex((c) => c.id === id);
      escolherRecompensa(t, f.opcoes.sort((a, b) => carta(b).energia - carta(a).energia || ordem(a) - ordem(b))[0] ?? null);
    } else if (f.tipo === 'perdida') {
      seguirDepoisDePerdida(t);
    } else break;
  }
  return t;
}
