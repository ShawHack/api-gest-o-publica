const mongoose = require('../db/conn')
const { Schema } = mongoose

const VoteAuditLogSchema = new Schema(
  {
    votationId: { type: Schema.Types.ObjectId, ref: 'Votation', index: true },
    userHash: { type: String, index: true },
    action: { type: String, required: true },
    detail: { type: String, default: '' },
    meta: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'vote_audit_logs' }
)

module.exports = mongoose.model('VoteAuditLog', VoteAuditLogSchema)
