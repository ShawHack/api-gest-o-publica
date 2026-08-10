const mongoose = require('../db/conn')
const { Schema } = mongoose
const { POST_FORMATOS, POST_STATUSES } = require('../helpers/cultura-constants')

const CulturaPost = mongoose.model(
  'CulturaPost',
  new Schema(
    {
      titulo: { type: String, required: true, trim: true },
      tipo: { type: String, required: true, trim: true, index: true },
      formato: {
        type: [String],
        required: true,
        enum: POST_FORMATOS,
      },
      descricao: { type: String, required: true },
      bannerUrl: { type: String, default: '' },
      videoUrl: { type: String, default: '' },
      corTituloCapa: { type: String, default: '#ffffff' },
      emCartazTeatro: { type: Boolean, default: false, index: true },
      imagensUrl: [{ type: String }],
      datasHorarios: [
        {
          data: String,
          horario: String,
        },
      ],
      status: {
        type: String,
        enum: POST_STATUSES,
        default: 'published',
        index: true,
      },
      publishedAt: { type: Date, default: Date.now, index: true },
      createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
  )
)

CulturaPost.schema.index({ status: 1, publishedAt: -1 })
CulturaPost.schema.index({ emCartazTeatro: 1, status: 1 })

module.exports = CulturaPost
