const mongoose = require('../db/conn')
const { Schema } = mongoose

const agendaUnitSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 100, unique: true },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    timezone: { type: String, trim: true, default: 'America/Sao_Paulo' },
    address: { type: String, trim: true, maxlength: 500, default: '' },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

module.exports = mongoose.model('AgendaUnit', agendaUnitSchema)
