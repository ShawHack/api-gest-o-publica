export function formatClock(date: Date): { time: string; date: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
    date: date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
  }
}

export function formatCallTime(iso: string): string {
  if (!iso?.trim()) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ''
  }
}

export function resolveMercureUrl(
  configured: string,
  apiInfoUrl: string | null | undefined,
  apiBase: string,
): string {
  let mercureUrl = (configured || apiInfoUrl || '').trim()
  if (!mercureUrl) return ''
  if (!mercureUrl.toLowerCase().startsWith('http')) {
    const serverUrl = apiBase.replace(/\/api\/?$/, '/').replace(/\/?$/, '/')
    mercureUrl = mercureUrl.startsWith('/')
      ? serverUrl + mercureUrl.slice(1)
      : serverUrl + mercureUrl
  }
  return mercureUrl
}
