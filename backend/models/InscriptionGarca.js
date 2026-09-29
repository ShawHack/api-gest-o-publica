// models/InscriptionGarca.js
const mongoose = require('../db/conn');
const { Schema } = mongoose;

const InscriptionFileSchema = new Schema(
  {
    fieldId: { type: String, required: true },
    fileName: { type: String },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number },
  },
  { _id: false }
);

const InscriptionGarcaSchema = new Schema(
  {
    formId: { type: Schema.Types.ObjectId, ref: 'FormGarca', required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, required: true, trim: true, lowercase: true },
    userPhone: { type: String, trim: true, default: '' },
    userCpf: { type: String, trim: true, default: '' },
    voucherCode: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['confirmada', 'pendente', 'cancelada'],
      default: 'confirmada',
      index: true,
    },
    formData: { type: Schema.Types.Mixed, default: {} },
    arquivos: [InscriptionFileSchema],
    observacoesAdmin: { type: String, default: '' },
    canceladoEm: { type: Date, default: null },
    canceladoPor: { type: String, default: null },
  },
  { timestamps: true }
);

InscriptionGarcaSchema.index({ formId: 1, userId: 1 });
InscriptionGarcaSchema.index({ formId: 1, status: 1, createdAt: -1 });

const InscriptionGarca = mongoose.model('InscriptionGarca', InscriptionGarcaSchema);

module.exports = InscriptionGarca;