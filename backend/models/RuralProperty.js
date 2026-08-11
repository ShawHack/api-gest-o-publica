const mongoose = require('../db/conn')
const { Schema } = mongoose

const ruralPropertySchema = new Schema(
  {
    codigoUpa: { type: String, required: true, trim: true, unique: true, index: true },
    plusCode: { type: String, required: true, trim: true, uppercase: true, unique: true, index: true },
    name: { type: String, trim: true, default: '' },
    source: { type: String, enum: ['firebase', 'operator'], required: true },
    firebaseKey: { type: String, trim: true },
    location: {
      latitude: Number,
      longitude: Number,
    },
    status: { type: String, enum: ['active', 'pending_review', 'inactive'], default: 'active' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

module.exports = mongoose.model('RuralProperty', ruralPropertySchema)
