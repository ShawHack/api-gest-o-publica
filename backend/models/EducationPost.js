const mongoose = require('../db/conn')
const { Schema } = mongoose
const { POST_TYPES, POST_STATUSES, FEATURED_MEDIA_TYPES, POST_ATTACHMENT_TYPES } = require('../helpers/education-constants')

const EducationPost = mongoose.model(
  'EducationPost',
  new Schema(
    {
      educationEntityId: {
        type: Schema.Types.ObjectId,
        ref: 'EducationEntity',
        required: true,
        index: true,
      },
      title: { type: String, required: true, trim: true },
      slug: { type: String, required: true, trim: true, index: true },
      summary: { type: String, default: '' },
      content: { type: String, default: '' },
      authorName: { type: String, default: '', trim: true },
      sourceUrl: { type: String, default: '', trim: true },
      type: { type: String, required: true, enum: POST_TYPES, index: true },
      status: { type: String, default: 'draft', enum: POST_STATUSES, index: true },
      featured: { type: Boolean, default: false, index: true },
      coverImageUrl: { type: String, default: '' },
      featuredMediaType: {
        type: String,
        enum: FEATURED_MEDIA_TYPES,
        default: 'none',
        index: true,
      },
      youtubeUrl: { type: String, default: '' },
      youtubeVideoId: { type: String, default: '', index: true },
      galleryImages: [{
        url: { type: String, required: true },
        caption: { type: String, default: '' },
        order: { type: Number, default: 0 },
      }],
      attachments: [{
        title: { type: String, default: '' },
        documentType: {
          type: String,
          enum: POST_ATTACHMENT_TYPES,
          default: 'outro',
        },
        description: { type: String, default: '' },
        documentDate: { type: Date, default: null },
        fileUrl: { type: String, required: true },
        originalName: { type: String, default: '' },
        order: { type: Number, default: 0 },
      }],
      publishedAt: { type: Date, default: null, index: true },
      createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
      approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
  )
)

EducationPost.schema.index({ educationEntityId: 1, slug: 1 }, { unique: true })

module.exports = EducationPost
