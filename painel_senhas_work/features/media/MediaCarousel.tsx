import { useEffect, useRef, useState } from 'react'
import type { MediaItemConfig } from '../../types/config'
import { isTvPlayerSrc, toSameOriginTvPlayerSrc } from '../../utils/tvPlayerUrl'
import { SupportWidgets } from './SupportWidgets'
import './MediaCarousel.css'

const WARMUP_TIMEOUT_MS = 25000

/** Se a URL não for arquivo de mídia, trata como página embutida (iframe). */
export function resolveMediaKind(item: MediaItemConfig): 'image' | 'video' | 'link' {
  const bare = item.src.split('?')[0].split('#')[0].toLowerCase()
  const isImageFile = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(bare)
  const isVideoFile = /\.(mp4|webm|ogg|mov|m4v)$/i.test(bare)

  if (item.type === 'link') return 'link'
  if (isImageFile) return 'image'
  if (isVideoFile) return 'video'
  if (item.type === 'image' || item.type === 'video') return 'link'
  return 'link'
}

export function MediaCarousel({
  items,
  durationMs,
  paused,
  widgetsEnabled,
  weatherCity,
  variant = 'default',
  emptyTitle = 'Área institucional',
  emptyHint = 'Configure imagens, vídeos ou links nas configurações',
}: {
  items: MediaItemConfig[]
  durationMs: number
  paused: boolean
  widgetsEnabled?: boolean
  weatherCity?: string
  rssFeedUrl?: string
  variant?: 'default' | 'portrait'
  emptyTitle?: string
  emptyHint?: string
}) {
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState(false)
  const [tvReady, setTvReady] = useState(false)
  const [tvLoad, setTvLoad] = useState({ stage: 'connecting', percent: 0, detail: 'Abrindo o player da TV' })
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const safeIndex = items.length === 0 ? 0 : index % items.length
  const isPortrait = variant === 'portrait'
  const item = items[safeIndex]
  const kind = item ? resolveMediaKind(item) : 'link'
  const isTv = Boolean(item?.src && isTvPlayerSrc(item.src))
  const frameSrc = item && kind === 'link' ? toSameOriginTvPlayerSrc(item.src) : item?.src

  useEffect(() => {
    setFailed(false)
    setTvReady(false)
    setTvLoad({ stage: 'connecting', percent: 0, detail: 'Abrindo o player da TV' })
  }, [item?.id, item?.src])

  useEffect(() => {
    if (paused || items.length <= 1) return
    if (kind === 'link' && items.length === 1) return
    const id = window.setInterval(() => {
      setIndex((currentIdx) => (currentIdx + 1) % items.length)
    }, Math.max(3000, durationMs))
    return () => window.clearInterval(id)
  }, [items, kind, durationMs, paused])

  useEffect(() => {
    if (kind !== 'link') return

    const onMessage = (event: MessageEvent) => {
      const data = event.data
      if (!data || typeof data !== 'object') return
      if (data.source !== 'painel-tv') return
      if (typeof data.percent === 'number' || data.detail || data.stage) {
        setTvLoad({
          stage: String(data.stage || 'loading'),
          percent: Math.max(0, Math.min(100, Number(data.percent) || 0)),
          detail: String(data.detail || 'Baixando a programação'),
        })
      }
      if (data.state === 'ready') setTvReady(true)
    }
    window.addEventListener('message', onMessage)

    const timeout = isTv
      ? window.setTimeout(() => setTvReady(true), WARMUP_TIMEOUT_MS)
      : undefined

    const updateEmbeddedAudio = () => {
      try {
        const mediaElements = frameRef.current?.contentDocument?.querySelectorAll('video, audio')
        mediaElements?.forEach((node) => {
          const media = node as HTMLMediaElement
          if (isTv && !tvReady) {
            media.muted = true
            media.volume = 0
            return
          }
          if (paused) {
            if (media.dataset.panelCallMuted !== 'true') {
              media.dataset.panelCallMuted = 'true'
              media.dataset.panelPreviousMuted = String(media.muted)
              media.dataset.panelPreviousVolume = String(media.volume)
            }
            media.muted = true
            media.volume = 0
          } else if (media.dataset.panelCallMuted === 'true') {
            media.muted = media.dataset.panelPreviousMuted === 'true'
            media.volume = Number(media.dataset.panelPreviousVolume || 1)
            delete media.dataset.panelCallMuted
            delete media.dataset.panelPreviousMuted
            delete media.dataset.panelPreviousVolume
          }
        })
      } catch {
        // O player precisa estar na mesma origem; a rota /tv-player garante isso.
      }
    }

    if (isTv && tvReady) {
      frameRef.current?.contentWindow?.postMessage({ source: 'painel-host', state: 'present' }, '*')
    }

    updateEmbeddedAudio()
    const timer = window.setInterval(updateEmbeddedAudio, 250)
    return () => {
      window.removeEventListener('message', onMessage)
      if (timeout) window.clearTimeout(timeout)
      window.clearInterval(timer)
    }
  }, [kind, item?.src, paused, isTv, tvReady])

  if (!items.length) {
    if (!isPortrait && widgetsEnabled !== false) {
      return <SupportWidgets city={weatherCity || 'Garça'} />
    }
    return (
      <div
        className={`media-carousel media-carousel--empty${isPortrait ? ' media-carousel--portrait' : ''}`}
      >
        <p>{emptyTitle}</p>
        <span>{emptyHint}</span>
      </div>
    )
  }

  const showTvWarmup = isTv && !failed && !tvReady

  return (
    <div
      className={[
        'media-carousel',
        isPortrait ? 'media-carousel--portrait' : '',
        paused ? 'media-carousel--paused' : '',
        showTvWarmup ? 'media-carousel--warming' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={isPortrait ? 'Programação' : 'Conteúdo institucional'}
    >
      {failed ? (
        <div className="media-carousel media-carousel--empty media-carousel--portrait">
          <p>Não foi possível abrir</p>
          <span>
            {kind === 'link'
              ? 'A página bloqueia embed (iframe) ou a URL está inacessível.'
              : 'Verifique o endereço da mídia.'}
          </span>
          <span className="media-carousel__src">{item.src}</span>
        </div>
      ) : kind === 'video' ? (
        <video
          key={item.id}
          className="media-carousel__media"
          src={item.src}
          autoPlay
          muted
          loop
          playsInline
          onError={() => setFailed(true)}
        />
      ) : kind === 'link' ? (
        <iframe
          ref={frameRef}
          key={item.id}
          className="media-carousel__media media-carousel__frame"
          src={frameSrc}
          title={item.label || 'Programação'}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          onError={() => setFailed(true)}
        />
      ) : (
        <img
          key={item.id}
          className="media-carousel__media"
          src={item.src}
          alt={item.label || 'Campanha'}
          onError={() => setFailed(true)}
        />
      )}
      {showTvWarmup ? (
        <div className="media-carousel__warmup" role="status" aria-live="polite">
          <p>Carregando a TV</p>
          <span>{tvLoad.detail}</span>
          <div
            className="media-carousel__progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={tvLoad.percent}
          >
            <div className="media-carousel__progress-bar" style={{ width: `${tvLoad.percent}%` }} />
          </div>
          <strong className="media-carousel__percent">{tvLoad.percent}%</strong>
        </div>
      ) : null}
      {paused && !failed && !showTvWarmup ? (
        <div className="media-carousel__priority">Chamada em exibição</div>
      ) : null}
      {kind === 'link' && !failed && !showTvWarmup ? (
        <div className="media-carousel__badge">{item.label || 'Programação'}</div>
      ) : null}
    </div>
  )
}
