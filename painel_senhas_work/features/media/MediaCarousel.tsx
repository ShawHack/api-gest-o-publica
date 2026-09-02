import { useEffect, useRef, useState } from 'react'
import type { MediaItemConfig } from '../../types/config'
import { SupportWidgets } from './SupportWidgets'
import './MediaCarousel.css'

/** Se a URL não for arquivo de mídia, trata como página embutida (iframe). */
export function resolveMediaKind(item: MediaItemConfig): 'image' | 'video' | 'link' {
  const bare = item.src.split('?')[0].split('#')[0].toLowerCase()
  const isImageFile = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(bare)
  const isVideoFile = /\.(mp4|webm|ogg|mov|m4v)$/i.test(bare)

  if (item.type === 'link') return 'link'
  if (isImageFile) return 'image'
  if (isVideoFile) return 'video'
  // Cadastrou como image/video, mas a URL é uma página (ex.: /tv/?display=semit)
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
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const safeIndex = items.length === 0 ? 0 : index % items.length
  const isPortrait = variant === 'portrait'
  const item = items[safeIndex]
  const kind = item ? resolveMediaKind(item) : 'link'

  useEffect(() => {
    setFailed(false)
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

    const updateEmbeddedAudio = () => {
      try {
        const mediaElements = frameRef.current?.contentDocument?.querySelectorAll('video, audio')
        mediaElements?.forEach((node) => {
          const media = node as HTMLMediaElement
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

    updateEmbeddedAudio()
    const timer = window.setInterval(updateEmbeddedAudio, 250)
    return () => window.clearInterval(timer)
  }, [kind, item?.src, paused])

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

  return (
    <div
      className={[
        'media-carousel',
        isPortrait ? 'media-carousel--portrait' : '',
        paused ? 'media-carousel--paused' : '',
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
          src={item.src}
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
      {paused && !failed ? <div className="media-carousel__priority">Chamada em exibição</div> : null}
      {kind === 'link' && !failed ? (
        <div className="media-carousel__badge">{item.label || 'Programação'}</div>
      ) : null}
    </div>
  )
}
