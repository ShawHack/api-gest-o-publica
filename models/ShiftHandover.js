// models/ShiftHandover.js
const mongoose = require('../db/conn');
const { Schema } = mongoose;

const PendingTaskSchema = new Schema({
  description: { type: String, required: false },
  responsible: { type: String },
  priority: {
    type: String,
    enum: ['Baixa', 'Média', 'Alta', 'Urgente'],
    default: 'Média'
  },
  deadline: { type: Date },
  completed: { type: Boolean, default: false }
}, { _id: true });

const OccurrenceSchema = new Schema({
  type: { type: String, required: false },
  dateTime: { type: Date, required: false, default: Date.now },
  description: { type: String, required: false },
  actionTaken: { type: String },
  status: {
    type: String,
    enum: ['Resolvido', 'Em andamento'],
    default: 'Em andamento'
  }
}, { _id: true });

const OngoingTaskSchema = new Schema({
  name: { type: String, required: false },
  identifier: { type: String },
  currentStatus: { type: String, required: false },
  nextAction: { type: String },
  observations: { type: String }
}, { _id: true });

const AttachmentSchema = new Schema({
  type: {
    type: String,
    enum: ['photo', 'document', 'screenshot', 'audio'],
    required: true
  },
  filename: { type: String, required: true },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const ShiftHandoverSchema = new Schema(
  {
    // 1️⃣ Identificação do Plantão
    sector: { type: String, required: true },
    unit: { type: String },
    shiftDate: { type: Date, required: true, default: Date.now },
    shiftTime: { type: String, required: true }, // ex: "14:00 - 22:00"
    shift: {
      type: String,
      enum: ['Manhã', 'Tarde', 'Noite'],
      required: true
    },

    // Profissionais
    handingOverUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    handingOverName: { type: String, required: true },

    receivingUser: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    receivingName: { type: String },

    // 2️⃣ Resumo Geral
    generalSummary: { type: String, required: true },
    shiftClimate: {
      type: String,
      enum: ['Tranquilo', 'Normal', 'Agitado', 'Crítico', 'Sobrecarga'],
      default: 'Normal'
    },

    // 3️⃣ Pendências
    pendingTasks: [PendingTaskSchema],

    // 4️⃣ Ocorrências
    occurrences: [OccurrenceSchema],

    // 5️⃣ Tarefas em Andamento
    ongoingTasks: [OngoingTaskSchema],

    // 6️⃣ Comunicados
    importantCommunications: { type: String },

    // 7️⃣ Anexos
    attachments: [AttachmentSchema],

    // 8️⃣ Confirmação
    handedOverAt: { type: Date },
    handedOverSignature: { type: String }, // Hash ou assinatura digital

    receivedAt: { type: Date },
    receivedSignature: { type: String },

    status: {
      type: String,
      enum: ['Pendente', 'Recebido', 'Arquivado'],
      default: 'Pendente'
    },

    // Controle de edição
    locked: { type: Boolean, default: false },
    lockedAt: { type: Date },

    // Notificações
    notificationSent: { type: Boolean, default: false },
    notificationSentAt: { type: Date }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para melhor performance
ShiftHandoverSchema.index({ shiftDate: -1 });
ShiftHandoverSchema.index({ sector: 1, shiftDate: -1 });
ShiftHandoverSchema.index({ handingOverUser: 1 });
ShiftHandoverSchema.index({ receivingUser: 1 });
ShiftHandoverSchema.index({ status: 1 });

// Virtual para contar pendências não concluídas
ShiftHandoverSchema.virtual('pendingTasksCount').get(function () {
  return this.pendingTasks.filter(task => !task.completed).length;
});

// Virtual para contar ocorrências em andamento
ShiftHandoverSchema.virtual('ongoingOccurrencesCount').get(function () {
  return this.occurrences.filter(occ => occ.status === 'Em andamento').length;
});

const ShiftHandover = mongoose.model('ShiftHandover', ShiftHandoverSchema);

module.exports = ShiftHandover;
