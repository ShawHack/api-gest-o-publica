const mongoose = require('mongoose');

const TeatroReservaSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
    },
    telefone: {
      type: String,
      required: [true, 'Telefone é obrigatório'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'E-mail é obrigatório'],
      trim: true,
      lowercase: true,
    },
    dataPretendida: {
      type: String,
      trim: true,
    },
    descricao: {
      type: String,
      required: [true, 'Descrição da pauta é obrigatória'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pendente', 'em_analise', 'aprovado', 'recusado', 'concluido'],
      default: 'pendente',
    },
    observacaoInterna: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('TeatroReserva', TeatroReservaSchema);
