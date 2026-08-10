const {
  maskValue,
  buildChanges,
  inferModule,
  inferEventType,
  sanitizeMetadata,
  parseClient,
} = require('../../helpers/audit-service')

describe('audit-service', () => {
  describe('maskValue', () => {
    test('redige senha e token', () => {
      expect(maskValue('password', 'secret123')).toBe('[redacted]')
      expect(maskValue('token', 'abc')).toBe('[redacted]')
    })

    test('mascara e-mail e CPF', () => {
      expect(maskValue('email', 'joao@example.com')).toBe('jo***@example.com')
      expect(maskValue('cpf', '12345678901')).toBe('***8901')
    })

    test('trunca strings longas', () => {
      const long = 'a'.repeat(600)
      const masked = maskValue('description', long)
      expect(masked.length).toBeLessThan(600)
      expect(masked.endsWith('…')).toBe(true)
    })
  })

  describe('sanitizeMetadata', () => {
    test('remove chaves sensíveis e mascara PII', () => {
      const out = sanitizeMetadata({
        password: 'x',
        email: 'a@b.com',
        petId: '507f1f77bcf86cd799439011',
      })
      expect(out.password).toBeUndefined()
      expect(out.email).toBe('a***@b.com')
      expect(out.petId).toBe('507f1f77bcf86cd799439011')
    })
  })

  describe('buildChanges', () => {
    test('gera diff apenas para campos alterados', () => {
      const changes = buildChanges(
        { name: 'Rex', age: 2 },
        { name: 'Rex', age: 3 },
        ['name', 'age']
      )
      expect(changes).toHaveLength(1)
      expect(changes[0]).toMatchObject({ campo: 'age', antes: 2, depois: 3 })
    })

    test('mascara campos sensíveis no diff', () => {
      const changes = buildChanges({ password: 'old' }, { password: 'new' })
      expect(changes[0].antes).toBe('[redacted]')
      expect(changes[0].depois).toBe('[redacted]')
    })
  })

  describe('inferModule', () => {
    test('infere garca_pet por rota', () => {
      expect(inferModule({ path: '/api/pets/123' })).toBe('garca_pet')
      expect(inferModule({ path: '/adoption-requests/abc' })).toBe('garca_pet')
    })

    test('respeita module explícito e header', () => {
      expect(inferModule({ module: 'memorial', path: '/pets' })).toBe('memorial')
      expect(
        inferModule({ path: '/x', client: { moduleHint: 'votacao' } })
      ).toBe('votacao')
    })

    test('infere auth por resourceType user', () => {
      expect(inferModule({ resourceType: 'user', path: '/other' })).toBe('auth')
    })
  })

  describe('inferEventType', () => {
    test('mapeia ações comuns', () => {
      expect(inferEventType('auth.login_success')).toBe('LOGIN')
      expect(inferEventType('auth.logout')).toBe('LOGOUT')
      expect(inferEventType('pet.create')).toBe('CREATE')
      expect(inferEventType('pet.delete')).toBe('DELETE')
      expect(inferEventType('authz.admin_denied')).toBe('SECURITY')
    })

    test('usa eventType explícito quando válido', () => {
      expect(inferEventType('x', 'APPROVE')).toBe('APPROVE')
    })
  })

  describe('parseClient', () => {
    test('extrai headers de cliente', () => {
      const req = {
        headers: {
          'x-client-app': 'prefeitura_app',
          'x-client-platform': 'android',
          'x-client-version': '1.0.0+1',
          'x-client-module': 'garca_pet',
          'x-screen-id': 'garca_pet/pet_detail',
          'x-request-id': 'req-1',
        },
      }
      expect(parseClient(req)).toMatchObject({
        app: 'prefeitura_app',
        platform: 'android',
        version: '1.0.0+1',
        moduleHint: 'garca_pet',
        screen: 'garca_pet/pet_detail',
        requestId: 'req-1',
      })
    })
  })

  describe('inferModule com app mobile', () => {
    test('usa moduleHint do header X-Client-Module', () => {
      expect(
        inferModule({
          path: '/pets/1',
          client: { moduleHint: 'garca_pet', app: 'prefeitura_app' },
        })
      ).toBe('garca_pet')
    })
  })
})
