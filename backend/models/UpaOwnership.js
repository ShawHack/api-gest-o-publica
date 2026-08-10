const mongoose = require('../db/conn')
const { Schema } = mongoose

const upaOwnershipSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    codigoUpa: { type: String, required: true, trim: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'revoked'],
      default: 'pending',
      index: true,
    },
    note: { type: String, trim: true, default: '' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
)

upaOwnershipSchema.index({ userId: 1, codigoUpa: 1 }, { unique: true })

module.exports = mongoose.model('UpaOwnership', upaOwnershipSchema)
