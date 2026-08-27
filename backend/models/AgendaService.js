const mongoose = require('../db/conn')
const { Schema } = mongoose

const periodSchema = new Schema(
  {
    start: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    end: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  },
  { _id: false },
)

const weeklyAvailabilitySchema = new Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    periods: { type: [periodSchema], default: [] },
  },
  { _id: false },
)

const agendaServiceSchema = new Schema(
  {
    unitId: { type: Schema.Types.ObjectId, ref: 'AgendaUnit', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    durationMinutes: { type: Number, required: true, min: 5, max: 480 },
    slotIntervalMinutes: { type: Number, required: true, min: 5, max: 480 },
    capacity: { type: Number, default: 1, min: 1, max: 1 },
    minimumNoticeMinutes: { type: Number, default: 60, min: 0, max: 525600 },
    bookingWindowDays: { type: Number, default: 90, min: 1, max: 730 },
    cancellationNoticeMinutes: { type: Number, default: 120, min: 0, max: 525600 },
    weeklyAvailability: { type: [weeklyAvailabilitySchema], default: [] },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

agendaServiceSchema.index({ unitId: 1, slug: 1 }, { unique: true })

module.exports = mongoose.model('AgendaService', agendaServiceSchema)
