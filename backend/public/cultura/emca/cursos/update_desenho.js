const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'desenho.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update CSS block
const newCss = `
        /* New Styles for Desenho (Sketchbook Theme) */
        :root {
            --desenho-primary: #636e72; /* Graphite */
            --desenho-accent: #e17055; /* Pencil Orange */
            --desenho-dark: #2d3436; /* Charcoal */
            --desenho-light: #fdfbf7; /* Sketchbook Paper */
            --paper-texture: url('data:image/svg+xml;utf8,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100" height="100" filter="url(%23noise)" opacity="0.05"/></svg>');
        }
        
        body {
            background-color: var(--desenho-light);
            background-image: var(--paper-texture);
        }

        .course-hero { 
            margin-top: 0;
            height: 70vh;
            min-height: 500px;
            background-image: linear-gradient(rgba(45, 52, 54, 0.7), rgba(45, 52, 54, 0.5)), url('../imagesemca/desenho/desenho1.jpg');
            background-size: cover;
            background-position: center;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            position: relative;
            overflow: hidden;
            border-bottom: 8px solid var(--desenho-accent);
        }
        .course-hero::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 40px;
            background: var(--desenho-light);
            clip-path: polygon(0% 100%, 5% 0%, 10% 100%, 15% 0%, 20% 100%, 25% 0%, 30% 100%, 35% 0%, 40% 100%, 45% 0%, 50% 100%, 55% 0%, 60% 100%, 65% 0%, 70% 100%, 75% 0%, 80% 100%, 85% 0%, 90% 100%, 95% 0%, 100% 100%);
            z-index: 2;
        }
        .course-hero-content {
            z-index: 3;
            animation: fadeInDown 1s ease-out forwards;
        }
        @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .course-hero h1 { 
            font-size: 5rem; 
            margin-bottom: 20px; 
            color: #fff; 
            font-family: 'Rubik', sans-serif;
            font-weight: 900;
            letter-spacing: -2px;
            text-shadow: 2px 2px 0px var(--desenho-accent), -1px -1px 0px rgba(0,0,0,0.5);
            text-transform: uppercase;
        }
        .course-hero h1 span {
            color: var(--desenho-accent);
            position: relative;
            display: inline-block;
        }
        .course-hero h1 span::after {
            content: '';
            position: absolute;
            width: 100%;
            height: 8px;
            background: var(--desenho-primary);
            bottom: 5px;
            left: 0;
            z-index: -1;
            transform: rotate(-2deg);
        }
        .course-hero p { 
            font-size: 1.5rem; 
            max-width: 700px; 
            margin: 0 auto; 
            color: #f1f5f9;
            font-weight: 400;
            line-height: 1.6;
            animation: fadeInUp 1s ease-out 0.5s forwards;
            opacity: 0;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Banner de Matrículas Sketch */
        .course-highlight-banner {
            padding: 40px 0;
            background: transparent;
            position: relative;
            margin-top: -60px;
            z-index: 10;
        }
        .course-highlight-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #ffffff;
            background-image: var(--paper-texture);
            padding: 40px 50px;
            border-radius: 2px 255px 3px 225px / 255px 5px 225px 3px;
            border: 2px solid var(--desenho-primary);
            box-shadow: 8px 8px 0px rgba(99, 110, 114, 0.2);
        }
        .course-highlight-text h2 {
            font-size: 2.2rem;
            color: var(--desenho-dark);
            margin-bottom: 10px;
            font-weight: 800;
        }
        .course-highlight-text p {
            font-size: 1.1rem;
            color: var(--desenho-primary);
            margin: 0;
            max-width: 600px;
            font-weight: 500;
        }
        .btn-modern {
            background: var(--desenho-accent);
            color: #ffffff;
            padding: 15px 35px;
            border-radius: 2px 255px 3px 225px / 255px 5px 225px 3px;
            border: 2px solid var(--desenho-dark);
            font-weight: 800;
            font-size: 1.2rem;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            box-shadow: 4px 4px 0px var(--desenho-dark);
            transition: all 0.2s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .btn-modern:hover {
            transform: translate(2px, 2px);
            box-shadow: 2px 2px 0px var(--desenho-dark);
            background: #ff8b7d;
        }

        /* Seção de Informações */
        .course-info-section { 
            padding: 80px 0; 
            background: transparent;
        }
        .course-grid { 
            display: grid; 
            grid-template-columns: 2fr 1fr; 
            gap: 60px; 
        }
        .course-details h2 { 
            font-size: 2.8rem; 
            margin-bottom: 25px; 
            color: var(--desenho-dark);
            font-weight: 900;
            position: relative;
            display: inline-block;
        }
        .course-details h2::after {
            content: '';
            position: absolute;
            left: 0;
            bottom: -5px;
            width: 100%;
            height: 12px;
            background: rgba(225, 112, 85, 0.3);
            transform: rotate(-1deg);
            z-index: -1;
        }
        .course-details p { 
            font-size: 1.2rem; 
            margin-bottom: 20px; 
            color: var(--desenho-primary); 
            line-height: 1.8;
            font-weight: 500;
        }
        
        .learn-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        .learn-card {
            background: #ffffff;
            padding: 25px;
            border-radius: 2px 255px 3px 225px / 255px 5px 225px 3px;
            border: 2px solid var(--desenho-primary);
            box-shadow: 4px 4px 0px rgba(99, 110, 114, 0.1);
            transition: transform 0.3s ease;
            position: relative;
        }
        .learn-card:hover {
            transform: translateY(-5px) rotate(1deg);
            box-shadow: 6px 8px 0px rgba(225, 112, 85, 0.2);
            border-color: var(--desenho-accent);
        }
        .learn-card i {
            color: var(--desenho-accent);
            font-size: 2.5rem;
            margin-bottom: 15px;
            display: block;
        }
        .learn-card h4 {
            font-size: 1.3rem;
            color: var(--desenho-dark);
            font-weight: 800;
            margin-bottom: 10px;
        }
        .learn-card p {
            font-size: 1rem;
            color: var(--desenho-primary);
            line-height: 1.5;
            margin: 0;
        }

        /* Sidebar Styles (Clipboard) */
        .course-sidebar { 
            background-color: #fdfbf7;
            background-image: linear-gradient(90deg, transparent 79px, #e17055 79px, #e17055 81px, transparent 81px), linear-gradient(#e1e1e1 .1em, transparent .1em);
            background-size: 100% 1.2em;
            padding: 50px 30px 40px 90px; 
            border-radius: 5px; 
            box-shadow: 8px 8px 20px rgba(0,0,0,0.1); 
            border: 1px solid #d1d1d1;
            height: fit-content;
            position: sticky;
            top: 100px;
            transform: rotate(1deg);
        }
        .course-sidebar::before {
            content: '';
            position: absolute;
            top: 15px;
            left: 20px;
            width: 40px;
            height: 40px;
            background: #2d3436;
            border-radius: 50%;
            box-shadow: inset 2px 2px 5px rgba(255,255,255,0.2), 2px 2px 5px rgba(0,0,0,0.5);
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
            font-size: 1.2rem; 
            color: var(--desenho-dark);
            font-weight: 800;
            font-family: 'Rubik', sans-serif;
            background: rgba(255,255,255,0.7);
            padding: 5px 10px;
            border-radius: 5px;
        }
        .info-icon-box {
            color: var(--desenho-accent);
            font-size: 1.5rem;
            width: 30px;
            text-align: center;
        }
        
        .schedule-box { 
            background-color: rgba(255,255,255,0.8); 
            padding: 20px; 
            border: 2px dashed var(--desenho-primary);
            border-radius: 5px; 
            margin-bottom: 30px; 
            transform: rotate(-1deg);
        }
        .schedule-box h4 { 
            margin-bottom: 15px; 
            color: var(--desenho-dark); 
            font-weight: 800;
            font-size: 1.3rem;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .schedule-item { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 10px; 
            font-weight: 700;
            color: var(--desenho-primary);
            font-size: 1.1rem;
        }
        
        .btn-outline-modern {
            display: block;
            text-align: center;
            padding: 15px;
            background: transparent;
            border: 3px solid var(--desenho-dark);
            color: var(--desenho-dark);
            border-radius: 2px 255px 3px 225px / 255px 5px 225px 3px;
            font-weight: 800;
            font-size: 1.1rem;
            text-decoration: none;
            transition: all 0.3s ease;
            text-transform: uppercase;
        }
        .btn-outline-modern:hover {
            background: var(--desenho-dark);
            color: white;
            transform: rotate(2deg);
        }

        /* Gallery Section */
        .gallery-section { 
            padding: 80px 0 100px; 
            background: transparent;
        }
        .gallery-header {
            text-align: center;
            margin-bottom: 50px;
        }
        .gallery-header h2 {
            font-size: 3rem;
            color: var(--desenho-dark);
            font-weight: 900;
            margin-bottom: 15px;
            text-transform: uppercase;
        }
        .gallery-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); 
            gap: 40px; 
        }
        .gallery-item { 
            height: 350px; 
            background: #ffffff;
            padding: 15px 15px 40px 15px;
            border-radius: 2px;
            position: relative;
            box-shadow: 5px 5px 15px rgba(0,0,0,0.15);
            cursor: pointer;
            transition: transform 0.4s ease;
        }
        .gallery-item:nth-child(even) {
            transform: rotate(2deg);
        }
        .gallery-item:nth-child(odd) {
            transform: rotate(-2deg);
        }
        .gallery-item:hover {
            transform: scale(1.05) rotate(0deg);
            z-index: 5;
            box-shadow: 10px 10px 25px rgba(0,0,0,0.2);
        }
        .gallery-item img { 
            width: 100%; 
            height: 100%; 
            object-fit: cover; 
            border: 1px solid #e2e8f0;
        }
        .gallery-item::after {
            content: 'Arte do Aluno';
            font-family: 'Rubik', sans-serif;
            font-style: italic;
            font-weight: 600;
            color: var(--desenho-primary);
            position: absolute;
            bottom: 10px;
            left: 0;
            width: 100%;
            text-align: center;
        }

        /* Responsiveness */
        @media (max-width: 992px) { 
            .course-grid { grid-template-columns: 1fr; } 
            .course-hero h1 { font-size: 4rem; }
            .course-highlight-content { flex-direction: column; text-align: center; gap: 20px; padding: 30px; }
            .course-sidebar { transform: rotate(0); padding: 40px 20px 40px 60px; margin-top: 30px; }
            .course-sidebar::before { left: 10px; width: 30px; height: 30px; }
        }
        @media (max-width: 768px) {
            .hide-mobile { display: none !important; }
            .btn-mapa { padding: 8px 12px !important; font-size: 0.9rem !important; }
            .course-hero { height: 60vh; min-height: 400px; }
            .course-hero h1 { font-size: 3rem; }
            .course-hero p { font-size: 1.2rem; }
            .course-details h2 { font-size: 2.2rem; }
            .course-highlight-banner { padding: 20px 15px; margin-top: 0; }
            .gallery-item { transform: rotate(0) !important; margin-bottom: 20px; }
        }
    </style>`;

content = content.replace(/<style>[\s\S]*?\/\*\s*New Styles for Desenho\s*\*\/[\s\S]*?<\/style>/, '<style>' + newCss + '</style>');

// 2. Update HTML elements (learn list, gallery)
const learnListHtml = `
                    <h3 style="margin: 40px 0 20px; font-weight: 800; color: var(--desenho-dark); font-size: 1.8rem; text-transform: uppercase;">O que você vai aprender?</h3>
                    <div class="learn-grid">
                        <div class="learn-card">
                            <i class="fa-solid fa-lightbulb"></i>
                            <h4>Fundamentos Visuais</h4>
                            <p>Domine o estudo de luz, sombra e volume para criar ilustrações com profundidade.</p>
                        </div>
                        <div class="learn-card">
                            <i class="fa-solid fa-cubes"></i>
                            <h4>Perspectiva</h4>
                            <p>Técnicas de composição e perspectiva espacial para cenários incríveis.</p>
                        </div>
                        <div class="learn-card">
                            <i class="fa-solid fa-user-pen"></i>
                            <h4>Figura Humana</h4>
                            <p>Anatomia, proporções e desenho de observação para dar vida a personagens.</p>
                        </div>
                        <div class="learn-card">
                            <i class="fa-solid fa-display"></i>
                            <h4>Arte Digital</h4>
                            <p>Introdução ao desenho conceitual e transição para o ambiente digital.</p>
                        </div>
                    </div>
`;
content = content.replace(/<h3[^>]*>O que você vai aprender\?<\/h3>[\s\S]*?<\/ul>/, learnListHtml);

// 3. Update Gallery HTML
const galleryHtml = `
                <div class="gallery-grid">
                    <div class="gallery-item"><img src="../imagesemca/desenho/galeria1_ai.png" alt="Desenho de Coruja" onerror="this.src='https://via.placeholder.com/600x400?text=Arte+Desenho+1';"></div>
                    <div class="gallery-item"><img src="../imagesemca/desenho/galeria2_ai.png" alt="Desenho de Olho" onerror="this.src='https://via.placeholder.com/600x400?text=Arte+Desenho+2';"></div>
                    <div class="gallery-item"><img src="../imagesemca/desenho/galeria3_ai.png" alt="Esboçando Paisagem" onerror="this.src='https://via.placeholder.com/600x400?text=Arte+Desenho+3';"></div>
                </div>
`;
content = content.replace(/<div class="gallery-grid">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/, galleryHtml + '\n            </div>\n        </section>');

fs.writeFileSync(filePath, content, 'utf8');
console.log('desenho.html updated with creative design');
