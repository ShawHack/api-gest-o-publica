const mongoose = require('../db/conn')
const { Schema } = mongoose

const VoteSchema = new Schema(
  {
    votationId: { type: Schema.Types.ObjectId, ref: 'Votation', required: true, index: true },
    /** v1: string slug do candidato; v2: ObjectId do documento VotingCandidate */
    candidateId: { type: Schema.Types.Mixed, default: null },
    /** v1 apenas — hash HMAC da identidade; v2 usa VoterParticipation separado */
    userHash: { type: String },
    categoryId: { type: Schema.Types.ObjectId, ref: 'VotingCategory', index: true },
    voteType: { type: String, enum: ['candidate', 'blank', 'null'] },
    ballotVersion: { type: Number, default: 1 },
    idempotencyKey: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'votes' }
)

VoteSchema.index(
  { votationId: 1, userHash: 1 },
  {
    unique: true,
    partialFilterExpression: { userHash: { $exists: true, $type: 'string', $gt: '' } },
  }
)
VoteSchema.index({ votationId: 1, idempotencyKey: 1 }, { sparse: true })
VoteSchema.index({ votationId: 1, categoryId: 1, ballotVersion: 1 })

module.exports = mongoose.model('Vote', VoteSchema)
