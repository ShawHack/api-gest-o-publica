const mongoose = require('../db/conn')
const { Schema } = mongoose

const agendaAppointmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'AgendaUnit', required: true, index: true },
    serviceId: { type: Schema.Types.ObjectId, ref: 'AgendaService', required: true, index: true },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['booked', 'confirmed', 'cancelled', 'completed', 'no_show'],
      default: 'booked',
      index: true,
    },
    reservationKey: { type: String, trim: true },
    protocol: { type: String, required: true, unique: true, index: true },
    source: { type: String, enum: ['web', 'mobile', 'admin', 'migration'], default: 'web' },
    identitySnapshot: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, default: '' },
    },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    cancelledAt: Date,
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
)

// O campo é removido no cancelamento. Enquanto presente, impede dupla reserva do mesmo slot.
agendaAppointmentSchema.index({ reservationKey: 1 }, { unique: true, sparse: true })

module.exports = mongoose.model('AgendaAppointment', agendaAppointmentSchema)
