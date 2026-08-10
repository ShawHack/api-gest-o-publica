const mongoose = require('../db/conn')
const { Schema } = mongoose

const SystemSetting = mongoose.model(
    'SystemSetting',
    new Schema({
        key: {
            type: String,
            required: true,
            unique: true
        },
        value: {
            type: Schema.Types.Mixed, // Can be boolean, string, object
            required: true
        },
        description: {
            type: String
        }
    }, { timestamps: true })
)

module.exports = SystemSetting
