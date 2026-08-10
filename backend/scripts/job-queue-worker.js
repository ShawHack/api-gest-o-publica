#!/usr/bin/env node
/**
 * Worker de jobs gerais (ex.: refresh medicamentos/PDF + WhatsApp + auto-close votação).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const mongoose = require('mongoose')
const { dequeue, QUEUE_JOBS, queuesEnabled } = require('../helpers/job-queue')

const VOTACAO_AUTO_CLOSE_MS = Math.max(
  15_000,
  Number(process.env.VOTACAO_AUTO_CLOSE_INTERVAL_MS || 60_000) || 60_000
)

function whatsappErrorText(result) {
  const msg = result?.message
  if (Array.isArray(msg)) return msg.map(String).join(' ')
  return String(msg || '')
}

function isTransientWhatsappError(result) {
  if (!result?.error) return false
  const text = whatsappErrorText(result).toLowerCase()
  return (
    text.includes('connection closed') ||
    text.includes('timeout') ||
    text.includes('econnrefused') ||
    text.includes('econnreset') ||
    text.includes('socket hang up') ||
    result.statusCode === 503 ||
    result.statusCode === 429
  )
}

async function runJob(job) {
  if (job.type === 'medicamentos:refresh') {
    const MedicamentosController = require('../controllers/MedicamentosController')
    const fakeReq = { user: { role: 'admin', id: 'queue-worker' } }
    const fakeRes = {
      statusCode: 200,
      status(code) {
        this.statusCode = code
        return this
      },
      json(body) {
        console.log('[job-worker] medicamentos:refresh', this.statusCode, body?.message || '')
      },
    }
    await MedicamentosController.refresh(fakeReq, fakeRes)
    return
  }
  if (job.type === 'whatsapp.sendText' || job.type === 'whatsapp.sendMedia') {
    const { processWhatsappJob } = require('../helpers/whatsapp-notifier')
    const { enqueue } = require('../helpers/job-queue')
    const result = await processWhatsappJob(job)
    const attempts = Number(job.attempts || 0)
    const maxAttempts = Number(process.env.WHATSAPP_JOB_MAX_ATTEMPTS || 5) || 5

    if (isTransientWhatsappError(result) && attempts < maxAttempts) {
      const nextAttempt = attempts + 1
      const delayMs = Math.min(30_000, 2_000 * nextAttempt)
      console.warn(
        `[job-worker] ${job.type} transient fail → requeue attempt=${nextAttempt}/${maxAttempts} in ${delayMs}ms`,
        whatsappErrorText(result),
        job.number || ''
      )
      await new Promise((r) => setTimeout(r, delayMs))
      await enqueue(QUEUE_JOBS, { ...job, attempts: nextAttempt })
      return
    }

    console.log(
      `[job-worker] ${job.type}`,
      result.error ? whatsappErrorText(result) : 'ok',
      job.number || ''
    )
    // Evita rajada na Evolution (Connection Closed sob carga).
    const paceMs = Math.max(0, Number(process.env.WHATSAPP_JOB_PACE_MS || 250) || 250)
    if (paceMs) await new Promise((r) => setTimeout(r, paceMs))
    return
  }
  if (job.type === 'votacao:autoClose') {
    const { closeExpiredVotations } = require('../helpers/votacao-auto-close')
    const result = await closeExpiredVotations()
    console.log(
      '[job-worker] votacao:autoClose',
      `checked=${result.checked} closed=${result.closed.length}`
    )
    return
  }
  console.warn('[job-worker] Tipo desconhecido:', job.type)
}

async function tickVotacaoAutoClose() {
  try {
    const { closeExpiredVotations } = require('../helpers/votacao-auto-close')
    const result = await closeExpiredVotations()
    if (result.closed.length) {
      console.log(
        '[job-worker] votacao auto-close',
        result.closed.map((c) => `${c.title}:sent=${c.whatsapp?.sent ?? 0}`).join(', ')
      )
    }
  } catch (err) {
    console.error('[job-worker] votacao auto-close:', err?.message || err)
  }
}

async function main() {
  if (!queuesEnabled()) {
    console.error('[job-worker] REDIS_URL não definido')
    process.exit(1)
  }
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('[job-worker] MONGODB_URI ausente')
    process.exit(1)
  }
  await mongoose.connect(uri)
  console.log('[job-worker] Iniciado (Mongo conectado)')
  console.log(`[job-worker] votacao auto-close a cada ${VOTACAO_AUTO_CLOSE_MS}ms`)

  // Roda na subida (cobre pleitos que já passaram do endDate sem PATCH manual).
  await tickVotacaoAutoClose()
  setInterval(tickVotacaoAutoClose, VOTACAO_AUTO_CLOSE_MS)

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const job = await dequeue(QUEUE_JOBS, 10)
      if (job) await runJob(job)
    } catch (err) {
      console.error('[job-worker]', err?.message || err)
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
