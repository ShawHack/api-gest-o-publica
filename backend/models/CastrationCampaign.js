const mongoose = require('../db/conn')
const { Schema } = mongoose

const CastrationCampaign = mongoose.model(
  'CastrationCampaign',
  new Schema(
    {
      name: { type: String, required: true, trim: true },
      year: { type: Number, required: true, index: true },
      status: {
        type: String,
        enum: ['draft', 'open', 'full', 'closed'],
        default: 'draft',
        index: true,
      },
      opensAt: { type: Date },
      closesAt: { type: Date },
      surgeryDate: { type: Date },
      location: { type: String, trim: true, default: '' },
      notes: { type: String, trim: true, default: '' },
      maxAnimals: { type: Number, required: true, min: 1 },
      reservedAnimals: { type: Number, default: 0, min: 0 },
      closedAt: { type: Date },
      closedReason: {
        type: String,
        enum: ['manual', 'full', 'scheduled', 'cancelled', 'legacy_toggle'],
      },
      createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
  )
)

CastrationCampaign.schema.index({ status: 1, createdAt: -1 })

module.exports = CastrationCampaign
