/**
 * Encerra pleitos cujo endDate já passou e dispara WhatsApp (só quem votou).
 * Pensado para rodar periodicamente no job-worker.
 */
const Votation = require('../models/Votation')

/**
 * @returns {Promise<{ checked: number, closed: Array<{ id: string, title: string }> }>}
 */
async function closeExpiredVotations({ now = new Date() } = {}) {
  const expired = await Votation.find({
    status: 'active',
    endDate: { $lte: now },
  }).lean()

  const closed = []

  for (const vot of expired) {
    const updated = await Votation.findOneAndUpdate(
      { _id: vot._id, status: 'active' },
      { $set: { status: 'closed' } },
      { new: true }
    )

    if (!updated) continue

    /* O encerramento altera somente o estado do pleito. Nenhuma notificação é enviada. */
    /*
      console.log(
        `[votacao-auto-close] Encerrado "${updated.title}" (${updated._id}) → whatsapp sent=${whatsapp?.sent ?? 0}/${whatsapp?.total ?? 0}`
      )
    } catch (err) {
      whatsapp = { error: true, message: err?.message || String(err) }
      console.error(
        `[votacao-auto-close] WhatsApp falhou para ${updated._id}:`,
        err?.message || err
      )
    }
    */

    closed.push({
      id: String(updated._id),
      title: updated.title,
      slug: updated.slug,
      endDate: updated.endDate,
    })
  }

  return { checked: expired.length, closed }
}

module.exports = {
  closeExpiredVotations,
}
