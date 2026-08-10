const mongoose = require('../db/conn')
const { Schema } = mongoose

/** Registro de comparecimento — sem vínculo recuperável com escolhas de voto. */
const VoterParticipationSchema = new Schema(
  {
    votationId: { type: Schema.Types.ObjectId, ref: 'Votation', required: true, index: true },
    servidorId: { type: Schema.Types.ObjectId, ref: 'VotingServidor', required: true, index: true },
    votedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

VoterParticipationSchema.index({ votationId: 1, servidorId: 1 }, { unique: true })

module.exports = mongoose.model('VoterParticipation', VoterParticipationSchema)
