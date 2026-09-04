const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'teatro.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. UPDATE CSS
const newCss = `
        /* New Styles for Teatro (Theater Theme) */
        :root {
            --teatro-primary: #a02e2e; /* Cortina Red */
            --teatro-accent: #f1c40f; /* Gold */
            --teatro-dark: #111111; /* Pitch Black */
            --teatro-dark-alt: #1a1a1a;
            --teatro-light: #f8fafc;
            --text-inverse: #ffffff;
            --text-gold: #f8e178;
        }

        body {
            background-color: var(--teatro-light);
        }

        .course-hero { 
            margin-top: 0;
            height: 75vh;
            min-height: 500px;
            background-image: linear-gradient(rgba(17, 17, 17, 0.8), rgba(160, 46, 46, 0.6)), url('../imagesemca/teatro/teatro.jpeg');
            background-size: cover;
            background-position: center;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            position: relative;
            overflow: hidden;
            border-bottom: 5px solid var(--teatro-accent);
        }
        .course-hero::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.6) 100%);
            z-index: 1;
        }
        .course-hero-content {
            z-index: 3;
            animation: fadeIn 1.5s ease-out forwards;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .course-hero h1 { 
            font-size: 5rem; 
            margin-bottom: 20px; 
            color: var(--text-inverse); 
            font-family: 'Rubik', sans-serif;
            font-weight: 300;
            letter-spacing: 5px;
            text-transform: uppercase;
            text-shadow: 2px 2px 20px rgba(0,0,0,0.8);
        }
        .course-hero h1 span {
            font-weight: 900;
            color: var(--text-gold);
        }
        .course-hero p { 
            font-size: 1.4rem; 
            max-width: 700px; 
            margin: 0 auto; 
            color: #cbd5e1;
            font-weight: 300;
            line-height: 1.6;
            text-shadow: 1px 1px 5px rgba(0,0,0,0.8);
        }

        /* Banner de Matrículas (Estilo Letreiro) */
        .course-highlight-banner {
            padding: 40px 0;
            background: var(--teatro-dark);
            color: white;
            position: relative;
            border-bottom: 2px solid #333;
        }
        .course-highlight-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--teatro-dark-alt);
            padding: 30px 40px;
            border-radius: 8px;
            border: 1px solid #333;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            position: relative;
        }
        .course-highlight-content::before {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 4px; height: 100%;
            background: var(--teatro-primary);
            border-radius: 8px 0 0 8px;
        }
        .course-highlight-text h2 {
            font-size: 2rem;
            color: var(--text-gold);
            margin-bottom: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .course-highlight-text p {
            font-size: 1.1rem;
            color: rgba(255, 255, 255, 0.8);
            margin: 0;
            max-width: 600px;
        }
        .btn-modern {
            background: var(--teatro-primary);
            color: white;
            padding: 15px 35px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 1.1rem;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 15px rgba(160, 46, 46, 0.4);
            transition: all 0.3s ease;
            text-transform: uppercase;
        }
        .btn-modern:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(160, 46, 46, 0.6);
            background: #b71c1c;
            color: var(--text-gold);
        }

        /* Seção de Informações */
        .course-info-section { 
            padding: 100px 0; 
            background-color: var(--teatro-light); 
        }
        .course-grid { 
            display: grid; 
            grid-template-columns: 2fr 1fr; 
            gap: 60px; 
        }
        .course-details h2 { 
            font-size: 2.5rem; 
            margin-bottom: 25px; 
            color: var(--teatro-dark);
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .course-details p { 
            font-size: 1.15rem; 
            margin-bottom: 20px; 
            color: #475569; 
            line-height: 1.8;
        }
        
        .learn-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        .learn-card {
            background: white;
            padding: 25px;
            border-radius: 8px;
            border-top: 4px solid var(--teatro-primary);
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
            transition: all 0.3s ease;
        }
        .learn-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .learn-card i {
            color: var(--teatro-primary);
            font-size: 2rem;
            margin-bottom: 15px;
            display: block;
        }
        .learn-card h4 {
            font-size: 1.2rem;
            color: var(--teatro-dark);
            font-weight: 700;
            margin-bottom: 10px;
        }
        .learn-card p {
            font-size: 1rem;
            color: #64748b;
            line-height: 1.5;
            margin: 0;
        }

        /* Sidebar Styles (VIP Ticket Style) */
        .course-sidebar { 
            background-color: var(--teatro-dark); 
            padding: 40px; 
            border-radius: 12px; 
            box-shadow: 0 15px 35px rgba(0,0,0,0.2); 
            height: fit-content;
            position: sticky;
            top: 100px;
            color: white;
            border: 1px solid #333;
        }
        .info-list { 
            list-style: none; 
            margin-bottom: 35px; 
            padding: 0;
        }
        .info-list li { 
            display: flex; 
            align-items: center; 
            gap: 15px; 
            margin-bottom: 20px; 
            font-size: 1.1rem; 
            color: #cbd5e1;
            font-weight: 500;
        }
        .info-icon-box {
            width: 40px;
            height: 40px;
            background: rgba(241, 196, 15, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--teatro-accent);
            font-size: 1.2rem;
        }
        
        .schedule-box { 
            background-color: var(--teatro-dark-alt); 
            padding: 25px; 
            border-radius: 8px; 
            margin-bottom: 30px; 
            border-left: 3px solid var(--teatro-primary);
        }
        .schedule-box h4 { 
            margin-bottom: 20px; 
            color: var(--text-gold); 
            font-weight: 700;
            font-size: 1.2rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .schedule-item { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 12px; 
            padding-bottom: 12px; 
            border-bottom: 1px solid #333; 
            font-weight: 500;
            color: #cbd5e1;
        }
        .schedule-item:last-child { 
            border-bottom: none; 
            margin-bottom: 0; 
            padding-bottom: 0; 
        }
        
        .btn-outline-modern {
            display: block;
            text-align: center;
            padding: 15px;
            border: 2px solid var(--teatro-accent);
            color: var(--teatro-accent);
            border-radius: 4px;
            font-weight: 700;
            text-decoration: none;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .btn-outline-modern:hover {
            background: var(--teatro-accent);
            color: var(--teatro-dark);
        }

        /* Gallery Section */
        .gallery-section { 
            padding: 100px 0; 
            background-color: var(--teatro-dark); 
        }
        .gallery-header {
            text-align: center;
            margin-bottom: 50px;
        }
        .gallery-header h2 {
            font-size: 2.8rem;
            color: var(--text-inverse);
            font-weight: 800;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .gallery-header p {
            color: var(--text-gold);
            font-size: 1.2rem;
        }
        .gallery-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
        }
        .gallery-item { 
            height: 250px; 
            border-radius: 4px; 
            overflow: hidden; 
            position: relative;
            cursor: pointer;
        }
        .gallery-item img { 
            width: 100%; 
            height: 100%; 
            object-fit: cover; 
            transition: transform 0.6s ease;
            filter: grayscale(20%);
        }
        .gallery-item::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
            opacity: 0;
            transition: opacity 0.4s ease;
        }
        .gallery-item:hover img { 
            transform: scale(1.1); 
            filter: grayscale(0%);
        }
        .gallery-item:hover::after {
            opacity: 1;
        }

        /* Responsiveness */
        @media (max-width: 992px) { 
            .course-grid { grid-template-columns: 1fr; } 
            .course-hero h1 { font-size: 4rem; }
            .course-highlight-content { flex-direction: column; text-align: center; gap: 20px; }
        }
        @media (max-width: 768px) {
            .hide-mobile { display: none !important; }
            .btn-mapa { padding: 8px 12px !important; font-size: 0.9rem !important; }
            .course-hero { height: 60vh; min-height: 400px; }
            .course-hero h1 { font-size: 2.8rem; }
            .course-hero p { font-size: 1.1rem; }
            .course-details h2 { font-size: 2rem; }
            .course-highlight-banner { padding: 30px 15px; }
        }
`;

content = content.replace(/<style>[\s\S]*?<\/style>/, '<style>\n' + newCss + '\n</style>');

// Fix typos and apply new HTML structure
// Note: We need to make sure we don't accidentally replace the footer's style. Wait, the regex might replace the first style tag, which is the main one. Let's make sure!
// Actually, earlier regex /<style>[\s\S]*?<\/style>/ might replace the first <style> tag.
// We must only replace the first <style> block, not the footer's. `replace` without /g does exactly that! It replaces the FIRST match.

// HERO
content = content.replace('<h1>Curso de Teatro</h1>', '<h1><span>Curso de</span> Teatro</h1>');
content = content.replace('Liberte sua criatividade e emoção não palco com nãosso curso de artes canicas.', 'Liberte sua criatividade e emoção no palco com nosso curso de artes cênicas.');

// HIGHLIGHT BANNER
content = content.replace('<h2>Matraculas e Informações</h2>', '<h2>Matrículas e Informações</h2>');
content = content.replace('As turmas de Teatro sao separadas por idade e navel. Entre em contato com a EMCA para saber datas e critarios de ingresso.', 'As turmas de Teatro são separadas por faixa etária e nível técnico. Entre em contato com a equipe da EMCA para consultar vagas e turmas.');
content = content.replace('class="btn btn-primary"', 'class="btn-modern"');
content = content.replace('Quero participar</a>', '<i class="fa-solid fa-masks-theater"></i> Quero participar</a>');

// ABOUT
content = content.replace('O teatro a uma poderosa ferramenta de autoconhecimento e expressao. Na EMCA, os alunãos', 'O teatro é uma poderosa ferramenta de autoconhecimento e expressão. Na EMCA, os alunos');
content = content.replace('tacnicas vocêêais, corporais e de improvisação', 'técnicas vocais, corporais e de improvisação');
content = content.replace('abertas ao pablico, permitindo que os alunãos vivenciem a verdadeira experiancia', 'abertas ao público, permitindo que os alunos vivenciem a verdadeira experiência');
content = content.replace('O que vocêêa vai aprender?', 'O que você vai aprender?');

// LEARN LIST
const newLearnList = `
                    <div class="learn-grid">
                        <div class="learn-card">
                            <i class="fa-solid fa-face-smile-beam"></i>
                            <h4>Interpretação e Improvisação</h4>
                            <p>Técnicas focadas na construção de personagens e jogos teatrais rápidos.</p>
                        </div>
                        <div class="learn-card">
                            <i class="fa-solid fa-microphone-lines"></i>
                            <h4>Preparação Vocal</h4>
                            <p>Dicção, projeção de voz e respiração para o palco.</p>
                        </div>
                        <div class="learn-card">
                            <i class="fa-solid fa-person-walking"></i>
                            <h4>Expressão Corporal</h4>
                            <p>Domínio do espaço cênico e movimento expressivo no palco.</p>
                        </div>
                        <div class="learn-card">
                            <i class="fa-solid fa-book-open"></i>
                            <h4>Análise de Textos</h4>
                            <p>Estudo da história do teatro e leitura dramática de roteiros clássicos.</p>
                        </div>
                    </div>
`;
content = content.replace(/<ul style="list-style: disc;[\s\S]*?<\/ul>/, newLearnList);

// SIDEBAR
content = content.replace('<li><i class="fa-solid fa-user-group"></i> Idade: 10 a 60+ anãos</li>', '<li><div class="info-icon-box"><i class="fa-solid fa-user-group"></i></div> Idade: 10 a 60+ anos</li>');
content = content.replace('<li><i class="fa-solid fa-clock"></i> Duração: 2 anãos</li>', '<li><div class="info-icon-box"><i class="fa-solid fa-clock"></i></div> Duração: 2 anos</li>');
content = content.replace('<li><i class="fa-solid fa-tag"></i> 100% Gratuito</li>', '<li><div class="info-icon-box"><i class="fa-solid fa-tag"></i></div> 100% Gratuito</li>');
content = content.replace('<h4>Horarios das Turmas</h4>', '<h4>Horários das Turmas</h4>');
content = content.replace('<span>Sab, 09h - 11h</span>', '<span>Sáb, 09h - 11h</span>');
content = content.replace('class="btn btn-primary w-100"', 'class="btn-outline-modern"');
content = content.replace('Davidas / Matracula', 'Dúvidas / Matrícula');

// GALLERY
const galleryHtml = `
                <div class="gallery-grid">
                    <div class="gallery-item"><img src="../imagesemca/teatro/dentro1.jpeg" alt="Teatro 1"></div>
                    <div class="gallery-item"><img src="../imagesemca/teatro/dentro2.jpeg" alt="Teatro 2"></div>
                    <div class="gallery-item"><img src="../imagesemca/teatro/dentro3.jpeg" alt="Teatro 3"></div>
                    <div class="gallery-item"><img src="../imagesemca/teatro/espaco.jpeg" alt="Teatro 4"></div>
                    <div class="gallery-item"><img src="../imagesemca/teatro/estudio.jpeg" alt="Teatro 5"></div>
                    <div class="gallery-item"><img src="../imagesemca/teatro/sala.jpeg" alt="Teatro 6"></div>
                    <div class="gallery-item"><img src="../imagesemca/teatro/teatro2.jpeg" alt="Teatro 7"></div>
                    <div class="gallery-item"><img src="../imagesemca/teatro/forateatro.jpeg" alt="Teatro 8"></div>
                </div>
`;
content = content.replace(/<div class="gallery-grid">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/, galleryHtml + '\n            </div>\n        </section>');

// One more check to clean up the section-header class for the gallery
content = content.replace('<div class="section-header">', '<div class="gallery-header">');


fs.writeFileSync(filePath, content, 'utf8');
console.log('Teatro page updated successfully!');
