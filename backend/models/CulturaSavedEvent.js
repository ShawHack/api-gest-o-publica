const mongoose = require('../db/conn')
const { Schema } = mongoose

const CulturaSavedEvent = mongoose.model(
  'CulturaSavedEvent',
  new Schema(
    {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
      postId: { type: Schema.Types.ObjectId, ref: 'CulturaPost', required: true, index: true },
    },
    { timestamps: true }
  )
)

CulturaSavedEvent.schema.index({ userId: 1, postId: 1 }, { unique: true })

module.exports = CulturaSavedEvent
