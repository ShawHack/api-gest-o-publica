const mongoose = require('../db/conn')
const { Schema } = mongoose
const {
  DOCUMENT_TYPES,
  DOCUMENT_CATEGORIES,
  MEETING_TYPES,
  VISIBILITY,
  DOCUMENT_STATUSES,
} = require('../helpers/education-constants')

const AttachmentSchema = new Schema(
  {
    fileUrl: { type: String, required: true },
    fileType: { type: String, default: '' },
    fileName: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
  },
  { _id: true }
)

const EducationDocument = mongoose.model(
  'EducationDocument',
  new Schema(
    {
      educationEntityId: {
        type: Schema.Types.ObjectId,
        ref: 'EducationEntity',
        default: null,
        index: true,
      },
      categoryId: {
        type: Schema.Types.ObjectId,
        ref: 'EducationDocumentCategory',
        default: null,
        index: true,
      },
      title: { type: String, required: true, trim: true },
      description: { type: String, default: '' },
      documentType: { type: String, required: true, enum: DOCUMENT_TYPES, index: true },
      category: { type: String, enum: DOCUMENT_CATEGORIES, index: true },
      meetingType: { type: String, enum: MEETING_TYPES, default: null },
      meetingDate: { type: Date, default: null, index: true },
      sessionNumber: { type: String, default: '' },
      referenceYear: { type: Number, index: true },
      calendarEventId: {
        type: Schema.Types.ObjectId,
        ref: 'EducationCalendarEvent',
        default: null,
      },
      fileUrl: { type: String, required: true },
      fileType: { type: String, default: '' },
      fileSize: { type: Number, default: 0 },
      attachments: [AttachmentSchema],
      visibility: { type: String, default: 'public', enum: VISIBILITY },
      status: { type: String, default: 'draft', enum: DOCUMENT_STATUSES, index: true },
      publishedAt: { type: Date, default: null, index: true },
      archivedAt: { type: Date, default: null },
      version: { type: Number, default: 1 },
      previousVersions: [{
        fileUrl: String,
        fileType: String,
        fileSize: Number,
        version: Number,
        replacedAt: { type: Date, default: Date.now },
      }],
      submittedAt: { type: Date, default: null },
      approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
  )
)

module.exports = EducationDocument
