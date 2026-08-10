const mongoose = require('../db/conn')

const PnabMediaSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  url: { type: String, required: true },
  sizeBytes: { type: Number },
  mimeType: { type: String },
  categoria: { type: String, enum: ['PDF', 'Word', 'Planilhas', 'ZIP', 'RAR', 'Imagem', 'Vídeo', 'Áudio', 'SVG'], required: true },
  ano: { type: String },
  edital: { type: mongoose.Schema.Types.ObjectId, ref: 'PnabEdital' },
  programa: { type: String },
  hash: { type: String, required: true, unique: true }, // SHA-256 hash de arquivo
  deleted: { type: Boolean, default: false },
  dataCriacao: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PnabMedia', PnabMediaSchema);
