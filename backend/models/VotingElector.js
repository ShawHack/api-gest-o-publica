const mongoose = require('../db/conn')
const { Schema } = mongoose

const VotingElectorSchema = new Schema(
  {
    electorateBaseId: { type: Schema.Types.ObjectId, ref: 'VotingElectorateBase', required: true, index: true },
    identifier: { type: String, required: true, trim: true },
    cpfHash: { type: String, required: true, index: true },
    cpfLast4: { type: String, default: '' },
    identityHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    phone: { type: String, default: '', trim: true },
    group: { type: String, default: '', trim: true },
    role: { type: String, default: '', trim: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)

VotingElectorSchema.index({ electorateBaseId: 1, identifier: 1 }, { unique: true })
VotingElectorSchema.index({ electorateBaseId: 1, cpfHash: 1 }, { unique: true })
module.exports = mongoose.model('VotingElector', VotingElectorSchema)
