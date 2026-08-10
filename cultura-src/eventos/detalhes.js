// Detalhes.js - Lógica para a Página de Evento Imersiva

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');

  const mainContainer = document.getElementById('detalhes-main');

  if (!eventId) {
    mainContainer.innerHTML = '<div style="padding:100px; text-align:center;"><h2>Evento não encontrado</h2><a href="eventos.html">Voltar para a agenda</a></div>';
    return;
  }

  try {
    // 1. Fetch Categories
    let categories = [];
    try {
      const catRes = await fetch('http://localhost:3000/api/categories');
      categories = await catRes.json();
    } catch(e) { console.error('Categorias:', e); }

    // 2. Fetch the specific Post
    const res = await fetch(`http://localhost:3000/api/posts/${eventId}`);
    
    if (!res.ok) {
      mainContainer.innerHTML = '<div style="padding:100px; text-align:center;"><h2>Evento não encontrado ou indisponível</h2><a href="eventos.html">Voltar para a agenda</a></div>';
      return;
    }

    const post = await res.json();

    // 3. Process Data
    // Capa (Hero Image)
    let heroImg = '';
    let galleryHTML = '';
    
    // 1. Tenta usar o banner (Capa Especial)
    if (post.bannerUrl) {
      heroImg = post.bannerUrl.startsWith('http') ? post.bannerUrl : `http://localhost:3000${post.bannerUrl}`;
    } 
    // 2. Se não tiver banner, tenta usar a primeira imagem da galeria
    else if (post.imagensUrl && post.imagensUrl.length > 0) {
      const pImg = post.imagensUrl[0];
      heroImg = pImg.startsWith('http') ? pImg : `http://localhost:3000${pImg}`;
    } 
    // 3. Fallback
    else {
      heroImg = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80';
    }

    // Galeria / Carrossel
    if (post.imagensUrl && post.imagensUrl.length > 0) {
      galleryHTML = `
        <section class="gallery-section" style="padding: 60px 5%; max-width: 1400px; margin: 0 auto;">
          <h2 style="font-family:'Rubik', sans-serif; font-size: 2.2rem; color: #1e293b; margin-bottom: 30px; text-align: center; font-weight: 700;">Galeria do Evento</h2>
          <div style="position: relative; display: flex; align-items: center;">
            <button onclick="this.nextElementSibling.scrollBy({left: -370, behavior: 'smooth'})" style="position: absolute; left: -25px; z-index: 10; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 50%; width: 50px; height: 50px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; color: #ea580c; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i data-lucide="chevron-left"></i></button>
            <div class="carousel-container" style="display: flex; overflow-x: auto; gap: 20px; padding: 20px 0; scroll-snap-type: x mandatory; scroll-behavior: smooth; width: 100%; -ms-overflow-style: none; scrollbar-width: none;">
      `;
      post.imagensUrl.forEach(img => {
        const absoluteImg = img.startsWith('http') ? img : `http://localhost:3000${img}`;
        galleryHTML += `
          <div class="carousel-item" style="min-width: 350px; height: 250px; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.1); scroll-snap-align: center; flex-shrink: 0; cursor: pointer;">
            <img src="${absoluteImg}" alt="Foto da Galeria" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease;" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">
          </div>
        `;
      });
      galleryHTML += `
            </div>
            <button onclick="this.previousElementSibling.scrollBy({left: 370, behavior: 'smooth'})" style="position: absolute; right: -25px; z-index: 10; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 50%; width: 50px; height: 50px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; color: #ea580c; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i data-lucide="chevron-right"></i></button>
          </div>
          <style>
            .carousel-container::-webkit-scrollbar { display: none; }
          </style>
        </section>
      `;
    }

    // Cor da Categoria
    let catColor = '#64748b';
    const foundCat = categories.find(c => c.nome === post.tipo);
    if(foundCat && foundCat.cor) catColor = foundCat.cor;

    // Sessões
    let sessionsHTML = '<p style="color:#64748b;">Nenhuma sessão específica agendada.</p>';
    if (post.datasHorarios && post.datasHorarios.length > 0) {
      sessionsHTML = '';
      post.datasHorarios.forEach(sess => {
        // Tenta parsear a data para o design do box
        const parts = sess.data.split('-');
        let d='00', m='Mês';
        if(parts.length === 3) {
          d = parts[2];
          const meses = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
          m = meses[parseInt(parts[1])-1] || 'MÊS';
        } else {
          d = sess.data.substring(0,2);
        }

        sessionsHTML += `
          <div class="session-item">
            <div class="date-box">
              <span class="d">${d}</span>
              <span class="m">${m}</span>
            </div>
            <div class="time"><i data-lucide="clock" style="width:14px; height:14px; margin-right:5px; color:#ea580c;"></i>${sess.horario}</div>
          </div>
        `;
      });
    }

    // Quebras de linha na descrição transformadas em parágrafos
    const formattedDesc = post.descricao
      .split('\n')
      .map(p => p.trim() ? `<p>${p.trim()}</p>` : '')
      .join('');

    // 4. Render Layout
    const html = `
      <section class="hero-detalhes">
        <img src="${heroImg}" alt="Capa" class="hero-bg">
        <div class="hero-overlay"></div>
      </section>

      <div class="content-wrapper-single">
        <div class="main-text">
          <span class="hero-badge" style="background-color:${catColor}40; color:${catColor}; border:1px solid ${catColor};">${post.tipo}</span>
          <h1 class="page-title" style="color: ${(post.corTituloCapa === '#ffffff' || !post.corTituloCapa) ? '#ea580c' : post.corTituloCapa};">${post.titulo}</h1>
          
          <div class="descricao-com-linha">
            ${formattedDesc}
          </div>

          <div class="bottom-sessions">
            <div class="sessions-card">
              <h3><i data-lucide="calendar-check"></i> Agendamento</h3>
              ${sessionsHTML}
            </div>
          </div>
        </div>
      </div>

      ${galleryHTML}
    `;

    mainContainer.innerHTML = html;
    
    // Injetar os ícones lucide
    if (window.lucide) {
      lucide.createIcons();
    }

  } catch (error) {
    console.error(error);
    mainContainer.innerHTML = '<div style="padding:100px; text-align:center; color:red;"><h2>Erro de Conexão</h2><p>Falha ao conectar com o servidor central.</p></div>';
  }
});
