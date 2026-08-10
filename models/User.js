// models/User.js
const mongoose = require('../db/conn')
const { Schema } = mongoose

const User = mongoose.model(
  'User',
  new Schema(
    {
      name: { type: String, required: true },
      cpf: { type: String, required: true },
      email: { type: String, required: true, index: true },
      password: { type: String, required: true },
      image: { type: String },
      phone: { type: String, required: true },

      role: {
        type: String,
        enum: ['usuario', 'concessionario', 'admin', 'monitor'],
        default: 'usuario',
        index: true,
      },

      // >>> novos campos: verificação de e-mail <<<
      emailVerified: { type: Boolean, default: false },
      emailVerifyToken: { type: String },
      emailVerifyExpires: { type: Date },

      resetPasswordToken: { type: String },
      resetPasswordExpires: { type: Date },

      // >>> novos campos: aceite dos Termos de Uso <<<
      // Data/hora de quando o usuário aceitou o termo no cadastro
      acceptedTermsAt: { type: Date },
      // Versão textual do termo aceito (ex.: '1.0')
      acceptedTermsVersion: { type: String, default: '1.0' },
      // (Opcional) metadados – deixei comentado; use se quiser
      // acceptedTermsIp: { type: String },
      // acceptedTermsUserAgent: { type: String },
    },
    { timestamps: true }
  )
)

module.exports = User
