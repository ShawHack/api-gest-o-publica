const { STATUS_LABELS } = require('./castration-constants')

function speciesLabel(animal) {
  if (animal.species === 'outro') return animal.speciesOther || 'Outro'
  if (animal.species === 'cachorro') return 'Cachorro'
  if (animal.species === 'gato') return 'Gato'
  return animal.species
}

function boolPt(v) {
  return v ? 'Sim' : 'Não'
}

function statusPillClass(status) {
  const map = {
    pendente: 'pill-warn',
    em_analise: 'pill-warn',
    aprovada: 'pill-ok',
    agendada: 'pill-ok',
    realizada: 'pill-ok',
    lista_de_espera: 'pill-info',
    recusada: 'pill-err',
    cancelada: 'pill-err',
  }
  return map[status] || 'pill-info'
}

function buildReceiptHtml({ request, campaign }) {
  const animalsRows = (request.animals || [])
    .map(
      (a, i) => `<tr>
        <td>${i + 1}</td>
        <td>${speciesLabel(a)}</td>
        <td>${a.name || '—'}</td>
        <td>${a.breed}</td>
        <td>${a.sex === 'femea' ? 'Fêmea' : 'Macho'}</td>
        <td>${a.weightKg} kg</td>
        <td>${boolPt(a.previouslyCastrated)}</td>
      </tr>`
    )
    .join('')

  const created = new Date(request.createdAt).toLocaleString('pt-BR')
  const status = STATUS_LABELS[request.status] || request.status
  const pillClass = statusPillClass(request.status)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Comprovante ${request.protocol}</title>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    :root {
      --gp-green: #446042;
      --gp-green-dark: #365233;
      --gp-green-soft: #ecf5eb;
      --gp-green-light: #749666;
      --gp-accent: #ed9756;
      --gp-accent-soft: #fff7ed;
      --gp-text: #1e293b;
      --gp-muted: #64748b;
      --gp-border: #e2e8f0;
      --gp-radius: 14px;
    }
    * { box-sizing: border-box; }
    body {
      font-family: Rubik, system-ui, sans-serif;
      color: var(--gp-text);
      margin: 0;
      padding: 24px 16px 40px;
      background: #f6f8f5;
      -webkit-font-smoothing: antialiased;
    }
    .receipt {
      max-width: 820px;
      margin: 0 auto;
      background: #fff;
      border-radius: var(--gp-radius);
      box-shadow: 0 8px 32px rgba(68, 96, 66, 0.1);
      overflow: hidden;
      border: 1px solid var(--gp-border);
    }
    .receipt-header {
      background: linear-gradient(135deg, var(--gp-green) 0%, var(--gp-green-dark) 100%);
      color: #fff;
      padding: 28px 28px 24px;
    }
    .receipt-brand {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }
    .receipt-brand h1 {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .receipt-brand .tag {
      display: inline-block;
      background: var(--gp-accent);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 5px 10px;
      border-radius: 999px;
    }
    .receipt-subtitle {
      margin: 0;
      font-size: 0.92rem;
      opacity: 0.92;
      font-weight: 400;
    }
    .receipt-body { padding: 24px 28px 28px; }
    .protocol-card {
      background: var(--gp-green-soft);
      border: 1px solid #c5d4c3;
      border-left: 4px solid var(--gp-green);
      border-radius: 10px;
      padding: 16px 18px;
      margin-bottom: 20px;
    }
    .protocol-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--gp-green);
      margin: 0 0 4px;
    }
    .protocol-value {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--gp-green-dark);
      letter-spacing: 0.02em;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 22px;
    }
    .meta-item {
      background: #fafdfb;
      border: 1px solid var(--gp-border);
      border-radius: 10px;
      padding: 12px 14px;
    }
    .meta-item strong {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--gp-green);
      margin-bottom: 4px;
      font-weight: 700;
    }
    .meta-item span { font-size: 0.92rem; color: var(--gp-text); }
    .pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }
    .pill-ok { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .pill-warn { background: var(--gp-accent-soft); color: #9a3412; border: 1px solid #fdba74; }
    .pill-info { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    .pill-err { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .section {
      border: 1px solid var(--gp-border);
      border-radius: 10px;
      margin-bottom: 18px;
      overflow: hidden;
    }
    .section-head {
      background: var(--gp-green-soft);
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 700;
      color: var(--gp-green);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #d4e5d2;
    }
    .section-body { padding: 16px; }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px 20px;
    }
    .info-row { font-size: 0.9rem; line-height: 1.45; }
    .info-row dt {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--gp-muted);
      margin: 0 0 2px;
    }
    .info-row dd { margin: 0; color: var(--gp-text); font-weight: 500; }
    .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
      min-width: 520px;
    }
    th, td {
      border-bottom: 1px solid var(--gp-border);
      padding: 10px 12px;
      text-align: left;
    }
    th {
      background: var(--gp-green-soft);
      color: var(--gp-green);
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover { background: #fafdfb; }
    .footer-note {
      margin: 20px 0 0;
      padding: 14px 16px;
      background: var(--gp-accent-soft);
      border: 1px solid #fdba74;
      border-radius: 10px;
      font-size: 0.85rem;
      color: #9a3412;
      line-height: 1.5;
    }
    .actions {
      margin-top: 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .btn-print {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 22px;
      border: none;
      border-radius: 10px;
      background: var(--gp-green);
      color: #fff;
      font-family: inherit;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(68, 96, 66, 0.28);
      transition: background 0.18s ease, transform 0.18s ease;
    }
    .btn-print:hover { background: var(--gp-green-dark); transform: translateY(-1px); }
    .btn-print:focus-visible { outline: 2px solid var(--gp-accent); outline-offset: 2px; }
    @media (max-width: 640px) {
      .receipt-header, .receipt-body { padding-left: 18px; padding-right: 18px; }
      .protocol-value { font-size: 1.15rem; }
    }
    @media print {
      body { background: #fff; padding: 0; }
      .receipt { box-shadow: none; border: none; border-radius: 0; }
      .no-print { display: none !important; }
      .receipt-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <header class="receipt-header">
      <div class="receipt-brand">
        <h1>Garça Pet · SAMA</h1>
        <span class="tag">Castração solidária</span>
      </div>
      <p class="receipt-subtitle">Prefeitura Municipal de Garça — Comprovante de solicitação</p>
    </header>

    <main class="receipt-body">
      <div class="protocol-card">
        <p class="protocol-label">Protocolo</p>
        <p class="protocol-value">${request.protocol}</p>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <strong>Data e hora</strong>
          <span>${created}</span>
        </div>
        <div class="meta-item">
          <strong>Status</strong>
          <span class="pill ${pillClass}">${status}</span>
        </div>
        ${campaign?.name ? `<div class="meta-item"><strong>Campanha</strong><span>${campaign.name}</span></div>` : ''}
        ${campaign?.surgeryDate ? `<div class="meta-item"><strong>Data da cirurgia</strong><span>${new Date(campaign.surgeryDate).toLocaleDateString('pt-BR')}</span></div>` : ''}
        ${campaign?.location ? `<div class="meta-item"><strong>Local</strong><span>${campaign.location}</span></div>` : ''}
      </div>

      <section class="section">
        <div class="section-head">Solicitante</div>
        <div class="section-body">
          <dl class="info-grid">
            <div class="info-row"><dt>Nome</dt><dd>${request.applicant?.name || '—'}</dd></div>
            <div class="info-row"><dt>CPF</dt><dd>${request.applicant?.cpf || '—'}</dd></div>
            <div class="info-row"><dt>Telefone</dt><dd>${request.applicant?.phone || '—'}</dd></div>
            <div class="info-row"><dt>WhatsApp</dt><dd>${request.applicant?.whatsapp || '—'}</dd></div>
            <div class="info-row"><dt>E-mail</dt><dd>${request.applicant?.email || '—'}</dd></div>
            <div class="info-row"><dt>Cidade</dt><dd>${request.applicant?.city || '—'}</dd></div>
            <div class="info-row" style="grid-column:1/-1"><dt>Endereço</dt><dd>${request.applicant?.address || '—'}</dd></div>
          </dl>
        </div>
      </section>

      <section class="section">
        <div class="section-head">Animais (${request.animalCount})</div>
        <div class="section-body table-wrap">
          <table>
            <thead><tr><th>#</th><th>Espécie</th><th>Nome</th><th>Raça</th><th>Sexo</th><th>Peso</th><th>Castrado?</th></tr></thead>
            <tbody>${animalsRows}</tbody>
          </table>
        </div>
      </section>

      <p class="footer-note">Guarde este comprovante. Em caso de dúvidas, contate a SAMA ou a Secretaria responsável pela campanha.</p>

      <div class="actions no-print">
        <button type="button" class="btn-print" onclick="window.print()">Imprimir / Salvar PDF</button>
      </div>
    </main>
  </div>
</body>
</html>`
}

module.exports = { buildReceiptHtml }
