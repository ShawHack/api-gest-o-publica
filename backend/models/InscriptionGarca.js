// models/InscriptionGarca.js
const mongoose = require('../db/conn');
const { Schema } = mongoose;

const InscriptionGarca = mongoose.model(
    'InscriptionGarca',
    new Schema(
        {
            formId: { type: Schema.Types.ObjectId, ref: 'FormGarca', required: true, index: true },
            userId: { type: String, required: true, index: true },
            userName: { type: String, required: true },
            userEmail: { type: String, required: true },
            userPhone: { type: String },
            userCpf: { type: String },
            voucherCode: { type: String, required: true, unique: true, index: true },
            formData: { type: Schema.Types.Mixed, default: {} },  // respostas do formulário
        },
        { timestamps: true }
    )
);

module.exports = InscriptionGarca;
