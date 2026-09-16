/** Reescreve URLs da TV para o proxy same-origin `/tv-player/`. */
export function toSameOriginTvPlayerSrc(src: string): string {
  const trimmed = src.trim()
  if (!trimmed) return trimmed
  try {
    const url = new URL(trimmed, 'http://local.invalid')
    const path = url.pathname.replace(/\/+$/, '') || '/'
    const isTvPath =
      path === '/tv' ||
      path.startsWith('/tv/') ||
      path === '/tv-player' ||
      path.startsWith('/tv-player/')
    if (!isTvPath) return trimmed
    const rest = path.replace(/^\/tv-player/, '').replace(/^\/tv/, '').replace(/^\//, '')
    const nextPath = rest ? `/tv-player/${rest}` : '/tv-player/'
    return `${nextPath}${url.search}${url.hash}`
  } catch {
    return trimmed
  }
}

export function isTvPlayerSrc(src: string): boolean {
  const rewritten = toSameOriginTvPlayerSrc(src)
  return rewritten.startsWith('/tv-player')
}
