#!/usr/bin/env node
/**
 * Envia alerta de uptime por e-mail (SMTP do backend/.env).
 * Uso: tail -40 log | docker compose exec -T api node scripts/send-uptime-alert.js down
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { sendMailDirect } = require('../helpers/mailer');

function recipients() {
  const raw =
    process.env.UPTIME_ALERT_EMAIL_TO ||
    process.env.COMPLIANCE_ALERT_EMAIL_TO ||
    process.env.SMTP_USER ||
    '';
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8').trim();
}

async function main() {
  const kind = (process.argv[2] || 'down').toLowerCase();
  const appName = process.env.APP_NAME || 'API SEMIT';
  const baseUrl = process.env.BASE_URL || process.env.APP_URL || 'https://api.garca.sp.gov.br';
  const toList = recipients();

  if (!toList.length) {
    console.error('[uptime-alert] Defina UPTIME_ALERT_EMAIL_TO no backend/.env');
    process.exit(1);
  }

  const snippet = await readStdin();
  const subject =
    kind === 'recovered'
      ? `[${appName}] RECUPERADO — monitoramento`
      : `[${appName}] ALERTA — falha no monitoramento`;

  const html = `
    <h2>${subject}</h2>
    <p><strong>Host:</strong> ${process.env.HOSTNAME || 'api-semit'}</p>
    <p><strong>URL:</strong> ${baseUrl}/readyz</p>
    <p><strong>Quando:</strong> ${new Date().toISOString()}</p>
    <p>Runbook: <code>docs/RUNBOOK-INCIDENTES.md</code></p>
    <pre style="background:#f4f4f4;padding:12px;white-space:pre-wrap">${snippet
      .replace(/</g, '&lt;')
      .slice(0, 12000)}</pre>
  `;

  const text = `${subject}\n\n${snippet}\n\nRunbook: docs/RUNBOOK-INCIDENTES.md`;

  for (const to of toList) {
    const r = await sendMailDirect({ to, subject, html, text });
    if (r?.error) {
      console.error('[uptime-alert] Falha ao enviar para', to, r.message);
      process.exit(1);
    }
    console.log('[uptime-alert] E-mail enviado para', to);
  }
}

main().catch((e) => {
  console.error('[uptime-alert]', e);
  process.exit(1);
});
