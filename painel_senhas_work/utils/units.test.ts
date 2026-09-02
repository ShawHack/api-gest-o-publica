import { describe, expect, it } from 'vitest'
import type { PanelSettings } from '../types/config'
import { DEFAULT_SETTINGS } from '../config/env'
import { normalizeUnits, syncLegacyUnitFields, unitsLabel } from './units'

function base(partial: Partial<PanelSettings> = {}): PanelSettings {
  return { ...DEFAULT_SETTINGS, ...partial }
}

describe('multi-unidades', () => {
  it('migra configuração legada de uma unidade', () => {
    const units = normalizeUnits(
      base({ unitId: 4, unitName: 'SEDETUR', serviceIds: [75, 22] }),
    )
    expect(units).toEqual([{ id: 4, name: 'SEDETUR', serviceIds: [75, 22] }])
  })

  it('aceita várias unidades no array', () => {
    const units = normalizeUnits(
      base({
        units: [
          { id: 4, name: 'SEDETUR', serviceIds: [75] },
          { id: 7, name: 'SEMIT', serviceIds: [10, 11] },
        ],
      }),
    )
    expect(units).toHaveLength(2)
    expect(unitsLabel(units)).toContain('2 unidades')
  })

  it('sincroniza campos legados a partir do array', () => {
    const synced = syncLegacyUnitFields(
      base({
        units: [
          { id: 4, name: 'A', serviceIds: [1] },
          { id: 5, name: 'B', serviceIds: [2] },
        ],
      }),
    )
    expect(synced.unitId).toBe(4)
    expect(synced.unitName).toContain('A')
    expect(synced.unitName).toContain('B')
  })
})
