// models/User.js
const mongoose = require('../db/conn')
const { Schema } = mongoose

const User = mongoose.model(
  'User',
  new Schema(
    {
      name: { type: String, required: true },
      cpf: { type: String }, // Mantido para compatibilidade com sistema de cemitério
      email: { type: String, required: true, index: true },
      password: { type: String, required: true },
      image: { type: String },
      phone: { type: String, required: true },
      whatsapp: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' },

      // Sistema de roles do cemitério (mantido para compatibilidade) + SAMA
      role: {
        type: String,
        enum: [
          'usuario',
          'concessionario',
          'admin',
          'iluminacao_admin',
          'rotas_admin',
          'rotas_operador',
          'admin-votacao',
          'votacao_auditor',
          'sama',
          'secretario',
          'Secretario',
          'Secretário',
        ],
        default: 'usuario',
        index: true,
      },

      // >>> CAMPOS SEMIT_A_PET <<<
      // Tipo de usuário para o sistema SEMIT_A_PET
      userType: {
        type: String,
        enum: ['Pessoa Física', 'Instituto', 'Cemitério'],
        default: 'Pessoa Física'
      },

      // Nome do instituto (quando userType === 'Instituto')
      instituteName: {
        type: String
      },

      // CPF ou CNPJ (campo unificado para SEMIT_A_PET)
      cpf_cnpj: {
        type: String,
        sparse: true, // Permite null mas mantém unicidade quando preenchido
        index: true
      },

      // Flag de administrador (SEMIT_A_PET)
      isAdmin: {
        type: Boolean,
        default: false
      },

      // Membro da equipe SAMA
      isSamaMember: {
        type: Boolean,
        default: false
      },

      // Permissão para gerenciar árvores
      canManageTrees: {
        type: Boolean,
        default: false
      },

      // Referência ao admin que criou este usuário
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      ruralAccessRequestedAt: { type: Date, index: true },

      // >>> novos campos: verificação de e-mail <<<
      emailVerified: { type: Boolean, default: false },
      emailVerifyToken: { type: String },
      emailVerifyExpires: { type: Date },

      resetPasswordToken: { type: String },
      resetPasswordExpires: { type: Date },

      // >>> novos campos: aceite dos Termos de Uso <<<
      // Data/hora de quando o usuário aceitou o termo no cadastro
      acceptedTermsAt: { type: Date },
      // Versão textual do termo aceito (ex.: '2.0')
      acceptedTermsVersion: { type: String, default: '2.0' },
      // (Opcional) metadados – deixei comentado; use se quiser
      // acceptedTermsIp: { type: String },
      // acceptedTermsUserAgent: { type: String },
    },
    { timestamps: true }
  )
)

module.exports = User
