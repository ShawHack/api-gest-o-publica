import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { readEnv } from '../../config/env'
import { requestPasswordToken, refreshAccessToken } from '../../services/api/auth'
import { fetchApiInfo, fetchPainelCallsForUnits } from '../../services/api/painel'
import { fetchManagedPanelSession } from '../../services/api/panelsApi'
import { ConnectionManager } from '../../services/realtime/connectionManager'
import { playAlertChime } from '../../services/speech/alertSound'
import { buildAnnouncementParts } from '../../services/speech/announceCall'
import { SpeechQueue } from '../../services/speech/speechQueue'
import { loadPanelSettings, savePanelSettings } from '../../services/storage/localConfig'
import {
  loadCredentials,
  loadTokens,
  saveCredentials,
  saveTokens,
} from '../../services/storage/sessionAuth'
import type { DisplayCall } from '../../types/call'
import type { ConnectionStatus, PanelSettings, SessionCredentials } from '../../types/config'
import type { ManagedPanel } from '../../types/panel'
import { resolveMercureUrl } from '../../utils/format'
import { applyApiSnapshot, pushFeaturedCall, type CallBoardState } from '../../utils/history'
import { managedPanelToSettings } from '../../utils/panelMapper'
import { normalizeUnits } from '../../utils/units'
import { painelSenhaSchema } from '../../services/api/adapters/schemas'
import { toDisplayCall } from '../../services/api/adapters/painelSenhaAdapter'
import { PanelContext, type PanelContextValue } from './panelContextValue'

export function PanelProvider({ children }: { children: ReactNode }) {
  const env = useMemo(() => readEnv(), [])
  const [settings, setSettings] = useState<PanelSettings>(() => loadPanelSettings())
  const [board, setBoard] = useState<CallBoardState>({ current: null, history: [] })
  const [initialized, setInitialized] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle')
  const [connectionDetail, setConnectionDetail] = useState('')
  const [highlight, setHighlight] = useState(false)
  const [soundUnlocked, setSoundUnlocked] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [hasSession, setHasSession] = useState(() => Boolean(loadTokens()))

  const speechRef = useRef(
    new SpeechQueue({
      playAlert: (volume) => playAlertChime(volume),
    }),
  )
  const managerRef = useRef<ConnectionManager | null>(null)
  const boardRef = useRef(board)
  const initializedRef = useRef(initialized)
  const settingsRef = useRef(settings)
  const fetchingRef = useRef(false)
  const announcedIdsRef = useRef(new Set<number>())
  const [managedSlug, setManagedSlug] = useState<string | null>(null)
  const managedSlugRef = useRef<string | null>(null)

  useEffect(() => {
    boardRef.current = board
  }, [board])
  useEffect(() => {
    initializedRef.current = initialized
  }, [initialized])
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const updateSettings = useCallback((next: PanelSettings) => {
    settingsRef.current = next
    setSettings(next)
    savePanelSettings(next)
  }, [])

  const getValidToken = useCallback(async (): Promise<string> => {
    let tokens = loadTokens()
    const credentials = loadCredentials()
    const apiUrl = settingsRef.current.novosgaApiUrl || env.apiUrl
    const managedSlug = managedSlugRef.current

    if (!tokens || tokens.expiresAt <= Date.now()) {
      if (credentials) {
        if (tokens?.refreshToken) {
          try {
            tokens = await refreshAccessToken(apiUrl, credentials, tokens.refreshToken)
          } catch {
            tokens = await requestPasswordToken(apiUrl, credentials)
          }
        } else {
          tokens = await requestPasswordToken(apiUrl, credentials)
        }
      } else if (managedSlug) {
        try {
          tokens = await fetchManagedPanelSession(managedSlug, tokens?.refreshToken)
        } catch {
          tokens = await fetchManagedPanelSession(managedSlug)
        }
      } else {
        throw new Error(
          'Sessão OAuth ausente. Configure OAuth no admin do painel ou em Configurações.',
        )
      }
      saveTokens(tokens)
      setHasSession(true)
    }
    if (!tokens) {
      throw new Error('Sessão OAuth ausente. Configure OAuth no admin do painel ou em Configurações.')
    }
    return tokens.accessToken
  }, [env.apiUrl])

  const announce = useCallback(
    (call: DisplayCall) => {
      if (announcedIdsRef.current.has(call.id)) return
      announcedIdsRef.current.add(call.id)
      if (announcedIdsRef.current.size > 200) {
        const keep = [...announcedIdsRef.current].slice(-100)
        announcedIdsRef.current = new Set(keep)
      }
      const cfg = settingsRef.current
      if (!cfg.speechEnabled || !speechRef.current.isUnlocked()) return
      speechRef.current.enqueue({
        id: String(call.id),
        parts: buildAnnouncementParts(call),
        lang: 'pt-BR',
        volume: cfg.speechVolume,
        rate: cfg.speechRate,
        voicePreference: cfg.speechVoice,
        playAlertFirst: true,
      })
    },
    [],
  )

  const flash = useCallback(() => {
    setHighlight(false)
    requestAnimationFrame(() => {
      setHighlight(true)
      window.setTimeout(() => setHighlight(false), 900)
    })
  }, [])

  const applyIncoming = useCallback(
    (list: DisplayCall[]) => {
      const cfg = settingsRef.current
      const result = applyApiSnapshot(
        boardRef.current,
        list,
        cfg.historySize,
        initializedRef.current,
      )
      setBoard(result.state)
      if (!initializedRef.current) {
        setInitialized(true)
      }
      if (result.newlyFeatured.length) {
        flash()
        result.newlyFeatured.forEach((call) => announce(call))
      }
    },
    [announce, flash],
  )

  const fetchCalls = useCallback(
    async (source: DisplayCall['source'] = 'poll') => {
      if (fetchingRef.current) return
      const cfg = settingsRef.current
      const units = normalizeUnits(cfg).filter((u) => u.serviceIds.length > 0)
      if (!units.length) {
        setConnectionStatus('config_error')
        setConnectionDetail('Nenhuma unidade/serviço configurado')
        return
      }
      fetchingRef.current = true
      try {
        const token = await getValidToken()
        const list = await fetchPainelCallsForUnits(
          cfg.novosgaApiUrl || env.apiUrl,
          token,
          units,
          source,
        )
        applyIncoming(list)
        setLastError(null)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao buscar senhas'
        setLastError(message)
        if (message.includes('401') || message.includes('403') || message.includes('OAuth')) {
          setConnectionStatus('auth_error')
        }
      } finally {
        fetchingRef.current = false
      }
    },
    [applyIncoming, env.apiUrl, getValidToken],
  )

  const startRealtime = useCallback(async () => {
    managerRef.current?.stop()
    managerRef.current = null

    const cfg = settingsRef.current
    const apiUrl = cfg.novosgaApiUrl || env.apiUrl
    const units = normalizeUnits(cfg).filter((u) => u.serviceIds.length > 0)

    if (!apiUrl || !units.length) {
      setConnectionStatus('config_error')
      setConnectionDetail('Configure URL e ao menos uma unidade com serviços')
      return
    }

    try {
      const token = await getValidToken()
      const info = await fetchApiInfo(apiUrl, token)
      const mercureUrl = resolveMercureUrl(
        cfg.mercurePublicUrl || env.mercureUrl,
        info.mercureUrl,
        apiUrl,
      )

      await fetchCalls('api')

      const manager = new ConnectionManager({
        mercurePublicUrl: mercureUrl,
        unitIds: units.map((u) => u.id),
        topicTemplate: env.topicTemplate,
        subscribeGlobal: env.subscribeGlobal,
        subscriberJwt: env.subscriberJwt || undefined,
        pollIntervalMs: env.pollIntervalMs,
        onWake: (event) => {
          if (event?.raw && typeof event.raw === 'object' && 'senha' in event.raw) {
            const parsed = painelSenhaSchema.safeParse(event.raw)
            if (parsed.success) {
              const directCall = toDisplayCall(parsed.data, 'mercure')
              applyIncoming([directCall])
              return
            }
          }
          void fetchCalls('mercure')
        },
        onPollTick: () => {
          void fetchCalls('poll')
        },
        onStatus: (status, detail) => {
          setConnectionStatus(status)
          setConnectionDetail(detail ?? '')
        },
      })
      managerRef.current = manager
      manager.start()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao iniciar tempo real'
      setLastError(message)
      setConnectionStatus('auth_error')
      setConnectionDetail(message)
    }
  }, [env, fetchCalls, getValidToken])

  const ensureSession = useCallback(
    async (credentials?: SessionCredentials) => {
      if (credentials) {
        saveCredentials(credentials)
      }
      const creds = credentials ?? loadCredentials()
      if (!creds) {
        throw new Error('Credenciais de sessão necessárias')
      }
      const apiUrl = settingsRef.current.novosgaApiUrl || env.apiUrl
      const tokens = await requestPasswordToken(apiUrl, creds)
      saveTokens(tokens)
      setHasSession(true)
      await startRealtime()
    },
    [env.apiUrl, startRealtime],
  )

  const bootstrapManagedPanel = useCallback(
    async (panel: ManagedPanel) => {
      managedSlugRef.current = panel.slug
      setManagedSlug(panel.slug)
      updateSettings(managedPanelToSettings(panel))

      if (!loadTokens()) {
        if (!panel.hasOauth) {
          setConnectionStatus('auth_error')
          setConnectionDetail(
            'OAuth não gravado neste painel. Abra a edição no admin, preencha Client ID/Secret/usuário/senha e salve.',
          )
          setLastError('Configure e salve as credenciais OAuth no admin do painel.')
          return
        }
        const tokens = await fetchManagedPanelSession(panel.slug)
        saveTokens(tokens)
        setHasSession(true)
      }

      await startRealtime()
    },
    [startRealtime, updateSettings],
  )

  const unlockSound = useCallback(async () => {
    await playAlertChime(0.2)
    speechRef.current.markUnlocked()
    setSoundUnlocked(true)
  }, [])

  const injectDemoCall = useCallback(
    (call: DisplayCall) => {
      setBoard((prev) => pushFeaturedCall(prev, call, settingsRef.current.historySize))
      setInitialized(true)
      flash()
      announce(call)
    },
    [announce, flash],
  )

  const simulateDisconnect = useCallback(() => {
    managerRef.current?.simulateDisconnect()
  }, [])

  const reconnect = useCallback(() => {
    void startRealtime()
  }, [startRealtime])

  const startRealtimeRef = useRef(startRealtime)

  useEffect(() => {
    startRealtimeRef.current = startRealtime
  }, [startRealtime])

  useEffect(() => {
    const units = normalizeUnits(settingsRef.current).filter((u) => u.serviceIds.length > 0)
    if (loadTokens() && units.length) {
      void startRealtimeRef.current()
    }
    return () => {
      managerRef.current?.stop()
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    document.documentElement.style.setProperty('--color-primary', settings.primaryColor)
  }, [settings.theme, settings.primaryColor])

  const value: PanelContextValue = {
    settings,
    updateSettings,
    connectionStatus,
    connectionDetail,
    current: board.current,
    history: board.history,
    highlight,
    soundUnlocked,
    unlockSound,
    demoEnabled: env.enableDemo,
    injectDemoCall,
    simulateDisconnect,
    reconnect,
    ensureSession,
    bootstrapManagedPanel,
    managedSlug,
    hasSession,
    lastError,
  }

  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>
}
