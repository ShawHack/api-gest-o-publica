const {
  parseDays,
  retentionDays,
  retentionTiers,
} = require('../../helpers/audit-log-retention')

describe('audit-log-retention', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('parseDays', () => {
    test('usa fallback quando valor inválido', () => {
      expect(parseDays('abc', 365)).toBe(365)
      expect(parseDays('10', 365)).toBe(365)
    })

    test('aceita mínimo de 30 dias', () => {
      expect(parseDays('90', 365)).toBe(90)
      expect(parseDays('30', 365)).toBe(30)
    })
  })

  describe('retentionTiers', () => {
    test('define tiers mutuamente exclusivos por prioridade', () => {
      const tiers = retentionTiers()
      expect(tiers.map((t) => t.name)).toEqual([
        'security',
        'lgpd',
        'denied',
        'view',
        'default',
      ])
      expect(tiers[0].filter).toMatchObject({ eventType: 'SECURITY' })
      expect(tiers[4].filter.eventType.$nin).toContain('VIEW')
    })

    test('respeita variáveis de ambiente', () => {
      process.env.AUDIT_LOG_RETENTION_VIEW_DAYS = '120'
      process.env.AUDIT_LOG_RETENTION_SECURITY_DAYS = '2000'
      const tiers = retentionTiers()
      expect(tiers.find((t) => t.name === 'view').days).toBe(120)
      expect(tiers.find((t) => t.name === 'security').days).toBe(2000)
    })
  })

  describe('retentionDays', () => {
    test('padrão 365 dias', () => {
      delete process.env.AUDIT_LOG_RETENTION_DAYS
      expect(retentionDays()).toBe(365)
    })
  })
})
