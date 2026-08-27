const mongoose = require('../db/conn')
const { Schema } = mongoose

const periodSchema = new Schema(
  {
    start: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    end: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  },
  { _id: false },
)

const agendaAvailabilityExceptionSchema = new Schema(
  {
    unitId: { type: Schema.Types.ObjectId, ref: 'AgendaUnit', required: true, index: true },
    serviceId: { type: Schema.Types.ObjectId, ref: 'AgendaService', required: true, index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    type: { type: String, enum: ['closed', 'custom'], required: true },
    periods: { type: [periodSchema], default: [] },
    reason: { type: String, trim: true, maxlength: 500, default: '' },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

agendaAvailabilityExceptionSchema.index({ serviceId: 1, date: 1 }, { unique: true })

module.exports = mongoose.model('AgendaAvailabilityException', agendaAvailabilityExceptionSchema)
