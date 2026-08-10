const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    trim: true
  },
  tipo: {
    type: String,
    required: true
  },
  formato: {
    type: [String],
    required: true,
    enum: ['Evento', 'Notícia']
  },
  descricao: {
    type: String,
    required: true
  },
  bannerUrl: {
    type: String
  },
  videoUrl: {
    type: String
  },
  corTituloCapa: {
    type: String,
    default: '#ffffff'
  },
  emCartazTeatro: {
    type: Boolean,
    default: false
  },
  imagensUrl: [{
    type: String
  }],
  datasHorarios: [{
    data: String,
    horario: String
  }],
  dataCriacao: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Post', PostSchema);
