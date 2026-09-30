const mongoose = require('../db/conn')
const Votation = require('../models/Votation')
const VotingElectorateBase = require('../models/VotingElectorateBase')
const VotingElector = require('../models/VotingElector')
const VotingServidor = require('../models/VotingServidor')
const { tallyElection } = require('../helpers/voting-election-service')

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)
  const votations = await Votation.find({ title: /CIPA/i }).sort({ createdAt: -1 }).lean()
  for (const votation of votations) {
    const base = votation.electorateBaseId
      ? await VotingElectorateBase.findById(votation.electorateBaseId).lean()
      : null
    const activeElectors = base
      ? await VotingElector.countDocuments({ electorateBaseId: base._id, active: { $ne: false } })
      : await VotingServidor.countDocuments({ active: { $ne: false } })
    const tally = await tallyElection(votation._id)
    console.log(JSON.stringify({
      id: String(votation._id),
      title: votation.title,
      status: votation.status,
      electorateBaseId: votation.electorateBaseId ? String(votation.electorateBaseId) : null,
      baseName: base?.name || 'BASE GLOBAL LEGADA',
      activeElectors,
      tallyEligible: tally.eligibleVoters,
      participants: tally.participants,
    }))
  }
  await mongoose.disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
