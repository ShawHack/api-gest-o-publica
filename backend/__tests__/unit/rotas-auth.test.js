const { ROTAS_ADMIN_ROLES, ROTAS_OPERATOR_ROLES, isRotasAdmin } = require('../../helpers/rotas-auth')

describe('perfis do módulo Rotas Rurais', () => {
  it('permite ao operador somente o conjunto operacional', () => {
    expect(ROTAS_OPERATOR_ROLES).toContain('rotas_operador')
    expect(ROTAS_ADMIN_ROLES).not.toContain('rotas_operador')
    expect(isRotasAdmin({ role: 'rotas_operador' })).toBe(false)
  })

  it('mantém supervisores e administrador global nos dois conjuntos', () => {
    expect(ROTAS_OPERATOR_ROLES).toEqual(expect.arrayContaining(['admin', 'rotas_admin']))
    expect(isRotasAdmin({ role: 'rotas_admin' })).toBe(true)
    expect(isRotasAdmin({ role: 'admin' })).toBe(true)
  })
})
