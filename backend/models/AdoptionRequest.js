const mongoose = require('../db/conn')
const { Schema } = mongoose

const AdoptionRequest = mongoose.model(
    'AdoptionRequest',
    new Schema(
        {
            pet: {
                type: Schema.Types.ObjectId,
                ref: 'Pet',
                required: true,
                index: true,
            },
            adopter: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true,
                index: true,
            },
            status: {
                type: String,
                enum: [
                    'enviada',
                    'em_analise',
                    'aprovada',
                    'recusada',
                    'cancelada_adotante',
                    'cancelada_doador',
                    'encerrada_outro_aprovado',
                    'concluida',
                ],
                default: 'enviada',
                index: true,
            },
            initialMessage: {
                type: String,
                trim: true,
                default: '',
            },
            messages: [
                {
                    role: { type: String, enum: ['system', 'donor', 'adopter'] },
                    message: String,
                    createdAt: { type: Date, default: Date.now },
                },
            ],
            concludedAt: { type: Date, default: null },
            donorLastSeenAt: { type: Date, default: null },
            adopterLastSeenAt: { type: Date, default: null },
            donorLastActiveAt: { type: Date, default: null },
            adopterLastActiveAt: { type: Date, default: null },
        },
        { timestamps: true }
    )
)

AdoptionRequest.schema.index({ pet: 1, adopter: 1 })
AdoptionRequest.schema.index({ pet: 1, status: 1, createdAt: 1 })

module.exports = AdoptionRequest
