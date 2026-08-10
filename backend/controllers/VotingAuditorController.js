const crypto = require('crypto')
const bcrypt = require('bcrypt')
const User = require('../models/User')
const Votation = require('../models/Votation')
const VotingPleitoMembership = require('../models/VotingPleitoMembership')
const { recordVoteEvent } = require('../helpers/vote-audit-bridge')
const {
  isVotingGlobalAdmin,
  VOTING_AUDITOR_ROLE,
} = require('../helpers/voting-authz')

function userIdOf(req) {
  return req.user?._id || req.user?.id
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function generateTempPassword() {
  // 16 chars URL-safe — exibida uma única vez ao gestor
  return crypto.randomBytes(12).toString('base64url')
}

function publicMembership(doc, user) {
  return {
    id: String(doc._id),
    votationId: String(doc.votationId),
    role: doc.role,
    status: doc.status,
    justification: doc.justification,
    invitedAt: doc.invitedAt,
    revokedAt: doc.revokedAt || null,
    revokeReason: doc.revokeReason || '',
    lastAccessAt: doc.lastAccessAt || null,
    user: user
      ? {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active !== false,
        }
      : {
          id: String(doc.userId),
          name: '',
          email: doc.inviteEmail || '',
          role: VOTING_AUDITOR_ROLE,
        },
  }
}

module.exports = class VotingAuditorController {
  /** GET /admin/me — contexto de sessão no módulo votação */
  static async me(req, res) {
    try {
      const global = isVotingGlobalAdmin(req.user)
      const uid = userIdOf(req)
      const memberships = await VotingPleitoMembership.find({
        userId: uid,
        status: 'active',
      })
        .select('votationId role status lastAccessAt')
        .lean()

      return res.json({
        user: {
          id: String(uid),
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
        },
        access: {
          globalAdmin: global,
          canWrite: global,
          canManageAuditors: global,
          scope: global ? 'global_admin' : 'auditor',
          pleitoIds: memberships.map((m) => String(m.votationId)),
        },
      })
    } catch (e) {
      console.error('[VotingAuditor.me]', e)
      return res.status(500).json({ message: 'Erro ao carregar sessão.' })
    }
  }

  static async list(req, res) {
    try {
      const vot = await Votation.findById(req.params.id).lean()
      if (!vot) return res.status(404).json({ message: 'Pleito não encontrado.' })

      const rows = await VotingPleitoMembership.find({ votationId: vot._id })
        .sort({ createdAt: -1 })
        .populate('userId', 'name email role active')
        .populate('invitedBy', 'name email')
        .lean()

      void recordVoteEvent(req, {
        votationId: vot._id,
        action: 'admin.auditor_list',
        resourceType: 'voting_pleito_membership',
        eventType: 'VIEW',
        meta: { count: rows.length },
      })

      return res.json({
        items: rows.map((r) => ({
          ...publicMembership(r, r.userId),
          invitedBy: r.invitedBy
            ? { id: String(r.invitedBy._id), name: r.invitedBy.name, email: r.invitedBy.email }
            : null,
        })),
      })
    } catch (e) {
      console.error('[VotingAuditor.list]', e)
      return res.status(500).json({ message: 'Erro ao listar auditores.' })
    }
  }

  /**
   * Designa auditor do pleito.
   * - Justificativa obrigatória (lisura / rastreabilidade).
   * - Cria usuário Memorial se não existir (senha temporária única).
   * - Nunca rebaixa admin / admin-votacao.
   */
  static async invite(req, res) {
    try {
      const vot = await Votation.findById(req.params.id)
      if (!vot) return res.status(404).json({ message: 'Pleito não encontrado.' })

      const email = normalizeEmail(req.body?.email)
      const name = String(req.body?.name || '').trim()
      const phone = String(req.body?.phone || '').trim() || '00000000000'
      const justification = String(req.body?.justification || '').trim()

      if (!email || !email.includes('@')) {
        return res.status(422).json({ message: 'E-mail válido é obrigatório.' })
      }
      if (justification.length < 20) {
        return res.status(422).json({
          message: 'Informe uma justificativa institucional com pelo menos 20 caracteres.',
        })
      }

      let user = await User.findOne({ email })
      let createdUser = false
      let temporaryPassword = null

      if (!user) {
        if (!name) {
          return res.status(422).json({
            message: 'Nome é obrigatório para cadastrar novo auditor.',
          })
        }
        temporaryPassword = generateTempPassword()
        const hash = await bcrypt.hash(temporaryPassword, 12)
        user = await User.create({
          name,
          email,
          phone,
          password: hash,
          role: VOTING_AUDITOR_ROLE,
          emailVerified: true,
        })
        createdUser = true
      } else if (isVotingGlobalAdmin(user)) {
        // Mantém papel global; o vínculo registra a designação formal no pleito.
      } else if (user.role === VOTING_AUDITOR_ROLE) {
        // Já é auditor — apenas vincula ao pleito.
      } else if (user.role === 'usuario') {
        // Conta Memorial comum: eleva de forma auditada para perfil dedicado de auditor.
        const beforeRole = user.role
        user.role = VOTING_AUDITOR_ROLE
        await user.save()
        void recordVoteEvent(req, {
          votationId: vot._id,
          action: 'admin.auditor_role_elevated',
          resourceType: 'user',
          resourceId: user._id,
          eventType: 'UPDATE',
          meta: { beforeRole, afterRole: VOTING_AUDITOR_ROLE, email },
        })
      } else {
        return res.status(422).json({
          message:
            'Este e-mail já possui outro perfil institucional no sistema. ' +
            'Para lisura e segregação de funções, use um e-mail dedicado ao auditor ' +
            'ou ajuste o cadastro de usuários antes da designação.',
          currentRole: user.role,
        })
      }

      let membership = await VotingPleitoMembership.findOne({
        votationId: vot._id,
        userId: user._id,
        role: 'auditor',
      })

      if (membership && membership.status === 'active') {
        return res.status(409).json({
          message: 'Este usuário já é auditor ativo deste pleito.',
          membership: publicMembership(membership, user),
        })
      }

      if (membership && membership.status === 'revoked') {
        membership.status = 'active'
        membership.justification = justification
        membership.invitedBy = userIdOf(req)
        membership.invitedAt = new Date()
        membership.revokedBy = undefined
        membership.revokedAt = undefined
        membership.revokeReason = ''
        membership.inviteEmail = email
        await membership.save()
      } else {
        membership = await VotingPleitoMembership.create({
          votationId: vot._id,
          userId: user._id,
          role: 'auditor',
          status: 'active',
          justification,
          invitedBy: userIdOf(req),
          inviteEmail: email,
        })
      }

      void recordVoteEvent(req, {
        votationId: vot._id,
        action: 'admin.auditor_invite',
        resourceType: 'voting_pleito_membership',
        resourceId: membership._id,
        eventType: 'CREATE',
        meta: {
          email,
          userId: String(user._id),
          createdUser,
          justification,
        },
      })

      return res.status(201).json({
        message: createdUser
          ? 'Auditor cadastrado e vinculado ao pleito. Guarde a senha temporária — ela não será exibida novamente.'
          : 'Auditor vinculado ao pleito.',
        membership: publicMembership(membership, user),
        createdUser,
        temporaryPassword,
      })
    } catch (e) {
      if (e.code === 11000) {
        return res.status(409).json({ message: 'Vínculo de auditor já existe para este pleito.' })
      }
      console.error('[VotingAuditor.invite]', e)
      return res.status(500).json({ message: 'Erro ao designar auditor.' })
    }
  }

  static async revoke(req, res) {
    try {
      const vot = await Votation.findById(req.params.id)
      if (!vot) return res.status(404).json({ message: 'Pleito não encontrado.' })

      const membership = await VotingPleitoMembership.findOne({
        _id: req.params.membershipId,
        votationId: vot._id,
      })
      if (!membership) return res.status(404).json({ message: 'Vínculo não encontrado.' })

      const revokeReason = String(req.body?.revokeReason || '').trim()
      if (revokeReason.length < 10) {
        return res.status(422).json({
          message: 'Informe o motivo da revogação (mínimo 10 caracteres).',
        })
      }

      if (membership.status === 'revoked') {
        return res.status(409).json({ message: 'Vínculo já está revogado.' })
      }

      membership.status = 'revoked'
      membership.revokedBy = userIdOf(req)
      membership.revokedAt = new Date()
      membership.revokeReason = revokeReason
      await membership.save()

      void recordVoteEvent(req, {
        votationId: vot._id,
        action: 'admin.auditor_revoke',
        resourceType: 'voting_pleito_membership',
        resourceId: membership._id,
        eventType: 'UPDATE',
        meta: {
          userId: String(membership.userId),
          revokeReason,
        },
      })

      const user = await User.findById(membership.userId).select('name email role')
      return res.json({
        message: 'Acesso de auditor revogado.',
        membership: publicMembership(membership, user),
      })
    } catch (e) {
      console.error('[VotingAuditor.revoke]', e)
      return res.status(500).json({ message: 'Erro ao revogar auditor.' })
    }
  }
}
