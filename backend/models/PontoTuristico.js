const mongoose = require('../db/conn')
const { Schema } = mongoose

const categoriasPermitidas = [
  'atracao',
  'restaurante',
  'hotel',
  'comercio',
  'cultura',
  'natureza',
  'servico',
  'clube',
  'religioso',
]

const PontoTuristico = mongoose.model(
  'PontoTuristico',
  new Schema(
    {
      nome: { type: String, required: true, trim: true },
      categoria: { type: String, enum: categoriasPermitidas, default: 'atracao' },
      descricao: { type: String, default: '' },
      endereco: { type: String, default: '' },
      telefone: { type: String, default: '' },
      site: { type: String, default: '' },
      horario: { type: String, default: '' },
      foto: { type: String, default: null },
      fotos: { type: [String], default: [] },
      dadosHistoricos: { type: String, default: '' },
      eventos: { type: String, default: '' },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      ativo: { type: Boolean, default: true },
      destaque: { type: Boolean, default: false },
    },
    {
      timestamps: true,
      collection: 'pontos_turisticos',
    }
  )
)

PontoTuristico.schema.index({ ativo: 1, destaque: -1, nome: 1 })

module.exports = PontoTuristico
