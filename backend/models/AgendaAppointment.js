const mongoose = require('../db/conn')
const { Schema } = mongoose

const agendaAppointmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'AgendaUnit', required: true, index: true },
    serviceId: { type: Schema.Types.ObjectId, ref: 'AgendaService', required: true, index: true },
    capacityLane: { type: Number, required: true, default: 0, min: 0, max: 19 },
    resourceId: { type: Schema.Types.ObjectId, ref: 'AgendaResource', index: true },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['booked', 'confirmed', 'cancelled', 'completed', 'no_show'],
      default: 'booked',
      index: true,
    },
    reservationKey: { type: String, trim: true },
    reservationKeys: [{ type: String, trim: true }],
    idempotencyKey: { type: String, trim: true, maxlength: 120 },
    idempotencyFingerprint: { type: String, select: false },
    lastMutationKey: { type: String, trim: true, maxlength: 120, select: false },
    lastMutationFingerprint: { type: String, select: false },
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
    confirmedAt: Date,
    completedAt: Date,
    noShowAt: Date,
    statusUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    statusHistory: [{
      status: { type: String, enum: ['booked', 'confirmed', 'cancelled', 'completed', 'no_show'], required: true },
      at: { type: Date, required: true },
      by: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: { type: String, trim: true, maxlength: 500 },
    }],
  },
  { timestamps: true },
)

// O campo é removido no cancelamento. Enquanto presente, impede dupla reserva do mesmo slot.
agendaAppointmentSchema.index({ reservationKey: 1 }, { unique: true, sparse: true })
// Uma chave por minuto ocupado impede também reservas parcialmente sobrepostas.
agendaAppointmentSchema.index({ reservationKeys: 1 }, { unique: true, sparse: true })
agendaAppointmentSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
)

module.exports = mongoose.model('AgendaAppointment', agendaAppointmentSchema)
