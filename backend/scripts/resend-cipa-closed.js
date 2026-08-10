/**
 * One-shot: limpa idempotência closed da Votação CIPA e reenfileira WhatsApp.
 * Uso: node scripts/resend-cipa-closed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('mongoose')

const VID = process.env.RESEND_VOTATION_ID || '6a6cf1f0c7f1811250868767'

;(async () => {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI missing')
  await mongoose.connect(uri)

  const VotacaoNotifyDelivery = require('../models/VotacaoNotifyDelivery')
  const Votation = require('../models/Votation')
  const { notifyElectionClosed } = require('../helpers/votacao-notifier')
  const evolution = require('../helpers/evolution-client')

  const state = await evolution.getConnectionState()
  const waState = state?.data?.instance?.state
  console.log('evolution.state=', waState)
  if (waState !== 'open') {
    console.error('ABORT: Evolution não está open')
    process.exit(2)
  }

  const v = await Votation.findById(VID)
  if (!v) throw new Error('votation not found: ' + VID)
  console.log('votation=', v.title, v.status, String(v._id))

  const del = await VotacaoNotifyDelivery.deleteMany({ votationId: String(v._id), event: 'closed' })
  console.log('cleared_closed_keys=', del.deletedCount)

  const whatsapp = await notifyElectionClosed({ votation: v.toObject() })
  console.log('notify_result=', JSON.stringify(whatsapp))

  await mongoose.disconnect()
  process.exit(0)
})().catch(async (err) => {
  console.error('FATAL', err)
  try {
    await mongoose.disconnect()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
