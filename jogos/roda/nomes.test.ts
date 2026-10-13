import { describe, it, expect } from 'vitest';
import { nomeDoRecruta } from './nomes';

describe('nomeDoRecruta', () => {
  it('formato "Nome, profissão"', () => {
    expect(nomeDoRecruta(0)).toMatch(/^[\p{L} ]+, [\p{L} ]+$/u);
  });

  it('profissão concorda com o nome', () => {
    const errados = Array.from({ length: 300 }, (_, i) => nomeDoRecruta(i)).filter((n) =>
      /^(Dona|Tia) .*, (pedreiro|porteiro|cobrador|enfermeiro|professor|cozinheiro|garçom)$/.test(n) ||
      /^(Seu|Gilberto|Edson|Diego) .*?, (enfermeira|professora|cozinheira|pedreira|garçonete)$/.test(n),
    );
    expect(errados).toEqual([]);
  });

  it('tia da feira é sempre feirante e sempre mulher', () => {
    for (let i = 0; i < 50; i++) expect(nomeDoRecruta(i, 'tia')).toMatch(/, feirante$/);
  });

  it('é determinístico', () => {
    expect(nomeDoRecruta(42)).toBe(nomeDoRecruta(42));
  });
});
