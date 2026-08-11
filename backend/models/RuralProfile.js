const mongoose = require('../db/conn')
const { Schema } = mongoose

const ruralProfileSchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'RuralAccount', required: true, unique: true },
    propertyId: { type: Schema.Types.ObjectId, ref: 'RuralProperty', required: true, index: true },
    personal: {
      fullName: { type: String, required: true, trim: true },
      birthDate: Date,
      phone: { type: String, required: true, trim: true },
      whatsapp: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, lowercase: true, default: '' },
      mailingAddress: { type: String, trim: true, default: '' },
    },
    property: {
      name: { type: String, trim: true, default: '' },
      ruralNeighborhood: { type: String, trim: true, default: '' },
      totalAreaHectares: Number,
      relationship: {
        type: String,
        enum: ['owner', 'tenant', 'partner', 'possessor', 'other'],
        default: 'owner',
      },
      activities: [{ type: String, trim: true }],
      residents: { type: Number, min: 0 },
      accessNotes: { type: String, trim: true, default: '' },
      notes: { type: String, trim: true, default: '' },
    },
    status: { type: String, enum: ['draft', 'submitted', 'changes_requested', 'approved'], default: 'draft' },
    submittedAt: Date,
  },
  { timestamps: true },
)

module.exports = mongoose.model('RuralProfile', ruralProfileSchema)
