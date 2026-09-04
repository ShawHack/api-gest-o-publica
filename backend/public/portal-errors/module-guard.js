/* Presentation boundary for SAMA and Agenda only. No requests or session writes. */
(function () {
  const initial = location.pathname;
  const moduleName = initial.startsWith('/agendamentos') ? 'agenda' : 'sama';
  const sourcePrefixes = moduleName === 'agenda' ? ['/agendamentos/assets/'] : ['/sama/main.', '/sama/static/js/', '/sama/patch'];
  let originalTitle = document.title;
  function known() {
    if (moduleName === 'agenda') {
      if (!/^\/agendamentos(?:\/|\/index\.html)?$/.test(location.pathname)) return false;
      if (!location.hash || location.hash === '#' || location.hash === '#/') return true;
      try {
        const hash = decodeURIComponent(location.hash.slice(1));
        if (document.getElementById(hash)) return true;
        return /^\/p\/[^/?#]+\/[^/?#]+\/?(?:\?[^#]*)?$/.test(hash);
      } catch (_) { return false; }
    }
    let path = window.SamaRoutes ? window.SamaRoutes.legacyPath(location.pathname) : location.pathname;
    path = path.replace(/\/+$/, '');
    return /^\/garcapet(?:$|\/(?:index\.html|sama|adotar|sobre|login|register|castracao|zoologico|denunciar|funcionalidade|arvores|vacinacao)$|\/auth\/(?:verify-email|forgot-password|reset-password)$|\/user\/profile$|\/pet\/[^/]+$|\/pet\/edit\/[^/]+$|\/arvore\/[^/]+$|\/arvore\/edit\/[^/]+$|\/admin\/users(?:\/create)?$|\/admin\/castracao-(?:solicitacoes|campanhas)$)/.test(path);
  }
  function show(type) {
    if (!document.body || document.getElementById('module-error-frame')) return;
    originalTitle = document.title;
    const root = document.getElementById('root'); if (root) root.hidden = true;
    const frame = document.createElement('iframe'); frame.id = 'module-error-frame';
    frame.title = 'Informação sobre a página'; frame.src = '/portal-errors/' + type + '.html';
    frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;background:#f3f6fa;z-index:2147483647';
    document.body.appendChild(frame);
    document.title = type === '404' ? 'Página não encontrada — Prefeitura de Garça' : 'Falha ao carregar — Prefeitura de Garça';
  }
  function check() {
    if (!known()) return show('404');
    const frame = document.getElementById('module-error-frame');
    if (frame) { frame.remove(); document.title = originalTitle; }
    const root = document.getElementById('root'); if (root) root.hidden = false;
  }
  for (const name of ['pushState', 'replaceState']) {
    const original = history[name];
    history[name] = function () { const result = original.apply(this, arguments); check(); return result; };
  }
  window.addEventListener('hashchange', check);
  window.addEventListener('popstate', check);
  window.addEventListener('error', event => {
    const script = event.target && event.target.tagName === 'SCRIPT' ? event.target.src : '';
    const url = event.error ? event.filename || '' : script;
    if (sourcePrefixes.some(prefix => url.startsWith(location.origin + prefix))) show('unavailable');
  }, true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', check); else check();
})();
