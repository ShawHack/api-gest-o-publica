const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'emca.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Rewrite Courses Section
const newCursosSection = `
        <!-- Cursos Oferecidos Section -->
        <section class="cursos-section-new reveal" id="cursos" style="position: relative; background-color: #fdfbf7; padding: 100px 0;">
            <div class="container">
                <div class="cursos-custom-header" style="text-align: center; margin-bottom: 50px;">
                    <h2 class="cursos-title-img" style="font-size: 3rem; color: #ff716e; font-weight: 800;">NOSSOS CURSOS</h2>
                    <p class="cursos-subtitle" style="font-size: 1.2rem; color: #475569; max-width: 600px; margin: 0 auto;">
                        Atualmente a EMCA trabalha com quatro grandes frentes artísticas: Artes Cênicas, Artes Plásticas, Dança e Música.
                    </p>
                </div>

                <div class="cursos-carousel-container">
                    <div style="overflow: hidden; width: 100%;">
                        <div class="cursos-carousel-track" id="cursosCarousel">
                            <!-- Circo -->
                            <div class="curso-slide">
                                <div class="curso-column">
                                    <a href="cursos/circo.html">
                                        <div class="curso-circle-img" style="background-image: url('imagesemca/Circo/R6II4147.jpg'); box-shadow: 0 10px 30px rgba(255, 113, 110, 0.3);"></div>
                                        <h3 class="curso-column-title">Circo</h3>
                                    </a>
                                    <p class="curso-column-text">A partir de 7 anos. Aulas coletivas duas vezes por semana focadas em acrobacias, malabares e aéreos.</p>
                                    <p class="curso-duration" style="color: #ff716e; font-weight: bold;">DURAÇÃO: 3 ANOS</p>
                                    <a href="cursos/circo.html" class="btn-ver-mais" style="border: 2px solid #ff716e; color: #ff716e; border-radius: 30px; padding: 8px 20px;">Explorar Circo</a>
                                </div>
                            </div>

                            <!-- Teatro -->
                            <div class="curso-slide">
                                <div class="curso-column">
                                    <a href="cursos/teatro.html">
                                        <div class="curso-circle-img" style="background-image: url('imagesemca/teatro/teatro.jpeg'); box-shadow: 0 10px 30px rgba(114, 28, 36, 0.3);"></div>
                                        <h3 class="curso-column-title">Teatro</h3>
                                    </a>
                                    <p class="curso-column-text">A partir de 5 anos. Desenvolvimento de expressão corporal, vocal e improvisação através de jogos teatrais.</p>
                                    <p class="curso-duration" style="color: #ff716e; font-weight: bold;">DURAÇÃO: 3 ANOS</p>
                                    <a href="cursos/teatro.html" class="btn-ver-mais" style="border: 2px solid #ff716e; color: #ff716e; border-radius: 30px; padding: 8px 20px;">Explorar Teatro</a>
                                </div>
                            </div>

                            <!-- Desenho e Pintura -->
                            <div class="curso-slide">
                                <div class="curso-column">
                                    <a href="cursos/desenho.html">
                                        <div class="curso-circle-img" style="background-image: url('imagesemca/desenho/desenho1.jpg'); box-shadow: 0 10px 30px rgba(54, 75, 163, 0.3);"></div>
                                        <h3 class="curso-column-title">Desenho e Pintura</h3>
                                    </a>
                                    <p class="curso-column-text">Foco no desenvolvimento do traço, uso das cores e técnicas mistas como aquarela e óleo.</p>
                                    <p class="curso-duration" style="color: #ff716e; font-weight: bold;">DURAÇÃO: 3 A 4 ANOS</p>
                                    <a href="cursos/desenho.html" class="btn-ver-mais" style="border: 2px solid #ff716e; color: #ff716e; border-radius: 30px; padding: 8px 20px;">Explorar Artes Plásticas</a>
                                </div>
                            </div>

                            <!-- Dança -->
                            <div class="curso-slide">
                                <div class="curso-column">
                                    <a href="cursos/danca.html">
                                        <div class="curso-circle-img" style="background-image: url('imagesemca/Alice não País das Maravilhas (Ballet)/R6II7394.jpg'); box-shadow: 0 10px 30px rgba(236, 72, 153, 0.3);"></div>
                                        <h3 class="curso-column-title">Dança</h3>
                                    </a>
                                    <p class="curso-column-text">Ballet Clássico, Contemporâneo e Jazz. Disciplina, ritmo e graciosidade a partir dos 5 anos.</p>
                                    <p class="curso-duration" style="color: #ff716e; font-weight: bold;">DURAÇÃO: ATÉ 10 ANOS</p>
                                    <a href="cursos/danca.html" class="btn-ver-mais" style="border: 2px solid #ff716e; color: #ff716e; border-radius: 30px; padding: 8px 20px;">Explorar Dança</a>
                                </div>
                            </div>

                            <!-- Música -->
                            <div class="curso-slide">
                                <div class="curso-column">
                                    <a href="cursos/musica.html">
                                        <div class="curso-circle-img" style="background-image: url('imagesemca/musica/IMG_0126.jpg'); box-shadow: 0 10px 30px rgba(234, 179, 8, 0.3);"></div>
                                        <h3 class="curso-column-title">Música</h3>
                                    </a>
                                    <p class="curso-column-text">Cursos variados de instrumentos musicais e iniciação musical para diversas faixas etárias.</p>
                                    <p class="curso-duration" style="color: #ff716e; font-weight: bold;">DURAÇÃO: VARIA POR MÓDULO</p>
                                    <a href="cursos/musica.html" class="btn-ver-mais" style="border: 2px solid #ff716e; color: #ff716e; border-radius: 30px; padding: 8px 20px;">Explorar Música</a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button class="carousel-btn prev-btn-cursos"><i class="fa-solid fa-chevron-left"></i></button>
                    <button class="carousel-btn next-btn-cursos"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
            </div>
            
            <!-- Onda divisora -->
            <svg style="position: absolute; bottom: 0; left: 0; width: 100%; height: auto;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 100">
                <path fill="#ffffff" fill-opacity="1" d="M0,32L60,42.7C120,53,240,75,360,74.7C480,75,600,53,720,42.7C840,32,960,32,1080,42.7C1200,53,1320,75,1380,85.3L1440,96L1440,100L1380,100C1320,100,1200,100,1080,100C960,100,840,100,720,100C600,100,480,100,360,100C240,100,120,100,60,100L0,100Z"></path>
            </svg>
        </section>
`;

// 2. Rewrite Sobre Section and Add Diferenciais
const newSobreSection = `
        <!-- Conheça a EMCA (Sobre) Section -->
        <section class="sobre-section reveal" id="sobre" style="background-color: #ffffff; padding: 80px 0 120px;">
            <div class="container sobre-container" style="display: flex; flex-wrap: wrap; gap: 50px; align-items: center;">
                <div class="sobre-content" style="flex: 1; min-width: 300px;">
                    <h2 style="font-size: 2.8rem; color: #1e293b; font-weight: 800; margin-bottom: 10px;">Conheça a EMCA</h2>
                    <h3 class="subtitle" style="font-size: 1.2rem; color: #ff716e; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 25px;">Onde o talento ganha forma</h3>
                    <p style="font-size: 1.1rem; color: #475569; line-height: 1.8; margin-bottom: 20px;">
                        A Escola Municipal de Cultura e Arte (EMCA) tem sido um pilar na comunidade de Garça para o fomento e celebração das expressões artísticas. Acreditamos que a arte tem o poder de transformar vidas e construir perspectivas brilhantes.
                    </p>
                    <p style="font-size: 1.1rem; color: #475569; line-height: 1.8; margin-bottom: 30px;">
                        Com uma infraestrutura acolhedora e uma equipe de professores altamente capacitados, nosso compromisso é proporcionar um ambiente criativo e inclusivo para que cada aluno — desde crianças até a melhor idade — possa alcançar o seu pleno potencial.
                    </p>
                    <a href="#diferenciais" class="btn btn-secondary" style="background: linear-gradient(135deg, #ff9f66 0%, #e65c00 100%); color: white; padding: 12px 30px; border-radius: 30px; text-decoration: none; font-weight: 600; display: inline-block; box-shadow: 0 4px 15px rgba(230, 92, 0, 0.3);">Descubra Mais</a>
                </div>
                <div class="sobre-image" style="flex: 1; min-width: 300px; position: relative;">
                    <div style="position: relative; width: 100%; padding-top: 100%;">
                        <div style="position: absolute; top: 0; left: 10%; width: 70%; height: 70%; background-image: url('imagesemca/teatro/forateatro.jpeg'); background-size: cover; background-position: center; border-radius: 50%; box-shadow: 0 20px 40px rgba(0,0,0,0.2); border: 8px solid #fff; z-index: 2;"></div>
                        <div style="position: absolute; bottom: 0; right: 0; width: 55%; height: 55%; background-image: url('imagesemca/jazz/R6II0295.jpg'); background-size: cover; background-position: center; border-radius: 50%; box-shadow: 0 20px 40px rgba(0,0,0,0.2); border: 8px solid #fff; z-index: 3;"></div>
                        <div style="position: absolute; top: 20%; right: 5%; width: 100px; height: 100px; background-color: #ff9f66; border-radius: 50%; opacity: 0.2; z-index: 1;"></div>
                        <div style="position: absolute; bottom: 10%; left: 0; width: 150px; height: 150px; background-color: #364ba3; border-radius: 50%; opacity: 0.1; z-index: 1;"></div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Diferenciais / Infraestrutura -->
        <section class="diferenciais-section reveal" id="diferenciais" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 100px 0; color: white;">
            <div class="container">
                <div style="text-align: center; margin-bottom: 60px;">
                    <h2 style="font-size: 2.5rem; color: #fff; font-weight: 800;">Por que escolher a EMCA?</h2>
                    <div style="width: 60px; height: 4px; background: #ff716e; margin: 15px auto;"></div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 40px;">
                    <!-- Diferencial 1 -->
                    <div style="background: rgba(255,255,255,0.05); padding: 40px 30px; border-radius: 15px; text-align: center; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); transition: transform 0.3s ease;">
                        <i class="fa-solid fa-masks-theater" style="font-size: 3rem; color: #ff716e; margin-bottom: 20px;"></i>
                        <h4 style="font-size: 1.4rem; margin-bottom: 15px;">Experiência de Palco</h4>
                        <p style="color: #cbd5e1; line-height: 1.6;">Nossos alunos realizam apresentações anuais no majestoso Teatro Municipal, vivenciando a emoção dos grandes espetáculos.</p>
                    </div>
                    <!-- Diferencial 2 -->
                    <div style="background: rgba(255,255,255,0.05); padding: 40px 30px; border-radius: 15px; text-align: center; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); transition: transform 0.3s ease;">
                        <i class="fa-solid fa-graduation-cap" style="font-size: 3rem; color: #3b82f6; margin-bottom: 20px;"></i>
                        <h4 style="font-size: 1.4rem; margin-bottom: 15px;">Corpo Docente</h4>
                        <p style="color: #cbd5e1; line-height: 1.6;">Professores especialistas em suas áreas, garantindo uma metodologia de ensino técnica, atualizada e inspiradora.</p>
                    </div>
                    <!-- Diferencial 3 -->
                    <div style="background: rgba(255,255,255,0.05); padding: 40px 30px; border-radius: 15px; text-align: center; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); transition: transform 0.3s ease;">
                        <i class="fa-solid fa-house-chimney" style="font-size: 3rem; color: #d4af37; margin-bottom: 20px;"></i>
                        <h4 style="font-size: 1.4rem; margin-bottom: 15px;">Ampla Estrutura</h4>
                        <p style="color: #cbd5e1; line-height: 1.6;">Salas de espelhos para dança, estúdios com acústica para música e ateliês equipados para o desenvolvimento artístico.</p>
                    </div>
                </div>
            </div>
        </section>
`;

// Regex replacement
const cursosRegex = /<!-- Cursos Oferecidos Section -->[\s\S]*?(?=<!-- Conheça a EMCA \(Sobre\) Section -->)/;
const sobreRegex = /<!-- Conheça a EMCA \(Sobre\) Section -->[\s\S]*?(?=<!-- Galeria de Fotos -->)/;

let newContent = content.replace(cursosRegex, newCursosSection);
newContent = newContent.replace(sobreRegex, newSobreSection);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('EMCA page successfully redesigned!');
