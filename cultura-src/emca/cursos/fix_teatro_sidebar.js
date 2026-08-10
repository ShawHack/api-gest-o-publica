const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'teatro.html');
let content = fs.readFileSync(filePath, 'utf8');

// Find where <section class="gallery-section"> starts
const gallerySectionIdx = content.indexOf('<section class="gallery-section">');

// We need to inject the closing tags and the sidebar right before the gallery section.
// Wait, let's see what is right before it.
// Right now, before gallery-section we have:
//                     </div>
// 
//         <section class="gallery-section">

const sidebarContent = `
                </div>
                
                <div class="course-sidebar">
                    <ul class="info-list">
                        <li><div class="info-icon-box"><i class="fa-solid fa-user-group"></i></div> Idade: A partir de 5 anos</li>
                        <li><div class="info-icon-box"><i class="fa-solid fa-clock"></i></div> Duração: 3 anos</li>
                        <li><div class="info-icon-box"><i class="fa-solid fa-tag"></i></div> 100% Gratuito</li>
                    </ul>
                    <div class="schedule-box">
                        <h4>Horários das Turmas</h4>
                        <div class="schedule-item"><span>Iniciantes</span><span>2x na semana (1h30)</span></div>
                        <div class="schedule-item"><span>Níveis</span><span>Infantil, Juvenil, Adulto</span></div>
                    </div>
                    <a href="../emca.html#contato" class="btn-outline-modern">Dúvidas / Matrícula</a>
                </div>
            </div>
        </section>

        `;

content = content.replace(/                    <\/div>\s*<section class="gallery-section">/, '                    </div>\n' + sidebarContent + '<section class="gallery-section">');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Sidebar restored and updated!');
