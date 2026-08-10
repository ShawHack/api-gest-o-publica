const mongoose = require('../db/conn')
const { Schema } = mongoose
const { DOCUMENT_TYPES } = require('../helpers/education-constants')

const EducationDocumentCategory = mongoose.model(
  'EducationDocumentCategory',
  new Schema(
    {
      educationEntityId: {
        type: Schema.Types.ObjectId,
        ref: 'EducationEntity',
        default: null,
        index: true,
      },
      slug: { type: String, required: true, trim: true, lowercase: true },
      label: { type: String, required: true, trim: true },
      documentTypes: [{ type: String, enum: DOCUMENT_TYPES }],
      order: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true, index: true },
      createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
  )
)

EducationDocumentCategory.schema.index(
  { educationEntityId: 1, slug: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
)

module.exports = EducationDocumentCategory
