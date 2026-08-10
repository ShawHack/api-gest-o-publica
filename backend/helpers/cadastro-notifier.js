const { notifyWhatsappMedia, notifyWhatsapp } = require('./whatsapp-notifier')

function publicAssetUrl(path) {
  const base = (process.env.APP_URL || 'https://api.garca.sp.gov.br').replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

function bannerUrl() {
  return process.env.CADASTRO_WHATSAPP_BANNER_URL || publicAssetUrl('/notificacao-banner/not-cadastro.png')
}

function whatsappEnabled() {
  const flag = String(process.env.CADASTRO_WHATSAPP_ENABLED || 'true').toLowerCase()
  return !(flag === 'false' || flag === '0' || flag === 'off')
}

async function notifyVerificationLink({ phone, name, link }) {
  if (!whatsappEnabled()) return { ignored: true }
  const caption = [
    `Olá, ${name || 'usuário'}!`,
    '',
    'Recebemos seu cadastro nos Sistemas SEMIT.',
    'Para liberar seu acesso, confirme seu e-mail pelo link abaixo (válido por 72 horas):',
    '',
    link,
    '',
    'Se você não solicitou este cadastro, ignore esta mensagem.',
    '',
    'Sistemas SEMIT — Prefeitura Municipal de Garça',
  ].join('\n')
  return notifyWhatsappMedia({
    phone,
    mediaUrl: bannerUrl(),
    caption,
    fileName: 'not-cadastro.png',
    module: 'cadastro',
  })
}

async function notifyAccessReleased({ phone, name }) {
  if (!whatsappEnabled()) return { ignored: true }
  const text = [
    `Olá, ${name || 'usuário'}!`,
    '',
    'Seu e-mail foi confirmado com sucesso.',
    'Seu acesso aos Sistemas SEMIT está liberado — você já pode fazer login.',
    '',
    'Sistemas SEMIT — Prefeitura Municipal de Garça',
  ].join('\n')
  // Prefer media+caption for consistency with branding
  return notifyWhatsappMedia({
    phone,
    mediaUrl: bannerUrl(),
    caption: text,
    fileName: 'not-cadastro.png',
    module: 'cadastro',
  })
}

module.exports = { notifyVerificationLink, notifyAccessReleased, bannerUrl }