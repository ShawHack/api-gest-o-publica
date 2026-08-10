const mongoose = require('../db/conn')
const { Schema } = mongoose

const LprEvent = mongoose.model(
  'LprEvent',
  new Schema(
    {
      plateNormalized: { type: String, required: true, index: true },
      plateRaw: { type: String, default: '' },
      cameraId: { type: String, required: true, index: true },
      cameraLabel: { type: String, default: '' },
      capturedAt: { type: Date, required: true, index: true },
      classification: {
        type: String,
        enum: ['known', 'unknown'],
        required: true,
        index: true,
      },
      vehicleId: { type: Schema.Types.ObjectId, ref: 'RuralVehicle' },
      codigoUpa: { type: String, default: '' },
      snapshotUrl: { type: String, default: '' },
      sourcePayload: { type: Schema.Types.Mixed },
      alertId: { type: Schema.Types.ObjectId, ref: 'UnknownVehicleAlert' },
    },
    { timestamps: true },
  ),
)

module.exports = LprEvent
