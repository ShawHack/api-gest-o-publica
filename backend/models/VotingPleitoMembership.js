const mongoose = require('../db/conn')
const { Schema } = mongoose

/**
 * Vínculo de acesso a um pleito específico.
 * Fonte de verdade do escopo: auditor só acessa pleitos com membership active.
 * Papéis globais (admin / admin-votacao) não dependem deste vínculo.
 */
const VotingPleitoMembershipSchema = new Schema(
  {
    votationId: {
      type: Schema.Types.ObjectId,
      ref: 'Votation',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** Papel no pleito. Hoje: auditor (somente leitura). Extensível. */
    role: {
      type: String,
      enum: ['auditor'],
      default: 'auditor',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active',
      index: true,
    },
    /** Justificativa institucional da designação (obrigatória na criação). */
    justification: { type: String, required: true, trim: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invitedAt: { type: Date, default: Date.now },
    revokedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    revokedAt: { type: Date },
    revokeReason: { type: String, trim: true, default: '' },
    lastAccessAt: { type: Date },
    /** Snapshot do e-mail no momento do convite (auditoria LGPD / rastreio). */
    inviteEmail: { type: String, trim: true, lowercase: true, default: '' },
  },
  { timestamps: true },
)

VotingPleitoMembershipSchema.index(
  { votationId: 1, userId: 1, role: 1 },
  { unique: true },
)

module.exports = mongoose.model('VotingPleitoMembership', VotingPleitoMembershipSchema)
