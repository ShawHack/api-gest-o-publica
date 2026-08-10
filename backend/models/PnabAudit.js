const mongoose = require('../db/conn')

const PnabAuditSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userEmail: String,
  userName: String,
  action: { type: String, required: true }, // CREATE, UPDATE, DELETE, DUPLICATE, RESTORE, ARCHIVE
  contentType: String, // PnabEdital, PnabDocument, etc.
  contentId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PnabAudit', PnabAuditSchema);
