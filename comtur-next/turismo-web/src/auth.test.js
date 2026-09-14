import { describe, expect, test } from 'vitest'
import { isManager, maskCpf, maskPhone, validateRegister } from './auth.js'

describe('cadastro municipal do COMTUR', () => {
  test('mascara CPF e telefone como na Cultura', () => {
    expect(maskCpf('12345678901')).toBe('123.456.789-01')
    expect(maskPhone('14999998888')).toBe('(14) 99999-8888')
  })

  test('rejeita cadastro incompleto e aceita payload válido', () => {
    const invalid = validateRegister({ name: 'A', email: 'x', cpf: '1', phone: '1', password: '12', confirmpassword: '34' }, false)
    expect(Object.keys(invalid.errors)).toEqual(expect.arrayContaining(['name', 'email', 'cpf', 'phone', 'password', 'confirmpassword', 'agreeTerms']))
    const valid = validateRegister({
      name: 'Maria Silva',
      email: 'maria@garca.sp.gov.br',
      cpf: '123.456.789-01',
      phone: '(14) 99999-8888',
      password: 'secret1',
      confirmpassword: 'secret1',
    }, true)
    expect(valid.errors).toEqual({})
    expect(valid.payload.cpf).toBe('12345678901')
    expect(valid.payload.email).toBe('maria@garca.sp.gov.br')
  })
})

describe('permissão COMTUR', () => {
  test('reconhece admin_comtur e o admin global', () => {
    expect(isManager({ role: 'admin_comtur' })).toBe(true)
    expect(isManager({ role: 'admin-comtur' })).toBe(true)
    expect(isManager({ role: 'admin' })).toBe(true)
    expect(isManager({ role: 'usuario' })).toBe(false)
    expect(isManager({ role: 'rotas_admin' })).toBe(false)
  })
})
