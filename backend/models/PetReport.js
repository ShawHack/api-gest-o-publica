const mongoose = require('../db/conn')
const { Schema } = mongoose

const PetReport = mongoose.model(
    'PetReport',
    new Schema(
        {
            pet: {
                type: Schema.Types.ObjectId,
                ref: 'Pet',
                required: true,
                index: true,
            },
            reporter: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                default: null,
            },
            reason: {
                type: String,
                required: true,
                trim: true,
            },
            description: {
                type: String,
                trim: true,
                default: '',
            },
            status: {
                type: String,
                enum: ['aberta', 'em_analise', 'resolvida', 'descartada'],
                default: 'aberta',
            },
        },
        { timestamps: true }
    )
)

module.exports = PetReport
