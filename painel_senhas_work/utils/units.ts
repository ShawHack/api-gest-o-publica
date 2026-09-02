import type { PanelSettings, UnitBinding } from '../types/config'

/** Normaliza settings legadas (1 unidade) para o array `units`. */
export function normalizeUnits(settings: PanelSettings): UnitBinding[] {
  if (Array.isArray(settings.units) && settings.units.length > 0) {
    return settings.units
      .filter((u) => u && Number(u.id) > 0)
      .map((u) => ({
        id: Number(u.id),
        name: u.name || `Unidade ${u.id}`,
        serviceIds: (u.serviceIds || []).map(Number).filter((id) => id > 0),
      }))
  }

  if (settings.unitId) {
    return [
      {
        id: settings.unitId,
        name: settings.unitName || `Unidade ${settings.unitId}`,
        serviceIds: settings.serviceIds || [],
      },
    ]
  }

  return []
}

export function syncLegacyUnitFields(settings: PanelSettings): PanelSettings {
  const units = normalizeUnits(settings)
  const first = units[0]
  return {
    ...settings,
    units,
    unitId: first?.id ?? null,
    unitName: units.length === 1 ? first?.name || '' : units.map((u) => u.name).join(' · '),
    serviceIds: first?.serviceIds ?? [],
  }
}

export function unitsLabel(units: UnitBinding[]): string {
  if (!units.length) return ''
  if (units.length === 1) return units[0]?.name || `Unidade ${units[0]?.id}`
  return `${units.length} unidades: ${units.map((u) => u.name || u.id).join(', ')}`
}

export function configuredUnitIds(settings: PanelSettings): number[] {
  return normalizeUnits(settings).map((u) => u.id)
}
