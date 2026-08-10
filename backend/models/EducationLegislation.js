const mongoose = require('../db/conn')
const { Schema } = mongoose
const { LEGISLATION_CATEGORIES, DOCUMENT_STATUSES } = require('../helpers/education-constants')

const EducationLegislation = mongoose.model(
  'EducationLegislation',
  new Schema(
    {
      educationEntityId: {
        type: Schema.Types.ObjectId,
        ref: 'EducationEntity',
        default: null,
        index: true,
      },
      title: { type: String, required: true, trim: true },
      description: { type: String, default: '' },
      category: { type: String, required: true, enum: LEGISLATION_CATEGORIES, index: true },
      number: { type: String, default: '', index: true },
      year: { type: Number, index: true },
      publicationDate: { type: Date, default: null, index: true },
      fileUrl: { type: String, required: true },
      status: { type: String, default: 'published', enum: DOCUMENT_STATUSES, index: true },
      createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
  )
)

module.exports = EducationLegislation
