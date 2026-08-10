const mongoose = require('../db/conn')
const { Schema } = mongoose

const Vaccination = mongoose.model(
    'Vaccination',
    new Schema(
        {
            petId: {
                type: Schema.Types.ObjectId,
                ref: 'Pet',
                required: true,
                index: true
            },
            nomeVacina: {
                type: String,
                required: true,
                trim: true
            },
            dataAplicacao: {
                type: Date,
                required: true
            },
            proximaDose: {
                type: Date,
                required: false,
                default: null
            },
            observacoes: {
                type: String,
                required: false,
                trim: true,
                default: ''
            }
        },
        { timestamps: true }
    )
)

module.exports = Vaccination
