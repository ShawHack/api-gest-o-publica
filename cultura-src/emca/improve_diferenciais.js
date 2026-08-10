const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'emca.html');
let content = fs.readFileSync(filePath, 'utf8');

// The current HTML for this section:
/*
        <section class="diferenciais-section reveal" id="diferenciais" style="background: linear-gradient(135deg, #ff9f66 0%, #e65c00 100%); padding: 100px 0; color: white;">
            <div class="container">
                <div style="text-align: center; margin-bottom: 60px;">
                    <h2 style="font-size: 2.5rem; color: #fff; font-weight: 800;">Por que escolher a EMCA?</h2>
                    <div style="width: 60px; height: 4px; background: #ffffff; margin: 15px auto;"></div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 40px;">
                    <!-- Diferencial 1 -->
                    <div style="background: rgba(255,255,255,0.05); padding: 40px 30px; border-radius: 15px; text-align: center; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); transition: transform 0.3s ease;">
                        <i class="fa-solid fa-masks-theater" style="font-size: 3rem; color: #ffffff; margin-bottom: 20px;"></i>
                        <h4 style="font-size: 1.4rem; margin-bottom: 15px;">Experiência de Palco</h4>
                        <p style="color: #cbd5e1; line-height: 1.6;">Nossos alunos realizam apresentações anuais no majestoso Teatro Municipal, vivenciando a emoção dos grandes espetáculos.</p>
                    </div>
                    ...
*/

const newSection = `
        <section class="diferenciais-section reveal" id="diferenciais" style="background: linear-gradient(135deg, #ff9f66 0%, #e65c00 100%); padding: 100px 0;">
            <div class="container">
                <div style="text-align: center; margin-bottom: 60px;">
                    <h2 style="font-size: 2.8rem; color: #ffffff; font-weight: 800; font-family: 'Rubik', sans-serif; text-shadow: 0 4px 15px rgba(0,0,0,0.1);">Por que escolher a EMCA?</h2>
                    <div style="width: 80px; height: 5px; background: #ffffff; margin: 20px auto; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);"></div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 40px;">
                    <!-- Diferencial 1 -->
                    <div class="diferencial-card" style="background: #ffffff; padding: 50px 35px; border-radius: 20px; text-align: center; box-shadow: 0 15px 35px rgba(0,0,0,0.1); border-bottom: 5px solid #ff716e; transition: transform 0.3s ease, box-shadow 0.3s ease;">
                        <div style="width: 80px; height: 80px; background: rgba(255, 113, 110, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px;">
                            <i class="fa-solid fa-masks-theater" style="font-size: 2.5rem; color: #ff716e;"></i>
                        </div>
                        <h4 style="font-size: 1.5rem; margin-bottom: 15px; color: #1e293b; font-weight: 700; font-family: 'Rubik', sans-serif;">Experiência de Palco</h4>
                        <p style="color: #475569; line-height: 1.7; font-size: 1.05rem; margin: 0;">Nossos alunos realizam apresentações anuais no majestoso Teatro Municipal, vivenciando a emoção dos grandes espetáculos.</p>
                    </div>
                    <!-- Diferencial 2 -->
                    <div class="diferencial-card" style="background: #ffffff; padding: 50px 35px; border-radius: 20px; text-align: center; box-shadow: 0 15px 35px rgba(0,0,0,0.1); border-bottom: 5px solid #ff9f66; transition: transform 0.3s ease, box-shadow 0.3s ease; transform: translateY(-15px);">
                        <div style="width: 80px; height: 80px; background: rgba(255, 159, 102, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px;">
                            <i class="fa-solid fa-graduation-cap" style="font-size: 2.5rem; color: #ff9f66;"></i>
                        </div>
                        <h4 style="font-size: 1.5rem; margin-bottom: 15px; color: #1e293b; font-weight: 700; font-family: 'Rubik', sans-serif;">Corpo Docente</h4>
                        <p style="color: #475569; line-height: 1.7; font-size: 1.05rem; margin: 0;">Professores especialistas em suas áreas, garantindo uma metodologia de ensino técnica, atualizada e inspiradora.</p>
                    </div>
                    <!-- Diferencial 3 -->
                    <div class="diferencial-card" style="background: #ffffff; padding: 50px 35px; border-radius: 20px; text-align: center; box-shadow: 0 15px 35px rgba(0,0,0,0.1); border-bottom: 5px solid #d4af37; transition: transform 0.3s ease, box-shadow 0.3s ease;">
                        <div style="width: 80px; height: 80px; background: rgba(212, 175, 55, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px;">
                            <i class="fa-solid fa-house-chimney" style="font-size: 2.5rem; color: #d4af37;"></i>
                        </div>
                        <h4 style="font-size: 1.5rem; margin-bottom: 15px; color: #1e293b; font-weight: 700; font-family: 'Rubik', sans-serif;">Ampla Estrutura</h4>
                        <p style="color: #475569; line-height: 1.7; font-size: 1.05rem; margin: 0;">Salas de espelhos para dança, estúdios com acústica para música e ateliês equipados para o desenvolvimento artístico.</p>
                    </div>
                </div>
            </div>
            
            <style>
                .diferencial-card:hover {
                    transform: translateY(-10px) !important;
                    box-shadow: 0 25px 45px rgba(0,0,0,0.15) !important;
                }
            </style>
        </section>
`;

const regex = /<section class="diferenciais-section reveal"[^>]*>[\s\S]*?<\/section>/;
content = content.replace(regex, newSection);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Diferenciais section improved!');
