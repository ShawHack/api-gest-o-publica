require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('mongoose')
const validateCPF = require('../helpers/validate-cpf')
const { onlyDigits, computeCpfHash, cpfLast4 } = require('../helpers/voting-identity-hash')
const VotingElectorateBase = require('../models/VotingElectorateBase')
const VotingElector = require('../models/VotingElector')

async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, ''))
}

async function main() {
  const payload = await readStdin()
  const name = String(payload.name || '').trim()
  const sourceRows = Array.isArray(payload.rows) ? payload.rows : []
  if (name.length < 3) throw new Error('Nome da base inválido')

  const seenCpf = new Set()
  const seenIdentifier = new Set()
  const valid = []
  let invalid = 0
  let duplicate = 0
  for (const raw of sourceRows) {
    const cpf = onlyDigits(raw.cpf)
    const identifier = String(raw.identifier || '').trim()
    const personName = String(raw.name || '').trim()
    if (!personName || !identifier || !validateCPF(cpf)) { invalid += 1; continue }
    const cpfHash = computeCpfHash(cpf)
    if (seenCpf.has(cpfHash) || seenIdentifier.has(identifier)) { duplicate += 1; continue }
    seenCpf.add(cpfHash)
    seenIdentifier.add(identifier)
    valid.push({
      identifier,
      name: personName,
      cpfHash,
      cpfLast4: cpfLast4(cpf),
      identityHash: computeCpfHash(`${cpf}|${identifier}`),
      group: 'SAAE',
      active: true,
    })
  }
  if (!valid.length) throw new Error('Nenhum eleitor válido')

  await mongoose.connect(process.env.MONGODB_URI)
  const existing = await VotingElectorateBase.findOne({ name })
  if (existing) {
    const count = await VotingElector.countDocuments({ electorateBaseId: existing._id })
    console.log(JSON.stringify({ status: 'already_exists', baseId: String(existing._id), imported: count, invalid, duplicate }))
    return
  }

  const session = await mongoose.startSession()
  let result
  try {
    await session.withTransaction(async () => {
      const [base] = await VotingElectorateBase.create([{
        name,
        description: 'Servidores públicos do Serviço Autônomo de Águas e Esgotos de Garça — importação administrativa.',
        type: 'imported',
      }], { session })
      await VotingElector.insertMany(valid.map((row) => ({ ...row, electorateBaseId: base._id })), { session, ordered: true })
      result = { status: 'created', baseId: String(base._id), imported: valid.length, invalid, duplicate }
    })
  } finally {
    await session.endSession()
  }
  console.log(JSON.stringify(result))
}

main().catch((err) => {
  console.error(JSON.stringify({ status: 'error', message: err.message }))
  process.exitCode = 1
}).finally(async () => mongoose.disconnect())
