/**
 * Corrige índice único de chip: sparse indexa `null` e impede vários pets sem chip.
 * - Remove chip vazio/null dos documentos existentes
 * - Recria índice único apenas para chips preenchidos (partialFilterExpression)
 */
async function ensurePetChipIndex(mongoose) {
    const conn = mongoose.connection
    if (conn.readyState !== 1) return

    const coll = conn.collection('pets')
    if (!coll) return

    const cleanup = await coll.updateMany(
        {
            $or: [
                { chip: null },
                { chip: '' },
                { chip: { $regex: /^\s*$/ } },
            ],
        },
        { $unset: { chip: '' } }
    )

    if (cleanup.modifiedCount > 0) {
        console.log(`[Pet chip] Removido campo chip vazio de ${cleanup.modifiedCount} pet(s).`)
    }

    const indexes = await coll.indexes()
    const chipIndex = indexes.find((idx) => idx.key && idx.key.chip === 1)
    const wantsPartial = chipIndex?.partialFilterExpression != null

    if (chipIndex && !wantsPartial) {
        try {
            await coll.dropIndex(chipIndex.name)
            console.log(`[Pet chip] Índice antigo removido: ${chipIndex.name}`)
        } catch (err) {
            console.warn('[Pet chip] Falha ao remover índice chip:', err.message)
        }
    }

    const hasPartialChipIndex = (await coll.indexes()).some(
        (idx) => idx.key && idx.key.chip === 1 && idx.partialFilterExpression
    )

    if (!hasPartialChipIndex) {
        await coll.createIndex(
            { chip: 1 },
            {
                unique: true,
                name: 'chip_1',
                partialFilterExpression: {
                    chip: { $exists: true, $gt: '' },
                },
            }
        )
        console.log('[Pet chip] Índice único parcial (chip preenchido) criado.')
    }
}

module.exports = { ensurePetChipIndex }
