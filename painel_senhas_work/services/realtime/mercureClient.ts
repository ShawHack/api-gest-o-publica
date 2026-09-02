import { mercurePanelEventSchema } from '../api/adapters/schemas'

export type MercureStatus = 'connecting' | 'open' | 'error' | 'closed'

export interface MercureClientOptions {
  mercurePublicUrl: string
  /** Uma ou várias unidades — assina /unidades/{id}/painel para cada. */
  unitIds: number[]
  topicTemplate?: string
  subscribeGlobal?: boolean
  subscriberJwt?: string
  onMessage: (event: { type: string; id: number; raw: unknown }) => void
  onStatus: (status: MercureStatus, detail?: string) => void
}

/**
 * Cliente EventSource alinhado ao painel oficial:
 * topics /unidades/{id}/painel (N unidades) e opcionalmente /paineis.
 */
export class MercureClient {
  private source: EventSource | null = null
  private closedByUser = false
  private readonly options: MercureClientOptions

  constructor(options: MercureClientOptions) {
    this.options = options
  }

  connect(): void {
    this.disconnect()
    this.closedByUser = false

    const url = this.buildUrl()
    if (!url) {
      this.options.onStatus('error', 'URL do Mercure inválida ou sem unidades')
      return
    }

    this.options.onStatus('connecting')
    try {
      this.source = new EventSource(url.toString())
      this.source.onopen = () => this.options.onStatus('open')
      this.source.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data) as unknown
          const parsed = mercurePanelEventSchema.safeParse(raw)
          if (!parsed.success) {
            this.options.onMessage({ type: 'unknown', id: 0, raw })
            return
          }
          this.options.onMessage({
            type: parsed.data['@type'],
            id: parsed.data.id,
            raw,
          })
        } catch {
          this.options.onMessage({ type: 'unknown', id: 0, raw: event.data })
        }
      }
      this.source.onerror = () => {
        if (this.closedByUser) return
        this.options.onStatus('error', 'Falha no EventSource')
        this.disconnect()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao conectar Mercure'
      this.options.onStatus('error', message)
    }
  }

  disconnect(): void {
    this.closedByUser = true
    if (this.source) {
      this.source.close()
      this.source = null
    }
    this.options.onStatus('closed')
  }

  isConnected(): boolean {
    return this.source !== null && this.source.readyState === EventSource.OPEN
  }

  private buildUrl(): URL | null {
    const base = this.options.mercurePublicUrl.trim()
    const unitIds = this.options.unitIds.filter((id) => id > 0)
    if (!base || unitIds.length === 0) return null
    try {
      const url = new URL(base)
      const template = this.options.topicTemplate || '/unidades/{unitId}/painel'
      for (const unitId of unitIds) {
        url.searchParams.append('topic', template.replace('{unitId}', String(unitId)))
      }
      if (this.options.subscribeGlobal !== false) {
        url.searchParams.append('topic', '/paineis')
      }
      if (this.options.subscriberJwt) {
        url.searchParams.set('authorization', this.options.subscriberJwt)
      }
      return url
    } catch {
      return null
    }
  }
}
