const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'museu', 'museu.html');
let content = fs.readFileSync(filePath, 'utf8');

const oldAbout = /<div class="about-card">[\s\S]*?<\/div>/;

const newAbout = `<div class="about-card">
        <h2>Nossa História</h2>
        <p>Inaugurado em 06/05/1995, o Museu Histórico e Pedagógico de Garça está instalado no prédio que foi a primeira Escola Pública da cidade, denominada Grupo Escolar de Garça. Este prédio serviu também como local para a primeira eleição do município. O prédio é antigo, de dois andares, foi também sede do Tiro de Guerra, além do Centro Municipal de Cultura. É mantido com subsídios da Prefeitura Municipal de Garça e seu acervo é formado por doações da comunidade.</p>
        
        <h2 style="margin-top: 40px;">Sobre o Acervo</h2>
        <p>O acervo foi formado inicialmente com as doações da família Labieno da Costa Machado, um dos fundadores da cidade, mas ao longo do tempo o museu recebeu doações de peças de outras famílias e particulares. O acervo é composto por mobiliário, máquinas de escrever, documentos, jornais, fotografias, cédulas e moedas.</p>
        <p>Em nosso espaço, os visitantes também podem explorar coleções sobre economia e desenvolvimento, curiosidades, memória artística, dentre outros.</p>
      </div>`;

content = content.replace(oldAbout, newAbout);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Museu content updated!');
