const mongoose = require('../db/conn')
const { Schema } = mongoose

const VotationSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'active', 'closed'],
      default: 'draft',
      index: true,
    },
    /** Se true, permite GET resultado com totais antes de encerrar */
    allowPartialResults: { type: Boolean, default: false },
    /** URL exclusiva: /votacao/p/{slug} */
    slug: { type: String, trim: true, unique: true, sparse: true, index: true },
    bannerUrl: { type: String, default: '' },
    voterInstructions: { type: String, default: '' },
    themeColor: { type: String, default: '#1e3a8a' },
    /** Se false, desliga WhatsApp (canhoto/encerramento) neste pleito. */
    whatsappNotifyEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Votation', VotationSchema)
