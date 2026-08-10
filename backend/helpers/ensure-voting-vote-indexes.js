/**
 * Corrige índice único votationId+userHash: versão antiga indexava userHash null
 * e impedia múltiplos votos anônimos (cédula v2, um por categoria).
 */
async function ensureVotingVoteIndexes(mongoose) {
  const conn = mongoose.connection
  if (conn.readyState !== 1) return

  const coll = conn.collection('votes')
  if (!coll) return

  const cleanup = await coll.updateMany(
    {
      ballotVersion: 2,
      $or: [{ userHash: null }, { userHash: '' }],
    },
    { $unset: { userHash: '' } }
  )
  if (cleanup.modifiedCount > 0) {
    console.log(`[Voting votes] userHash removido de ${cleanup.modifiedCount} voto(s) v2.`)
  }

  const indexes = await coll.indexes()
  const legacy = indexes.find((idx) => idx.key?.votationId === 1 && idx.key?.userHash === 1)
  const hasPartial = legacy?.partialFilterExpression != null

  if (legacy && !hasPartial) {
    try {
      await coll.dropIndex(legacy.name)
      console.log(`[Voting votes] Índice antigo removido: ${legacy.name}`)
    } catch (err) {
      console.warn('[Voting votes] Falha ao remover índice:', err.message)
    }
  }

  const refreshed = await coll.indexes()
  const ok = refreshed.some(
    (idx) =>
      idx.key?.votationId === 1 &&
      idx.key?.userHash === 1 &&
      idx.partialFilterExpression &&
      idx.unique
  )

  if (!ok) {
    await coll.createIndex(
      { votationId: 1, userHash: 1 },
      {
        unique: true,
        name: 'votationId_1_userHash_1',
        partialFilterExpression: { userHash: { $exists: true, $type: 'string', $gt: '' } },
      }
    )
    console.log('[Voting votes] Índice único parcial votationId+userHash criado.')
  }
}

module.exports = { ensureVotingVoteIndexes }
