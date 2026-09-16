// Boundary for the published Memorial shell only; no auth/session mutations.
(function () {
  function known(path) {
    return /^\/(?:$|index\.html$|login\/?$|register\/?$|monitoramento\/login\.?\/?$|auth\/(?:forgot-password|reset-password|verify-email)\/?$|medicamentos\/?$|compliance\/?$|educacao(?:\/.*)?$|sepulturas\/?$|sepultados\/[^/]+\/?$|sepultados\/edit\/[^/]+\/?$|user\/profile\/?$|meussepultados\/?$|meuusuario\/?$|usuarios\/add\/?$|usuarios\/edit\/[^/]+\/?$|shift-handovers(?:\/[^/]+|\/edit\/[^/]+)?\/?$)/.test(path);
  }
  function show(kind) {
    if (document.getElementById('portal-error-frame')) return;
    const root = document.getElementById('root');
    if (root) root.hidden = true;
    const frame = document.createElement('iframe');
    frame.id = 'portal-error-frame'; frame.title = 'Informação sobre a página';
    frame.src = '/portal-errors/' + kind + '.html';
    frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;background:#f3f6fa;z-index:2147483647';
    document.body.appendChild(frame);
    document.title = kind === '404' ? 'Página não encontrada — Prefeitura de Garça' : 'Falha ao carregar — Prefeitura de Garça';
  }
  function check() {
    if (!known(location.pathname)) show('404');
    else {
      const frame = document.getElementById('portal-error-frame');
      if (frame) frame.remove();
      const root = document.getElementById('root'); if (root) root.hidden = false;
    }
  }
  document.addEventListener('DOMContentLoaded', check);
  window.addEventListener('popstate', check);
  for (const method of ['pushState','replaceState']) {
    const original = history[method];
    history[method] = function () { const result = original.apply(this, arguments); check(); return result; };
  }
  // Resource/third-party errors are not treated as total application failure.
  window.addEventListener('error', event => {
    const source = event.filename || '';
    const script = event.target && event.target.tagName === 'SCRIPT' ? event.target.src : '';
    if ((event.error && source.startsWith(location.origin + '/static/js/')) || script.startsWith(location.origin + '/static/js/main.')) show('unavailable');
  }, true);
})();
