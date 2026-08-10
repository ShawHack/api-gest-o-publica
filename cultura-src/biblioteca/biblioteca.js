// ========================================================
// Biblioteca Municipal — Lógica Interativa
// ========================================================

// Hamburguer Menu (Mobile)
function toggleMenu() {
  const menu = document.getElementById("mobile-menu");
  const overlay = document.getElementById("menu-overlay");
  if (menu) {
      menu.classList.toggle("open");
      if(overlay) {
          if(menu.classList.contains("open")) {
              overlay.classList.add("active");
          } else {
              overlay.classList.remove("active");
          }
      }
  }
}

// ========================================================
// LIVRO INTERATIVO — Navegação Página por Página
// ========================================================
const totalPages = 6;
let currentPage = 0; // 0 = capa fechada, 1-6 = páginas
let bookIsOpen = false;

const interactiveBook = document.getElementById("interactive-book");
const bookHint = document.getElementById("book-hint");
const bookNav = document.getElementById("book-nav");
const pageIndicator = document.getElementById("page-indicator");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");

// Abre o livro ao clicar na capa
if (interactiveBook) {
  interactiveBook.addEventListener("click", () => {
    if (!bookIsOpen) {
      openBook();
    }
  });
}

function openBook() {
  bookIsOpen = true;
  interactiveBook.classList.add("is-open");
  currentPage = 1;

  // Esconde o hint e mostra navegação após a capa abrir
  setTimeout(() => {
    if (bookHint) bookHint.classList.add("hidden");
    if (bookNav) {
      bookNav.style.display = "flex";
      lucide.createIcons(); // Re-renderiza ícones nos botões
    }
    updateNavState();
  }, 800);
}

function nextPage() {
  if (currentPage >= totalPages) return;

  // Vira a página atual
  const page = document.querySelector(`.page-${currentPage}`);
  if (page) {
    page.classList.add("flipped");
  }

  currentPage++;
  updateNavState();
}

function closeBook() {
  bookIsOpen = false;
  interactiveBook.classList.remove("is-open");
  currentPage = 0;
  
  if (bookNav) bookNav.style.display = "none";
  if (bookHint) bookHint.classList.remove("hidden");
}

function prevPage() {
  if (currentPage === 1) {
    closeBook();
    return;
  }

  currentPage--;

  // Desvira a página atual
  const page = document.querySelector(`.page-${currentPage}`);
  if (page) {
    page.classList.remove("flipped");
  }

  updateNavState();
}

function updateNavState() {
  if (pageIndicator) {
    pageIndicator.textContent = `${currentPage} / ${totalPages}`;
  }

  if (btnPrev) {
    btnPrev.disabled = false;
  }

  if (btnNext) {
    btnNext.disabled = currentPage >= totalPages;
  }
}



// ========================================================
// INICIALIZAÇÃO
// ========================================================
document.addEventListener("DOMContentLoaded", () => {

  // Fecha menu mobile no clique fora
  document.addEventListener("click", (e) => {
    const menu = document.getElementById("mobile-menu");
    const hamburger = document.querySelector(".hamburger");
    if (menu && hamburger && !menu.contains(e.target) && !hamburger.contains(e.target)) {
      menu.classList.remove("open");
    }
  });

  // Highlight links da navegação ao rolar a página (Otimizado com cache de DOM e requestAnimationFrame)
  const sectionElements = ["inicio", "espacos", "servicos", "informacoes"]
    .map(id => ({ id, el: document.getElementById(id) }))
    .filter(item => item.el);
  const navLinks = document.querySelectorAll(".nav-menu .nav-link");
  let isScrolling = false;

  window.addEventListener("scroll", () => {
    if (!isScrolling) {
      window.requestAnimationFrame(() => {
        let current = "";
        const scrollY = window.scrollY;
        
        sectionElements.forEach(item => {
          if (scrollY >= item.el.offsetTop - 120) {
            current = item.id;
          }
        });

        navLinks.forEach(link => {
          link.classList.toggle("active", link.getAttribute("href") === `#${current}`);
        });
        
        isScrolling = false;
      });
      isScrolling = true;
    }
  });

  // Animação de entrada suave nos cards ao entrar na viewport
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
  };

  const fadeInObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        fadeInObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Aplica animação de entrada nos cards e no livro
  document.querySelectorAll(".space-card, .servico-card, .info-item, .stat-item, .hero-book-wrapper, .about-text-content").forEach(el => {
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    fadeInObserver.observe(el);
  });
});

// ========================================================
// CARROSSEL DE JORNADA (CITAÇÕES)
// ========================================================
let currentJourneyIndex = 0;

function updateJourney(index) {
  const journeyItems = document.querySelectorAll('.menu-item');
  const journeySlides = document.querySelectorAll('.carousel-slide');
  const track = document.getElementById('carousel-track');
  
  if (!journeyItems.length || !journeySlides.length || !track) return;
  
  // Remove classes ativas
  journeyItems.forEach(item => item.classList.remove('active'));
  journeySlides.forEach(slide => slide.classList.remove('active'));
  
  // Adiciona classes ativas no índice correto
  currentJourneyIndex = index;
  journeyItems[currentJourneyIndex].classList.add('active');
  journeySlides[currentJourneyIndex].classList.add('active');

  // Move o carrossel (65% de largura + 1.5rem de margem por slide)
  track.style.transform = `translateX(calc(-${index * 65}% - ${index * 1.5}rem))`;
}

function nextJourneySlide() {
  const journeySlides = document.querySelectorAll('.carousel-slide');
  let nextIndex = currentJourneyIndex + 1;
  if (nextIndex >= journeySlides.length) {
    nextIndex = 0;
  }
  updateJourney(nextIndex);
}

// Event Listeners pros itens do menu
document.addEventListener("DOMContentLoaded", () => {
  const journeyItems = document.querySelectorAll('.menu-item');
  if (journeyItems) {
    journeyItems.forEach((item, index) => {
      item.addEventListener('click', () => {
        updateJourney(index);
      });
    });
  }
});

// Botão Voltar ao Topo
document.addEventListener('DOMContentLoaded', () => {
  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        backToTopBtn.classList.add('show');
      } else {
        backToTopBtn.classList.remove('show');
      }
    });
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
});

