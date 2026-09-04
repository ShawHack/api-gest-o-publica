/* Shared API / auth for voting admin workspace */
window.VotingAdmin = (() => {
  const API = '/api/votacao'
  const MEMORIAL_API = '/api/users'
  const ALLOWED_ROLES = new Set(['admin', 'admin-votacao', 'votacao_auditor'])
  const TOKEN_KEY = 'votacao_admin_token'
  const REFRESH_KEY = 'votacao_admin_refresh'
  const SESSION_KEY = 'votacao_admin_session'
  const ACCESS_KEY = 'votacao_admin_access'

  let token = localStorage.getItem(TOKEN_KEY) || ''
  let refreshToken = localStorage.getItem(REFRESH_KEY) || ''
  let refreshInFlight = null

  const el = (id) => document.getElementById(id)

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function getSessionLabel() {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (!raw) return ''
      const s = JSON.parse(raw)
      return s.name || s.email || ''
    } catch (_) {
      return ''
    }
  }

  function setSessionLabel(data, email) {
    const label = {
      name: data?.user?.name || data?.name || '',
      email: data?.user?.email || email || '',
      role: data?.role || data?.user?.role || '',
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(label))
  }

  function clearSessionLabel() {
    localStorage.removeItem(SESSION_KEY)
  }

  function setAccess(access) {
    localStorage.setItem(ACCESS_KEY, JSON.stringify(access || {}))
  }

  function getAccess() {
    try {
      return JSON.parse(localStorage.getItem(ACCESS_KEY) || '{}')
    } catch (_) {
      return {}
    }
  }

  function clearAccess() {
    localStorage.removeItem(ACCESS_KEY)
  }

  function canWrite() {
    const a = getAccess()
    return a.canWrite === true || a.globalAdmin === true
  }

  function canManageAuditors() {
    return canWrite()
  }

  function fmtDate(d) {
    if (!d) return '—'
    const dt = new Date(d)
    if (Number.isNaN(+dt)) return '—'
    return dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  }

  // Converte o valor de um <input type="datetime-local"> (hora local do
  // navegador) para ISO 8601 com fuso, para o backend gravar o instante exato.
  function localInputToISO(value) {
    if (!value) return ''
    const dt = new Date(value)
    if (Number.isNaN(+dt)) return ''
    return dt.toISOString()
  }

  // ISO/Date -> valor para <input type="datetime-local"> na hora local.
  function isoToLocalInput(d) {
    if (!d) return ''
    const dt = new Date(d)
    if (Number.isNaN(+dt)) return ''
    const pad = (n) => String(n).padStart(2, '0')
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
  }

  function statusBadge(status) {
    const s = String(status || 'draft')
    const cls = s === 'active' ? 'badge-active' : s === 'closed' ? 'badge-closed' : 'badge-draft'
    const label = s === 'active' ? 'Ativo' : s === 'closed' ? 'Encerrado' : 'Rascunho'
    return `<span class="badge ${cls}">${label}</span>`
  }

  function getToken() {
    token = localStorage.getItem(TOKEN_KEY) || token || ''
    return token
  }

  function setToken(t) {
    token = t || ''
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  }

  function getRefreshToken() {
    refreshToken = localStorage.getItem(REFRESH_KEY) || refreshToken || ''
    return refreshToken
  }

  function setRefreshToken(t) {
    refreshToken = t || ''
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken)
    else localStorage.removeItem(REFRESH_KEY)
  }

  function authHeaders(extra = {}) {
    const headers = { ...extra }
    const t = getToken()
    if (t) headers.Authorization = `Bearer ${t}`
    return headers
  }

  async function refreshSession() {
    const currentRefresh = getRefreshToken()
    if (!currentRefresh) return false
    if (refreshInFlight) return refreshInFlight

    refreshInFlight = (async () => {
      try {
        const r = await fetch(`${MEMORIAL_API}/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: currentRefresh }),
        })
        const data = await r.json().catch(() => ({}))
        if (!r.ok) return false
        const nextAccess = data.accessToken || data.token
        if (!nextAccess) return false
        setToken(nextAccess)
        if (data.refreshToken) setRefreshToken(data.refreshToken)
        return true
      } catch (_) {
        return false
      } finally {
        refreshInFlight = null
      }
    })()

    return refreshInFlight
  }

  async function requestJson(url, opts = {}, { retryOnAuth = true } = {}) {
    const headers = authHeaders({ ...(opts.headers || {}) })
    if (!opts.rawBody && !(opts.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json'
    }
    const r = await fetch(url, { ...opts, headers })
    const data = await r.json().catch(() => ({}))
    if (r.status === 401 && retryOnAuth) {
      const renewed = await refreshSession()
      if (renewed) return requestJson(url, opts, { retryOnAuth: false })
      logout()
      throw new Error('Sessão expirada. Faça login novamente.')
    }
    if (!r.ok) throw new Error(data.message || `Erro ${r.status}`)
    return data
  }

  async function api(path, opts = {}) {
    return requestJson(`${API}${path}`, opts)
  }

  async function apiForm(path, formData, method = 'PATCH') {
    return requestJson(
      `${API}${path}`,
      {
        method,
        body: formData,
        rawBody: true,
        headers: {},
      },
    )
  }

  async function login(email, password) {
    const r = await fetch(`${MEMORIAL_API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.message || 'Falha no login.')
    const role = data.role || data.user?.role || ''
    if (!ALLOWED_ROLES.has(role)) {
      throw new Error('Sem permissão. Solicite o perfil admin-votacao à SEMIT.')
    }
    setToken(data.accessToken || data.token)
    if (data.refreshToken) setRefreshToken(data.refreshToken)
    setSessionLabel(data, email)
    return data
  }

  function logout() {
    setToken('')
    setRefreshToken('')
    clearSessionLabel()
    clearAccess()
  }

  function parseRoute() {
    const path = window.location.pathname.replace(/\/+$/, '') || '/votacao/admin'
    const base = '/votacao/admin'
    if (path === base || path === `${base}/`) {
      return { name: 'redirect-pleitos' }
    }
    if (path === `${base}/pleitos`) return { name: 'pleitos' }
    if (path === `${base}/eleitores`) return { name: 'eleitores' }
    if (path === `${base}/legacy`) return { name: 'legacy' }

    const m = path.match(/^\/votacao\/admin\/pleitos\/([^/]+)(?:\/([^/]+))?$/)
    if (m) {
      const section = m[2] || 'resumo'
      const allowed = new Set([
        'resumo',
        'configuracoes',
        'eleicoes',
        'candidatos',
        'landing-page',
        'votacao',
        'apuracao',
        'resultados',
        'equipe',
      ])
      return {
        name: 'workspace',
        pleitoId: m[1],
        section: allowed.has(section) ? section : 'resumo',
      }
    }
    return { name: 'pleitos' }
  }

  function navigate(to) {
    if (to !== window.location.pathname) {
      window.history.pushState({}, '', to)
    }
    window.dispatchEvent(new Event('votacao-route'))
  }

  function workspacePath(pleitoId, section = 'resumo') {
    return `/votacao/admin/pleitos/${pleitoId}/${section}`
  }

  return {
    API,
    el,
    esc,
    fmtDate,
    localInputToISO,
    isoToLocalInput,
    statusBadge,
    getToken,
    setToken,
    getSessionLabel,
    setSessionLabel,
    clearSessionLabel,
    setAccess,
    getAccess,
    clearAccess,
    canWrite,
    canManageAuditors,
    api,
    apiForm,
    login,
    logout,
    parseRoute,
    navigate,
    workspacePath,
  }
})()
