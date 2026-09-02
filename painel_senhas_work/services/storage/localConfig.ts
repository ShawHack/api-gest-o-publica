import { DEFAULT_SETTINGS, STORAGE_ADMIN_PIN_KEY, STORAGE_CONFIG_KEY, readEnv } from '../../config/env'
import type { PanelSettings } from '../../types/config'
import { syncLegacyUnitFields } from '../../utils/units'

function mergeSettings(partial: Partial<PanelSettings>): PanelSettings {
  const env = readEnv()
  const merged: PanelSettings = {
    ...DEFAULT_SETTINGS,
    novosgaApiUrl: env.apiUrl || DEFAULT_SETTINGS.novosgaApiUrl,
    mercurePublicUrl: env.mercureUrl || DEFAULT_SETTINGS.mercurePublicUrl,
    unitId: env.defaultUnitId,
    ...partial,
    units: partial.units ?? DEFAULT_SETTINGS.units,
  }

  if (env.defaultUnitId && merged.units.length === 0 && !merged.unitId) {
    merged.unitId = env.defaultUnitId
  }

  return syncLegacyUnitFields(merged)
}

export function loadPanelSettings(): PanelSettings {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY)
    if (!raw) {
      return mergeSettings({})
    }
    const parsed = JSON.parse(raw) as Partial<PanelSettings>
    const safe = { ...parsed } as Record<string, unknown>
    delete safe.username
    delete safe.password
    delete safe.clientId
    delete safe.clientSecret
    delete safe.accessToken
    delete safe.refreshToken
    return mergeSettings(safe as Partial<PanelSettings>)
  } catch {
    return mergeSettings({})
  }
}

export function savePanelSettings(settings: PanelSettings): void {
  const toStore = syncLegacyUnitFields(settings)
  localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(toStore))
}

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`painel-semit:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function getStoredAdminPinHash(): string | null {
  return localStorage.getItem(STORAGE_ADMIN_PIN_KEY)
}

export async function setAdminPin(pin: string): Promise<void> {
  const hashed = await hashPin(pin)
  localStorage.setItem(STORAGE_ADMIN_PIN_KEY, hashed)
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const stored = getStoredAdminPinHash()
  if (!stored) {
    return true
  }
  const hashed = await hashPin(pin)
  return hashed === stored
}
