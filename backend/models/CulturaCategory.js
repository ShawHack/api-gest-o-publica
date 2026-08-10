const mongoose = require('../db/conn')
const { Schema } = mongoose

const CulturaCategory = mongoose.model(
  'CulturaCategory',
  new Schema(
    {
      nome: { type: String, required: true, unique: true, trim: true },
      cor: { type: String, default: '#3b82f6' },
      isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true }
  )
)

module.exports = CulturaCategory
