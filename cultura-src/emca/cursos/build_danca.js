const fs = require('fs');

const nav = fs.readFileSync('c:/Users/marjorie.talberg/Desktop/teatro/emca/cursos/nav_template.html', 'utf8');
const footer = fs.readFileSync('c:/Users/marjorie.talberg/Desktop/teatro/emca/cursos/footer_template.html', 'utf8');

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EMCA - Curso de Dança</title>
    <link rel="icon" href="../../logo.jpg" type="image/jpeg">
    <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../emca.css">
    <style>
        /* Slider Styles */
        .slider-container {
            position: relative;
            width: 100%;
            height: 70vh;
            min-height: 500px;
            overflow: hidden;
            background: #000;
        }
        .slide {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            transition: opacity 1s ease-in-out;
            display: flex;
            align-items: center;
            justify-content: flex-start;
        }
        .slide.active {
            opacity: 1;
            z-index: 1;
        }
        .slide-bg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            z-index: 0;
        }
        .slide-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 100%);
            z-index: 1;
        }
        .slide-content {
            position: relative;
            z-index: 2;
            padding: 0 10%;
            color: white;
            max-width: 800px;
            transform: translateY(30px);
            opacity: 0;
            transition: all 1s ease 0.5s;
        }
        .slide.active .slide-content {
            transform: translateY(0);
            opacity: 1;
        }
        .slide-title {
            font-size: clamp(2.5rem, 5vw, 4.5rem);
            font-weight: 700;
            margin-bottom: 20px;
            font-family: 'Rubik', sans-serif;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .slide-text {
            font-size: clamp(1.1rem, 2vw, 1.4rem);
            font-weight: 300;
            line-height: 1.6;
        }
        
        /* Slider Controls */
        .slider-controls {
            position: absolute;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10;
            display: flex;
            gap: 15px;
        }
        .slider-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: rgba(255,255,255,0.5);
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .slider-dot.active {
            background: #ff716e;
            transform: scale(1.3);
        }

        /* Responsive Banner Images */
        @media (max-width: 768px) {
            .slide-bg { object-position: center; }
            .slide-overlay { background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%); }
            .slide-content { padding: 0 5%; text-align: center; }
        }

        /* Sections Styles */
        .dance-section {
            padding: 100px 0;
            background-color: #fff;
            position: relative;
            overflow: hidden;
        }
        .jazz-section {
            background-color: #fff6f6;
        }
        .minimalist-container {
            display: flex;
            align-items: center;
            gap: 60px;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        .minimalist-text { flex: 1; }
        .minimalist-tag {
            color: #ff716e;
            font-size: 0.9rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 3px;
            margin-bottom: 15px;
            display: inline-block;
        }
        .minimalist-title {
            font-size: 3rem;
            color: #333;
            margin-bottom: 30px;
            font-weight: 700;
        }
        .minimalist-desc {
            font-size: 1.15rem;
            line-height: 1.8;
            color: #666;
            margin-bottom: 25px;
        }
        
        /* Overlapping Images */
        .overlapping-images {
            position: relative;
            flex: 1;
            height: 450px;
            min-width: 300px;
        }
        .img-back, .img-front {
            position: absolute;
            border-radius: 15px;
            box-shadow: 0 15px 40px rgba(0,0,0,0.15);
            object-fit: cover;
        }
        .img-back {
            width: 65%;
            height: 350px;
            top: 0;
            right: 0;
            z-index: 1;
        }
        .img-front {
            width: 60%;
            height: 300px;
            bottom: 0;
            left: 0;
            z-index: 2;
            border: 10px solid #fff;
        }

        /* Gallery */
        .gallery-section {
            padding: 80px 0;
            background-color: #f9f9f9;
        }
        .gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        .gallery-item {
            position: relative;
            height: 300px;
            border-radius: 10px;
            overflow: hidden;
        }
        .gallery-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.5s ease;
        }
        .gallery-item:hover img {
            transform: scale(1.1);
        }

        @media (max-width: 768px) {
            .minimalist-container { flex-direction: column !important; }
            .overlapping-images { height: 350px; width: 100%; }
            .img-back { width: 70%; height: 250px; }
            .img-front { width: 65%; height: 200px; }
            .minimalist-title { font-size: 2.2rem; }
        }
        
        /* Pink dots */
        .pink-dot {
            position: absolute;
            background-color: #a02e2e;
            border-radius: 50%;
            z-index: 5;
        }
        .dot-1 { width: 12px; height: 12px; top: 20%; left: 10%; }
        .dot-2 { width: 8px; height: 8px; top: 60%; right: 15%; }
        .dot-3 { width: 15px; height: 15px; bottom: 10%; left: 20%; }
    </style>
</head>
<body>

${nav}

<!-- Slider Banner Section -->
<div class="slider-container">
    <!-- Slide 1 -->
    <div class="slide active">
        <picture>
            <source media="(max-width: 768px)" srcset="../imagesemca/Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20(Ballet)/bannerballet01celular.png">
            <img src="../imagesemca/Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20(Ballet)/bannerballet01.png" alt="Ballet Banner 1" class="slide-bg">
        </picture>
        <div class="slide-overlay"></div>
        <div class="slide-content">
            <h1 class="slide-title">A Arte do Movimento</h1>
            <p class="slide-text">Descubra a elegância, a disciplina e a magia da dança. Na EMCA, cada passo é uma forma de expressar sua alma.</p>
        </div>
    </div>

    <!-- Slide 2 -->
    <div class="slide">
        <picture>
            <source media="(max-width: 768px)" srcset="../imagesemca/Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20(Ballet)/bannerballet02celular.png">
            <img src="../imagesemca/Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20(Ballet)/bannerballet02.png" alt="Ballet Banner 2" class="slide-bg">
        </picture>
        <div class="slide-overlay"></div>
        <div class="slide-content">
            <h1 class="slide-title">Paixão e Técnica</h1>
            <p class="slide-text">Professores dedicados e uma estrutura completa para você desenvolver todo o seu potencial artístico no palco.</p>
        </div>
    </div>

    <!-- Slide 3 -->
    <div class="slide">
        <picture>
            <source media="(max-width: 768px)" srcset="../imagesemca/Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20(Ballet)/bannerballet03celular.png">
            <img src="../imagesemca/Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20(Ballet)/bannerballet03.png" alt="Ballet Banner 3" class="slide-bg">
        </picture>
        <div class="slide-overlay"></div>
        <div class="slide-content">
            <h1 class="slide-title">Brilhe no Palco</h1>
            <p class="slide-text">Participe de grandes espetáculos e viva a emoção de se apresentar com nossa equipe de excelência.</p>
        </div>
    </div>

    <!-- Controls -->
    <div class="slider-controls">
        <div class="slider-dot active" onclick="goToSlide(0)"></div>
        <div class="slider-dot" onclick="goToSlide(1)"></div>
        <div class="slider-dot" onclick="goToSlide(2)"></div>
    </div>
</div>

<!-- Ballet Section -->
<section class="dance-section">
    <div class="pink-dot dot-1"></div>
    <div class="pink-dot dot-2"></div>
    
    <div class="minimalist-container">
        <div class="minimalist-text">
            <span class="minimalist-tag">O que é a Dança?</span>
            <h2 class="minimalist-title">Ballet Clássico</h2>
            <p class="minimalist-desc">O Ballet é a base de todas as danças, desenvolvendo postura, flexibilidade e musicalidade. Na EMCA, ensinamos muito mais do que passos e coreografias.</p>
            <p class="minimalist-desc">Nosso objetivo é moldar artistas completos, extremamente confiantes e criativos, capazes de arrancar sorrisos e suspiros do público nos palcos.</p>
        </div>
        <div class="overlapping-images">
            <img src="../imagesemca/Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20(Ballet)/R6II7466.jpg" alt="Ballet 1" class="img-back">
            <img src="../imagesemca/Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20(Ballet)/R6II7522.jpg" alt="Ballet 2" class="img-front">
        </div>
    </div>
</section>

<!-- Jazz Section -->
<section class="dance-section jazz-section">
    <div class="pink-dot dot-3"></div>
    
    <div class="minimalist-container" style="flex-direction: row-reverse;">
        <div class="minimalist-text">
            <span class="minimalist-tag">A Beleza da Expressão</span>
            <h2 class="minimalist-title">Jazz e Contemporâneo</h2>
            <p class="minimalist-desc">Desenvolva ritmo e expressão artística com nossos cursos mais encantadores. Aprenda jazz e dança contemporânea em um ambiente acolhedor e inspirador.</p>
            <p class="minimalist-desc">Seja você um iniciante ou alguém com experiência, nosso curso é desenhado para ajudar a descobrir a paixão pela dança.</p>
        </div>
        <div class="overlapping-images">
            <img src="../imagesemca/Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20(Ballet)/jazz1.jpg" alt="Jazz 1" class="img-back">
            <img src="../imagesemca/Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20(Ballet)/jazz2.jpg" alt="Jazz 2" class="img-front">
        </div>
    </div>
</section>

<!-- Gallery Section -->
<section class="gallery-section">
    <div style="text-align: center; margin-bottom: 50px;">
        <span class="minimalist-tag">Nossos Momentos</span>
        <h2 class="minimalist-title">Galeria de Apresentações</h2>
    </div>
    <div class="gallery-grid">
        <div class="gallery-item"><img src="../imagesemca/Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20(Ballet)/R6II7394.jpg" alt="Gallery"></div>
        <div class="gallery-item"><img src="../imagesemca/Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20(Ballet)/R6II7449.jpg" alt="Gallery"></div>
        <div class="gallery-item"><img src="../imagesemca/Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20(Ballet)/R6II7675.jpg" alt="Gallery"></div>
        <div class="gallery-item"><img src="../imagesemca/Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20(Ballet)/R6II7834.jpg" alt="Gallery"></div>
        <div class="gallery-item"><img src="../imagesemca/Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20(Ballet)/R6II7857.jpg" alt="Gallery"></div>
        <div class="gallery-item"><img src="../imagesemca/Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20(Ballet)/R6II7940.jpg" alt="Gallery"></div>
        <div class="gallery-item"><img src="../imagesemca/Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20(Ballet)/R6II7964.jpg" alt="Gallery"></div>
        <div class="gallery-item"><img src="../imagesemca/Alice%20no%20Pa%C3%ADs%20das%20Maravilhas%20(Ballet)/R6II7988.jpg" alt="Gallery"></div>
    </div>
</section>

${footer}

<script>
    lucide.createIcons();

    // Menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Slider functionality
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.slider-dot');
    let slideInterval;

    function goToSlide(index) {
        slides[currentSlide].classList.remove('active');
        dots[currentSlide].classList.remove('active');
        
        currentSlide = index;
        
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
        
        resetInterval();
    }

    function nextSlide() {
        let next = (currentSlide + 1) % slides.length;
        goToSlide(next);
    }

    function resetInterval() {
        clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
    }

    // Start auto-slide
    if(slides.length > 0) {
        resetInterval();
    }
</script>
</body>
</html>`;

fs.writeFileSync('c:/Users/marjorie.talberg/Desktop/teatro/emca/cursos/danca.html', html, 'utf8');
console.log('Successfully created danca.html');
