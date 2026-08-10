const mongoose = require('../db/conn')
const { Schema } = mongoose
const { MEDIA_TYPES } = require('../helpers/education-constants')

const GalleryItemSchema = new Schema(
  {
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, required: true, enum: MEDIA_TYPES },
    caption: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
)

const EducationGallery = mongoose.model(
  'EducationGallery',
  new Schema(
    {
      educationEntityId: {
        type: Schema.Types.ObjectId,
        ref: 'EducationEntity',
        required: true,
        index: true,
      },
      educationPostId: {
        type: Schema.Types.ObjectId,
        ref: 'EducationPost',
        default: null,
        index: true,
      },
      title: { type: String, required: true, trim: true },
      description: { type: String, default: '' },
      eventDate: { type: Date, default: null },
      items: [GalleryItemSchema],
      createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
  )
)

module.exports = EducationGallery
