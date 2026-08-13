const mongoose = require('../db/conn')
const { Schema } = mongoose

const VotingElectorateBaseSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    type: { type: String, enum: ['legacy_servidores', 'imported'], default: 'imported', index: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

VotingElectorateBaseSchema.index({ name: 1 }, { unique: true })
module.exports = mongoose.model('VotingElectorateBase', VotingElectorateBaseSchema)
