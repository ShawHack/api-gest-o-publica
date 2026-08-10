// models/FormGarca.js
const mongoose = require('../db/conn');
const { Schema } = mongoose;

const CustomFieldSchema = new Schema({
    fieldId: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'date', 'email', 'phone', 'textarea', 'select', 'checkbox', 'file'], default: 'text' },
    required: { type: Boolean, default: false },
    value: { type: String },
    options: [{ type: String }],
}, { _id: false });

const FormGarca = mongoose.model(
    'FormGarca',
    new Schema(
        {
            titulo: { type: String, required: true },
            descricao: { type: String },
            dataEvento: { type: Date, required: true },
            idSolicitacao1Doc: { type: String },
            status: { type: String, enum: ['aberto', 'emAndamento', 'concluido'], default: 'aberto' },
            createdBy: { type: String },
            updatedBy: { type: String },
            campos: [CustomFieldSchema],
        },
        { timestamps: true }
    )
);

module.exports = FormGarca;
