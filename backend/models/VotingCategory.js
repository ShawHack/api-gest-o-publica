const mongoose = require('../db/conn')
const { Schema } = mongoose

const VotingCategorySchema = new Schema(
  {
    votationId: { type: Schema.Types.ObjectId, ref: 'Votation', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
    /**
     * Quantos primeiros colocados são eleitos nesta categoria (ex.: 1 = majoritário, 5 = top 5).
     * Empates no último lugar também entram.
     */
    winnersCount: { type: Number, default: 1, min: 1, max: 100 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
)

VotingCategorySchema.index({ votationId: 1, name: 1 }, { unique: true })

module.exports = mongoose.model('VotingCategory', VotingCategorySchema)
