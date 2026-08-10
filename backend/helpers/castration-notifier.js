const { sendMail } = require('./mailer')
const { STATUS_LABELS } = require('./castration-constants')
const User = require('../models/User')

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())

function panelUrl(path) {
  const base = (process.env.APP_URL || 'https://api.garca.sp.gov.br').replace(/\/$/, '')
  return `${base}/garcapet${path.startsWith('/') ? path : `/${path}`}`
}

async function getSamaNotifyEmails() {
  const envList = String(process.env.CASTRATION_SAMA_NOTIFY_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(isValidEmail)
  if (envList.length) return envList
  const users = await User.find({ role: 'sama', emailVerified: true }).select('email').lean()
  return users.map((u) => u.email).filter(isValidEmail)
}

async function notifyApplicantSubmitted({ request, campaign }) {
  const email = request.applicant?.email
  if (!isValidEmail(email)) return
  const text = [
    `Olá ${request.applicant.name || 'cidadão'},`,
    '',
    'Sua solicitação de castração foi registrada com sucesso.',
    `Protocolo: ${request.protocol}`,
    `Animais: ${request.animalCount}`,
    campaign?.surgeryDate ? `Data prevista da campanha: ${new Date(campaign.surgeryDate).toLocaleDateString('pt-BR')}` : null,
    campaign?.location ? `Local: ${campaign.location}` : null,
    '',
    'Acompanhe o status em Garça Pet > Minhas solicitações de castração.',
    panelUrl('/castracao'),
  ]
    .filter(Boolean)
    .join('\n')
  await sendMail({
    to: email,
    subject: `Solicitação de castração registrada — ${request.protocol}`,
    text,
    html: text.replace(/\n/g, '<br/>'),
  })
}

async function notifySamaNewRequest({ request }) {
  const emails = await getSamaNotifyEmails()
  if (!emails.length) return
  const text = [
    'Nova solicitação de castração recebida.',
    `Protocolo: ${request.protocol}`,
    `Solicitante: ${request.applicant?.name || '-'}`,
    `Telefone: ${request.applicant?.phone || '-'}`,
    `Animais: ${request.animalCount}`,
    '',
    panelUrl('/admin/castracao-solicitacoes'),
  ].join('\n')
  await sendMail({
    to: emails.join(','),
    subject: `[SAMA] Nova castração — ${request.protocol}`,
    text,
    html: text.replace(/\n/g, '<br/>'),
  })
}

async function notifyApplicantStatusChange({ request, note }) {
  const email = request.applicant?.email
  if (!isValidEmail(email)) return
  const label = STATUS_LABELS[request.status] || request.status
  const lines = [
    `Olá ${request.applicant.name || 'cidadão'},`,
    '',
    `Atualização da solicitação ${request.protocol}.`,
    `Novo status: ${label}`,
  ]
  if (request.status === 'agendada' && request.scheduledAt) {
    lines.push(`Data: ${new Date(request.scheduledAt).toLocaleString('pt-BR')}`)
    if (request.scheduledLocation) lines.push(`Local: ${request.scheduledLocation}`)
  }
  if (request.status === 'recusada' && request.refusalReason) {
    lines.push(`Motivo: ${request.refusalReason}`)
  }
  if (note) lines.push('', note)
  lines.push('', panelUrl('/castracao'))
  const text = lines.join('\n')
  await sendMail({
    to: email,
    subject: `Castração ${request.protocol} — ${label}`,
    text,
    html: text.replace(/\n/g, '<br/>'),
  })
}

module.exports = {
  notifyApplicantSubmitted,
  notifySamaNewRequest,
  notifyApplicantStatusChange,
}
