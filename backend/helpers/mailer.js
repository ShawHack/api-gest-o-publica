let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch {
  console.warn('[mailer] nodemailer não instalado. E-mails serão ignorados.');
}

const env = (k, d='') => process.env[k] ?? d;
const asBool = (v, d=false) => String(v ?? d).toLowerCase() === 'true';

const hasSMTP = !!env('SMTP_HOST') && !!env('SMTP_USER') && !!env('SMTP_PASS');

let transporter = null;

function buildTransporter() {
  if (!nodemailer || !hasSMTP) return null;

  const secure     = asBool(env('SMTP_SECURE'));               // 465 -> true
  const requireTLS = asBool(env('SMTP_REQUIRE_TLS'), !secure); // 587 costuma ser true
  const rejectUna  = asBool(env('SMTP_TLS_REJECT_UNAUTH'), true);
  const sniName    = env('SMTP_TLS_SERVERNAME', env('SMTP_HOST')); // força SNI se preciso

  const t = nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port: Number(env('SMTP_PORT', secure ? 465 : 587)),
    secure,
    requireTLS,
    name: env('SMTP_NAME') || undefined, // EHLO/HELO (FQDN)
    auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },

    // Conexões
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    connectionTimeout: 20000,
    socketTimeout: 20000,
    greetingTimeout: 10000,

    // TLS
    tls: {
      servername: sniName,          // ex.: webmail.garca.sp.gov.br
      rejectUnauthorized: rejectUna
    },

    logger: asBool(env('SMTP_DEBUG'))
  });

  return t;
}

function getTransporter() {
  if (transporter) return transporter;
  transporter = buildTransporter();
  if (!transporter) console.warn('[mailer] SMTP não configurado; envios serão ignorados.');
  return transporter;
}

// NUNCA derruba a aplicação: sempre captura erro
async function sendMailDirect({ to, subject, html, text }) {
  const tx = getTransporter();
  if (!tx) {
    console.warn('[mailer] Sem transporter. Ignorando envio.', { to, subject });
    return { ignored: true };
  }
  try {
    return await tx.sendMail({
      from: env('MAIL_FROM', '"Prefeitura M. de Garça" <no-reply@garca.sp.gov.br>'),
      to,
      subject,
      html,
      text
    });
  } catch (err) {
    console.error('[mailer] Falha ao enviar e-mail:', err?.message || err);
    return { error: true, message: err?.message || String(err) };
  }
}

async function sendMail(payload) {
  const { queuesEnabled, enqueue, QUEUE_EMAIL } = require('./job-queue');
  if (queuesEnabled()) {
    const ok = await enqueue(QUEUE_EMAIL, payload);
    // Fila ≠ entrega. Callers que precisam de certeza (cadastro/verificação/reset)
    // devem usar sendMailDirect.
    if (ok) return { queued: true };
  }
  return sendMailDirect(payload);
}

/** True só quando o SMTP aceitou (não conta `{ queued: true }` da fila). */
function isMailAccepted(result) {
  if (!result || result.error || result.ignored || result.queued) return false
  return true
}

module.exports = { sendMail, sendMailDirect, isMailAccepted };
