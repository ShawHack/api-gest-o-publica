#!/usr/bin/env node
/* Inventário somente leitura. Não cria, atualiza ou remove documentos. */
const admin = require('firebase-admin')
const { analyzeAgendaInventory } = require('../helpers/agenda-migration-inventory')

function credential() {
  const raw = process.env.AGENDA_FIREBASE_SERVICE_ACCOUNT_JSON
  return raw ? admin.credential.cert(JSON.parse(raw)) : admin.credential.applicationDefault()
}

async function main() {
  const projectId = process.env.AGENDA_FIREBASE_PROJECT_ID
  if (!projectId) throw new Error('AGENDA_FIREBASE_PROJECT_ID é obrigatória.')
  const app = admin.apps.find((item) => item.name === 'agenda-inventory') || admin.initializeApp({
    credential: credential(), projectId,
  }, 'agenda-inventory')
  const firestore = admin.firestore(app)

  const [appointmentSnapshot, serviceSnapshot] = await Promise.all([
    firestore.collection('appointments').get(),
    firestore.collection('services').get(),
  ])

  const User = require('../models/User')
  const centralUsers = await User.find({ active: { $ne: false } }).select('_id email').lean()
  const report = analyzeAgendaInventory({
    appointments: appointmentSnapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() })),
    services: serviceSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    centralUsers,
  })

  const includeRecords = process.argv.includes('--include-records')
  process.stdout.write(`${JSON.stringify(includeRecords ? report : { summary: report.summary }, null, 2)}\n`)
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((error) => {
    process.stderr.write(`Inventário não executado: ${error.message}\n`)
    process.exit(1)
  })
}

module.exports = { main }
