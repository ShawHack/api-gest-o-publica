const mongoose = require('../db/conn')
const { Schema } = mongoose

const VotingCandidateSchema = new Schema(
  {
    votationId: { type: Schema.Types.ObjectId, ref: 'Votation', required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'VotingCategory', index: true },
    /** id único informado pelo admin (string), único por votação — legado v1 */
    candidateId: { type: String },
    /** Número na cédula — único por categoria no pleito v2 */
    number: { type: Number },
    name: { type: String, required: true },
    photoUrl: { type: String, default: '' },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
)

VotingCandidateSchema.index(
  { votationId: 1, candidateId: 1 },
  { unique: true, partialFilterExpression: { candidateId: { $exists: true, $type: 'string', $gt: '' } } }
)
VotingCandidateSchema.index(
  { votationId: 1, categoryId: 1, number: 1 },
  { unique: true, partialFilterExpression: { categoryId: { $exists: true }, number: { $exists: true } } }
)

module.exports = mongoose.model('VotingCandidate', VotingCandidateSchema)
