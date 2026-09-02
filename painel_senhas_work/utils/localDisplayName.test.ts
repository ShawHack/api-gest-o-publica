import { describe, expect, it } from 'vitest'
import { parsePainelSenha } from '../services/api/adapters/painelSenhaAdapter'
import { resolveLocalDisplayName } from './localDisplayName'

describe('resolveLocalDisplayName', () => {
  it('converte Sala do NovoSGA para Guichê', () => {
    expect(resolveLocalDisplayName('Sala')).toBe('Guichê')
    expect(resolveLocalDisplayName('sala')).toBe('Guichê')
  })

  it('mantém outros nomes de local', () => {
    expect(resolveLocalDisplayName('Guichê')).toBe('Guichê')
    expect(resolveLocalDisplayName('Box')).toBe('Box')
  })
})

describe('parsePainelSenha local', () => {
  it('aplica Guichê quando a API envia Sala', () => {
    const call = parsePainelSenha({
      id: 1,
      senha: 'A001',
      siglaSenha: 'A',
      numeroSenha: 1,
      local: 'Sala',
      numeroLocal: 3,
      servico: { id: 1, nome: 'Teste' },
      prioridade: 'Normal',
      peso: 1,
    })
    expect(call.localName).toBe('Guichê')
    expect(call.localLabel).toBe('Guichê 03')
  })
})
