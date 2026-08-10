export function readStoredToken() {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    if (auth?.token) return normalizeToken(auth.token)
  } catch {
    // ignora JSON inválido
  }
  const raw = localStorage.getItem('auth')
  if (raw && !raw.trim().startsWith('{')) {
    return normalizeToken(raw)
  }
  return normalizeToken(localStorage.getItem('token'))
}

function normalizeToken(value) {
  if (!value) return ''
  return String(value).replace(/^"+|"+$/g, '')
}
