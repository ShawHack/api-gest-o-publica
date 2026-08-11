const mongoose = require('../db/conn')
const { Schema } = mongoose

const ruralAccountSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    cpfHash: { type: String, required: true, unique: true, index: true, select: false },
    cpfLast4: { type: String, required: true },
    mustChangePassword: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'blocked', 'inactive'], default: 'active', index: true },
    propertyId: { type: Schema.Types.ObjectId, ref: 'RuralProperty', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastLoginAt: Date,
  },
  { timestamps: true },
)

module.exports = mongoose.model('RuralAccount', ruralAccountSchema)
