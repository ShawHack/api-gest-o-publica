import type {
  DisplayLayout,
  MediaItemConfig,
  SessionCredentials,
  ThemeMode,
  UnitBinding,
} from './config'

export type PanelStatus = 'publicado' | 'rascunho'

export interface ManagedPanel {
  id: string
  name: string
  slug: string
  status: PanelStatus
  novosgaApiUrl: string
  mercurePublicUrl: string
  units: UnitBinding[]
  panelTitle: string
  institutionName: string
  logoUrl: string
  primaryColor: string
  theme: ThemeMode
  displayLayout: DisplayLayout
  historySize: number
  speechEnabled: boolean
  speechVolume: number
  speechRate: number
  speechVoice: string
  mediaEnabled: boolean
  mediaDurationMs: number
  mediaItems: MediaItemConfig[]
  widgetsEnabled: boolean
  weatherCity: string
  rssFeedUrl: string
  /** Indica se o servidor tem OAuth gravado (segredos nunca vêm na API). */
  hasOauth?: boolean
  createdAt: string
  updatedAt: string
}

export type ManagedPanelInput = Partial<ManagedPanel> & {
  name: string
  /** Gravado só no servidor; omitido nas respostas GET. */
  oauth?: SessionCredentials
}
