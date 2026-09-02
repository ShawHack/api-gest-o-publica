/**
 * Módulo Universal de Acessibilidade - Prefeitura Municipal de Garça (SECULT)
 * Conformidade com eMAG, WCAG 2.1 e Lei Brasileira de Inclusão
 */

(function () {
  'use strict';

  // 1. Injetar CSS de Acessibilidade se não carregado
  if (!document.getElementById('a11y-css')) {
    const link = document.createElement('link');
    link.id = 'a11y-css';
    link.rel = 'stylesheet';
    link.href = '/cultura/acessibilidade.css';
    document.head.appendChild(link);
  }

  // 2. Injetar VLibras oficial se não presente
  if (!document.querySelector('[vw]')) {
    const vlibrasHtml = `
      <div vw class="enabled">
        <div vw-access-button class="active"></div>
        <div vw-plugin-wrapper>
          <div class="vw-plugin-top-wrapper"></div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', vlibrasHtml);

    if (!window.VLibras) {
      const script = document.createElement('script');
      script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
      script.onload = () => {
        if (window.VLibras) new window.VLibras.Widget('https://vlibras.gov.br/app');
      };
      document.body.appendChild(script);
    }
  }

  // 3. Injetar Skip Links (Navegação Rápida por Teclado eMAG)
  const skipLinks = `
    <a href="#conteudo-principal" class="skip-link">Ir para o Conteúdo [Alt + 1]</a>
    <a href="#menu-principal" class="skip-link">Ir para o Menu [Alt + 2]</a>
    <a href="#rodape-principal" class="skip-link">Ir para o Rodapé [Alt + 3]</a>
  `;
  document.body.insertAdjacentHTML('afterbegin', skipLinks);

  // 4. Injetar Guia de Leitura
  const guide = document.createElement('div');
  guide.id = 'a11y-reading-guide';
  document.body.appendChild(guide);

  window.addEventListener('mousemove', (e) => {
    guide.style.top = `${e.clientY - 12}px`;
  });

  // 5. Injetar Painel e Botão Flutuante de Acessibilidade
  const widgetHtml = `
    <button id="accessibility-trigger" aria-label="Abrir Menu de Acessibilidade (Atalho Alt + 4)" title="Acessibilidade [Alt + 4]">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/>
      </svg>
    </button>

    <div id="accessibility-modal" role="dialog" aria-modal="true" aria-label="Opções de Acessibilidade">
      <div class="a11y-header">
        <span>♿ Acessibilidade</span>
        <button id="a11y-close" aria-label="Fechar">&times;</button>
      </div>
      <div class="a11y-body">
        <div>
          <div class="a11y-section-title">Tamanho da Fonte</div>
          <div class="a11y-btn-group">
            <button class="a11y-btn" id="a11y-font-dec" title="Diminuir fonte">A -</button>
            <button class="a11y-btn" id="a11y-font-res" title="Fonte normal">100%</button>
            <button class="a11y-btn" id="a11y-font-inc" title="Aumentar fonte">A +</button>
          </div>
        </div>

        <div>
          <div class="a11y-section-title">Contraste & Cores</div>
          <div class="a11y-btn-group-2">
            <button class="a11y-btn" id="a11y-contrast">🌓 Alto Contraste</button>
            <button class="a11y-btn" id="a11y-monochrome">🏁 Preto & Branco</button>
          </div>
        </div>

        <div>
          <div class="a11y-section-title">Leitura & Navegação</div>
          <div class="a11y-btn-group-2">
            <button class="a11y-btn" id="a11y-speech">🔊 Ouvir Página</button>
            <button class="a11y-btn" id="a11y-guide">📏 Guia de Leitura</button>
            <button class="a11y-btn" id="a11y-links">🔗 Destacar Links</button>
            <button class="a11y-btn" id="a11y-dyslexic">📖 Dislexia</button>
            <button class="a11y-btn" id="a11y-spacing">↔️ Espaçamento</button>
            <button class="a11y-btn" id="a11y-cursor">👆 Cursor Grande</button>
          </div>
        </div>
      </div>
      <div class="a11y-footer">
        <button class="a11y-reset-btn" id="a11y-reset-all">Restaurar Padrão</button>
        <span style="color: #9ca3af; font-size: 11px;">SECULT Garça</span>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', widgetHtml);

  // 6. Estado e Lógica
  const state = {
    fontSize: 100,
    contrast: false,
    monochrome: false,
    links: false,
    dyslexic: false,
    spacing: false,
    cursor: false,
    guide: false,
  };

  // Carregar preferências salvas
  try {
    const saved = localStorage.getItem('garca_a11y_prefs');
    if (saved) Object.assign(state, JSON.parse(saved));
  } catch (_e) {}

  function applyState() {
    document.documentElement.style.fontSize = `${state.fontSize}%`;
    document.documentElement.classList.toggle('a11y-high-contrast', state.contrast);
    document.documentElement.classList.toggle('a11y-monochrome', state.monochrome);
    document.documentElement.classList.toggle('a11y-highlight-links', state.links);
    document.documentElement.classList.toggle('a11y-dyslexic', state.dyslexic);
    document.documentElement.classList.toggle('a11y-spacing', state.spacing);
    document.documentElement.classList.toggle('a11y-large-cursor', state.cursor);
    document.documentElement.classList.toggle('a11y-guide-active', state.guide);

    // Atualizar botões ativos
    document.getElementById('a11y-contrast')?.classList.toggle('active', state.contrast);
    document.getElementById('a11y-monochrome')?.classList.toggle('active', state.monochrome);
    document.getElementById('a11y-links')?.classList.toggle('active', state.links);
    document.getElementById('a11y-dyslexic')?.classList.toggle('active', state.dyslexic);
    document.getElementById('a11y-spacing')?.classList.toggle('active', state.spacing);
    document.getElementById('a11y-cursor')?.classList.toggle('active', state.cursor);
    document.getElementById('a11y-guide')?.classList.toggle('active', state.guide);

    const fontRes = document.getElementById('a11y-font-res');
    if (fontRes) fontRes.textContent = `${state.fontSize}%`;

    try {
      localStorage.setItem('garca_a11y_prefs', JSON.stringify(state));
    } catch (_e) {}
  }

  // Eventos do Modal
  const modal = document.getElementById('accessibility-modal');
  const trigger = document.getElementById('accessibility-trigger');
  const closeBtn = document.getElementById('a11y-close');

  function toggleModal() {
    modal.classList.toggle('open');
    if (modal.classList.contains('open')) {
      closeBtn.focus();
    } else {
      trigger.focus();
    }
  }

  trigger.addEventListener('click', toggleModal);
  closeBtn.addEventListener('click', () => modal.classList.remove('open'));

  // Botões de Ação
  document.getElementById('a11y-font-inc')?.addEventListener('click', () => {
    if (state.fontSize < 160) {
      state.fontSize += 10;
      applyState();
    }
  });
  document.getElementById('a11y-font-dec')?.addEventListener('click', () => {
    if (state.fontSize > 80) {
      state.fontSize -= 10;
      applyState();
    }
  });
  document.getElementById('a11y-font-res')?.addEventListener('click', () => {
    state.fontSize = 100;
    applyState();
  });

  document.getElementById('a11y-contrast')?.addEventListener('click', () => {
    state.contrast = !state.contrast;
    if (state.contrast) state.monochrome = false;
    applyState();
  });
  document.getElementById('a11y-monochrome')?.addEventListener('click', () => {
    state.monochrome = !state.monochrome;
    if (state.monochrome) state.contrast = false;
    applyState();
  });
  document.getElementById('a11y-links')?.addEventListener('click', () => {
    state.links = !state.links;
    applyState();
  });
  document.getElementById('a11y-dyslexic')?.addEventListener('click', () => {
    state.dyslexic = !state.dyslexic;
    applyState();
  });
  document.getElementById('a11y-spacing')?.addEventListener('click', () => {
    state.spacing = !state.spacing;
    applyState();
  });
  document.getElementById('a11y-cursor')?.addEventListener('click', () => {
    state.cursor = !state.cursor;
    applyState();
  });
  document.getElementById('a11y-guide')?.addEventListener('click', () => {
    state.guide = !state.guide;
    applyState();
  });

  // Leitor de Texto em Voz Alta (Speech Synthesis em PT-BR)
  let speaking = false;
  document.getElementById('a11y-speech')?.addEventListener('click', () => {
    if (!('speechSynthesis' in window)) {
      alert('Seu navegador não suporta leitura de tela por voz.');
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      speaking = false;
      document.getElementById('a11y-speech').classList.remove('active');
      return;
    }

    const selectedText = window.getSelection().toString().trim();
    const textToRead = selectedText || document.body.innerText || 'Página do Portal da Cultura de Garça';

    const utterance = new SpeechSynthesisUtterance(textToRead.slice(0, 3000));
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;

    utterance.onend = () => {
      speaking = false;
      document.getElementById('a11y-speech').classList.remove('active');
    };
    utterance.onerror = () => {
      speaking = false;
      document.getElementById('a11y-speech').classList.remove('active');
    };

    window.speechSynthesis.speak(utterance);
    speaking = true;
    document.getElementById('a11y-speech').classList.add('active');
  });

  // Restaurar Padrão
  document.getElementById('a11y-reset-all')?.addEventListener('click', () => {
    Object.assign(state, {
      fontSize: 100,
      contrast: false,
      monochrome: false,
      links: false,
      dyslexic: false,
      spacing: false,
      cursor: false,
      guide: false,
    });
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    speaking = false;
    document.getElementById('a11y-speech')?.classList.remove('active');
    applyState();
  });

  // Atalhos de Teclado (eMAG)
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === '1') {
      const target = document.getElementById('conteudo-principal') || document.querySelector('main') || document.querySelector('article') || document.body;
      target.scrollIntoView({ behavior: 'smooth' });
      target.focus();
    } else if (e.altKey && e.key === '2') {
      const nav = document.getElementById('menu-principal') || document.querySelector('nav') || document.querySelector('header');
      nav?.scrollIntoView({ behavior: 'smooth' });
      nav?.focus();
    } else if (e.altKey && e.key === '3') {
      const footer = document.getElementById('rodape-principal') || document.querySelector('footer');
      footer?.scrollIntoView({ behavior: 'smooth' });
      footer?.focus();
    } else if (e.altKey && e.key === '4') {
      e.preventDefault();
      toggleModal();
    } else if (e.key === 'Escape' && modal.classList.contains('open')) {
      modal.classList.remove('open');
      trigger.focus();
    }
  });

  // Aplicar estado inicial
  applyState();
})();
