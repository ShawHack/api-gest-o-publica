(function (global) {
  var ACCESS = 'semit_dashboard_token'
  var REFRESH = 'semit_dashboard_refresh'
  var LOCAL_TOKEN = 'token'
  var MEMORIAL_REFRESH = 'memorial_refresh'
  var pending = null

  function readAccess() {
    return sessionStorage.getItem(ACCESS) || localStorage.getItem(LOCAL_TOKEN) || ''
  }

  function readRefresh() {
    return sessionStorage.getItem(REFRESH) || localStorage.getItem(MEMORIAL_REFRESH) || ''
  }

  function persist(token, refresh) {
    if (token) {
      sessionStorage.setItem(ACCESS, token)
      try { localStorage.setItem(LOCAL_TOKEN, token) } catch (e) {}
    }
    if (refresh) {
      sessionStorage.setItem(REFRESH, refresh)
      try { localStorage.setItem(MEMORIAL_REFRESH, refresh) } catch (e) {}
    }
  }

  function restoreSync() {
    persist(readAccess(), readRefresh())
    return !!(readAccess() || readRefresh())
  }

  function clear() {
    sessionStorage.removeItem(ACCESS)
    sessionStorage.removeItem(REFRESH)
    try {
      localStorage.removeItem(LOCAL_TOKEN)
      localStorage.removeItem(MEMORIAL_REFRESH)
    } catch (e) {}
  }

  function authHeaders(extra) {
    var headers = {}
    if (extra) Object.keys(extra).forEach(function (key) { headers[key] = extra[key] })
    var token = readAccess()
    if (token) headers.Authorization = 'Bearer ' + token
    return headers
  }

  async function refreshAccess() {
    var current = readRefresh()
    if (!current) return false
    if (pending) return pending
    pending = (async function () {
      try {
        var response = await fetch('/api/users/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refreshToken: current }),
        })
        var data = await response.json().catch(function () { return {} })
        var token = data.token || data.accessToken
        if (!response.ok || !token) return false
        persist(token, data.refreshToken || current)
        return true
      } catch (e) {
        return false
      }
    })()
    try {
      return await pending
    } finally {
      pending = null
    }
  }

  async function fetchAuth(url, options) {
    options = options || {}
    restoreSync()
    var headers = authHeaders(options.headers)
    if (options.body instanceof FormData) {
      delete headers['Content-Type']
      delete headers['content-type']
    }
    var response = await fetch(url, Object.assign({}, options, {
      headers: headers,
      cache: options.cache || 'no-store',
    }))
    if (response.status !== 401) return response
    if (!(await refreshAccess())) return response
    var retryHeaders = authHeaders(options.headers)
    if (options.body instanceof FormData) {
      delete retryHeaders['Content-Type']
      delete retryHeaders['content-type']
    }
    return fetch(url, Object.assign({}, options, {
      headers: retryHeaders,
      cache: options.cache || 'no-store',
    }))
  }

  global.SemitSession = {
    persist: persist,
    restoreSync: restoreSync,
    clear: clear,
    readAccess: readAccess,
    readRefresh: readRefresh,
    refreshAccess: refreshAccess,
    authHeaders: authHeaders,
    fetchAuth: fetchAuth,
  }
})(window)
