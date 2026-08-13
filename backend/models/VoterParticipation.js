const mongoose = require('../db/conn')
const { Schema } = mongoose

/** Registro de comparecimento — sem vínculo recuperável com escolhas de voto. */
const VoterParticipationSchema = new Schema(
  {
    votationId: { type: Schema.Types.ObjectId, ref: 'Votation', required: true, index: true },
    servidorId: { type: Schema.Types.ObjectId, ref: 'VotingServidor', index: true },
    electorId: { type: Schema.Types.ObjectId, ref: 'VotingElector', index: true },
    electorateType: { type: String, enum: ['legacy_servidores', 'imported'], default: 'legacy_servidores' },
    votedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

VoterParticipationSchema.index({ votationId: 1, servidorId: 1 }, { unique: true })
VoterParticipationSchema.index(
  { votationId: 1, electorId: 1 },
  { unique: true, partialFilterExpression: { electorId: { $type: 'objectId' } } },
)

module.exports = mongoose.model('VoterParticipation', VoterParticipationSchema)
