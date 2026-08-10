const mongoose = require('../db/conn')
const { Schema } = mongoose

const PetVaccine = mongoose.model(
  'PetVaccine',
  new Schema(
    {
      pet: {
        type: Schema.Types.ObjectId,
        ref: 'Pet',
        required: true,
        index: true,
      },
      vaccineName: {
        type: String,
        required: true,
        trim: true,
      },
      dose: {
        type: String,
        default: '1a dose',
        trim: true,
      },
      applicationDate: {
        type: Date,
        required: true,
      },
      nextDueDate: {
        type: Date,
      },
      batch: {
        type: String,
        trim: true,
        default: '',
      },
      veterinarian: {
        type: String,
        trim: true,
        default: '',
      },
      status: {
        type: String,
        enum: ['aplicada', 'pendente', 'atrasada'],
        default: 'aplicada',
      },
      notes: {
        type: String,
        default: '',
      },
    },
    { timestamps: true, collection: 'pet_vaccines' }
  )
)

PetVaccine.schema.index({ pet: 1, applicationDate: -1 })

module.exports = PetVaccine
