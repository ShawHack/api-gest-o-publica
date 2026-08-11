'use strict'

const fs = require('fs')

const file = process.argv[2]
if (!file) {
  throw new Error('Informe o caminho do dashboard-app.html')
}

let html = fs.readFileSync(file, 'utf8')

if (!html.includes('class="card card-rural"')) {
  const cssAnchor = `        .card-ferramentas {
            --card-color-1: #3b4ea0;
            --card-color-2: #ed9756;
        }
`
  const ruralCss = `${cssAnchor}
        .card-rural {
            --card-color-1: #166534;
            --card-color-2: #84cc16;
        }
`
  if (!html.includes(cssAnchor)) throw new Error('Âncora CSS não encontrada')
  html = html.replace(cssAnchor, ruralCss)

  const cardsEnd = `        </div>

        <section class="charts-section">`
  const ruralCard = `            <!-- Card 15: Estradas Rurais -->
            <a href="/rotas-rurais/login" class="card card-rural">
                <span class="card-icon">🌾</span>
                <h2 class="card-title">Estradas Rurais</h2>
                <p class="card-description">
                    Cadastro e gerenciamento de propriedades rurais e acesso do produtor.
                </p>
                <span class="card-badge badge-new">Novo</span>
            </a>
        </div>

        <section class="charts-section">`
  if (!html.includes(cardsEnd)) throw new Error('Fim da grade de cards não encontrado')
  html = html.replace(cardsEnd, ruralCard)
}

html = html.replace(
  /(<span class="stat-value">)13(<\/span>\s*<span class="stat-label">Aplicações<\/span>)/,
  '$114$2'
)

if (!html.includes('href="/rotas-rurais/login"')) {
  throw new Error('O link do portal rural não foi incluído')
}

fs.writeFileSync(file, html, 'utf8')
console.log('Card Estradas Rurais presente e contador atualizado.')
