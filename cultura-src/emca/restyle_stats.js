const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'emca.html');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /<!-- Impacto \/ Estatísticas -->[\s\S]*?<\/section>/;

const newSection = `<!-- Impacto / Estatísticas -->
        <section class="impacto-section reveal" style="padding: 0; background-color: transparent; margin-top: -60px; position: relative; z-index: 20;">
            <div class="container">
                <div style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-radius: 20px; box-shadow: 0 15px 40px rgba(0,0,0,0.08); padding: 40px 20px; display: flex; flex-wrap: wrap; justify-content: space-around; gap: 20px; text-align: center; border: 1px solid rgba(255, 159, 102, 0.2);">
                    <div style="flex: 1; min-width: 180px; padding: 15px; border-right: 1px solid rgba(0,0,0,0.05); position: relative;">
                        <i data-lucide="users" style="color: #ff716e; width: 36px; height: 36px; margin-bottom: 12px; filter: drop-shadow(0 4px 6px rgba(255,113,110,0.3));"></i>
                        <h3 style="font-size: 2.2rem; background: linear-gradient(135deg, #ff716e, #ff9f66); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800; margin-bottom: 5px; font-family: 'Rubik', sans-serif;">+<span class="count-up" data-target="500">0</span></h3>
                        <p style="color: #64748b; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin: 0;">Alunos Formados</p>
                    </div>
                    <div style="flex: 1; min-width: 180px; padding: 15px; border-right: 1px solid rgba(0,0,0,0.05); position: relative;">
                        <i data-lucide="palette" style="color: #ff9f66; width: 36px; height: 36px; margin-bottom: 12px; filter: drop-shadow(0 4px 6px rgba(255,159,102,0.3));"></i>
                        <h3 style="font-size: 2.2rem; background: linear-gradient(135deg, #ff9f66, #ffad85); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800; margin-bottom: 5px; font-family: 'Rubik', sans-serif;"><span class="count-up" data-target="5">0</span></h3>
                        <p style="color: #64748b; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin: 0;">Áreas Artísticas</p>
                    </div>
                    <div style="flex: 1; min-width: 180px; padding: 15px; border-right: 1px solid rgba(0,0,0,0.05); position: relative;">
                        <i data-lucide="calendar-heart" style="color: #e65c00; width: 36px; height: 36px; margin-bottom: 12px; filter: drop-shadow(0 4px 6px rgba(230,92,0,0.3));"></i>
                        <h3 style="font-size: 2.2rem; background: linear-gradient(135deg, #e65c00, #ff716e); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800; margin-bottom: 5px; font-family: 'Rubik', sans-serif;">+<span class="count-up" data-target="20">0</span></h3>
                        <p style="color: #64748b; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin: 0;">Eventos Anuais</p>
                    </div>
                    <div style="flex: 1; min-width: 180px; padding: 15px; position: relative;">
                        <i data-lucide="award" style="color: #d4af37; width: 36px; height: 36px; margin-bottom: 12px; filter: drop-shadow(0 4px 6px rgba(212,175,55,0.3));"></i>
                        <h3 style="font-size: 2.2rem; background: linear-gradient(135deg, #d4af37, #ffcf54); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800; margin-bottom: 5px; font-family: 'Rubik', sans-serif;"><span class="count-up" data-target="20">0</span>+</h3>
                        <p style="color: #64748b; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin: 0;">Anos de Tradição</p>
                    </div>
                </div>
            </div>
            
            <style>
                @media (max-width: 768px) {
                    .impacto-section { margin-top: -30px !important; }
                    .impacto-section .container > div > div { border-right: none !important; border-bottom: 1px solid rgba(0,0,0,0.05); }
                    .impacto-section .container > div > div:last-child { border-bottom: none !important; }
                }
            </style>
        </section>`;

content = content.replace(regex, newSection);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Impacto section restyled!');
