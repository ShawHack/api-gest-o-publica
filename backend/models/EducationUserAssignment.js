const mongoose = require('../db/conn')
const { Schema } = mongoose
const { EDUCATION_ROLES } = require('../helpers/education-constants')

const EducationUserAssignment = mongoose.model(
  'EducationUserAssignment',
  new Schema(
    {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
      educationEntityId: {
        type: Schema.Types.ObjectId,
        ref: 'EducationEntity',
        default: null,
        index: true,
      },
      role: { type: String, required: true, enum: EDUCATION_ROLES, index: true },
      isActive: { type: Boolean, default: true },
      assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
  )
)

EducationUserAssignment.schema.index(
  { userId: 1, educationEntityId: 1, role: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
)

module.exports = EducationUserAssignment
