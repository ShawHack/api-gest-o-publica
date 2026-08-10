const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'museu', 'museu.html');

const htmlContent = `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Museu Histórico e Pedagógico - Garça</title>
  <link rel="icon" href="../logo.jpg" type="image/jpeg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Rubik:ital,wght@0,300..900;1,300..900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../style.css">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    :root {
      --gold-primary: #C5A059;
      --gold-light: #F4EEDF;
      --museum-dark: #1A1A1A;
      --museum-text: #4A4A4A;
    }
    body {
        background-color: #FAFAFA;
        font-family: 'Rubik', sans-serif;
    }
    
    /* Premium Navbar Overrides */
    .premium-header {
      background-color: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 30px rgba(0,0,0,0.05);
      position: sticky;
      top: 0;
      z-index: 1000;
      transition: all 0.3s ease;
    }
    
    /* Hero Section */
    .museum-hero {
      position: relative;
      height: 80vh;
      min-height: 600px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-image: url('museu_bg.png');
      background-size: cover;
      background-position: center;
      background-attachment: fixed;
    }
    .museum-hero::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(to bottom, rgba(26,26,26,0.6) 0%, rgba(26,26,26,0.8) 100%);
    }
    .hero-content {
      position: relative;
      z-index: 10;
      text-align: center;
      color: white;
      max-width: 800px;
      padding: 0 20px;
    }
    .hero-subtitle {
      font-family: 'Rubik', sans-serif;
      text-transform: uppercase;
      letter-spacing: 4px;
      font-size: 0.9rem;
      color: var(--gold-primary);
      margin-bottom: 20px;
      display: block;
    }
    .hero-title {
      font-family: 'Playfair Display', serif;
      font-size: 4.5rem;
      font-weight: 700;
      margin-bottom: 30px;
      line-height: 1.1;
      text-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .hero-desc {
      font-size: 1.2rem;
      font-weight: 300;
      opacity: 0.9;
      line-height: 1.6;
    }

    /* Main Content Layout */
    .museum-content {
      max-width: 1200px;
      margin: -100px auto 100px;
      position: relative;
      z-index: 20;
      padding: 0 20px;
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 40px;
    }

    @media (max-width: 992px) {
      .museum-content {
        grid-template-columns: 1fr;
        margin-top: 40px;
      }
      .hero-title { font-size: 3rem; }
    }

    /* Glass Cards */
    .glass-card {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      padding: 50px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.08);
      border: 1px solid rgba(255,255,255,0.4);
    }

    .story-section h2 {
      font-family: 'Playfair Display', serif;
      font-size: 2.5rem;
      color: var(--museum-dark);
      margin-bottom: 30px;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .story-section h2::after {
      content: '';
      flex: 1;
      height: 1px;
      background: linear-gradient(to right, var(--gold-primary), transparent);
    }
    .story-section p {
      font-size: 1.15rem;
      color: var(--museum-text);
      line-height: 1.8;
      margin-bottom: 25px;
    }
    .story-section p:first-of-type::first-letter {
      font-family: 'Playfair Display', serif;
      font-size: 3.5rem;
      float: left;
      line-height: 1;
      margin-right: 15px;
      color: var(--gold-primary);
    }

    /* Info Sidebar */
    .info-sidebar {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .info-card {
      background: white;
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.04);
      border-left: 4px solid var(--gold-primary);
      transition: transform 0.3s ease;
    }
    .info-card:hover {
      transform: translateY(-5px);
    }
    .info-card .icon-wrapper {
      width: 45px;
      height: 45px;
      background: var(--gold-light);
      color: var(--gold-primary);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 15px;
    }
    .info-card h3 {
      font-size: 1.1rem;
      color: var(--museum-dark);
      margin-bottom: 10px;
      font-weight: 600;
    }
    .info-card p {
      color: var(--museum-text);
      font-size: 0.95rem;
      line-height: 1.5;
    }

    /* Collection Grid */
    .collection-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 40px;
    }
    .collection-item {
      background: #F8F9FA;
      padding: 20px;
      border-radius: 15px;
      text-align: center;
      border: 1px solid #E9ECEF;
      transition: all 0.3s ease;
    }
    .collection-item:hover {
      background: white;
      box-shadow: 0 10px 20px rgba(0,0,0,0.05);
      border-color: var(--gold-primary);
    }
    .collection-item i {
      color: var(--gold-primary);
      width: 32px;
      height: 32px;
      margin-bottom: 15px;
    }
    .collection-item span {
      display: block;
      color: var(--museum-dark);
      font-weight: 500;
      font-size: 1rem;
    }

  </style>
</head>
<body>

  <!-- NAVBAR -->
  <header class="premium-header">
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 5%; max-width: 1400px; margin: 0 auto;">
      <div onclick="window.location.href='../index.html'" style="cursor: pointer; display: flex; flex-direction: column;">
        <span style="font-family: 'Rubik', sans-serif; font-weight: 700; font-size: 1.5rem; color: #ff716e; letter-spacing: 2px;">GARÇA</span>
        <span style="font-family: 'Rubik', sans-serif; font-size: 0.8rem; color: #364ba3; text-transform: uppercase; letter-spacing: 1px;">Cidade de Culturas</span>
      </div>
      
      <nav class="nav-menu" style="display: flex; gap: 30px;">
        <a href="../index.html" class="nav-link" style="color: #475569; text-decoration: none; font-weight: 500; transition: color 0.3s;">Início</a>
        <a href="../emca/emca.html" class="nav-link" style="color: #475569; text-decoration: none; font-weight: 500; transition: color 0.3s;">EMCA</a>
        <a href="../biblioteca/biblioteca.html" class="nav-link" style="color: #475569; text-decoration: none; font-weight: 500; transition: color 0.3s;">Biblioteca</a>
        <a href="../teatro/teatro.html" class="nav-link" style="color: #475569; text-decoration: none; font-weight: 500; transition: color 0.3s;">Teatro</a>
        <a href="../museu/museu.html" class="nav-link" style="color: var(--gold-primary); text-decoration: none; font-weight: 600; transition: color 0.3s; position: relative;">Museu
          <span style="position: absolute; bottom: -5px; left: 0; width: 100%; height: 2px; background: var(--gold-primary); border-radius: 2px;"></span>
        </a>
      </nav>
    </div>
  </header>

  <!-- HERO -->
  <section class="museum-hero">
    <div class="hero-content">
      <span class="hero-subtitle">Preservando o Passado</span>
      <h1 class="hero-title">Museu Histórico<br>e Pedagógico</h1>
      <p class="hero-desc">Um mergulho profundo nas raízes, na memória artística e no desenvolvimento da nossa comunidade.</p>
    </div>
  </section>

  <!-- CONTENT -->
  <main class="museum-content">
    
    <!-- Left Column (Story & Collection) -->
    <div class="story-section glass-card">
      <h2>Nossa História</h2>
      <p>Inaugurado em 06/05/1995, o Museu Histórico e Pedagógico de Garça está instalado no prédio que foi a primeira Escola Pública da cidade, denominada Grupo Escolar de Garça. Este imponente edifício arquitetônico é testemunha silenciosa do crescimento da nossa gente.</p>
      <p>O prédio é antigo, de dois andares, e já assumiu múltiplos papéis na história local. Serviu como espaço para a primeira eleição do município, foi sede do Tiro de Guerra e abrigou o Centro Municipal de Cultura. Hoje, mantido com subsídios da Prefeitura Municipal de Garça, o Museu vive e respira através das preciosas doações da comunidade.</p>
      
      <h2 style="margin-top: 60px;">Sobre o Acervo</h2>
      <p>O acervo foi formado inicialmente com as generosas doações da família Labieno da Costa Machado, um dos fundadores da cidade. Ao longo do tempo, o museu enriqueceu-se imensamente ao receber doações de peças de outras famílias tradicionais e particulares apaixonados pela memória garcense.</p>
      <p>Em nosso espaço, os visitantes podem explorar coleções fascinantes que narram o desenvolvimento regional, a economia, curiosidades marcantes e a nossa viva memória artística.</p>

      <div class="collection-grid">
        <div class="collection-item">
          <i data-lucide="armchair"></i>
          <span>Mobiliário Antigo</span>
        </div>
        <div class="collection-item">
          <i data-lucide="type"></i>
          <span>Máquinas de Escrever</span>
        </div>
        <div class="collection-item">
          <i data-lucide="scroll-text"></i>
          <span>Documentos Históricos</span>
        </div>
        <div class="collection-item">
          <i data-lucide="newspaper"></i>
          <span>Jornais de Época</span>
        </div>
        <div class="collection-item">
          <i data-lucide="camera"></i>
          <span>Fotografias Inéditas</span>
        </div>
        <div class="collection-item">
          <i data-lucide="coins"></i>
          <span>Cédulas e Moedas</span>
        </div>
      </div>
    </div>

    <!-- Right Column (Sidebar Infos) -->
    <aside class="info-sidebar">
      <div class="info-card">
        <div class="icon-wrapper"><i data-lucide="map-pin"></i></div>
        <h3>Endereço</h3>
        <p>Rua Julio Prestes, nº 322<br>Bairro Willimans<br>Garça - SP</p>
      </div>

      <div class="info-card">
        <div class="icon-wrapper"><i data-lucide="clock"></i></div>
        <h3>Horário de Funcionamento</h3>
        <p>Segunda a Sexta-feira<br><strong>08:00 às 17:00</strong></p>
      </div>

      <div class="info-card">
        <div class="icon-wrapper"><i data-lucide="phone"></i></div>
        <h3>Telefone</h3>
        <p>(14) 3406-1971</p>
      </div>

      <div class="info-card">
        <div class="icon-wrapper"><i data-lucide="mail"></i></div>
        <h3>E-mail</h3>
        <p><a href="mailto:cultura@garca.sp.gov.br" style="color: var(--gold-primary); text-decoration: none;">cultura@garca.sp.gov.br</a></p>
      </div>
    </aside>

  </main>

  <script>
    lucide.createIcons();
  </script>
</body>
</html>`;

fs.writeFileSync(filePath, htmlContent, 'utf8');
console.log('Museu page completely redesigned!');
