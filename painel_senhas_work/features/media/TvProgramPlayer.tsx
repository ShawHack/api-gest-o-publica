import { useEffect, useRef, useState } from 'react'
import { clampVolume } from '../../utils/tvEmbed'
import { downloadAndCache, getCachedBlobUrl, type CacheProgress } from './tvMediaCache'
import './TvProgramPlayer.css'

type PlaylistItem = {
  id?: string
  type?: string
  title?: string
  url?: string
  duration?: number
}

const DEFAULT_TV_BASE = 'https://api.garca.sp.gov.br/tv'

export function isSemitTvLink(src: string): boolean {
  const lower = src.toLowerCase()
  return (
    lower.includes('/tv/') ||
    lower.includes('/tv?') ||
    lower.includes('/tv-player') ||
    /[?&]display=/.test(lower)
  )
}

export function parseTvDisplayId(src: string): string {
  try {
    const url = new URL(src, typeof window !== 'undefined' ? window.location.href : DEFAULT_TV_BASE)
    return url.searchParams.get('display') || url.searchParams.get('id') || 'semit'
  } catch {
    return 'semit'
  }
}

function tvApiBase(): string {
  const fromEnv = (import.meta.env.VITE_TV_API_URL as string | undefined)?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined' && window.location.port === '8088') {
    return `${window.location.origin}/tv`
  }
  return DEFAULT_TV_BASE
}

function resolveMediaUrl(raw: string, base: string): string {
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw) || raw.startsWith('blob:')) return raw
  const clean = raw.replace(/^\//, '')
  return `${base.replace(/\/$/, '')}/${clean}`
}

export function playlistItemKind(item: PlaylistItem): 'overlay' | 'video' | null {
  const url = String(item.url || '')
  if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url)) return 'overlay'
  if (/\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url) || item.type === 'video') return 'video'
  return null
}

function playlistKey(items: PlaylistItem[]): string {
  return items.map((i) => i.url || '').join('|')
}

function machinePlaysHevc(): boolean {
  const probe = document.createElement('video')
  const types = [
    'video/mp4; codecs="hvc1.1.6.L93.B0"',
    'video/mp4; codecs="hev1.1.6.L93.B0"',
    'video/mp4; codecs="hvc1"',
    'video/mp4; codecs="hev1"',
  ]
  return types.some((type) => probe.canPlayType(type) === 'probably')
}

const codecCache = new Map<string, 'hevc' | 'avc' | 'unknown'>()

async function sniffMp4Codec(url: string): Promise<'hevc' | 'avc' | 'unknown'> {
  const cached = codecCache.get(url)
  if (cached) return cached
  try {
    const res = await fetch(url, {
      headers: { Range: 'bytes=0-786431' },
      cache: 'force-cache',
    })
    const buf = new Uint8Array(await res.arrayBuffer())
    const text = new TextDecoder('latin1').decode(buf)
    let kind: 'hevc' | 'avc' | 'unknown' = 'unknown'
    if (text.includes('hvc1') || text.includes('hev1')) kind = 'hevc'
    else if (text.includes('avc1') || text.includes('avc3')) kind = 'avc'
    codecCache.set(url, kind)
    return kind
  } catch {
    codecCache.set(url, 'unknown')
    return 'unknown'
  }
}

async function keepPlayableVideos(items: PlaylistItem[], base: string): Promise<PlaylistItem[]> {
  if (machinePlaysHevc()) return items
  const checked = await Promise.all(
    items.map(async (item) => {
      const url = resolveMediaUrl(item.url || '', base)
      const codec = await sniffMp4Codec(url)
      return codec === 'hevc' ? null : item
    }),
  )
  const playable = checked.filter((item): item is PlaylistItem => item !== null)
  return playable
}

async function prepareLocalPlaylist(
  items: PlaylistItem[],
  base: string,
  onProgress: (progress: CacheProgress) => void,
): Promise<void> {
  for (let i = 0; i < items.length; i += 1) {
    const url = resolveMediaUrl(items[i].url || '', base)
    const label = items[i].title || `vídeo ${i + 1}`
    const update = (loaded: number, total: number) => {
      const currentPart = total > 0 ? loaded / total : 0
      onProgress({
        current: i + 1,
        total: items.length,
        fileLabel: label,
        bytesLoaded: loaded,
        bytesTotal: total,
        percent: Math.min(99, Math.round(((i + currentPart) / items.length) * 100)),
        detail: `Baixando vídeo ${i + 1} de ${items.length}: ${label}`,
      })
    }
    const cached = await getCachedBlobUrl(url)
    if (cached) {
      onProgress({ current: i + 1, total: items.length, fileLabel: label, bytesLoaded: 1, bytesTotal: 1, percent: Math.round(((i + 1) / items.length) * 100), detail: `Vídeo ${i + 1} de ${items.length} já está pronto` })
      continue
    }
    update(0, 0)
    const localUrl = await downloadAndCache(url, update)
    if (!localUrl) throw new Error(`Não foi possível baixar ${label}`)
  }
}

/** Um único <video>: some o loading no play e não interrompe a fila. */
export function TvProgramPlayer({
  src,
  volume = 1,
  paused = false,
  onError,
}: {
  src: string
  volume?: number
  paused?: boolean
  onError?: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([])
  const [index, setIndex] = useState(0)
  const [overlayUrl, setOverlayUrl] = useState('')
  const [opened, setOpened] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [effectiveSrc, setEffectiveSrc] = useState('')
  const [progress, setProgress] = useState<CacheProgress | null>(null)
  const displayId = parseTvDisplayId(src)
  const base = tvApiBase()
  const playlistKeyRef = useRef('')
  const pendingPlaylistRef = useRef<PlaylistItem[] | null>(null)
  const pendingOverlayRef = useRef('')

  const current = playlist[index]
  const playUrl = current?.url ? resolveMediaUrl(current.url, base) : ''

  function markOpened() {
    setOpened(true)
    setStatus('ready')
  }

  function goNext() {
    const pending = pendingPlaylistRef.current
    if (pending?.length) {
      pendingPlaylistRef.current = null
      setPlaylist(pending)
      setOverlayUrl(pendingOverlayRef.current)
      setIndex(0)
      return
    }
    if (playlist.length <= 1) {
      const el = videoRef.current
      if (el) {
        el.currentTime = 0
        void el.play().catch(() => {})
      }
      return
    }
    setIndex((i) => (i + 1) % playlist.length)
  }

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function load(isRefresh: boolean) {
      try {
        const res = await fetch(
          `${base}/api/playlist?display=${encodeURIComponent(displayId)}&t=${Date.now()}`,
          { signal: controller.signal },
        )
        if (!res.ok) throw new Error(`playlist ${res.status}`)
        const data = (await res.json()) as PlaylistItem[]
        if (cancelled) return
        const raw = Array.isArray(data) ? data : []
        const overlay = raw.find((item) => playlistItemKind(item) === 'overlay')
        const videos = raw.filter((item) => playlistItemKind(item) === 'video')
        const items = await keepPlayableVideos(videos, base)
        const nextOverlay = overlay?.url ? resolveMediaUrl(overlay.url, base) : ''
        const nextKey = playlistKey(items)
        if (!items.length) {
          setPlaylist([])
          setStatus('error')
          onError?.()
          return
        }
        if (isRefresh && nextKey === playlistKeyRef.current) return
        setStatus('loading')
        await prepareLocalPlaylist(items, base, setProgress)
        if (cancelled) return
        playlistKeyRef.current = nextKey
        setProgress(null)
        if (!isRefresh) {
          setPlaylist(items)
          setOverlayUrl(nextOverlay)
          setIndex(0)
        } else {
          // Nunca interrompe o vídeo exibido: aplica a nova grade apenas na próxima troca.
          pendingPlaylistRef.current = items
          pendingOverlayRef.current = nextOverlay
        }
      } catch {
        if (cancelled || isRefresh) return
        setStatus('error')
        onError?.()
      }
    }

    void load(false)
    const timer = window.setInterval(() => void load(true), 60000)
    return () => {
      cancelled = true
      controller.abort()
      window.clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, displayId])

  useEffect(() => {
    let cancelled = false
    if (!playUrl) {
      setEffectiveSrc('')
      return
    }

    // A fonte só é liberada depois do download completo para o cache local.
    void getCachedBlobUrl(playUrl).then((resolved) => {
      if (!cancelled) {
        if (resolved) setEffectiveSrc(resolved)
        else {
          setStatus('error')
          onError?.()
        }
      }
    })

    return () => {
      cancelled = true
    }
  }, [playUrl])

  useEffect(() => {
    const el = videoRef.current
    if (!el || !effectiveSrc) return
    if (el.getAttribute('src') !== effectiveSrc) {
      el.setAttribute('src', effectiveSrc)
      el.load()
    }
    const hideLoader = window.setTimeout(() => markOpened(), 4000)
    const tryPlay = () => {
      el.muted = true
      void el.play().then(() => markOpened()).catch(() => {
        el.muted = true
        void el.play().then(() => markOpened()).catch(() => {})
      })
    }
    tryPlay()
    return () => window.clearTimeout(hideLoader)
  }, [effectiveSrc])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const vol = opened && !paused ? clampVolume(volume, 1) : 0
    el.volume = vol
    el.muted = vol <= 0
    if (paused) el.pause()
    else void el.play().catch(() => {})
  }, [volume, opened, paused, playUrl])

  useEffect(() => {
    function onPanelTv(event: Event) {
      const detail = (event as CustomEvent<{ action?: string; volume?: number; source?: string }>)
        .detail
      if (!detail || detail.source !== 'painel-semit') return
      const el = videoRef.current
      if (!el) return
      if (detail.action === 'pause') el.pause()
      if (detail.action === 'resume' || detail.action === 'unmute' || detail.action === 'unlock-audio') {
        const vol = clampVolume(detail.volume ?? volume, 1)
        el.volume = vol
        el.muted = vol <= 0
        void el.play().catch(() => {})
      }
    }
    window.addEventListener('painel-semit-tv', onPanelTv as EventListener)
    return () => window.removeEventListener('painel-semit-tv', onPanelTv as EventListener)
  }, [volume])

  useEffect(() => {
    const el = videoRef.current
    if (!el || !playUrl) return
    const onEnded = () => goNext()
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('ended', onEnded)
    }
  }, [playUrl, playlist.length])

  const showLoader = !opened && status !== 'error'

  if (status === 'error' && !playUrl) {
    return (
      <div className="tv-program-player tv-program-player--status">
        <span>Sem vídeos na programação</span>
      </div>
    )
  }

  return (
    <div className="tv-program-player">
      <video
        ref={videoRef}
        className="tv-program-player__video"
        autoPlay
        muted
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        onPlaying={markOpened}
        onCanPlay={markOpened}
        onLoadedData={markOpened}
        onError={() => goNext()}
      />
      {overlayUrl && opened ? (
        <img className="tv-program-player__logo" src={overlayUrl} alt="" />
      ) : null}
      {showLoader ? (
        <div className="tv-program-player__loader" role="status" aria-live="polite">
          <p>Carregando a TV</p>
          <span>
            {progress
              ? `${progress.detail} (${progress.percent}%)`
              : playlist.length
              ? `Abrindo vídeo ${index + 1} de ${playlist.length}`
              : 'Consultando a programação'}
          </span>
          {progress ? (
            <div className="tv-program-player__progress" aria-hidden="true">
              <div className="tv-program-player__progress-bar" style={{ width: `${progress.percent}%` }} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
