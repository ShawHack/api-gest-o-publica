const mongoose = require('../db/conn')
const { Schema } = mongoose

const EducationEarlyChildhoodPolicy = mongoose.model(
  'EducationEarlyChildhoodPolicy',
  new Schema(
    {
      title: { type: String, required: true, trim: true },
      fileUrl: { type: String, required: true },
      createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
  )
)

module.exports = EducationEarlyChildhoodPolicy
