const Votation = require('../models/Votation')
const { buildVotationSlug } = require('./voting-slug')

async function ensureVotingSlugs(mongoose) {
  const VotationModel = mongoose?.models?.Votation || Votation
  const missing = await VotationModel.find({
    $or: [{ slug: { $exists: false } }, { slug: '' }, { slug: null }],
  })
    .select('_id title slug')
    .lean()

  for (const row of missing) {
    const slug = await buildVotationSlug(VotationModel, row.title, row._id)
    await VotationModel.updateOne({ _id: row._id }, { $set: { slug } })
  }

  return missing.length
}

module.exports = { ensureVotingSlugs }
