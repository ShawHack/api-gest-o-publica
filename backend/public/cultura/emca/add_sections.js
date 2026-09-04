const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'emca.html');
let content = fs.readFileSync(filePath, 'utf8');

const newSections = `
        <!-- Impacto / Estatísticas -->
        <section class="impacto-section reveal" style="padding: 80px 0; background-color: #ffffff; border-top: 1px solid #fce8df;">
            <div class="container">
                <div style="display: flex; flex-wrap: wrap; justify-content: space-around; gap: 30px; text-align: center;">
                    <div style="flex: 1; min-width: 200px;">
                        <i data-lucide="users" style="color: #ff9f66; width: 48px; height: 48px; margin-bottom: 15px;"></i>
                        <h3 style="font-size: 3rem; color: #ff9f66; font-weight: 800; margin-bottom: 5px;">+500</h3>
                        <p style="color: #475569; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Alunos Formados</p>
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <i data-lucide="palette" style="color: #ff9f66; width: 48px; height: 48px; margin-bottom: 15px;"></i>
                        <h3 style="font-size: 3rem; color: #ff9f66; font-weight: 800; margin-bottom: 5px;">5</h3>
                        <p style="color: #475569; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Áreas Artísticas</p>
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <i data-lucide="calendar-heart" style="color: #ff9f66; width: 48px; height: 48px; margin-bottom: 15px;"></i>
                        <h3 style="font-size: 3rem; color: #ff9f66; font-weight: 800; margin-bottom: 5px;">+20</h3>
                        <p style="color: #475569; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Eventos Anuais</p>
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <i data-lucide="award" style="color: #ff9f66; width: 48px; height: 48px; margin-bottom: 15px;"></i>
                        <h3 style="font-size: 3rem; color: #ff9f66; font-weight: 800; margin-bottom: 5px;">20+</h3>
                        <p style="color: #475569; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Anos de Tradição</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Agenda de Eventos -->
        <section class="eventos-section reveal" style="padding: 100px 0; background-color: #fffaf7;">
            <div class="container">
                <div style="text-align: center; margin-bottom: 60px;">
                    <h2 style="font-size: 2.8rem; color: #ffad85; font-weight: 800; font-family: 'Rubik', sans-serif;">Próximos Eventos</h2>
                    <div style="width: 80px; height: 5px; background: #ffad85; margin: 20px auto; border-radius: 5px;"></div>
                    <p style="color: #475569; font-size: 1.1rem; max-width: 600px; margin: 0 auto;">Fique por dentro das apresentações e espetáculos abertos ao público no Teatro Municipal.</p>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
                    <!-- Evento 1 -->
                    <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border-left: 5px solid #ff9f66; transition: transform 0.3s ease;">
                        <div style="padding: 30px;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; color: #ff9f66; font-weight: bold;">
                                <i data-lucide="calendar"></i>
                                <span>15 de Agosto, 2026</span>
                            </div>
                            <h3 style="font-size: 1.5rem; color: #1e293b; margin-bottom: 15px;">Festival de Inverno: Ballet Clássico</h3>
                            <p style="color: #64748b; margin-bottom: 20px; line-height: 1.6;">Uma noite mágica onde nossos alunos apresentam coreografias clássicas premiadas.</p>
                            <a href="#" style="color: #ff9f66; font-weight: bold; text-decoration: none; display: flex; align-items: center; gap: 5px;">Saiba Mais <i data-lucide="arrow-right" style="width: 16px;"></i></a>
                        </div>
                    </div>
                    
                    <!-- Evento 2 -->
                    <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border-left: 5px solid #ff716e; transition: transform 0.3s ease;">
                        <div style="padding: 30px;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; color: #ff716e; font-weight: bold;">
                                <i data-lucide="calendar"></i>
                                <span>12 de Setembro, 2026</span>
                            </div>
                            <h3 style="font-size: 1.5rem; color: #1e293b; margin-bottom: 15px;">Mostra de Música e Coral</h3>
                            <p style="color: #64748b; margin-bottom: 20px; line-height: 1.6;">Apresentação especial dos alunos de instrumentos e canto, com repertório variado.</p>
                            <a href="#" style="color: #ff716e; font-weight: bold; text-decoration: none; display: flex; align-items: center; gap: 5px;">Saiba Mais <i data-lucide="arrow-right" style="width: 16px;"></i></a>
                        </div>
                    </div>

                    <!-- Evento 3 -->
                    <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border-left: 5px solid #d4af37; transition: transform 0.3s ease;">
                        <div style="padding: 30px;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; color: #d4af37; font-weight: bold;">
                                <i data-lucide="calendar"></i>
                                <span>20 de Outubro, 2026</span>
                            </div>
                            <h3 style="font-size: 1.5rem; color: #1e293b; margin-bottom: 15px;">Espetáculo "Noites de Circo"</h3>
                            <p style="color: #64748b; margin-bottom: 20px; line-height: 1.6;">Venha se encantar com as acrobacias aéreas e malabares no palco principal.</p>
                            <a href="#" style="color: #d4af37; font-weight: bold; text-decoration: none; display: flex; align-items: center; gap: 5px;">Saiba Mais <i data-lucide="arrow-right" style="width: 16px;"></i></a>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Depoimentos -->
        <section class="depoimentos-section reveal" style="padding: 100px 0; background: linear-gradient(135deg, #ffeddd 0%, #ffe0cc 100%); position: relative; overflow: hidden;">
            <div style="position: absolute; top: -50px; left: -50px; width: 200px; height: 200px; background: rgba(255, 113, 110, 0.1); border-radius: 50%; blur: 20px;"></div>
            <div style="position: absolute; bottom: -50px; right: -50px; width: 300px; height: 300px; background: rgba(255, 159, 102, 0.1); border-radius: 50%; blur: 30px;"></div>
            
            <div class="container" style="position: relative; z-index: 1;">
                <div style="text-align: center; margin-bottom: 60px;">
                    <h2 style="font-size: 2.8rem; color: #ff9f66; font-weight: 800; font-family: 'Rubik', sans-serif;">O que nossos alunos dizem</h2>
                    <p style="color: #475569; font-size: 1.1rem;">A arte transforma vidas. Conheça algumas histórias de quem passou por aqui.</p>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px;">
                    <!-- Depoimento 1 -->
                    <div style="background: white; padding: 40px; border-radius: 20px; box-shadow: 0 15px 40px rgba(255, 159, 102, 0.15); text-align: center; position: relative;">
                        <i data-lucide="quote" style="color: #ff9f66; width: 40px; height: 40px; opacity: 0.2; position: absolute; top: 30px; left: 30px;"></i>
                        <p style="color: #475569; font-style: italic; line-height: 1.8; margin-bottom: 25px; position: relative; z-index: 1; font-size: 1.05rem;">"A EMCA foi o lugar onde minha filha descobriu sua paixão pela dança. Os professores são incríveis e a estrutura é digna de escolas de primeiro mundo."</p>
                        <div style="width: 60px; height: 60px; background: #e2e8f0; border-radius: 50%; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #64748b; font-size: 1.2rem;">M</div>
                        <h5 style="color: #1e293b; font-size: 1.1rem; margin: 0;">Mariana Silva</h5>
                        <span style="color: #94a3b8; font-size: 0.9rem;">Mãe de Aluna de Ballet</span>
                    </div>

                    <!-- Depoimento 2 -->
                    <div style="background: white; padding: 40px; border-radius: 20px; box-shadow: 0 15px 40px rgba(255, 159, 102, 0.15); text-align: center; position: relative;">
                        <i data-lucide="quote" style="color: #ff9f66; width: 40px; height: 40px; opacity: 0.2; position: absolute; top: 30px; left: 30px;"></i>
                        <p style="color: #475569; font-style: italic; line-height: 1.8; margin-bottom: 25px; position: relative; z-index: 1; font-size: 1.05rem;">"Entrei no curso de Teatro tímido e saí pronto para enfrentar qualquer palco. A experiência de me apresentar no Teatro Municipal é indescritível!"</p>
                        <div style="width: 60px; height: 60px; background: #e2e8f0; border-radius: 50%; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #64748b; font-size: 1.2rem;">R</div>
                        <h5 style="color: #1e293b; font-size: 1.1rem; margin: 0;">Rafael Costa</h5>
                        <span style="color: #94a3b8; font-size: 0.9rem;">Aluno de Teatro</span>
                    </div>

                    <!-- Depoimento 3 -->
                    <div style="background: white; padding: 40px; border-radius: 20px; box-shadow: 0 15px 40px rgba(255, 159, 102, 0.15); text-align: center; position: relative;">
                        <i data-lucide="quote" style="color: #ff9f66; width: 40px; height: 40px; opacity: 0.2; position: absolute; top: 30px; left: 30px;"></i>
                        <p style="color: #475569; font-style: italic; line-height: 1.8; margin-bottom: 25px; position: relative; z-index: 1; font-size: 1.05rem;">"As aulas de pintura me trouxeram uma paz imensa. A estrutura dos ateliês e a dedicação dos instrutores tornam a EMCA um refúgio de arte em Garça."</p>
                        <div style="width: 60px; height: 60px; background: #e2e8f0; border-radius: 50%; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #64748b; font-size: 1.2rem;">L</div>
                        <h5 style="color: #1e293b; font-size: 1.1rem; margin: 0;">Luiza Mendes</h5>
                        <span style="color: #94a3b8; font-size: 0.9rem;">Aluna de Artes Plásticas</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- Galeria de Fotos -->`;

content = content.replace(/<!-- Galeria de Fotos -->/, newSections);

fs.writeFileSync(filePath, content, 'utf8');
console.log('New sections added successfully!');
