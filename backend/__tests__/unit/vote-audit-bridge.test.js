const { unifiedAction, legacyAction } = require('../../helpers/vote-audit-bridge')

describe('vote-audit-bridge', () => {
  test('unifiedAction adiciona prefixo votacao.', () => {
    expect(unifiedAction('vote_cast')).toBe('votacao.vote_cast')
    expect(unifiedAction('votacao.admin.export_csv')).toBe('votacao.admin.export_csv')
  })

  test('legacyAction mantém apenas ações de voto na coleção legada', () => {
    expect(legacyAction('vote_cast')).toBe('vote_cast')
    expect(legacyAction('votacao.vote_duplicate_blocked')).toBe('vote_duplicate_blocked')
    expect(legacyAction('admin.export_csv')).toBeNull()
    expect(legacyAction('votacao.admin.dashboard_view')).toBeNull()
  })
})
