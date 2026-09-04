/**
 * Memorial / Garça Pet: renova JWT via refresh token (localStorage memorial_refresh).
 * Compatível com apps React que só gravam `token` no login.
 */
(function () {
  var REFRESH_KEY = 'memorial_refresh';
  var TOKEN_KEY = 'token';
  var AUTH_KEY = 'auth';
  var refreshing = null;

  function apiBase() {
    if (window.__API_BASE__) return String(window.__API_BASE__).replace(/\/$/, '');
    return '';
  }

  function persistTokens(data) {
    if (!data) return;
    var access = data.token || data.accessToken;
    if (access) {
      localStorage.setItem(TOKEN_KEY, access);
      try {
        var prev = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
        if (prev && typeof prev === 'object') {
          prev.token = access;
          localStorage.setItem(AUTH_KEY, JSON.stringify(prev));
        } else {
          localStorage.setItem(AUTH_KEY, JSON.stringify({ token: access }));
        }
      } catch (e) {
        localStorage.setItem(AUTH_KEY, JSON.stringify({ token: access }));
      }
    }
    if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
  }

  function clearSession() {
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('user');
  }

  function isLoginUrl(url) {
    return /\/users\/login(\?|#|$)/i.test(url);
  }

  function isRefreshUrl(url) {
    return /\/users\/refresh(\?|#|$)/i.test(url);
  }

  function shouldHandle(url) {
    if (!url || isRefreshUrl(url)) return false;
    var base = apiBase();
    if (base && url.indexOf(base) === 0) return true;
    return /\/api\//i.test(url) || /\/users\//i.test(url) ||
      /\/pets(\/|\?|$)/i.test(url) || /\/sepultados/i.test(url) ||
      /\/dloc/i.test(url) || /\/services/i.test(url);
  }

  async function doRefresh() {
    var rt = localStorage.getItem(REFRESH_KEY);
    if (!rt) return false;
    var url = apiBase() + '/users/refresh';
    var res = await nativeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
      credentials: 'same-origin',
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      clearSession();
      return false;
    }
    persistTokens(data);
    return true;
  }

  function tryRefresh() {
    if (!refreshing) {
      refreshing = doRefresh().finally(function () { refreshing = null; });
    }
    return refreshing;
  }

  var nativeFetch = window.fetch.bind(window);

  window.fetch = async function (input, init) {
    init = init || {};
    var url = typeof input === 'string' ? input : (input && input.url) || '';

    var res = await nativeFetch(input, init);

    if (isLoginUrl(url) && res.ok) {
      try {
        var clone = res.clone();
        var loginData = await clone.json();
        if (loginData && (loginData.refreshToken || loginData.token || loginData.accessToken)) {
          persistTokens(loginData);
        }
      } catch (e) { /* ignore */ }
      return res;
    }

    if (res.status === 401 && shouldHandle(url) && !init._memorialRefreshRetry) {
      var ok = await tryRefresh();
      if (ok) {
        var headers = new Headers(init.headers || {});
        var token = localStorage.getItem(TOKEN_KEY);
        if (token) headers.set('Authorization', 'Bearer ' + token);
        return nativeFetch(input, Object.assign({}, init, {
          headers: headers,
          _memorialRefreshRetry: true,
        }));
      }
    }

    return res;
  };

  window.__memorialTryRefresh = tryRefresh;
  window.__memorialPersistTokens = persistTokens;
})();
