const mongoose = require('../db/conn')
const { Schema } = mongoose

const VotingRefreshTokenSchema = new Schema(
  {
    servidorId: { type: Schema.Types.ObjectId, ref: 'VotingServidor', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)

VotingRefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model('VotingRefreshToken', VotingRefreshTokenSchema)
