/* Canonical public paths; no changes to API endpoints or shared authentication. */
(function () {
  const names = ['arvores', 'arvore', 'castracao', 'zoologico', 'denunciar', 'funcionalidade', 'vacinacao'];
  function canonical(path) {
    if (/^\/garcapet\/sama\/?$/.test(path)) return '/sama/';
    for (const name of names) {
      if (path === '/garcapet/' + name || path.startsWith('/garcapet/' + name + '/')) return '/sama/' + path.slice(10);
    }
    return path;
  }
  function legacyPath(path) {
    path = path || location.pathname;
    if (path === '/sama' || path === '/sama/') return '/garcapet/sama';
    for (const name of names) {
      if (path === '/sama/' + name || path.startsWith('/sama/' + name + '/')) return '/garcapet/' + path.slice(6);
    }
    return path;
  }
  window.SamaRoutes = { canonical, legacyPath };
  for (const name of ['pushState', 'replaceState']) {
    const original = history[name];
    history[name] = function (state, unused, href) {
      if (href != null) {
        const url = new URL(href, location.href);
        if (url.origin === location.origin) href = canonical(url.pathname) + url.search + url.hash;
      }
      return original.call(this, state, unused, href);
    };
  }
  function links() {
    const legacy = legacyPath().replace(/\/$/, '');
    const adoption = /^\/garcapet(?:$|\/adotar$|\/sobre$|\/pet\/myadoptions$|\/pet\/[a-f0-9]{24}$)/.test(legacy);
    const brand = document.querySelector('header [class*="Navbar_navbar_logo__"]');
    if (brand) brand.setAttribute('href', adoption ? '/garcapet/' : '/sama/');
    let back = document.getElementById('sama-return-link');
    if (brand && !back) {
      back = document.createElement('a'); back.id = 'sama-return-link'; back.href = '/sama/'; back.textContent = 'Voltar à Secretaria';
      back.style.cssText = 'font-size:13px;color:#446042;padding:8px;white-space:normal';
      brand.parentElement.appendChild(back);
    }
    if (back) back.hidden = !adoption;
    document.querySelectorAll('footer a').forEach(a => {
      if (a.textContent.trim() === 'Página Inicial') {
        a.setAttribute('data-sama-home', '1');
        a.setAttribute('href', adoption ? '/garcapet/' : '/sama/');
      }
    });
    document.querySelectorAll('a[href]').forEach(a => {
      const url = new URL(a.getAttribute('href'), location.href);
      if (url.origin !== location.origin) return;
      const next = canonical(url.pathname);
      if (next !== url.pathname) a.setAttribute('href', next + url.search + url.hash);
    });
  }
  document.addEventListener('click', event => {
    const a = event.target.closest && event.target.closest('a');
    if (!a || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (a.id === 'sama-return-link' || a.hasAttribute('data-sama-home') || a.matches('header [class*="Navbar_navbar_logo__"]')) {
      event.preventDefault(); event.stopPropagation(); location.assign(a.href);
    }
  }, true);
  let queued = false;
  const observer = new MutationObserver(() => {
    if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; links(); }); }
  });
  function start() { links(); observer.observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
