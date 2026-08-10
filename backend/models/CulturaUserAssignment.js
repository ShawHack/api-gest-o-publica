const mongoose = require('../db/conn')
const { Schema } = mongoose
const { CULTURA_ROLES } = require('../helpers/cultura-constants')

const CulturaUserAssignment = mongoose.model(
  'CulturaUserAssignment',
  new Schema(
    {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
      role: { type: String, required: true, enum: CULTURA_ROLES, index: true },
      isActive: { type: Boolean, default: true },
      assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
  )
)

CulturaUserAssignment.schema.index(
  { userId: 1, role: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
)

module.exports = CulturaUserAssignment
