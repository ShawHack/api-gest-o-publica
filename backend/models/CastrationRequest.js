const mongoose = require('../db/conn')
const { Schema } = mongoose
const { REQUEST_STATUSES } = require('../helpers/castration-constants')

const animalSchema = new Schema(
  {
    species: { type: String, required: true },
    speciesOther: { type: String, trim: true, default: '' },
    name: { type: String, trim: true, default: '' },
    birthYearOrAge: { type: String, required: true, trim: true },
    weightKg: { type: Number, required: true, min: 0 },
    breed: { type: String, required: true, trim: true },
    sex: { type: String, enum: ['macho', 'femea'], required: true },
    previouslyCastrated: { type: Boolean, required: true },
    notes: { type: String, trim: true, default: '' },
    isCommunityAnimal: { type: Boolean, default: false },
    hasGuardian: { type: Boolean, default: true },
    isPregnant: { type: Boolean, default: false },
    inHeat: { type: Boolean, default: false },
    hasDiseases: { type: Boolean, default: false },
    diseasesDetail: { type: String, trim: true, default: '' },
    onContinuousMedication: { type: Boolean, default: false },
    medicationDetail: { type: String, trim: true, default: '' },
    isAggressive: { type: Boolean, default: false },
  },
  { _id: true }
)

const CastrationRequest = mongoose.model(
  'CastrationRequest',
  new Schema(
    {
      protocol: { type: String, required: true, unique: true, index: true },
      campaignId: { type: Schema.Types.ObjectId, ref: 'CastrationCampaign', required: true, index: true },
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
      applicant: {
        name: String,
        cpf: String,
        phone: String,
        whatsapp: String,
        email: String,
        city: String,
        address: String,
      },
      animals: { type: [animalSchema], validate: [(v) => Array.isArray(v) && v.length >= 1, 'Mínimo 1 animal'] },
      animalCount: { type: Number, required: true, min: 1 },
      status: { type: String, enum: REQUEST_STATUSES, default: 'pendente', index: true },
      statusHistory: [
        {
          status: String,
          changedAt: { type: Date, default: Date.now },
          changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
          note: { type: String, default: '' },
        },
      ],
      scheduledAt: { type: Date },
      scheduledLocation: { type: String, trim: true, default: '' },
      refusalReason: { type: String, trim: true, default: '' },
      ip: { type: String },
      userAgent: { type: String },
      client: { type: Schema.Types.Mixed },
    },
    { timestamps: true }
  )
)

CastrationRequest.schema.index({ 'applicant.cpf': 1 })
CastrationRequest.schema.index({ 'applicant.phone': 1 })
CastrationRequest.schema.index({ 'applicant.city': 1 })
CastrationRequest.schema.index({ createdAt: -1 })

module.exports = CastrationRequest
