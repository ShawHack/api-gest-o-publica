const mongoose = require('../db/conn')
const { Schema } = mongoose
const { TIPOS_OS, STATUS_OS, SECRETARIAS } = require('../helpers/ordem-servico-constants')

const EnderecoSchema = new Schema(
  {
    cep: { type: String, default: '' },
    rua: { type: String, default: '' },
    numero: { type: String, default: '' },
    bairro: { type: String, default: '' },
    complemento: { type: String, default: '' },
    texto: { type: String, default: '' },
  },
  { _id: false }
)

const OrdemServicoSchema = new Schema(
  {
    numero: { type: String, required: true, unique: true, index: true },
    tipo: { type: String, required: true, enum: TIPOS_OS, index: true },
    status: {
      type: String,
      enum: STATUS_OS,
      default: 'Pendente',
      index: true,
    },
    funcionarioResponsavel: { type: String, required: true, index: true },
    dataTrabalho: { type: Date },
    dataSla: { type: Date, index: true },
    dataEmAndamento: { type: Date },
    dataConclusao: { type: Date },
    observacoes: { type: String, default: '' },
    ocorrencia: { type: String, default: '' },
    nomeCidadao: { type: String, default: '' },
    nomeSolicitante: { type: String, default: '' },
    nomePropriedade: { type: String, default: '' },
    endereco: { type: EnderecoSchema, default: () => ({}) },
    tipoMaterial: { type: String, default: '' },
    porteAnimal: { type: String, default: '' },
    tipoServicoDetalhe: { type: String, default: '' },
    secretaria: { type: String, enum: [...SECRETARIAS, ''], default: '' },
    departamento: { type: String, default: '' },
    criadoPor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    atualizadoPor: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

OrdemServicoSchema.index({ tipo: 1, status: 1, createdAt: -1 })
OrdemServicoSchema.index({ 'endereco.bairro': 1 })
OrdemServicoSchema.index({ dataSla: 1, status: 1 })

module.exports = mongoose.model('OrdemServico', OrdemServicoSchema)
