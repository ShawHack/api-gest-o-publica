import type { PanelSettings } from '../types/config'

export const STORAGE_CONFIG_KEY = 'painel-semit:config'
export const STORAGE_ADMIN_PIN_KEY = 'painel-semit:admin-pin-hash'
export const SESSION_AUTH_KEY = 'painel-semit:auth'
export const SESSION_CREDENTIALS_KEY = 'painel-semit:credentials'
export const SESSION_ADMIN_UNLOCK_KEY = 'painel-semit:admin-unlocked'

export const DEFAULT_SETTINGS: PanelSettings = {
  novosgaApiUrl: '',
  mercurePublicUrl: '',
  unitId: null,
  unitName: '',
  serviceIds: [],
  units: [],
  panelTitle: 'Painel de Senhas',
  institutionName: 'Prefeitura de Garça — SEMIT',
  logoUrl: '',
  primaryColor: '#0b5fff',
  theme: 'dark',
  displayLayout: 'classic',
  historySize: 6,
  speechEnabled: true,
  speechVolume: 1,
  speechRate: 1,
  speechVoice: 'auto-female',
  mediaEnabled: true,
  mediaDurationMs: 12000,
  mediaItems: [],
  widgetsEnabled: true,
  weatherCity: 'Garça',
  rssFeedUrl: 'https://g1.globo.com/rss/g1/',
}

export function readEnv(): {
  apiUrl: string
  mercureUrl: string
  topicTemplate: string
  subscribeGlobal: boolean
  subscriberJwt: string
  displayMode: string
  enableDemo: boolean
  defaultUnitId: number | null
  pollIntervalMs: number
} {
  const defaultUnit = import.meta.env.VITE_DEFAULT_UNIT_ID
  return {
    apiUrl: (import.meta.env.VITE_NOVOSGA_API_URL ?? '').replace(/\/$/, ''),
    mercureUrl: (import.meta.env.VITE_MERCURE_PUBLIC_URL ?? '').trim(),
    topicTemplate: import.meta.env.VITE_MERCURE_TOPIC_TEMPLATE || '/unidades/{unitId}/painel',
    subscribeGlobal: String(import.meta.env.VITE_MERCURE_SUBSCRIBE_GLOBAL ?? 'true') === 'true',
    subscriberJwt: (import.meta.env.VITE_MERCURE_SUBSCRIBER_JWT ?? '').trim(),
    displayMode: import.meta.env.VITE_DISPLAY_MODE || 'production',
    enableDemo: String(import.meta.env.VITE_ENABLE_DEMO ?? 'false') === 'true',
    defaultUnitId: defaultUnit ? Number(defaultUnit) : null,
    pollIntervalMs: Number(import.meta.env.VITE_POLL_INTERVAL_MS || 8000),
  }
}
