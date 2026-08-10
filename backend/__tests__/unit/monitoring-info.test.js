const { getMonitoringInfo } = require('../../helpers/monitoring-info')

describe('monitoring-info', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  test('retorna URLs e credenciais Grafana padrão', () => {
    delete process.env.GRAFANA_ADMIN_PASSWORD
    const info = getMonitoringInfo()
    expect(info.grafana.url).toContain('3001')
    expect(info.grafana.username).toBe('admin')
    expect(info.grafana.password).toBe('change-me-grafana')
    expect(info.grafana.passwordIsDefault).toBe(true)
    expect(info.prometheus.requiresAuth).toBe(false)
  })

  test('usa senha customizada do ambiente', () => {
    process.env.GRAFANA_ADMIN_PASSWORD = 'segredo-forte'
    const info = getMonitoringInfo()
    expect(info.grafana.password).toBe('segredo-forte')
    expect(info.grafana.passwordIsDefault).toBe(false)
  })
})
