const mongoose = require('../db/conn')
const { Schema } = mongoose

const agendaUserAssignmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'AgendaUnit', index: true },
    role: {
      type: String,
      enum: ['agenda_admin', 'agenda_manager', 'agenda_attendant'],
      required: true,
      index: true,
    },
    active: { type: Boolean, default: true, index: true },
    grantedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    revokedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    revokedAt: Date,
  },
  { timestamps: true },
)

agendaUserAssignmentSchema.index({ userId: 1, unitId: 1, role: 1 }, { unique: true })

module.exports = mongoose.model('AgendaUserAssignment', agendaUserAssignmentSchema)
