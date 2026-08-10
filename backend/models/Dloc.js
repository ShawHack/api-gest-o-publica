// models/DLoc.js
const mongoose = require('../db/conn')
const { Schema } = mongoose

const DLocSchema = new Schema(
  {
    quadra: { type: String, required: true, trim: true, unique: true },
    available: { type: Boolean, default: true },
    _extra: {
      pluscode: { type: String, required: true, trim: true, unique: true },
    },
    // opcional (geo no futuro)
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], index: '2dsphere' }, // [lng, lat]
    },
  },
  {
    timestamps: true,
    collection: 'dloc', // <— **ESSENCIAL:** usar exatamente a coleção do Compass
  }
)

module.exports = mongoose.model('DLoc', DLocSchema) // o nome do model pode ser ‘DLoc’
