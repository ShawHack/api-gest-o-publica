const mongoose = require('../db/conn')
const { Schema } = mongoose

const Arvore = mongoose.model(
    'Arvore',
    new Schema(
        {
            species: { type: String, required: true },
            age: { type: String, required: true },
            height: { type: String, required: true },
            scientificName: { type: String, required: true },
            origin: { type: String, required: true },
            description: { type: String, required: true },
            location: { type: String, required: true },
            quantity: { type: Number, required: true, default: 1 }, // quantidade disponível
            images: { type: Array, required: true },
            available: { type: Boolean, default: true },
            allowsWiring: { type: Boolean, required: true },

            user: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            requester: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            requesterStatus: {
                type: String,
                enum: ['Pendente', 'Em análise', 'Aprovado', 'Recusado'],
                default: 'Pendente'
            },
            requesterMessage: {
                type: String,
                default: ''
            },
            adopter: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            requestedAt: {
                type: Date
            }
        },
        { timestamps: true }
    )
)

module.exports = Arvore
