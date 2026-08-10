const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

const oldPins = /<!-- Pontos Interativos \(Pins\) -->[\s\S]*?<div class="ponto library"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const newPins = `<!-- Pontos Interativos (Pins) -->
            <div class="ponto theater" style="top: 28%; left: 28%;" onclick="abrir('Teatro', 'Espaço dedicado às artes cênicas e eventos culturais de Garça.', 'teatro/teatro.html')">
              <div class="pin">
                <div class="pin-icon"><i data-lucide="theater"></i></div>
              </div>
              <div class="label-container">Teatro</div>
            </div>

            <div class="ponto library" style="top: 38%; left: 78%;" onclick="abrir('Biblioteca Municipal', 'Um espaço de conhecimento, literatura e saber para toda a comunidade de Garça.', 'biblioteca/biblioteca.html')">
              <div class="pin">
                <div class="pin-icon"><i data-lucide="library"></i></div>
              </div>
              <div class="label-container">Biblioteca</div>
            </div>

            <div class="ponto museum" style="top: 72%; left: 65%;" onclick="abrir('EMCA', 'Escola Municipal de Cultura e Artes - O polo de formação artística de Garça, com cursos de música, dança e teatro.', 'emca/emca.html')">
              <div class="pin">
                <div class="pin-icon"><i data-lucide="palette"></i></div>
              </div>
              <div class="label-container">EMCA</div>
            </div>`;

content = content.replace(oldPins, newPins);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Map pins updated to REAL REAL final layout!');
