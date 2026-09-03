/**
 * Cliente API Cultura — reutiliza autenticação SEMIT (/api/users/login).
 */
(function (global) {
  const TOKEN_KEY = 'token'
  const REFRESH_KEY = 'memorial_refresh'
  const USER_KEY = 'user'

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || ''
  }

  function setSession({ token, refreshToken, user }) {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem('auth')
  }

  function authHeaders(extra) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, extra || {})
    const token = getToken()
    if (token) headers.Authorization = 'Bearer ' + token
    return headers
  }

  async function apiLogin(email, password) {
    const res = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = data.message || data.error || 'Erro ao fazer login.'
      throw new Error(msg)
    }
    const token = data.token || data.accessToken
    setSession({
      token,
      refreshToken: data.refreshToken,
      user: {
        id: data.userId,
        nome: data.name,
        email,
        role: data.role,
      },
    })
    return data
  }

  async function isCulturaAdmin() {
    const token = getToken()
    if (!token) return false
    const res = await fetch('/api/cultura/admin/dashboard', {
      headers: { Authorization: 'Bearer ' + token },
    })
    return res.ok
  }

  async function culturaFetch(url, options) {
    const opts = options || {}
    const headers = authHeaders(opts.headers)
    if (opts.body instanceof FormData) {
      delete headers['Content-Type']
    }
    return fetch(url, Object.assign({}, opts, { headers }))
  }

  global.CulturaApi = {
    getToken,
    setSession,
    clearSession,
    authHeaders,
    apiLogin,
    isCulturaAdmin,
    culturaFetch,
  }
})(window)
