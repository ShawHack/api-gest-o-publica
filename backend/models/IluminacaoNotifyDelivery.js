const mongoose = require('mongoose')
const { Schema } = mongoose

/**
 * Registro de entrega de notificação (idempotência).
 * Chave típica: `{reportId}:{event}:{status}:{channel}`
 */
const IluminacaoNotifyDeliverySchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    reportId: { type: String, required: true, index: true },
    event: { type: String, required: true },
    status: { type: String, default: '' },
    channel: { type: String, required: true },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    result: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
)

module.exports =
  mongoose.models.IluminacaoNotifyDelivery ||
  mongoose.model('IluminacaoNotifyDelivery', IluminacaoNotifyDeliverySchema)
