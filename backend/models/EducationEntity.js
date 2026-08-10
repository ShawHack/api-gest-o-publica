const mongoose = require('../db/conn')
const { Schema } = mongoose
const { ENTITY_TYPES } = require('../helpers/education-constants')
const { buildFullAddress } = require('../helpers/education-entity-fields')

const addressDetailsSchema = new Schema(
  {
    cep: { type: String, default: '' },
    street: { type: String, default: '' },
    number: { type: String, default: '' },
    complement: { type: String, default: '' },
    city: { type: String, default: 'Garça' },
    state: { type: String, default: 'SP' },
  },
  { _id: false }
)

const educationEntitySchema = new Schema(
    {
      name: { type: String, required: true, trim: true },
      slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
      type: { type: String, required: true, enum: ENTITY_TYPES, index: true },
      description: { type: String, default: '' },
      address: { type: String, default: '' },
      addressDetails: { type: addressDetailsSchema, default: () => ({}) },
      neighborhood: { type: String, default: '', index: true },
      phone: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
      email: { type: String, default: '' },
      openingHours: { type: String, default: '' },
      managerName: { type: String, default: '' },
      managerRole: { type: String, default: '' },
      managerPhotoUrl: { type: String, default: '' },
      logoUrl: { type: String, default: '' },
      coverImageUrl: { type: String, default: '' },
      councilCode: { type: String, default: '' },
      competencies: { type: String, default: '' },
      legalBasis: { type: String, default: '' },
      institutionalAbout: { type: String, default: '' },
      isActive: { type: Boolean, default: true, index: true },
      isPartnerEntity: { type: Boolean, default: false, index: true },
      createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
)

educationEntitySchema.index({ 'addressDetails.city': 1 })
educationEntitySchema.index({ 'addressDetails.cep': 1 })

educationEntitySchema.pre('save', function syncReadableAddress(next) {
  if (this.addressDetails?.street || this.addressDetails?.cep) {
    this.address = buildFullAddress(this.addressDetails, this.neighborhood)
  }
  next()
})

const EducationEntity = mongoose.model('EducationEntity', educationEntitySchema)

module.exports = EducationEntity
