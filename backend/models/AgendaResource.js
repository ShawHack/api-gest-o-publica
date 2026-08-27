const mongoose = require('../db/conn')
const { Schema } = mongoose

const agendaResourceSchema = new Schema(
  {
    unitId: { type: Schema.Types.ObjectId, ref: 'AgendaUnit', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 100 },
    type: { type: String, enum: ['attendant', 'room', 'equipment'], required: true, index: true },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

agendaResourceSchema.index({ unitId: 1, slug: 1 }, { unique: true })

module.exports = mongoose.model('AgendaResource', agendaResourceSchema)
