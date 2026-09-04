/* SAMA identity layer: presentation only; preserves API, authentication and routes. */
(function () {
  'use strict';
  if (window.__samaIdentity) return;
  window.__samaIdentity = true;
  function section(path) {
    path = (window.SamaRoutes ? window.SamaRoutes.legacyPath(path) : path).toLowerCase().replace(/^\/sama\/garcapet(?=\/|$)|^\/semit-a-pet(?=\/|$)|^\/garcapet(?=\/|$)/, '').replace(/\/+$/, '') || '/';
    if (path === '/' || path === '/adotar' || path === '/sobre' || path === '/pet/myadoptions' || /^\/pet\/[a-f0-9]{24}$/.test(path)) return 'adoption';
    if (/^\/(castracao|vacinacao|denunciar|pet)(\/|$)/.test(path) || /^\/admin\/castracao/.test(path)) return 'welfare';
    return 'sama';
  }
  function text(el, value) { if (el && el.textContent !== value) el.textContent = value; }
  function apply() {
    const mode = section(location.pathname);
    const adoption = mode === 'adoption';
    const title = adoption ? 'GarçaPet — Adoção responsável' : mode === 'welfare' ? 'SAMA — Bem-estar animal' : 'Secretaria do Meio Ambiente — SAMA';
    if (document.title !== title) document.title = title;
    document.documentElement.dataset.samaIdentity = mode;
    const brand = document.querySelector('header [class*="Navbar_navbar_logo__"]');
    if (brand) {
      // Keep React-owned nodes intact; switch their visible text, not their structure.
      const spans = brand.querySelectorAll('h2 > span');
      if (spans.length === 2) {
        text(spans[0], adoption ? 'Garça' : 'Secretaria do');
        text(spans[1], adoption ? 'Pet' : 'Meio Ambiente');
      }
      brand.setAttribute('aria-label', title);
      const img = brand.querySelector('img');
      if (img) img.setAttribute('alt', 'Selo da Secretaria do Meio Ambiente de Garça');
      if (!brand.querySelector('.sama-mobile-brand')) {
        const short = document.createElement('span'); short.className = 'sama-mobile-brand'; short.textContent = 'SAMA'; brand.appendChild(short);
      }
    }
    const heading = document.querySelector('h1[class*="intro_main_title"]');
    if (heading && !adoption) text(heading, 'Secretaria do Meio Ambiente de Garça');
    if (heading && !document.getElementById('sama-service-shortcuts')) {
      const nav = document.createElement('nav'); nav.id = 'sama-service-shortcuts'; nav.setAttribute('aria-label', 'Serviços da Secretaria do Meio Ambiente');
      for (const [label, href] of [['Árvores e mudas', '/garcapet/arvores'], ['Bem-estar animal', '/garcapet/castracao'], ['GarçaPet — Quero adotar', '/garcapet/adotar']]) {
        const link = document.createElement('a'); link.href = href; link.textContent = label; nav.appendChild(link);
      }
      heading.parentElement.appendChild(nav);
    }
    const footer = document.querySelector('footer');
    if (footer && !footer.querySelector('.sama-footer-identity')) {
      const label = document.createElement('p'); label.className = 'sama-footer-identity'; footer.prepend(label);
    }
    text(document.querySelector('.sama-footer-identity'), adoption ? 'GarçaPet · Adoção responsável · Secretaria do Meio Ambiente de Garça' : 'Secretaria do Meio Ambiente de Garça · SAMA');
  }
  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; observer.disconnect(); try { apply(); } finally { observer.observe(document.body, { childList: true, subtree: true, characterData: true }); } });
  }
  const observer = new MutationObserver(schedule);
  function start() {
    schedule();
    if (typeof window.__garcapetOnRouteChange === 'function') window.__garcapetOnRouteChange(schedule);
    window.addEventListener('popstate', schedule);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
