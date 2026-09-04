const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'emca.html');
let content = fs.readFileSync(filePath, 'utf8');

// The new courses section to replace the current one
const revertedCursosSection = `
        <!-- Cursos Oferecidos Section -->
        <section class="cursos-section-new reveal" id="cursos">
            <div class="container">
                <div class="cursos-custom-header">
                    <h2 class="cursos-title-img">CURSOS</h2>
                    <p class="cursos-subtitle">Atualmente a EMCA trabalha com quatro grandes frentes artísticas: Artes Cênicas, Artes Plásticas, Dança e Música.</p>
                </div>

                <div class="cursos-carousel-container">
                    <div style="overflow: hidden; width: 100%;">
                        <div class="cursos-carousel-track" id="cursosCarousel">
                            <!-- Circo -->
                            <div class="curso-slide">
                                <div class="curso-column">
                                    <a href="cursos/circo.html">
                                        <div class="curso-circle-img" style="background-image: url('imagesemca/Circo/R6II4147.jpg');"></div>
                                        <h3 class="curso-column-title">Circo</h3>
                                    </a>
                                    <p class="curso-column-text">O Curso de Circo requer a idade mínima de 07 anos. As aulas são coletivas e acontecem duas vezes por semana.</p>
                                    <p class="curso-bold-text">Técnicas: Cambalhota, Perna de pau, Malabares, Aparelhos Aéreos.</p>
                                    <p class="curso-duration">DURAÇÃO: 3 ANOS</p>
                                    <a href="cursos/circo.html" class="btn-ver-mais">Ver mais detalhes</a>
                                </div>
                            </div>

                            <!-- Teatro -->
                            <div class="curso-slide">
                                <div class="curso-column">
                                    <a href="cursos/teatro.html">
                                        <div class="curso-circle-img" style="background-image: url('imagesemca/teatro/teatro.jpeg');"></div>
                                        <h3 class="curso-column-title">Teatro</h3>
                                    </a>
                                    <p class="curso-column-text">O Curso de Teatro requer a idade mínima de 5 anos. Aulas coletivas com foco em expressão corporal e vocal.</p>
                                    <p class="curso-bold-text">Técnicas: Jogos Teatrais, Interpretação, Preparação Física.</p>
                                    <p class="curso-duration">DURAÇÃO: 3 ANOS</p>
                                    <a href="cursos/teatro.html" class="btn-ver-mais">Ver mais detalhes</a>
                                </div>
                            </div>

                            <!-- Desenho e Pintura -->
                            <div class="curso-slide">
                                <div class="curso-column">
                                    <a href="cursos/desenho.html">
                                        <div class="curso-circle-img" style="background-image: url('imagesemca/desenho/desenho1.jpg');"></div>
                                        <h3 class="curso-column-title">Desenho e Pintura</h3>
                                    </a>
                                    <p class="curso-column-text">A partir de 7 anos. Foco no desenvolvimento do traço, uso das cores e técnicas mistas.</p>
                                    <p class="curso-bold-text">Técnicas: Aquarela, Guache, Carvão, Cores, Luz e Sombra.</p>
                                    <p class="curso-duration">DURAÇÃO: 3 A 4 ANOS</p>
                                    <a href="cursos/desenho.html" class="btn-ver-mais">Ver mais detalhes</a>
                                </div>
                            </div>

                            <!-- Dança -->
                            <div class="curso-slide">
                                <div class="curso-column">
                                    <a href="cursos/danca.html">
                                        <div class="curso-circle-img" style="background-image: url('imagesemca/Alice não País das Maravilhas (Ballet)/R6II7394.jpg');"></div>
                                        <h3 class="curso-column-title">Dança</h3>
                                    </a>
                                    <p class="curso-column-text">Oferecemos Ballet Clássico, Contemporâneo e Jazz. Aulas para alunos a partir de 5 anos.</p>
                                    <p class="curso-bold-text">Modalidades: Ballet Clássico, Jazz e Contemporâneo.</p>
                                    <p class="curso-duration">DURAÇÃO: ATÉ 10 ANOS</p>
                                    <a href="cursos/danca.html" class="btn-ver-mais">Ver mais detalhes</a>
                                </div>
                            </div>

                            <!-- Música -->
                            <div class="curso-slide">
                                <div class="curso-column">
                                    <a href="cursos/musica.html">
                                        <div class="curso-circle-img" style="background-image: url('imagesemca/musica/IMG_0126.jpg');"></div>
                                        <h3 class="curso-column-title">Música</h3>
                                    </a>
                                    <p class="curso-column-text">Diversos instrumentos: Bateria, Canto, Piano, Violão e aulas de iniciação musical.</p>
                                    <p class="curso-bold-text">Cursos: Instrumentos Variados e Iniciação Musical.</p>
                                    <p class="curso-duration">DURAÇÃO: VARIA POR MÓDULO</p>
                                    <a href="cursos/musica.html" class="btn-ver-mais">Ver mais detalhes</a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button class="carousel-btn prev-btn-cursos"><i class="fa-solid fa-chevron-left"></i></button>
                    <button class="carousel-btn next-btn-cursos"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
            </div>
        </section>
`;

const regex = /<!-- Cursos Oferecidos Section -->[\s\S]*?(?=<!-- Conheça a EMCA \(Sobre\) Section -->)/;
let newContent = content.replace(regex, revertedCursosSection);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Courses section reverted to original style!');
