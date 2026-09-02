import { createContext } from 'react'
import type { DisplayCall } from '../../types/call'
import type { ConnectionStatus, PanelSettings, SessionCredentials } from '../../types/config'
import type { ManagedPanel } from '../../types/panel'

export interface PanelContextValue {
  settings: PanelSettings
  updateSettings: (next: PanelSettings) => void
  connectionStatus: ConnectionStatus
  connectionDetail: string
  current: DisplayCall | null
  history: DisplayCall[]
  highlight: boolean
  soundUnlocked: boolean
  unlockSound: () => Promise<void>
  demoEnabled: boolean
  injectDemoCall: (call: DisplayCall) => void
  simulateDisconnect: () => void
  reconnect: () => void
  ensureSession: (credentials?: SessionCredentials) => Promise<void>
  /** Carrega config do painel gerenciado e inicia tempo real (OAuth via servidor se necessário). */
  bootstrapManagedPanel: (panel: ManagedPanel) => Promise<void>
  /** Slug do painel `/p/:slug` ativo, se houver. */
  managedSlug: string | null
  hasSession: boolean
  lastError: string | null
}

export const PanelContext = createContext<PanelContextValue | null>(null)
