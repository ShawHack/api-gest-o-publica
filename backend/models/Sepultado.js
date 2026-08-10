const mongoose = require('../db/conn')
const { Schema } = mongoose
const { v4: uuidv4 } = require('uuid')

// ===========================================================
// Subdocumento de comentários
// ===========================================================
const ComentarioSchema = new Schema(
  {
    autor: { type: String, default: 'Anônimo', trim: true },
    texto: { type: String, required: true, trim: true, maxlength: 1000 },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deleteReason: { type: String, trim: true, maxlength: 300 },
  },
  { _id: true }
)

ComentarioSchema.index({ createdAt: -1 })

// ===========================================================
// Schema principal: Sepultado
// ===========================================================
const SepultadoSchema = new Schema(
  {
    // Identificador UUID
    _id: { type: String, default: () => uuidv4() },

    // Espelho para compatibilidade
    id: { type: String },

    // Dados principais
    nome: { type: String, required: true, trim: true },
    cemiterio: { type: String, trim: true },
    chapa: { type: String, required: true, trim: true },
    idade: { type: String, trim: true },

    dtFal: { type: String, required: true, trim: true },
    dtNasc: { type: String, required: true, trim: true },

    mae: { type: String, required: true, trim: true },
    nacionalidade: { type: String, trim: true },
    pai: { type: String, required: true, trim: true },

    moderacao: { type: Boolean },

    // ==========================================
    // RELAÇÃO COM QUADRA (DLOC) E PLUSCODE
    // ==========================================
    // Quadra textual (compatibilidade)
    quadra: { type: String, required: true, trim: true },

    // Referência oficial à collection `dloc`
    quadraId: { type: Schema.Types.ObjectId, ref: 'dloc', index: true },
    quadraNome: { type: String, trim: true },

    // Campos de Plus Code (quadra e ponto exato)
    plusCodeQuadra: { type: String, trim: true, index: true },
    plusCodePreciso: { type: String, trim: true },

    // Localização decodificada (útil para mapas)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        // [lng, lat]
        type: [Number],
        index: '2dsphere',
      },
    },

    // ==========================================
    // CAMPOS ADICIONAIS / LEGADO
    // ==========================================
    rua: { type: String, trim: true },
    tipoSepultura: { type: String, trim: true },

    epitafio: { type: String, trim: true },
    comentarios: { type: [ComentarioSchema], default: [] },
    available: { type: Boolean },
    images: { type: [String] },

    // ==========================================
    // USUÁRIO CRIADOR DO REGISTRO
    // ==========================================
    user: {
      _id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true, trim: true },
      image: { type: String },
      phone: { type: String },
    },

    // Concessionários vinculados
    concessionarios: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
  },
  {
    timestamps: true,
  }
)

// ===========================================================
// Middlewares e Índices
// ===========================================================

// Espelhar `id` <- `_id` ao salvar
SepultadoSchema.pre('save', function (next) {
  if (this.isNew && !this.id) this.id = this._id
  next()
})

// Índices úteis para consultas
SepultadoSchema.index({ nome: 1 })
SepultadoSchema.index({ rua: 1 })
SepultadoSchema.index({ quadra: 1 })
SepultadoSchema.index({ chapa: 1 })
SepultadoSchema.index({ 'user._id': 1 })
SepultadoSchema.index({ plusCodePreciso: 1 })

// ===========================================================
module.exports = mongoose.model('Sepultado', SepultadoSchema)
