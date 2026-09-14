const { canAssignStaff, staffSearchFilter, validateStaffChange } = require('../../helpers/comtur-staff')

describe('equipe COMTUR', () => {
  test('somente admin geral designa gestores', () => {
    expect(canAssignStaff({ role: 'admin' })).toBe(true)
    expect(canAssignStaff({ role: 'admin_comtur' })).toBe(false)
    expect(canAssignStaff({ role: 'usuario' })).toBe(false)
  })

  test('busca exige 3 caracteres e escapa regex', () => {
    expect(staffSearchFilter('ab').error).toBeDefined()
    const ok = staffSearchFilter('maria.s@garca.sp.gov.br')
    expect(ok.filter.$or[1].email).toBeInstanceOf(RegExp)
    const cpf = staffSearchFilter('123.456')
    expect(cpf.filter.$or.some((clause) => clause.cpf)).toBe(true)
  })

  test('concede e revoga sem tocar no admin geral', () => {
    const actor = { _id: '1', role: 'admin' }
    expect(validateStaffChange({ actor, target: { _id: '2', role: 'usuario' }, action: 'grant' }).role).toBe('admin_comtur')
    expect(validateStaffChange({ actor, target: { _id: '2', role: 'admin_comtur' }, action: 'revoke' }).role).toBe('usuario')
    expect(validateStaffChange({ actor, target: { _id: '3', role: 'admin' }, action: 'grant' }).status).toBe(409)
    expect(validateStaffChange({ actor: { _id: '1', role: 'admin_comtur' }, target: { _id: '2', role: 'usuario' }, action: 'grant' }).status).toBe(403)
    expect(validateStaffChange({ actor, target: { _id: '1', role: 'usuario' }, action: 'grant' }).status).toBe(400)
  })
})
