// models/FormGarca.js
const mongoose = require('../db/conn');
const { Schema } = mongoose;

const CustomFieldSchema = new Schema(
  {
    fieldId: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'text',
        'textarea',
        'number',
        'date',
        'email',
        'phone',
        'cpf',
        'select',
        'checkbox',
        'radio',
        'file',
        'declaracao',
      ],
      default: 'text',
    },
    required: { type: Boolean, default: false },
    placeholder: { type: String, default: '' },
    helpText: { type: String, default: '' },
    options: [{ type: String }],
    ordem: { type: Number, default: 0 },
    validacoes: { type: Schema.Types.Mixed, default: {} },
    value: { type: String },
  },
  { _id: false }
);

const FormGarcaSchema = new Schema(
  {
    // Identidade
    titulo: { type: String, required: true, trim: true },
    subtitulo: { type: String, trim: true, default: '' },
    slug: { type: String, trim: true, lowercase: true, unique: true, sparse: true, index: true },
    descricao: { type: String, default: '' },
    status: {
      type: String,
      enum: ['rascunho', 'aberto', 'emAndamento', 'encerrado', 'arquivado', 'concluido'],
      default: 'rascunho',
      index: true,
    },
    publicado: { type: Boolean, default: false, index: true },

    // Agenda
    tipoEvento: {
      type: String,
      enum: ['presencial', 'online', 'hibrido'],
      default: 'presencial',
    },
    dataEvento: { type: Date, required: true, index: true },
    dataFim: { type: Date },
    inicioInscricoes: { type: Date },
    fimInscricoes: { type: Date },

    // Capacidade & Inscrições
    limiteInscricoes: { type: Number, default: null },
    inscricoesAbertas: { type: Boolean, default: true },
    permitirMultiplasInscricoes: { type: Boolean, default: false },
    mensagemConfirmacao: { type: String, default: '' },
    orientacoesInscricao: { type: String, default: '' },

    // Localização
    local: { type: String, default: '' },
    endereco: { type: String, default: '' },
    numero: { type: String, default: '' },
    complemento: { type: String, default: '' },
    bairro: { type: String, default: '' },
    cidade: { type: String, default: 'Garça' },
    estado: { type: String, default: 'SP' },
    cep: { type: String, default: '' },
    linkOnline: { type: String, default: '' },

    // Personalização / White Label
    tema: { type: String, default: 'padrao' },
    corPrimaria: { type: String, default: '#1e3a8a' },
    logoUrl: { type: String, default: '' },
    bannerUrl: { type: String, default: '' },
    organizadorNome: { type: String, default: '' },
    organizadorDescricao: { type: String, default: '' },
    organizadorEmail: { type: String, default: '' },
    organizadorTelefone: { type: String, default: '' },

    // Campos do Formulário
    campos: [CustomFieldSchema],

    // Governança & Auditoria
    idSolicitacao1Doc: { type: String, default: null },
    createdBy: { type: String, index: true },
    updatedBy: { type: String },
    organizadores: [{ type: String, index: true }],
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

FormGarcaSchema.index({ status: 1, publicado: 1, dataEvento: -1 });
FormGarcaSchema.index({ createdBy: 1, createdAt: -1 });

const FormGarca = mongoose.model('FormGarca', FormGarcaSchema);

module.exports = FormGarca;