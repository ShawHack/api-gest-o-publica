const mongoose = require('../db/conn')
const { Schema } = mongoose

const unknownVehicleAlertSchema = new Schema(
  {
    plateNormalized: { type: String, required: true, index: true },
    cameraId: { type: String, required: true, index: true },
    cameraLabel: { type: String, default: '' },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    count: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'closed', 'false_positive'],
      default: 'open',
      index: true,
    },
    snapshotUrl: { type: String, default: '' },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    closedAt: { type: Date },
    note: { type: String, default: '' },
  },
  { timestamps: true },
)

unknownVehicleAlertSchema.index({ plateNormalized: 1, cameraId: 1, status: 1 })

module.exports = mongoose.model('UnknownVehicleAlert', unknownVehicleAlertSchema)
