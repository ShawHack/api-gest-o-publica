import { useEffect, useMemo, useState } from 'react'
import { fetchRssWidget, type RssPayload } from '../../services/api/widgetsApi'
import './NewsTicker.css'

const REFRESH_MS = 10 * 60 * 1000

/** Letreiro de notícias em faixa full-width (toda a extensão do painel). */
export function NewsTicker({ rssFeedUrl }: { rssFeedUrl: string }) {
  const [rss, setRss] = useState<RssPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!rssFeedUrl.trim()) {
        setRss(null)
        return
      }
      try {
        const data = await fetchRssWidget(rssFeedUrl.trim())
        if (cancelled) return
        setRss(data)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Falha no RSS')
      }
    }

    void load()
    const id = window.setInterval(() => void load(), REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [rssFeedUrl])

  const tickerText = useMemo(() => {
    const titles = rss?.titles || []
    if (!titles.length) return ''
    return `${titles.join('   ·   ')}   ·   `
  }, [rss])

  if (!rssFeedUrl.trim()) return null

  return (
    <div className="news-ticker" aria-label="Letreiro de notícias" aria-live="off">
      {tickerText ? (
        <div className="news-ticker__track">
          <span>{tickerText}</span>
          <span aria-hidden>{tickerText}</span>
        </div>
      ) : (
        <span className="news-ticker__empty">{error || 'Carregando notícias…'}</span>
      )}
    </div>
  )
}
