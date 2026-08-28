function normalizeToken(value) { return value ? String(value).replace(/^"+|"+$/g, '') : '' }

export function readToken() {
  try { const auth = JSON.parse(localStorage.getItem('auth') || '{}'); if (auth?.token) return normalizeToken(auth.token) } catch {}
  return normalizeToken(localStorage.getItem('token'))
}

export function storeToken(token) {
  const clean = normalizeToken(token)
  localStorage.setItem('token', clean)
  let previous = {}; try { previous = JSON.parse(localStorage.getItem('auth') || '{}') || {} } catch {}
  localStorage.setItem('auth', JSON.stringify({ ...previous, token: clean }))
}

export function clearToken() { localStorage.removeItem('token'); localStorage.removeItem('auth') }

export async function api(path, options = {}) {
  const token = readToken()
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || `Falha na requisição (${response.status})`)
  return body
}
