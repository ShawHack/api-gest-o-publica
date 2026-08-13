const mongoose = require('mongoose')
const { Schema } = mongoose

/**
 * Idempotência de notificações WhatsApp do módulo votação.
 * Chaves típicas:
 *   `{participationId}:canhoto:whatsapp`
 */
const VotacaoNotifyDeliverySchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    votationId: { type: String, required: true, index: true },
    servidorId: { type: String, default: '', index: true },
    event: { type: String, required: true },
    channel: { type: String, required: true, default: 'whatsapp' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    result: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
)

module.exports =
  mongoose.models.VotacaoNotifyDelivery ||
  mongoose.model('VotacaoNotifyDelivery', VotacaoNotifyDeliverySchema)
