const mongoose = require('../db/conn')
const { Schema } = mongoose

const DOCUMENT_KINDS = ['convocacao', 'pauta', 'ata', 'lista_presenca', 'anexo', 'gravacao']
const MEETING_TYPES = ['ordinaria', 'extraordinaria']
const PUBLICATION_STATUSES = ['draft', 'review', 'published', 'archived']

const documentSchema = new Schema(
  {
    kind: { type: String, required: true, enum: DOCUMENT_KINDS },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    url: { type: String, required: true, trim: true, maxlength: 1000 },
    mimeType: { type: String, default: '', trim: true, maxlength: 120 },
    sizeBytes: { type: Number, default: null, min: 0 },
    isAccessible: { type: Boolean, default: false },
  },
  { _id: true }
)

const comturMeetingSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    number: { type: Number, required: true, min: 1 },
    year: { type: Number, required: true, min: 2000, max: 2100, index: true },
    type: { type: String, required: true, enum: MEETING_TYPES, index: true },
    startsAt: { type: Date, required: true, index: true },
    location: { type: String, required: true, trim: true, maxlength: 240 },
    summary: { type: String, required: true, trim: true, maxlength: 2000 },
    deliberations: [{ type: String, trim: true, maxlength: 1000 }],
    documents: { type: [documentSchema], default: [] },
    status: { type: String, enum: PUBLICATION_STATUSES, default: 'draft', index: true },
    publishedAt: { type: Date, default: null },
    reviewAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    revision: { type: Number, default: 1, min: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

comturMeetingSchema.index({ year: 1, type: 1, number: 1 }, { unique: true })
comturMeetingSchema.index({ status: 1, startsAt: -1 })
comturMeetingSchema.index({
  summary: 'text',
  location: 'text',
  'documents.title': 'text',
})

const ComturMeeting = mongoose.models.ComturMeeting || mongoose.model('ComturMeeting', comturMeetingSchema)

module.exports = ComturMeeting
module.exports.DOCUMENT_KINDS = DOCUMENT_KINDS
module.exports.MEETING_TYPES = MEETING_TYPES
module.exports.PUBLICATION_STATUSES = PUBLICATION_STATUSES
