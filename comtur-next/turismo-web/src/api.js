async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
  if (!response.ok) throw new Error('Não foi possível consultar o portal.')
  return response.json()
}

export async function fetchBranding() {
  const payload = await getJson(`/api/comtur/branding?ts=${Date.now()}`)
  return payload.data || {}
}

export async function fetchContent({ type, featured, q, limit = 24 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (type) params.set('type', type)
  if (featured) params.set('featured', 'true')
  if (q) params.set('q', q)
  const payload = await getJson(`/api/comtur/content?${params}`)
  return payload.data || []
}

export async function fetchContentBySlug(slug) {
  const payload = await getJson(`/api/comtur/content/${encodeURIComponent(slug)}`)
  return payload.data
}

export async function fetchMeetings({ q, year, type } = {}) {
  const params = new URLSearchParams({ limit: '40' })
  if (q) params.set('q', q)
  if (year) params.set('year', year)
  if (type) params.set('type', type)
  const payload = await getJson(`/api/comtur/meetings?${params}`)
  return payload.data || []
}

export async function fetchMeetingBySlug(slug) {
  const payload = await getJson(`/api/comtur/meetings/${encodeURIComponent(slug)}`)
  return payload.data
}
