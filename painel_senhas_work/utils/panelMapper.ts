import type { ManagedPanel } from '../types/panel'
import type { PanelSettings } from '../types/config'
import { DEFAULT_SETTINGS, readEnv } from '../config/env'
import { syncLegacyUnitFields } from '../utils/units'

export function managedPanelToSettings(panel: ManagedPanel): PanelSettings {
  const env = readEnv()
  return syncLegacyUnitFields({
    ...DEFAULT_SETTINGS,
    novosgaApiUrl: panel.novosgaApiUrl || env.apiUrl || DEFAULT_SETTINGS.novosgaApiUrl,
    mercurePublicUrl: panel.mercurePublicUrl || env.mercureUrl || DEFAULT_SETTINGS.mercurePublicUrl,
    units: panel.units || [],
    panelTitle: panel.panelTitle || panel.name,
    institutionName: panel.institutionName,
    logoUrl: panel.logoUrl,
    primaryColor: panel.primaryColor,
    theme: panel.theme,
    displayLayout: panel.displayLayout === 'programacao' ? 'programacao' : 'classic',
    historySize: panel.historySize,
    speechEnabled: panel.speechEnabled,
    speechVolume: panel.speechVolume,
    speechRate: panel.speechRate,
    speechVoice: panel.speechVoice || 'auto-female',
    mediaEnabled: panel.mediaEnabled,
    mediaDurationMs: panel.mediaDurationMs,
    mediaItems: panel.mediaItems || [],
    widgetsEnabled: panel.widgetsEnabled !== false,
    weatherCity: panel.weatherCity || 'Garça',
    rssFeedUrl: panel.rssFeedUrl || 'https://g1.globo.com/rss/g1/',
    unitId: null,
    unitName: '',
    serviceIds: [],
  })
}

export function settingsToManagedInput(settings: PanelSettings, name: string, slug: string) {
  const displayLayout = settings.displayLayout === 'programacao' ? 'programacao' as const : 'classic' as const
  return {
    name,
    slug,
    novosgaApiUrl: settings.novosgaApiUrl,
    mercurePublicUrl: settings.mercurePublicUrl,
    units: settings.units,
    panelTitle: settings.panelTitle,
    institutionName: settings.institutionName,
    logoUrl: settings.logoUrl,
    primaryColor: settings.primaryColor,
    theme: settings.theme,
    displayLayout,
    historySize: settings.historySize,
    speechEnabled: settings.speechEnabled,
    speechVolume: settings.speechVolume,
    speechRate: settings.speechRate,
    speechVoice: settings.speechVoice || 'auto-female',
    mediaEnabled: settings.mediaEnabled,
    mediaDurationMs: settings.mediaDurationMs,
    mediaItems: settings.mediaItems,
    widgetsEnabled: settings.widgetsEnabled !== false,
    weatherCity: settings.weatherCity || 'Garça',
    rssFeedUrl: settings.rssFeedUrl || '',
    status: 'publicado' as const,
  }
}
