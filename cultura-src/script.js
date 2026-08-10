let currentLink = '';

function toggleMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) {
        mobileMenu.classList.toggle('open');
    }
}

function abrir(titulo, descricao, link) {
    const modal = document.getElementById('modal');
    const tituloEl = document.getElementById('titulo');
    const descricaoEl = document.getElementById('descricao');
    const actionBtn = document.querySelector('.action-btn');
    
    if (tituloEl) tituloEl.innerText = titulo;
    if (descricaoEl) descricaoEl.innerText = descricao;
    
    if (actionBtn) {
        if (link) {
            currentLink = link;
            actionBtn.innerText = 'Acessar ' + titulo;
            actionBtn.onclick = function() {
                window.location.href = currentLink;
            };
        } else {
            actionBtn.innerText = 'Entendido';
            actionBtn.onclick = fechar;
        }
    }
    
    if (modal) {
        modal.classList.add('active');
        // Adiciona um listener para fechar se clicar fora do conteúdo
        modal.onclick = function(e) {
            if (e.target === modal) {
                fechar();
            }
        };
    }
}

function fechar() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Scroll Progress Bar
document.addEventListener('scroll', function() {
    const scrollProgress = document.querySelector('.scroll-progress');
    if (scrollProgress) {
        const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        scrollProgress.style.width = scrolled + '%';
    }
});
