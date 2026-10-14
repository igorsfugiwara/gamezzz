import { describe, it, expect } from 'vitest';
import {
  CARTAS, EVENTOS, BARALHO_INICIAL, NOITES, novaTurne, caminhos, viajar, iniciarShow, jogar, podeJogar, proximoBloco,
  encerrarShow, escolherNoEvento, evento, carta, aplicar, descreverEfeitos, type Turne, type Show,
} from './motor';
import { jogarTurne } from './bot';

/** Monta um show com a mão escolhida, sem sorteio. */
function showCom(t: Turne, mao: string[], alvo = 20): Show {
  t.fase = { tipo: 'mapa' };
  viajar(t, 0);
  const { show } = iniciarShow(t);
  show.mao = mao.map((id) => ({ id }));
  show.pilha = [];
  show.descarte = [];
  show.alvo = alvo;
  show.folego = 10;
  return show;
}

describe('conteúdo', () => {
  it('25 cartas, 12 no baralho inicial, ids únicos', () => {
    expect(CARTAS).toHaveLength(25);
    expect(BARALHO_INICIAL).toHaveLength(12);
    expect(new Set(CARTAS.map((c) => c.id)).size).toBe(25);
  });

  it('20 eventos com 2 a 3 escolhas, e toda escolha mexe em dois recursos ou mais', () => {
    expect(EVENTOS).toHaveLength(20);
    for (const ev of EVENTOS) {
      expect(ev.escolhas.length, ev.id).toBeGreaterThanOrEqual(2);
      expect(ev.escolhas.length, ev.id).toBeLessThanOrEqual(3);
      for (const e of ev.escolhas) {
        const mexe = Object.keys(e.efeitos).length + (e.carta || e.remover || e.flag || e.requer ? 1 : 0);
        expect(mexe, `${ev.id}: ${e.texto}`).toBeGreaterThanOrEqual(2);
        if (e.carta) expect(() => carta(e.carta!)).not.toThrow();
      }
    }
  });

  it('escolhas sempre têm ganho e perda (nenhuma é óbvia)', () => {
    for (const ev of EVENTOS) {
      for (const e of ev.escolhas) {
        const v = Object.values(e.efeitos);
        const ganha = v.some((x) => x > 0) || !!e.carta || !!e.remover || e.flag === 'mascote';
        const perde = v.some((x) => x < 0) || !!e.requer || !!e.sorte;
        expect(ganha && perde, `${ev.id}: ${e.texto}`).toBe(true);
      }
    }
  });
});

describe('turnê', () => {
  it('mesma seed, mesma turnê', () => {
    expect(JSON.stringify(novaTurne('ABC123').mapa)).toBe(JSON.stringify(novaTurne('ABC123').mapa));
    expect(JSON.stringify(jogarTurne('ZINE42'))).toBe(JSON.stringify(jogarTurne('ZINE42')));
  });

  it('mapa: 10 noites, primeira e última com um show, todo nó alcançável', () => {
    const t = novaTurne('MAPA01');
    expect(t.mapa).toHaveLength(NOITES);
    expect(t.mapa[0]).toEqual([expect.objectContaining({ tipo: 'show' })]);
    expect(t.mapa[NOITES - 1][0].final).toBe(true);
    for (const linha of t.mapa.slice(1, -1)) expect(linha.some((n) => n.tipo === 'show')).toBe(true);
    expect(caminhos(t)).toEqual([0]);
  });

  it('gasolina acabou: evento de resgate antes de chegar', () => {
    const t = novaTurne('SECOU1');
    viajar(t, 0);
    t.fase = { tipo: 'mapa' };
    t.gasolina = 3;
    viajar(t, caminhos(t)[0]);
    expect(t.fase).toMatchObject({ tipo: 'evento', id: 'sem-gasolina', depois: true });
    escolherNoEvento(t, 1); // empurrar
    expect(t.gasolina).toBe(15);
    expect(t.fase.tipo).not.toBe('evento');
  });

  it('sem grana: perde o nó', () => {
    const t = novaTurne('LISO01');
    viajar(t, 0);
    t.fase = { tipo: 'mapa' };
    t.grana = 3;
    viajar(t, caminhos(t)[0]);
    expect(t.fase).toEqual({ tipo: 'perdida', motivo: 'grana' });
  });

  it('clima zerado tira alguém; duas saídas acabam a banda', () => {
    const t = novaTurne('BRIGA1');
    aplicar(t, { clima: -20 });
    expect(t.banda).toHaveLength(3);
    expect(t.clima).toBe(3);
    expect(t.fim).toBeNull();
    aplicar(t, { clima: -20 });
    expect(t.fim).toBe('acabou');
    expect(t.causos.at(-1)!.chave).toBe('causo.fim');
  });

  it('baterista conserta a van uma vez só', () => {
    const t = novaTurne('VAN001');
    viajar(t, 0);
    const ev = evento('correia');
    t.fase = { tipo: 'evento', id: 'correia', bloqueada: null, depois: false };
    expect(escolherNoEvento(t, 2)).not.toBeNull();
    t.fase = { tipo: 'evento', id: 'correia', bloqueada: null, depois: false };
    expect(escolherNoEvento(t, 2)).toBeNull();
    expect(ev.escolhas[2].requer).toBe('conserto');
  });
});

describe('show', () => {
  it('Breakdown seguido de Mosh: +10 dobrado e o público sobe no palco', () => {
    const t = novaTurne('MOSH01');
    const s = showCom(t, ['breakdown', 'mosh']);
    jogar(t, s, 0);
    const j = jogar(t, s, 0)!;
    expect(j.energia).toBe(20);
    expect(j.momento).toBe('mosh');
    expect(t.causos.some((c) => c.chave === 'causo.mosh')).toBe(true);
  });

  it('Cover não entra em combo e não gasta o Breakdown', () => {
    const t = novaTurne('COVER1');
    const s = showCom(t, ['breakdown', 'cover', 'blast']);
    jogar(t, s, 0);
    expect(jogar(t, s, 0)!.energia).toBe(4);
    expect(jogar(t, s, 0)!.energia).toBe(12);
  });

  it('Contagem barateia a próxima; Parede da morte dá o choque na seguinte', () => {
    const t = novaTurne('CONTA1');
    const s = showCom(t, ['contagem', 'parede', 'lenta']);
    s.folego = 2;
    jogar(t, s, 0);
    expect(podeJogar(t, s, 0)).toBeNull(); // Parede custa 2, sai por 1
    expect(s.folego).toBe(2);
    jogar(t, s, 0);
    expect(jogar(t, s, 0)!.energia).toBe(18);
  });

  it('sem voz, cartas vocais travam; Plateia canta junto libera', () => {
    const t = novaTurne('ROUCA1');
    const s = showCom(t, ['grito', 'cantajunto', 'grito']);
    t.voz = 0;
    expect(podeJogar(t, s, 0)).toBe('sem_voz');
    jogar(t, s, 1);
    expect(podeJogar(t, s, 0)).toBeNull();
  });

  it('Microfonia tira energia ao entrar na mão e não ocupa espaço', () => {
    const t = novaTurne('IIIII1');
    const s = showCom(t, []);
    s.energia = 5;
    s.pilha = ['cover', 'cover', 'cover', 'cover', 'cover', 'microfonia'];
    s.bloco = 1;
    proximoBloco(t, s);
    expect(s.energia).toBe(3);
    expect(s.mao).toHaveLength(5);
  });

  it('passar do dobro do alvo derruba o palco e dobra o cachê', () => {
    const t = novaTurne('PALCO1');
    const s = showCom(t, ['hino', 'hino', 'hino', 'hino'], 10);
    t.voz = 5;
    while (s.mao.length && podeJogar(t, s, 0) === null) jogar(t, s, 0);
    expect(s.desabou).toBe(true);
    const r = encerrarShow(t, s);
    expect(r.cache).toBeGreaterThan(0);
    expect(t.causos.some((c) => c.chave === 'causo.palco')).toBe(true);
  });

  it('Agradecimento encerra o show na hora', () => {
    const t = novaTurne('VALEU1');
    const s = showCom(t, ['agradecimento', 'blast']);
    jogar(t, s, 0);
    expect(s.encerrado).toBe(true);
    expect(s.grana).toBe(10);
  });
});

describe('balanceamento (bot em 400 turnês)', () => {
  const turnes = Array.from({ length: 400 }, (_, i) => jogarTurne(`SIM${i}`));
  const completas = turnes.filter((t) => t.fim === 'completa').length / turnes.length;
  const acabou = turnes.filter((t) => t.fim === 'acabou').length / turnes.length;

  it('toda turnê termina', () => {
    expect(turnes.every((t) => t.fim)).toBe(true);
  });

  it('dá pra completar, mas não é de graça', () => {
    // eslint-disable-next-line no-console
    console.log(`completas ${(completas * 100).toFixed(0)}% · banda acabou ${(acabou * 100).toFixed(0)}%`);
    expect(completas).toBeGreaterThan(0.3);
    expect(completas).toBeLessThan(0.85);
  });
});

describe('descreverEfeitos', () => {
  it('formata para a interface', () => {
    expect(descreverEfeitos({ grana: 10, clima: -1 })).toBe('+R$ 10 · −1 clima');
  });
});
