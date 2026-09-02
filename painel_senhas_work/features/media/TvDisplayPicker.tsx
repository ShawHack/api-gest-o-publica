import { useEffect, useMemo, useState } from 'react'
import './TvDisplayPicker.css'

const TV_BASE_URL = '/tv-player/'
const TV_DISPLAYS_FALLBACK_URL = 'https://api.garca.sp.gov.br/tv/api/displays'

export interface TvDisplayOption {
  id: string
  displayName: string
  orientation?: string
  hardwareKey?: string
}

export function buildTvDisplayUrl(displayId: string) {
  return displayId === 'default'
    ? TV_BASE_URL
    : `${TV_BASE_URL}?display=${encodeURIComponent(displayId)}`
}

function readDisplayId(playerUrl?: string) {
  if (!playerUrl) return ''
  try {
    const parsed = new URL(playerUrl, window.location.origin)
    const displayId = parsed.searchParams.get('display') || parsed.searchParams.get('id')
    if (displayId) return displayId
    if (parsed.pathname.includes('/tv/') || parsed.pathname.includes('/tv-player/')) return 'default'
  } catch {
    return ''
  }
  return ''
}

export function TvDisplayPicker({
  selectedUrl,
  onSelect,
}: {
  selectedUrl?: string
  onSelect: (display: TvDisplayOption | null, playerUrl: string) => void
}) {
  const [displays, setDisplays] = useState<TvDisplayOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    async function loadDisplays() {
      let lastError = 'Resposta inválida'
      for (const endpoint of [`${TV_BASE_URL}api/displays`, TV_DISPLAYS_FALLBACK_URL]) {
        try {
          const response = await fetch(`${endpoint}?t=${Date.now()}`, {
            signal: controller.signal,
            cache: 'no-store',
          })
          const text = await response.text()
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const data = JSON.parse(text) as TvDisplayOption[]
          if (!Array.isArray(data)) throw new Error('A resposta não é uma lista')
          return data
        } catch (reason) {
          if (controller.signal.aborted) throw reason
          lastError = reason instanceof Error ? reason.message : 'Falha ao carregar displays'
        }
      }
      throw new Error(lastError)
    }

    loadDisplays()
      .then((items) => {
        setDisplays(Array.isArray(items) ? items : [])
        setError('')
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setError(reason instanceof Error ? reason.message : 'Falha ao carregar displays')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const selectedId = useMemo(() => {
    const storedId = readDisplayId(selectedUrl)
    return displays.some((display) => display.id === storedId) ? storedId : ''
  }, [displays, selectedUrl])

  return (
    <div className="tv-display-picker">
      <label>
        Display da TV Corporativa
        <select
          value={selectedId}
          disabled={loading}
          onChange={(event) => {
            const display = displays.find((item) => item.id === event.target.value) || null
            onSelect(display, display ? buildTvDisplayUrl(display.id) : '')
          }}
        >
          <option value="">Nenhum display</option>
          {displays.map((display) => (
            <option key={display.id} value={display.id}>
              {display.displayName} ({display.id})
            </option>
          ))}
        </select>
      </label>
      {loading ? <p className="tv-display-picker__status">Carregando displays…</p> : null}
      {error ? (
        <p className="tv-display-picker__status tv-display-picker__status--error">
          Não foi possível consultar a TV Corporativa: {error}
        </p>
      ) : null}
      <p className="tv-display-picker__status">
        O conteúdo será reproduzido somente na tela pública do painel de senhas.
      </p>
    </div>
  )
}
