const fs = require('fs');
const path = require('path');

const museuDir = path.join(__dirname, 'museu');
if (!fs.existsSync(museuDir)) {
    fs.mkdirSync(museuDir);
}

const htmlContent = `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Museu Histórico e Pedagógico - Garça Cultural</title>
  <link rel="icon" href="../logo.jpg" type="image/jpeg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300..900;1,300..900&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../style.css">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    :root {
      --museu-primary: #8b5a2b;
      --museu-secondary: #d2b48c;
      --museu-light: #fdf5e6;
    }
    body {
        background-color: #fafafa;
    }
    .museu-header {
      background: linear-gradient(135deg, var(--museu-primary), #654321);
      padding: 100px 5%;
      color: white;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .museu-title {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 20px;
      font-family: 'Rubik', sans-serif;
    }
    .museu-subtitle {
      font-size: 1.2rem;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
      opacity: 0.9;
    }
    .info-section {
      padding: 80px 5%;
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 50px;
    }
    .about-card {
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
    }
    .about-card h2 {
      color: var(--museu-primary);
      margin-bottom: 20px;
      font-family: 'Rubik', sans-serif;
      font-size: 1.8rem;
    }
    .about-card p {
      color: #475569;
      line-height: 1.8;
      font-size: 1.1rem;
      margin-bottom: 15px;
    }
    .details-card {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .detail-item {
      background: white;
      padding: 25px;
      border-radius: 15px;
      display: flex;
      align-items: flex-start;
      gap: 15px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.03);
    }
    .detail-icon {
      background: var(--museu-light);
      color: var(--museu-primary);
      width: 50px;
      height: 50px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .detail-content h3 {
      font-size: 1.1rem;
      color: #1e293b;
      margin-bottom: 5px;
    }
    .detail-content p {
      color: #64748b;
      font-size: 0.95rem;
      margin: 0;
    }
    @media (max-width: 768px) {
      .info-section {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header style="background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05); position: sticky; top: 0; z-index: 1000;">
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 5%;">
      <div onclick="window.location.href='../index.html'" style="cursor: pointer; display: flex; flex-direction: column;">
        <span style="font-family: 'Rubik', sans-serif; font-weight: 700; font-size: 1.5rem; color: #ff716e; letter-spacing: 2px;">GARÇA</span>
        <span style="font-family: 'Rubik', sans-serif; font-size: 0.8rem; color: #364ba3; text-transform: uppercase; letter-spacing: 1px;">Cidade de Culturas</span>
      </div>
      
      <nav class="nav-menu">
        <a href="../index.html" class="nav-link" style="color: #475569; text-decoration: none; font-weight: 500; font-family: 'Rubik', sans-serif;">Início</a>
        <a href="../emca/emca.html" class="nav-link" style="color: #475569; text-decoration: none; font-weight: 500; font-family: 'Rubik', sans-serif;">EMCA</a>
        <a href="../biblioteca/biblioteca.html" class="nav-link" style="color: #475569; text-decoration: none; font-weight: 500; font-family: 'Rubik', sans-serif;">Biblioteca</a>
        <a href="../teatro/teatro.html" class="nav-link" style="color: #475569; text-decoration: none; font-weight: 500; font-family: 'Rubik', sans-serif;">Teatro</a>
        <a href="../museu/museu.html" class="nav-link" style="color: #ff716e; text-decoration: none; font-weight: 600; font-family: 'Rubik', sans-serif;">Museu</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="museu-header">
      <h1 class="museu-title">Museu Histórico e Pedagógico</h1>
      <p class="museu-subtitle">Preservando a memória, a arte e o desenvolvimento da nossa cidade para as futuras gerações.</p>
    </section>

    <section class="info-section">
      <div class="about-card">
        <h2>Sobre o Acervo</h2>
        <p>O Museu Histórico e Pedagógico possui um rico acervo sobre a história dos fundadores do município de Garça.</p>
        <p>Em nosso espaço, os visitantes podem explorar coleções que narram a economia local, o desenvolvimento regional, curiosidades marcantes e a memória artística da cidade. É um verdadeiro mergulho nas raízes da nossa comunidade.</p>
      </div>

      <div class="details-card">
        <div class="detail-item">
          <div class="detail-icon"><i data-lucide="map-pin"></i></div>
          <div class="detail-content">
            <h3>Endereço</h3>
            <p>Rua Julio Prestes, nº 322<br>Bairro: Willimans<br>Cidade: Garça - SP</p>
          </div>
        </div>

        <div class="detail-item">
          <div class="detail-icon"><i data-lucide="clock"></i></div>
          <div class="detail-content">
            <h3>Horário de Funcionamento</h3>
            <p>Segunda a Sexta-feira<br>08:00 às 17:00</p>
          </div>
        </div>

        <div class="detail-item">
          <div class="detail-icon"><i data-lucide="phone"></i></div>
          <div class="detail-content">
            <h3>Contato</h3>
            <p>Telefone: (14) 3406-1971<br>E-mail: cultura@garca.sp.gov.br</p>
          </div>
        </div>
      </div>
    </section>
  </main>

  <script>lucide.createIcons();</script>
</body>
</html>`;

fs.writeFileSync(path.join(museuDir, 'museu.html'), htmlContent, 'utf8');

// Update index.html
const indexHtmlPath = path.join(__dirname, 'index.html');
let indexContent = fs.readFileSync(indexHtmlPath, 'utf8');

// Add to nav-menu if not present
if (!indexContent.includes('href="./museu/museu.html"')) {
    indexContent = indexContent.replace(
        /<a href="\.\/teatro\/teatro\.html" class="nav-link"([^>]+)>Teatro<\/a>/,
        '<a href="./teatro/teatro.html" class="nav-link"$1>Teatro</a>\n        <a href="./museu/museu.html" class="nav-link"$1>Museu</a>'
    );
    
    // Add to mobile menu
    indexContent = indexContent.replace(
        /<a href="\.\/teatro\/teatro\.html" class="nav-link" onclick="toggleMenu\(\)">Teatro<\/a>/,
        '<a href="./teatro/teatro.html" class="nav-link" onclick="toggleMenu()">Teatro</a>\n    <a href="./museu/museu.html" class="nav-link" onclick="toggleMenu()">Museu</a>'
    );
    
    fs.writeFileSync(indexHtmlPath, indexContent, 'utf8');
}

console.log('Museu page created and added to index.html navbar!');
