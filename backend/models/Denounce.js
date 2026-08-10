const mongoose = require('../db/conn')
const { Schema } = mongoose

const Denounce = mongoose.model(
    'Denounce',
    new Schema(
        {
            name: {
                type: String,
            },
            type: {
                type: String,
                required: true,
            },
            address: {
                type: String,
                required: true,
            },
            description: {
                type: String,
                required: true,
            },
            status: {
                type: String,
                enum: ['Pendente', 'Em Análise', 'Resolvido'],
                default: 'Pendente',
            },
            images: {
                type: Array,
            },
            user: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            }
        },
        { timestamps: true },
    ),
)

module.exports = Denounce
