const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'desenho.html');
let content = fs.readFileSync(filePath, 'utf8');

// Title & Hero
content = content.replace('<h1><span>Curso de</span> Desenho</h1>', '<h1><span>Curso de</span> Desenho e Pintura</h1>');
content = content.replace('<title>Curso de Desenho - EMCA</title>', '<title>Curso de Desenho e Pintura - EMCA</title>');
content = content.replace('Aprenda a dar vida a suas ideias com técnicas clássicas e modernas de ilustração.', 'Mergulhe no universo das cores, texturas e formas com técnicas de ilustração e pintura em tela.');
content = content.replace('As turmas de Desenho são separadas por idade', 'As turmas de Desenho e Pintura são separadas por modalidade e idade');

// Sobre o Curso
content = content.replace('<p>O desenho é a base de todas as artes visuais. Na EMCA, os alunos aprendem desde os fundamentos do traço e observação geométrica até a criação de ilustrações complexas.</p>', 
`<p>O curso de Desenho e Pintura introduz os alunos no maravilhoso mundo das artes plásticas. Abordamos desde os fundamentos do traço, volume e perspectiva, até o uso das cores em técnicas tradicionais como óleo, acrílico e aquarela.</p>`);

content = content.replace('<p>O curso desenvolve a percepção visual e a coordenação motora fina, permitindo que cada aluno encontre seu próprio estilo artístico.</p>',
`<p>Os alunos desenvolvem seus próprios projetos artísticos e aprendem sobre a teoria das cores e história da arte, finalizando com uma exposição aberta ao público na galeria da escola.</p>`);

// Cards
const newLearnList = `
                    <div class="learn-grid">
                        <div class="learn-card">
                            <i class="fa-solid fa-lightbulb"></i>
                            <h4>Fundamentos e Perspectiva</h4>
                            <p>Domine o estudo de luz, sombra, volume e técnicas de composição espacial.</p>
                        </div>
                        <div class="learn-card">
                            <i class="fa-solid fa-palette"></i>
                            <h4>Teoria das Cores</h4>
                            <p>Estudo aprofundado das cores, círculo cromático e misturas de tintas.</p>
                        </div>
                        <div class="learn-card">
                            <i class="fa-solid fa-paintbrush"></i>
                            <h4>Pintura Clássica</h4>
                            <p>Práticas tradicionais em telas e papéis com tintas Óleo e Acrílico.</p>
                        </div>
                        <div class="learn-card">
                            <i class="fa-solid fa-droplet"></i>
                            <h4>Aquarela e Técnicas Mistas</h4>
                            <p>Desenvolvimento da percepção visual com aquarela e transição de materiais.</p>
                        </div>
                    </div>
`;
content = content.replace(/<div class="learn-grid">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, newLearnList + '\n                </div>');

// Sidebar details
content = content.replace('<li><div class="info-icon-box"><i class="fa-solid fa-user-group"></i></div> Idade: 12 a 60+ anos</li>', '<li><div class="info-icon-box"><i class="fa-solid fa-user-group"></i></div> Idade: A partir de 12 anos</li>');
content = content.replace('<div class="schedule-item"><span>Iniciantes</span><span>Ter e Qui, 14h - 16h</span></div>', '<div class="schedule-item"><span>Desenho</span><span>Ter e Qui, 14h - 16h</span></div>');
content = content.replace('<div class="schedule-item"><span>Avançado</span><span>Seg e Qua, 19h - 21h</span></div>', '<div class="schedule-item"><span>Aquarela</span><span>Seg, 14h - 16h</span></div>\n                        <div class="schedule-item"><span>Óleo e Acrílico</span><span>Qua, 19h - 21h</span></div>');

// Gallery
const galleryHtml = `
                <div class="gallery-grid">
                    <div class="gallery-item"><img src="../imagesemca/desenho/galeria1_ai.png" alt="Desenho de Coruja"></div>
                    <div class="gallery-item"><img src="../imagesemca/desenho/galeria2_ai.png" alt="Desenho de Olho"></div>
                    <div class="gallery-item"><img src="../imagesemca/desenho/galeria3_ai.png" alt="Esboçando Paisagem"></div>
                    <div class="gallery-item"><img src="../imagesemca/pintura/pintura2.jpg" alt="Pintura Aluno 1"></div>
                    <div class="gallery-item"><img src="../imagesemca/pintura/pintura3.jpg" alt="Pintura Aluno 2"></div>
                    <div class="gallery-item"><img src="../imagesemca/pintura/pintura4.jpg" alt="Pintura Aluno 3"></div>
                </div>
`;
content = content.replace(/<div class="gallery-grid">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/, galleryHtml + '\n            </div>\n        </section>');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Desenho e Pintura merged successfully!');
