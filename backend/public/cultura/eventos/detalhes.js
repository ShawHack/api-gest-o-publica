// Detalhes.js — página de evento/notícia

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizePublicHref(value) {
  let href = String(value || '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(href)) href = `mailto:${href}`;
  else if (/^www\./i.test(href)) href = `https://${href}`;
  return /^(https?:\/\/|mailto:|tel:)/i.test(href) ? href : '';
}

function linkifyText(text) {
  const source = String(text || '');
  const matcher = /(?:https?:\/\/|www\.)[^\s<]+|[^\s@]+@[^\s@]+\.[^\s@]+/gi;
  let html = '';
  let lastIndex = 0;
  let match;

  while ((match = matcher.exec(source)) !== null) {
    let visible = match[0];
    let trailing = '';
    while (/[.,;:!?)\]]$/.test(visible)) {
      trailing = visible.slice(-1) + trailing;
      visible = visible.slice(0, -1);
    }

    const href = normalizePublicHref(visible);
    html += escapeHtml(source.slice(lastIndex, match.index));
    html += href
      ? `<a class="inline-event-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(visible)}</a>${escapeHtml(trailing)}`
      : escapeHtml(match[0]);
    lastIndex = match.index + match[0].length;
  }

  return html + escapeHtml(source.slice(lastIndex));
}

function initCoverImage(img) {
  const frame = img.closest('.event-cover-square');
  if (!frame) return;

  const applyFit = () => {
    if (!img.naturalWidth) return;
    const ratio = img.naturalWidth / img.naturalHeight;
    frame.classList.remove('cover-wide', 'cover-tall');
    if (ratio > 1.25) frame.classList.add('cover-wide');
    else if (ratio < 0.85) frame.classList.add('cover-tall');
  };

  if (img.complete) applyFit();
  else img.addEventListener('load', applyFit, { once: true });
}

function initLightbox(root) {
  const items = Array.from(root.querySelectorAll('.gallery-item img'));
  if (!items.length) return;

  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Visualização da imagem');
  overlay.innerHTML = `
    <button type="button" class="lightbox-close" aria-label="Fechar imagem">
      <i data-lucide="x"></i>
    </button>
    <button type="button" class="lightbox-nav prev" aria-label="Imagem anterior">
      <i data-lucide="chevron-left"></i>
    </button>
    <figure class="lightbox-figure">
      <img src="" alt="Foto do evento ampliada">
    </figure>
    <button type="button" class="lightbox-nav next" aria-label="Próxima imagem">
      <i data-lucide="chevron-right"></i>
    </button>
    <span class="lightbox-counter"></span>`;
  document.body.appendChild(overlay);

  const picture = overlay.querySelector('.lightbox-figure img');
  const counter = overlay.querySelector('.lightbox-counter');
  const navButtons = overlay.querySelectorAll('.lightbox-nav');
  let current = 0;
  let lastFocused = null;

  const single = items.length < 2;
  navButtons.forEach((btn) => { btn.hidden = single; });
  counter.hidden = single;

  function show(index) {
    current = (index + items.length) % items.length;
    picture.src = items[current].currentSrc || items[current].src;
    counter.textContent = `${current + 1} / ${items.length}`;
  }

  function open(index, trigger) {
    lastFocused = trigger || null;
    show(index);
    overlay.classList.add('is-open');
    document.body.classList.add('lightbox-open');
    overlay.querySelector('.lightbox-close').focus();
  }

  function close() {
    overlay.classList.remove('is-open');
    document.body.classList.remove('lightbox-open');
    picture.src = '';
    if (lastFocused) lastFocused.focus();
  }

  items.forEach((img, index) => {
    const frame = img.closest('.gallery-item');
    if (!frame) return;
    frame.tabIndex = 0;
    frame.setAttribute('role', 'button');
    frame.setAttribute('aria-label', 'Ampliar imagem');
    frame.addEventListener('click', () => open(index, frame));
    frame.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(index, frame);
      }
    });
  });

  overlay.querySelector('.lightbox-close').addEventListener('click', close);
  overlay.querySelector('.lightbox-nav.prev').addEventListener('click', () => show(current - 1));
  overlay.querySelector('.lightbox-nav.next').addEventListener('click', () => show(current + 1));
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  document.addEventListener('keydown', (event) => {
    if (!overlay.classList.contains('is-open')) return;
    if (event.key === 'Escape') close();
    else if (!single && event.key === 'ArrowLeft') show(current - 1);
    else if (!single && event.key === 'ArrowRight') show(current + 1);
  });
}

function initGalleryImages(root) {
  root.querySelectorAll('.gallery-item img').forEach((img) => {
    img.addEventListener('load', () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      img.style.objectFit = ratio > 1.35 || ratio < 0.75 ? 'contain' : 'cover';
    }, { once: true });
    if (img.complete) img.dispatchEvent(new Event('load'));
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  const mainContainer = document.getElementById('detalhes-main');

  if (!eventId) {
    mainContainer.innerHTML = `
      <div class="detalhes-error">
        <h2>Evento não encontrado</h2>
        <a href="eventos.html">Voltar para a agenda</a>
      </div>`;
    return;
  }

  try {
    let categories = [];
    try {
      const catRes = await fetch('/api/categories');
      categories = await catRes.json();
    } catch (e) {
      console.error('Categorias:', e);
    }

    const res = await fetch(`/api/posts/${eventId}`);
    if (!res.ok) {
      mainContainer.innerHTML = `
        <div class="detalhes-error">
          <h2>Evento não encontrado ou indisponível</h2>
          <a href="eventos.html">Voltar para a agenda</a>
        </div>`;
      return;
    }

    const post = await res.json();

    let heroImg = '';
    if (post.bannerUrl) {
      heroImg = post.bannerUrl.startsWith('http') ? post.bannerUrl : post.bannerUrl;
    } else if (post.imagensUrl && post.imagensUrl.length > 0) {
      const pImg = post.imagensUrl[0];
      heroImg = pImg.startsWith('http') ? pImg : pImg;
    } else {
      heroImg = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    }

    let galleryHTML = '';
    if (post.imagensUrl && post.imagensUrl.length > 0) {
      const items = post.imagensUrl.map((img) => {
        const src = img.startsWith('http') ? img : img;
        return `
          <figure class="gallery-item">
            <img src="${escapeHtml(src)}" alt="Foto do evento" loading="lazy">
          </figure>`;
      }).join('');

      galleryHTML = `
        <section class="gallery-section">
          <h2>Galeria</h2>
          <div class="gallery-grid">${items}</div>
        </section>`;
    }

    let catColor = '#64748b';
    const foundCat = categories.find((c) => c.nome === post.tipo);
    if (foundCat && foundCat.cor) catColor = foundCat.cor;

    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    let sessionsHTML = '<p class="agendamento-empty">Nenhuma sessão agendada no momento.</p>';
    if (post.datasHorarios && post.datasHorarios.length > 0) {
      sessionsHTML = '<div class="session-list">';
      post.datasHorarios.forEach((sess) => {
        const parts = (sess.data || '').split('-');
        let d = '—';
        let m = '—';
        let weekday = '';
        let fullDate = sess.data || 'Data a definir';

        if (parts.length === 3) {
          d = parts[2];
          m = meses[parseInt(parts[1], 10) - 1] || '—';
          fullDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
          const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          if (!Number.isNaN(dateObj.getTime())) {
            weekday = diasSemana[dateObj.getDay()];
          }
        }

        sessionsHTML += `
          <div class="session-chip">
            <div class="session-date">
              <span class="session-day">${escapeHtml(d)}</span>
              <span class="session-month">${escapeHtml(m)}</span>
            </div>
            <div class="session-info">
              <div class="session-detail">
                <span class="session-detail-label">Data do evento</span>
                <strong>${escapeHtml(fullDate)}</strong>
              </div>
              <div class="session-detail">
                <span class="session-detail-label">Dia da semana</span>
                <strong>${escapeHtml(weekday || 'A definir')}</strong>
              </div>
              <div class="session-detail">
                <span class="session-detail-label">Horário de início</span>
                <strong>${escapeHtml(sess.horario || 'A definir')}</strong>
              </div>
              <div class="session-detail">
                <span class="session-detail-label">Horário de término</span>
                <strong>${escapeHtml(sess.horarioFim || 'Não informado')}</strong>
              </div>
            </div>
          </div>`;
      });
      sessionsHTML += '</div>';
    }

    let linksHTML = '';
    if (Array.isArray(post.links) && post.links.length > 0) {
      const linkItems = post.links.map((link) => {
        const href = normalizePublicHref(link.url);
        if (!href) return '';
        const fallbackLabel = href.startsWith('mailto:')
          ? 'Enviar e-mail'
          : href.startsWith('tel:')
            ? 'Ligar'
            : 'Acessar link';
        return `
          <a class="event-link-button" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">
            <i data-lucide="external-link"></i>
            <span>${escapeHtml(link.label || fallbackLabel)}</span>
          </a>`;
      }).join('');

      if (linkItems) {
        linksHTML = `
          <div class="event-links-block">
            <div class="event-links-head">
              <i data-lucide="link-2"></i>
              <h2>Links úteis</h2>
            </div>
            <div class="event-links-list">${linkItems}</div>
          </div>`;
      }
    }

    const formattedDesc = (post.descricao || '')
      .split('\n')
      .map((p) => (p.trim() ? `<p>${linkifyText(p.trim())}</p>` : ''))
      .join('');

    const titleColor = (post.corTituloCapa === '#ffffff' || !post.corTituloCapa)
      ? '#ea580c'
      : post.corTituloCapa;

    mainContainer.innerHTML = `
      <article class="detalhes-page">
        <header class="detalhes-hero">
          <div class="detalhes-hero-grid">
            <div class="event-cover-square">
              <img src="${escapeHtml(heroImg)}" alt="${escapeHtml(post.titulo)}" class="event-cover-img" decoding="async">
            </div>
            <div class="event-header">
              <span class="event-badge" style="background-color:${catColor}22;color:${catColor};border:1px solid ${catColor}55;">
                ${escapeHtml(post.tipo)}
              </span>
              <h1 class="event-title" style="color:${escapeHtml(titleColor)};">${escapeHtml(post.titulo)}</h1>
            </div>
          </div>
        </header>

        <div class="detalhes-body">
          <div class="event-main-column">
            <div class="event-description">
              ${formattedDesc || '<p>Sem descrição disponível.</p>'}
            </div>

            ${linksHTML}

            <section class="agendamento-panel">
              <div class="agendamento-head">
                <i data-lucide="calendar-check"></i>
                <h2>Agendamento</h2>
              </div>
              ${sessionsHTML}
            </section>
          </div>
        </div>

        ${galleryHTML}
      </article>`;

    initCoverImage(mainContainer.querySelector('.event-cover-img'));
    initGalleryImages(mainContainer);
    initLightbox(mainContainer);

    if (window.lucide) lucide.createIcons();
  } catch (error) {
    console.error(error);
    mainContainer.innerHTML = `
      <div class="detalhes-error">
        <h2>Erro de conexão</h2>
        <p>Falha ao conectar com o servidor.</p>
        <a href="eventos.html">Voltar para a agenda</a>
      </div>`;
  }
});
