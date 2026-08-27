const mongoose = require('../db/conn')
const { Schema } = mongoose

const agendaScheduleBlockSchema = new Schema({
  unitId: { type: Schema.Types.ObjectId, ref: 'AgendaUnit', required: true, index: true },
  resourceId: { type: Schema.Types.ObjectId, ref: 'AgendaResource', index: true },
  scope: { type: String, enum: ['unit', 'resource'], required: true, index: true },
  startsAt: { type: Date, required: true, index: true },
  endsAt: { type: Date, required: true, index: true },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  category: { type: String, enum: ['holiday', 'vacation', 'pause', 'maintenance', 'other'], default: 'other' },
  active: { type: Boolean, default: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  revokedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  revokedAt: Date,
}, { timestamps: true })

agendaScheduleBlockSchema.index({ unitId: 1, startsAt: 1, endsAt: 1 })
agendaScheduleBlockSchema.index({ resourceId: 1, startsAt: 1, endsAt: 1 })

module.exports = mongoose.model('AgendaScheduleBlock', agendaScheduleBlockSchema)
