(function () {
  'use strict';

  if (document.querySelector('[data-comtur-global-nav]')) return;

  const path = window.location.pathname;
  const links = [
    ['/comtur-admin.html', 'Visão geral', '⌂'],
    ['/comtur-meetings-admin.html?v=7', 'Reuniões', '▣'],
    ['/comtur-content-admin.html?v=13', 'Conteúdos e documentos', '≡'],
    ['/comtur-branding-admin.html?v=11', 'Identidade visual', '◆'],
    ['/comtur-staff-admin.html', 'Equipe', '👤'],
    ['/turismo/', 'Portal público', '↗'],
    ['/dashboard.html', 'Dashboard da API', '←']
  ];

  const aside = document.createElement('aside');
  aside.className = 'comtur-global-nav';
  aside.dataset.comturGlobalNav = '';
  aside.setAttribute('aria-label', 'Navegação administrativa do COMTUR');
  aside.innerHTML = `
    <div class="comtur-global-nav__head">
      <a class="comtur-global-nav__brand" href="/comtur-admin.html">
        <span class="comtur-global-nav__mark" aria-hidden="true">G</span>
        <span><strong>COMTUR</strong><small>Administração</small></span>
      </a>
      <button class="comtur-global-nav__toggle" type="button" aria-expanded="false" aria-controls="comtur-admin-menu" aria-label="Abrir menu">☰</button>
    </div>
    <nav id="comtur-admin-menu" class="comtur-global-nav__links">
      ${links.map(([href, label, icon]) => {
        const hrefPath = href.split('?')[0];
        const active = path === hrefPath;
        return `<a href="${href}"${active ? ' class="active" aria-current="page"' : ''}><span aria-hidden="true">${icon}</span>${label}</a>`;
      }).join('')}
    </nav>`;

  document.body.prepend(aside);
  document.body.classList.add('with-comtur-global-nav');

  const toggle = aside.querySelector('.comtur-global-nav__toggle');
  toggle.addEventListener('click', function () {
    const open = aside.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  });
})();
