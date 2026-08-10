const validateCPF = require('../../helpers/validate-cpf');
const validatePassword = require('../../helpers/validate-password');

describe('validate-cpf', () => {
  test('rejeita CPF inválido e sequência repetida', () => {
    expect(validateCPF('')).toBe(false);
    expect(validateCPF('11111111111')).toBe(false);
    expect(validateCPF('00000000000')).toBe(false);
    expect(validateCPF('123')).toBe(false);
  });

  test('aceita CPF válido com ou sem máscara', () => {
    expect(validateCPF('39053344705')).toBe(true);
    expect(validateCPF('390.533.447-05')).toBe(true);
  });
});

describe('validate-password', () => {
  test('exige complexidade mínima', () => {
    expect(validatePassword('abc')).toBe(false);
    expect(validatePassword('abcdef')).toBe(false);
    expect(validatePassword('Abcdef1')).toBe(false);
    expect(validatePassword('Abcdef1!')).toBe(true);
  });
});
