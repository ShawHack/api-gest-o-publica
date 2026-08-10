const { computeCpfHash, cpfLast4 } = require('./voting-identity-hash')

/**
 * Migra servidores de votação: remove CPF em claro, grava cpfHash + cpfLast4.
 */
async function ensureVotingCpfHash(mongoose) {
  const VotingServidor = mongoose.model('VotingServidor')
  const legacy = await VotingServidor.find({
    $or: [
      { cpf: { $exists: true, $nin: [null, ''] } },
      { cpfHash: { $exists: false } },
      { cpfHash: null },
      { cpfHash: '' },
    ],
  })
    .select('+cpf cpfHash cpfLast4')
    .lean()
    .then((rows) => rows.filter((r) => r.cpf && !r.cpfHash))

  if (!legacy.length) return { migrated: 0 }

  let migrated = 0
  for (const row of legacy) {
    const cpfClean = String(row.cpf || '').replace(/\D/g, '')
    if (!cpfClean) continue
    await VotingServidor.updateOne(
      { _id: row._id },
      {
        $set: {
          cpfHash: computeCpfHash(cpfClean),
          cpfLast4: cpfLast4(cpfClean),
        },
        $unset: { cpf: '' },
      }
    )
    migrated += 1
  }

  if (migrated > 0) {
    console.log(`[Voting CPF] Migrados ${migrated} registro(s) para cpfHash (CPF em claro removido).`)
  }
  return { migrated }
}

module.exports = { ensureVotingCpfHash }
