rm -f scripts/smtp-check.js
cat > scripts/smtp-check.js <<'EOF'
'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const nodemailer = require('nodemailer');

const env = (k, d='') => process.env[k] ?? d;
const asBool = (v, d=false) => String(v ?? d).toLowerCase() === 'true';

(async () => {
  try {
    const host   = env('SMTP_HOST',  'webmail.garca.sp.gov.br');
    const port   = Number(env('SMTP_PORT', '587'));
    const secure = asBool(env('SMTP_SECURE'), false);       // 465=true, 587=false
    const reqTLS = !secure && asBool(env('SMTP_REQUIRE_TLS'), true);

    const t = nodemailer.createTransport({
      host, port, secure, requireTLS: reqTLS,
      name: env('SMTP_NAME') || undefined,                  // EHLO FQDN opcional
      auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
      tls: {
        // IMPORTANTE: se o cert é para webmail.garca.sp.gov.br,
        // mantenha o SNI coerente:
        servername: 'webmail.garca.sp.gov.br',
        rejectUnauthorized: asBool(env('SMTP_TLS_REJECT_UNAUTH'), true),
        minVersion: 'TLSv1.2',
      },
      logger: true,
      debug: true,
      connectionTimeout: 20000,
      socketTimeout: 25000,
      greetingTimeout: 15000,
    });

    console.log('>> VERIFY...');
    await t.verify();
    console.log('OK: conectado/autenticado.');

    console.log('>> SEND test...');
    const info = await t.sendMail({
      from: env('MAIL_FROM') || `"Prefeitura de Garça" <${env('SMTP_USER')}>`,
      to: env('SMTP_USER'),
      subject: 'Teste SMTP (ApiCemiterio)',
      text: 'Se você recebeu isto, o SMTP está OK.',
    });
    console.log('ENVIADO:', info.messageId, info.accepted);
    process.exit(0);
  } catch (err) {
    console.error('FALHA SMTP:', { code: err.code, command: err.command, response: err.response });
    console.error(err);
    process.exit(1);
  }
})();
EOF
