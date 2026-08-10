const mongoose = require('../db/conn')
const { Schema } = mongoose

const AuditLog = mongoose.model(
  'AuditLog',
  new Schema(
    {
      actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
      actorRole: { type: String, index: true },
      actorEmail: { type: String },
      action: { type: String, required: true, index: true },
      resourceType: { type: String, required: true, index: true },
      resourceId: { type: String, index: true },
      status: { type: String, enum: ['success', 'denied', 'error'], default: 'success', index: true },
      metadata: { type: Schema.Types.Mixed },
      ip: { type: String },
      userAgent: { type: String },
      actorName: { type: String },
      module: { type: String, index: true },
      eventType: { type: String, index: true },
      tenant: { type: String, index: true, default: 'prefeitura-garca' },
      changes: [{ campo: String, antes: Schema.Types.Mixed, depois: Schema.Types.Mixed }],
      files: [
        {
          name: String,
          path: String,
          type: String,
          size: Number,
          hash: String,
        },
      ],
      sessionId: { type: String },
      requestId: { type: String, index: true },
      client: { type: Schema.Types.Mixed },
      geo: { type: Schema.Types.Mixed },
      route: { type: String },
      method: { type: String },
    },
    { timestamps: true }
  )
)

AuditLog.schema.index({ createdAt: -1 })
AuditLog.schema.index({ ip: 1, createdAt: -1 })

module.exports = AuditLog
