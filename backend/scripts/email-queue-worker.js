#!/usr/bin/env node
/**
 * Worker de e-mails — consome queue:email no Redis.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const { dequeue, QUEUE_EMAIL, queuesEnabled } = require('../helpers/job-queue')
const { sendMailDirect } = require('../helpers/mailer')

async function processOne() {
  const job = await dequeue(QUEUE_EMAIL, 5)
  if (!job) return false
  const { to, subject, html, text } = job
  const result = await sendMailDirect({ to, subject, html, text })
  if (result?.error) {
    console.error('[email-worker] falha', to, subject, result.message)
  } else if (result?.ignored) {
    console.warn('[email-worker] ignorado (SMTP off)', to, subject)
  } else {
    console.log(
      '[email-worker] ok',
      to,
      subject || '',
      result?.messageId || result?.response || ''
    )
  }
  return true
}

async function main() {
  if (!queuesEnabled()) {
    console.error('[email-worker] REDIS_URL não definido')
    process.exit(1)
  }
  console.log('[email-worker] Iniciado')
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await processOne()
    } catch (err) {
      console.error('[email-worker]', err?.message || err)
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
