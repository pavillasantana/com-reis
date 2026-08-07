import { describe, it, expect } from 'vitest';
import { montarNomeCompleto, normalizarNomeRepetido } from '../utils/nomeCompleto';

describe('montarNomeCompleto', () => {
  it('junta nome e sobrenome', () => {
    expect(montarNomeCompleto('Maria', 'Silva')).toBe('Maria Silva');
  });

  it('não duplica sobrenome já contido no nome', () => {
    expect(montarNomeCompleto('Maria Silva', 'Silva')).toBe('Maria Silva');
  });

  it('retorna só o nome quando não há sobrenome', () => {
    expect(montarNomeCompleto('Maria', null)).toBe('Maria');
    expect(montarNomeCompleto('Maria', '')).toBe('Maria');
  });

  it('trata nome vazio', () => {
    expect(montarNomeCompleto('', 'Silva')).toBe('Silva');
  });
});

describe('normalizarNomeRepetido', () => {
  it('remove palavras adjacentes repetidas', () => {
    expect(normalizarNomeRepetido('Maria Maria Silva')).toBe('Maria Silva');
    expect(normalizarNomeRepetido('Maria Silva Silva')).toBe('Maria Silva');
  });

  it('mantém nomes sem repetição', () => {
    expect(normalizarNomeRepetido('Maria Silva Santos')).toBe('Maria Silva Santos');
  });

  it('remove espaços extras', () => {
    expect(normalizarNomeRepetido('  Maria   Silva  ')).toBe('Maria Silva');
  });
});
