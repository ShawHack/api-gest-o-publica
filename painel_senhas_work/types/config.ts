export type ConnectionStatus =
  | 'idle'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'config_error'
  | 'auth_error'

export type ThemeMode = 'light' | 'dark'

/** classic = senha à esquerda + lateral; programacao = coluna 9:16 à esquerda. */
export type DisplayLayout = 'classic' | 'programacao'

export interface MediaItemConfig {
  id: string
  /** image/video = arquivo; link = página/embed em iframe (ex.: programação). */
  type: 'image' | 'video' | 'link'
  src: string
  label?: string
}

/** Uma unidade do NovoSGA com os serviços exibidos neste painel. */
export interface UnitBinding {
  id: number
  name: string
  serviceIds: number[]
}

export interface PanelSettings {
  novosgaApiUrl: string
  mercurePublicUrl: string
  /** @deprecated Preferir `units`. Mantido para compatibilidade. */
  unitId: number | null
  /** @deprecated Preferir `units`. */
  unitName: string
  /** @deprecated Preferir `units`. */
  serviceIds: number[]
  /** Unidades monitoradas (quantas forem necessárias). */
  units: UnitBinding[]
  panelTitle: string
  institutionName: string
  logoUrl: string
  primaryColor: string
  theme: ThemeMode
  /** classic (padrão) ou programacao (coluna 9:16 à esquerda). */
  displayLayout: DisplayLayout
  historySize: number
  speechEnabled: boolean
  speechVolume: number
  speechRate: number
  /** `auto-female`, `auto` ou voiceURI do navegador. */
  speechVoice: string
  mediaEnabled: boolean
  mediaDurationMs: number
  mediaItems: MediaItemConfig[]
  /** Widgets de apoio (clima + notícias) na área institucional. */
  widgetsEnabled: boolean
  weatherCity: string
  rssFeedUrl: string
}

export interface SessionCredentials {
  clientId: string
  clientSecret: string
  username: string
  password: string
}

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}
