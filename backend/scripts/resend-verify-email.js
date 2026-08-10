#!/usr/bin/env node
/**
 * Reenvia e-mail de verificação (sendMailDirect) e imprime resposta SMTP.
 * Uso: node scripts/resend-verify-email.js [email]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('mongoose')
const { sendMailDirect } = require('../helpers/mailer')

const emailArg = String(process.argv[2] || 'saulovlima36@gmail.com')
  .trim()
  .toLowerCase()

;(async () => {
  await mongoose.connect(process.env.MONGODB_URI)
  const User = require('../models/User')
  const user = await User.findOne({ email: emailArg })
  if (!user) throw new Error('user not found: ' + emailArg)
  if (user.emailVerified) {
    console.log('already_verified')
    await mongoose.disconnect()
    return
  }
  if (!user.emailVerifyToken) throw new Error('missing emailVerifyToken')

  const base = (process.env.APP_URL || 'https://api.garca.sp.gov.br').replace(/\/$/, '')
  const link = `${base}/auth/verify-email?token=${user.emailVerifyToken}&email=${encodeURIComponent(user.email)}`
  console.log('to', user.email)
  console.log('MAIL_FROM', process.env.MAIL_FROM)
  console.log('SMTP_HOST', process.env.SMTP_HOST)
  console.log('link', link)

  const r = await sendMailDirect({
    to: user.email,
    subject: 'Confirme seu e-mail',
    html: `<p>Olá ${user.name},</p><p>Confirme seu e-mail clicando no link abaixo (válido por 72 horas):</p><p><a href="${link}">${link}</a></p>`,
    text: `Olá ${user.name},\n\nConfirme seu e-mail (válido por 72 horas):\n${link}\n`,
  })
  console.log('smtp_result', JSON.stringify(r, null, 2))
  await mongoose.disconnect()
})().catch(async (e) => {
  console.error('FATAL', e)
  try {
    await mongoose.disconnect()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
