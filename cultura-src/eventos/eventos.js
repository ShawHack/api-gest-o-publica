// Eventos.js - Renderização Dinâmica de Postagens (Eventos/Notícias) - Redesign Premium

async function loadPosts() {
  const grid = document.getElementById('events-grid-container');
  const upcomingContainer = document.getElementById('upcoming-events-container');
  const topNewsContainer = document.getElementById('top-news-container');
  
  if (!grid) return;
  grid.innerHTML = '<p style="text-align: center; color: #64748b; width: 100%;">Carregando informações...</p>';

  try {
    let categories = [];
    try {
      const catRes = await fetch('http://localhost:3000/api/categories');
      categories = await catRes.json();
      
      const categorySelect = document.querySelector('.category-select');
      if (categorySelect && categories.length > 0) {
        categories.forEach(cat => {
          categorySelect.insertAdjacentHTML('beforeend', `<option value="${cat.nome}">${cat.nome}</option>`);
        });
      }
    } catch(e) { console.error('Erro categorias:', e); }

    // 2. Fetch Posts
    const res = await fetch('http://localhost:3000/api/posts');
    let posts = await res.json();
    
    grid.innerHTML = '';
    if (upcomingContainer) upcomingContainer.innerHTML = '';
    if (topNewsContainer) topNewsContainer.innerHTML = '';

    if (posts.length === 0) {
      grid.innerHTML = '<p style="text-align: center; color: #64748b; width: 100%; font-size:1.1rem;">Ainda não há eventos ou notícias publicados.</p>';
      return;
    }

    // Função auxiliar para data de exibição (criação)
    const getCreationDateStr = (dateString) => {
      const dt = new Date(dateString);
      return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace(' de ', ' de ');
    };

    // --- Renderizar Main Grid ---
    posts.forEach(post => {
      let imageHTML = '';
      let imgPath = '';
      if (post.imagensUrl && post.imagensUrl.length > 0) {
        const principalImg = post.imagensUrl[0];
        imgPath = principalImg.startsWith('http') ? principalImg : `http://localhost:3000${principalImg}`;
        imageHTML = `<img src="${imgPath}" alt="${post.titulo}">`;
      } else {
        imageHTML = `<div style="background:#e2e8f0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;"><i data-lucide="image"></i></div>`;
      }

      // Se tiver data do evento, mostrar a primeira data. Senão, data de criação.
      let eventDateStr = getCreationDateStr(post.dataCriacao);
      if (post.datasHorarios && post.datasHorarios.length > 0) {
         eventDateStr = post.datasHorarios[0].data + ' às ' + post.datasHorarios[0].horario;
      }

      let formatoBadges = '';
      let formatoJson = '[]';
      if (post.formato && post.formato.length > 0) {
        formatoJson = JSON.stringify(post.formato);
        post.formato.forEach(f => {
           const fColor = f === 'Evento' ? '#ea580c' : '#0284c7';
           const fBg = f === 'Evento' ? '#ffedd5' : '#e0f2fe';
           formatoBadges += `<span class="event-badge" style="background-color:${fBg}; color:${fColor}; margin-right:5px;">${f}</span>`;
        });
      }

      const cardHTML = `
        <a href="detalhes.html?id=${post._id}" class="event-card" data-category="${post.tipo}" data-formato='${formatoJson}'>
          <div class="event-image">
            ${imageHTML}
          </div>
          <div class="event-content">
            <div style="display:flex; flex-wrap:wrap; margin-bottom:0.5rem;">
               ${formatoBadges}
               <span class="event-badge" style="background-color:#f1f5f9; color:#64748b; border:1px solid #e2e8f0;">${post.tipo}</span>
            </div>
            <h3 class="event-title">${post.titulo}</h3>
            <div class="event-date-row">
              <i data-lucide="clock" style="width:14px;height:14px;"></i> ${eventDateStr}
            </div>
            <p class="event-description">${post.descricao.substring(0, 110)}${post.descricao.length > 110 ? '...' : ''}</p>
            <div class="read-more">Ler mais <i data-lucide="arrow-right" style="width:16px;height:16px;margin-left:4px;"></i></div>
          </div>
        </a>
      `;
      grid.insertAdjacentHTML('beforeend', cardHTML);
    });

      // --- Renderizar Próximos Eventos (Sidebar) ---
      if (upcomingContainer) {
        window.upcomingPosts = posts.filter(p => p.datasHorarios && p.datasHorarios.length > 0);
        
        window.renderUpcomingEvents = function(showAll = false) {
          const container = document.getElementById('upcoming-events-container');
          if (!container) return;
          container.innerHTML = '';
          const postsToRender = showAll ? window.upcomingPosts : window.upcomingPosts.slice(0, 3);
          
          if (postsToRender.length === 0) {
            container.innerHTML = '<p style="color:#64748b; font-size:0.9rem;">Nenhum evento futuro.</p>';
            return;
          }

          postsToRender.forEach(post => {
            let day = "00";
            let monthStr = "MÊS";
            const dateRaw = post.datasHorarios[0].data; 
            const d = new Date(dateRaw);
            if (!isNaN(d.getTime())) {
              day = String(d.getDate()).padStart(2, '0');
              monthStr = d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
            } else if (dateRaw.includes('/')) {
              const parts = dateRaw.split('/');
              day = parts[0];
              const m = parseInt(parts[1]) - 1;
              const dt = new Date(2026, m, 1);
              monthStr = dt.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
            }
            const upHTML = `
              <div class="upcoming-item">
                <div class="upcoming-date">
                  <span class="day">${day}</span>
                  <span class="month">${monthStr}</span>
                </div>
                <div class="upcoming-info">
                  <h4>${post.titulo}</h4>
                  <p><i data-lucide="clock" style="width:12px;height:12px;"></i> ${dateRaw} às ${post.datasHorarios[0].horario}</p>
                </div>
              </div>
            `;
            container.insertAdjacentHTML('beforeend', upHTML);
          });
          if(window.lucide) lucide.createIcons();
        };

        window.showAllUpcomingEvents = function() {
          window.renderUpcomingEvents(true);
          const btn = document.getElementById('btn-show-all-events');
          if (btn) btn.style.display = 'none'; // hide the button since all are shown
        };

        window.renderUpcomingEvents(false);
      }

    // --- Renderizar Mais Lidas (Sidebar) ---
    // Usando os 3 posts mais recentes como "Mais Lidas" por enquanto
    if (topNewsContainer) {
      const topPosts = [...posts].sort((a,b) => new Date(b.dataCriacao) - new Date(a.dataCriacao)).slice(0, 3);
      topPosts.forEach((post, index) => {
        let imgPath = '';
        if (post.imagensUrl && post.imagensUrl.length > 0) {
          imgPath = post.imagensUrl[0].startsWith('http') ? post.imagensUrl[0] : `http://localhost:3000${post.imagensUrl[0]}`;
        } else {
          imgPath = '../logo.jpg'; // fallback
        }

        const topHTML = `
          <div class="top-news-item">
            <span class="top-news-number">${index + 1}</span>
            <a href="detalhes.html?id=${post._id}" class="top-news-text">${post.titulo}</a>
            <img src="${imgPath}" alt="${post.titulo}" class="top-news-thumb">
          </div>
        `;
        topNewsContainer.insertAdjacentHTML('beforeend', topHTML);
      });
    }

    // Inicializa ícones
    if(window.lucide) {
      lucide.createIcons();
    }
    
    // Filtros
    initFilters();

  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    grid.innerHTML = '<p style="text-align: center; color: red; width: 100%;">Erro ao carregar os dados. O servidor pode estar offline.</p>';
  }
}

function initFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const categorySelect = document.querySelector('.category-select');
  const cards = document.querySelectorAll('.event-card');

  const applyFilters = () => {
    const activeBtn = document.querySelector('.filter-btn.active');
    const filterFormato = activeBtn ? activeBtn.getAttribute('data-filter') : 'all';
    const filterCat = categorySelect ? categorySelect.value : '';

    cards.forEach(card => {
      // 1. Check formato
      let matchFormato = false;
      if (filterFormato === 'all') {
        matchFormato = true;
      } else {
        const formatoStr = card.getAttribute('data-formato');
        let formatos = [];
        try { formatos = JSON.parse(formatoStr); } catch(e) {}
        const targetTag = filterFormato === 'Eventos' ? 'Evento' : filterFormato === 'Notícia' || filterFormato === 'Notícias' ? 'Notícia' : filterFormato;
        if (formatos.includes(targetTag)) matchFormato = true;
      }

      // 2. Check categoria
      let matchCat = false;
      const cardCat = card.getAttribute('data-category');
      if (filterCat === '' || filterCat === cardCat) {
        matchCat = true;
      }

      // Combine
      if (matchFormato && matchCat) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  };

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
  });

  if (categorySelect) {
    categorySelect.addEventListener('change', applyFilters);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadPosts();
});
