const mongoose = require('../db/conn')
const { Schema } = mongoose

const ruralVehicleSchema = new Schema(
  {
    plate: { type: String, required: true, trim: true },
    plateNormalized: { type: String, required: true, trim: true },
    codigoUpa: { type: String, required: true, trim: true, index: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    brand: { type: String, trim: true, default: '' },
    model: { type: String, trim: true, default: '' },
    color: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'revoked'],
      default: 'pending',
      index: true,
    },
    validFrom: { type: Date, default: null },
    validUntil: { type: Date, default: null },
    consentAcceptedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

ruralVehicleSchema.index(
  { plateNormalized: 1 },
  { unique: true, partialFilterExpression: { status: 'approved' } },
)

module.exports = mongoose.model('RuralVehicle', ruralVehicleSchema)
