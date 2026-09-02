import type { ConnectionStatus } from '../../types/config'
import { MercureClient, type MercureStatus } from './mercureClient'

export interface ConnectionManagerOptions {
  mercurePublicUrl: string
  unitIds: number[]
  topicTemplate?: string
  subscribeGlobal?: boolean
  subscriberJwt?: string
  pollIntervalMs: number
  maxSseRetries?: number
  onWake: (event?: { type: string; id: number; raw: unknown }) => void
  onStatus: (status: ConnectionStatus, detail?: string) => void
  onPollTick: () => void
}

/**
 * Garante uma única conexão SSE, backoff progressivo e fallback de polling
 * (comportamento equivalente ao public/js/painel.js).
 */
export class ConnectionManager {
  private mercure: MercureClient | null = null
  private sseRetries = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private backgroundPollTimer: ReturnType<typeof setInterval> | null = null
  private sseRetryFromPollTimer: ReturnType<typeof setTimeout> | null = null
  private disposed = false
  private mode: 'sse' | 'poll' | 'idle' = 'idle'
  private readonly maxSseRetries: number
  private readonly options: ConnectionManagerOptions

  constructor(options: ConnectionManagerOptions) {
    this.options = options
    this.maxSseRetries = options.maxSseRetries ?? 3
  }

  start(): void {
    this.stop()
    this.disposed = false
    this.startBackgroundPolling()
    this.connectSse()
  }

  stop(): void {
    this.disposed = true
    this.clearTimers()
    this.clearBackgroundPolling()
    this.mercure?.disconnect()
    this.mercure = null
    this.mode = 'idle'
  }

  getMode(): 'sse' | 'poll' | 'idle' {
    return this.mode
  }

  /** Força desconexão (demo / diagnóstico). */
  simulateDisconnect(): void {
    this.mercure?.disconnect()
    this.clearTimers()
    this.clearBackgroundPolling()
    this.mode = 'idle'
    this.options.onStatus('disconnected', 'Simulado')
  }

  private connectSse(): void {
    if (this.disposed) return
    this.clearTimers()
    this.mercure?.disconnect()

    if (!this.options.mercurePublicUrl) {
      this.options.onStatus('config_error', 'Mercure não configurado')
      this.startPolling()
      return
    }

    this.mode = 'sse'
    this.options.onStatus(this.sseRetries > 0 ? 'reconnecting' : 'disconnected')

    this.mercure = new MercureClient({
      mercurePublicUrl: this.options.mercurePublicUrl,
      unitIds: this.options.unitIds,
      topicTemplate: this.options.topicTemplate,
      subscribeGlobal: this.options.subscribeGlobal,
      subscriberJwt: this.options.subscriberJwt,
      onMessage: (event) => {
        this.sseRetries = 0
        this.options.onWake(event)
      },
      onStatus: (status: MercureStatus, detail?: string) => {
        if (this.disposed) return
        if (status === 'open') {
          this.sseRetries = 0
          this.options.onStatus('connected')
          this.startBackgroundPolling()
          return
        }
        if (status === 'error') {
          this.handleSseFailure(detail)
        }
      },
    })
    this.mercure.connect()

    // Conectar também ao stream de eventos nativos da Agenda Garça e do painel
    try {
      if (typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
        const pathMatch = window.location.pathname.match(/\/p\/([^/?#]+)/)
        const hashMatch = (window.location.hash || '').match(/\/display\/([^?#/]+)/)
        const slug = pathMatch?.[1] || hashMatch?.[1] || 'semit'
        
        // 1. Stream da Agenda Garça
        const agendaSource = new EventSource('/api/agenda/public/panels/events')
        agendaSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data)
            if (data && typeof data === 'object' && 'senha' in data) {
              this.options.onWake({ type: 'call', id: data.id || Date.now(), raw: data })
            }
          } catch (_err) {}
        }

        // 2. Stream do servidor local de painéis
        const nativeUrl = `/api/panels/${encodeURIComponent(slug)}/events`
        const nativeSource = new EventSource(nativeUrl)
        nativeSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data)
            if (data && typeof data === 'object' && 'senha' in data) {
              this.options.onWake({ type: 'call', id: data.id || Date.now(), raw: data })
            }
          } catch (_err) {}
        }
      }
    } catch (_e) {}
  }

  private handleSseFailure(detail?: string): void {
    this.sseRetries += 1
    this.mercure?.disconnect()
    this.mercure = null

    if (this.sseRetries >= this.maxSseRetries) {
      this.options.onStatus('reconnecting', detail ?? 'Fallback para polling')
      this.startPolling()
      return
    }

    const delay = Math.min(30000, 2000 * 2 ** (this.sseRetries - 1))
    this.options.onStatus('reconnecting', `Tentativa ${this.sseRetries} em ${delay}ms`)
    this.reconnectTimer = setTimeout(() => this.connectSse(), delay)
  }

  private startBackgroundPolling(): void {
    this.clearBackgroundPolling()
    this.options.onPollTick()
    this.backgroundPollTimer = setInterval(
      () => this.options.onPollTick(),
      this.options.pollIntervalMs,
    )
  }

  private clearBackgroundPolling(): void {
    if (this.backgroundPollTimer) {
      clearInterval(this.backgroundPollTimer)
      this.backgroundPollTimer = null
    }
  }

  private startPolling(): void {
    this.clearBackgroundPolling()
    this.mode = 'poll'
    this.clearPollOnly()
    this.options.onPollTick()
    this.pollTimer = setInterval(() => this.options.onPollTick(), this.options.pollIntervalMs)
    this.sseRetryFromPollTimer = setTimeout(() => {
      if (this.disposed || this.mode !== 'poll') return
      this.sseRetries = 0
      this.connectSse()
    }, 60000)
  }

  private clearPollOnly(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    if (this.sseRetryFromPollTimer) {
      clearTimeout(this.sseRetryFromPollTimer)
      this.sseRetryFromPollTimer = null
    }
  }

  private clearTimers(): void {
    this.clearPollOnly()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}
