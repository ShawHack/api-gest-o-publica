const mongoose = require('../db/conn')
const { Schema } = mongoose
const { MEMBER_SEGMENTS, MEMBER_ROLES } = require('../helpers/education-constants')

const EducationCouncilMember = mongoose.model(
  'EducationCouncilMember',
  new Schema(
    {
      educationEntityId: {
        type: Schema.Types.ObjectId,
        ref: 'EducationEntity',
        required: true,
        index: true,
      },
      name: { type: String, required: true, trim: true },
      role: { type: String, required: true, enum: MEMBER_ROLES, default: 'membro_titular' },
      segment: { type: String, enum: MEMBER_SEGMENTS, default: 'outro' },
      isTitular: { type: Boolean, default: true },
      mandateStart: { type: Date, default: null },
      mandateEnd: { type: Date, default: null },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      order: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true, index: true },
      createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
  )
)

module.exports = EducationCouncilMember
