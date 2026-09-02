const {
  filterCallsForPanel,
  resolvePanelTargets,
  slugForNovosgaUnitId,
} = require('../helpers/panel-resolver')

describe('panel-resolver', () => {
  it('filtra chamadas por panelSlug', () => {
    const calls = [
      { senha: 'AG01', panelSlug: 'semit' },
      { senha: 'SD01', panelSlug: 'sedetur' },
      { senha: 'LEG', panelSlug: '' },
    ]
    expect(filterCallsForPanel(calls, 'semit').map((c) => c.senha)).toEqual(['AG01', 'LEG'])
    expect(filterCallsForPanel(calls, 'sedetur').map((c) => c.senha)).toEqual(['SD01'])
  })

  it('resolve destinos Sedetur e SEMIT', () => {
    const sedetur = resolvePanelTargets({
      unit: { slug: 'sedetur', novosgaUnitId: 4 },
      service: { panelSlug: 'sedetur', panelPrefix: 'SD' },
    })
    expect(sedetur.panelSlug).toBe('sedetur')
    expect(sedetur.novosgaUnitId).toBe(4)
    expect(sedetur.novosgaServiceId).toBe(85)

    const semit = resolvePanelTargets({
      unit: { slug: 'semit', novosgaUnitId: 6 },
      service: { panelSlug: 'semit' },
    })
    expect(semit.novosgaUnitId).toBe(6)
    expect(semit.novosgaServiceId).toBe(82)
  })

  it('mapeia unitId NovoSGA para slug', () => {
    expect(slugForNovosgaUnitId(4)).toBe('sedetur')
    expect(slugForNovosgaUnitId(6)).toBe('semit')
  })
})
