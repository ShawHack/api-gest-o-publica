const mongoose = require('mongoose')
const {
  canAccessEntity,
  canManageModule,
} = require('../../helpers/education-auth')
const {
  loadEducationContext,
  hasRole,
  canApproveEducationContent,
  applyLessonAssignmentAdminScope,
  canAccessLessonAssignment,
  validateEducationAssignment,
} = require('../../helpers/education-service')

const oid = () => new mongoose.Types.ObjectId().toString()

describe('education-auth', () => {
  test('admin global tem acesso total', () => {
    const ctx = { isGlobalAdmin: true, isEducationAdmin: true, assignments: [] }
    expect(canAccessEntity(ctx, oid(), { action: 'delete' })).toBe(true)
    expect(canManageModule(ctx)).toBe(true)
  })

  test('gestor acessa apenas entidade vinculada', () => {
    const entityId = oid()
    const ctx = {
      isGlobalAdmin: false,
      isEducationAdmin: false,
      assignments: [{ role: 'education_manager', educationEntityId: entityId }],
    }
    expect(canAccessEntity(ctx, entityId, { action: 'write' })).toBe(true)
    expect(canAccessEntity(ctx, oid(), { action: 'write' })).toBe(false)
  })

  test('secretaria pode aprovar e ler tudo', () => {
    const ctx = {
      isGlobalAdmin: false,
      isEducationAdmin: false,
      assignments: [{ role: 'education_secretary', educationEntityId: oid() }],
    }
    expect(canAccessEntity(ctx, oid(), { action: 'read' })).toBe(true)
    expect(canAccessEntity(ctx, oid(), { action: 'approve' })).toBe(true)
    expect(canManageModule(ctx)).toBe(true)
  })

  test('conselho não acessa entidade não vinculada', () => {
    const councilId = oid()
    const ctx = {
      isGlobalAdmin: false,
      isEducationAdmin: false,
      assignments: [{ role: 'education_council', educationEntityId: councilId }],
    }
    expect(canAccessEntity(ctx, councilId, { action: 'write', entityType: 'conselho' })).toBe(true)
    expect(canAccessEntity(ctx, oid(), { action: 'write', entityType: 'conselho' })).toBe(false)
  })

  test('hasRole identifica perfis', () => {
    const ctx = {
      assignments: [{ role: 'education_manager', educationEntityId: oid() }],
    }
    expect(hasRole(ctx, 'education_manager')).toBe(true)
    expect(hasRole(ctx, 'education_admin')).toBe(false)
  })

  test('gestor não pode aprovar publicação', () => {
    const entityId = oid()
    const ctx = {
      isGlobalAdmin: false,
      isEducationAdmin: false,
      assignments: [{ role: 'education_manager', educationEntityId: entityId }],
    }
    expect(canApproveEducationContent(ctx)).toBe(false)
    expect(canAccessEntity(ctx, entityId, { action: 'write' })).toBe(true)
  })

  test('escopo de atribuição de aulas filtra por unidade', () => {
    const entityId = oid()
    const ctx = {
      isGlobalAdmin: false,
      isEducationAdmin: false,
      assignments: [{ role: 'education_manager', educationEntityId: entityId }],
    }
    const filter = applyLessonAssignmentAdminScope(ctx, {})
    expect(filter.$or).toBeDefined()
    expect(canAccessLessonAssignment(ctx, {
      vacancies: [{ educationEntityId: entityId }],
    }, 'write')).toBe(true)
    expect(canAccessLessonAssignment(ctx, {
      vacancies: [{ educationEntityId: oid() }],
    }, 'write')).toBe(false)
  })

  test('validateEducationAssignment exige unidade para gestor', () => {
    const schoolId = oid()
    const missing = validateEducationAssignment({ role: 'education_manager', educationEntityId: null })
    expect(missing.valid).toBe(false)

    const okSchool = validateEducationAssignment({
      role: 'education_manager',
      educationEntityId: schoolId,
      entity: { type: 'escola' },
    })
    expect(okSchool.valid).toBe(true)

    const wrongType = validateEducationAssignment({
      role: 'education_manager',
      educationEntityId: schoolId,
      entity: { type: 'conselho' },
    })
    expect(wrongType.valid).toBe(false)
  })
})

describe('loadEducationContext', () => {
  test('retorna admin para usuário admin', async () => {
    const ctx = await loadEducationContext({ role: 'admin', id: oid() })
    expect(ctx.isGlobalAdmin).toBe(true)
    expect(ctx.isEducationAdmin).toBe(true)
  })
})
