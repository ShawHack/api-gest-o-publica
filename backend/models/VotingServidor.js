const mongoose = require('../db/conn')
const { Schema } = mongoose

/**
 * Servidor público autorizado a votar.
 * cpfHash = HMAC(CPF) — CPF não fica em claro (LGPD).
 * matriculaHash = HMAC(CPF|matrícula) — vínculo anonimizado.
 * matricula em claro permanece na base importada; login do eleitor usa nome + CPF.
 */
const VotingServidorSchema = new Schema(
  {
    matricula: { type: String, trim: true },
    cpfHash: { type: String, index: true },
    cpfLast4: { type: String },
    /** @deprecated removido na migração; mantido só leitura legada até ensure-voting-cpf-hash */
    cpf: { type: String, select: false },
    matriculaHash: { type: String, required: true, index: true, unique: true },
    password: { type: String, required: true },
    nome: { type: String, default: '' },
    setor: { type: String, default: '' },
    cargoFuncao: { type: String, default: '' },
    /** WhatsApp E.164 ou nacional (normalizado na Evolution). */
    whatsapp: { type: String, default: '', trim: true, index: true },
    /** Se false, não recebe canhoto/resultado por WhatsApp. */
    whatsappOptIn: { type: Boolean, default: true },
    /** E-mail para canhoto do voto (informado no unlock). */
    email: { type: String, default: '', trim: true, lowercase: true, index: true },
    /** Se false, não recebe canhoto por e-mail. */
    emailOptIn: { type: Boolean, default: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
)

VotingServidorSchema.index(
  { matricula: 1 },
  { unique: true, partialFilterExpression: { matricula: { $exists: true, $type: 'string', $gt: '' } } }
)

module.exports = mongoose.model('VotingServidor', VotingServidorSchema)
