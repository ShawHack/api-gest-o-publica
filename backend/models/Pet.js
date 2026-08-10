const mongoose = require('../db/conn')
const { Schema } = mongoose

const Pet = mongoose.model(
    'Pet',
    new Schema(
        {
            name: {
                type: String,
                required: true
            },
            age: {
                type: String,
                required: true
            },
            type: {
                type: String,
                required: true,
                enum: ['Cachorro', 'Gato', 'Outros']
            },
            size: {
                type: String,
                required: true,
                enum: ['Pequeno', 'Médio', 'Grande']
            },
            weight: {
                type: Number,
                required: true
            },
            color: {
                type: String,
                required: true
            },
            gender: {
                type: String,
                required: true,
                enum: ['Macho', 'Fêmea']
            },
            breed: {
                type: String,
                required: true
            },
            chip: {
                type: String,
                required: false,
                trim: true,
            },
            images: {
                type: Array,
                required: true
            },
            available: {
                type: Boolean,
                default: true
            },
            user: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            adopter: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            adopterStatus: {
                type: String,
                enum: ['Pendente', 'Em análise', 'Aprovado', 'Recusado', 'Finalizado'],
                default: 'Pendente'
            },
            adopterMessages: [
                {
                    role: { type: String, enum: ['system', 'donor', 'adopter'] },
                    message: String,
                    createdAt: { type: Date, default: Date.now }
                }
            ],
            deliveryAddress: {
                type: String
            },
            vaccinations: [
                {
                    nomeVacina: { type: String, trim: true },
                    dataAplicacao: { type: Date },
                    proximaDose: { type: Date, default: null },
                    observacoes: { type: String, trim: true, default: '' },
                }
            ]
            ,
            // compatibilidade com payload/cliente legado
            vaccines: {
                type: Array,
                default: undefined
            }
        },
        { timestamps: true }
    )
)

// Unicidade só quando chip está preenchido (vários pets podem não ter chip).
Pet.schema.index(
    { chip: 1 },
    {
        unique: true,
        partialFilterExpression: { chip: { $exists: true, $gt: '' } },
    }
)

// Não persistir chip vazio (evita colisão no índice único sparse com `null`).
Pet.schema.pre('save', function normalizeChipBeforeSave(next) {
    const raw = this.chip
    if (raw === undefined || raw === null || String(raw).trim() === '') {
        this.set('chip', undefined)
        if (!this.isNew) {
            this.$unset('chip')
        }
        return next()
    }
    this.chip = String(raw).trim()
    next()
})

module.exports = Pet
