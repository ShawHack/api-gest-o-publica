const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const RuralAccount = require('../models/RuralAccount')
const RuralProperty = require('../models/RuralProperty')
const RuralProfile = require('../models/RuralProfile')
const { recordAudit } = require('../helpers/audit-log')
const { findByPlusCode } = require('../helpers/rural-property-catalog')
const { publishRuralProperty } = require('../helpers/rural-property-publisher')
const {
  normalizePlusCode,
  isPlausiblePlusCode,
  normalizeCpf,
  isValidCpf,
  ruralCpfIdentity,
} = require('../helpers/rural-identity')

function operatorId(req) {
  return req.user?._id || req.user?.id
}

function safeAccount(account) {
  return {
    id: account._id,
    username: account.username,
    cpfLast4: account.cpfLast4,
    mustChangePassword: account.mustChangePassword,
    status: account.status,
    propertyId: account.propertyId,
  }
}

module.exports = class RuralPortalController {
  static async resolveProperty(req, res) {
    const plusCode = normalizePlusCode(req.query.plusCode)
    if (!isPlausiblePlusCode(plusCode)) return res.status(422).json({ message: 'Plus Code inválido.' })

    try {
      const local = await RuralProperty.findOne({ plusCode }).lean()
      if (local) return res.status(200).json({ found: true, source: 'local', property: local, catalogAvailable: true })
    } catch (error) {
      return res.status(503).json({ message: 'Não foi possível consultar a base local de UPAs.' })
    }

    try {
      const catalog = await findByPlusCode(plusCode)
      return res.status(200).json({ found: !!catalog, source: catalog ? 'firebase' : null, property: catalog, catalogAvailable: true })
    } catch (error) {
      return res.status(200).json({
        found: false,
        source: null,
        property: null,
        catalogAvailable: false,
        warning: 'Catálogo de UPAs temporariamente indisponível. Faça o cadastro manual para posterior revisão.',
      })
    }
  }

  static async createOwner(req, res) {
    try {
      const plusCode = normalizePlusCode(req.body?.plusCode)
      const cpf = req.body?.cpf
      if (!isPlausiblePlusCode(plusCode)) return res.status(422).json({ message: 'Plus Code inválido.' })
      if (!isValidCpf(cpf)) return res.status(422).json({ message: 'CPF inválido.' })

      let property = await RuralProperty.findOne({ plusCode })
      if (!property) {
        let catalog = null
        try {
          catalog = await findByPlusCode(plusCode)
        } catch (catalogError) {
          // O catálogo é uma fonte auxiliar. Sua indisponibilidade não deve
          // impedir o cadastro manual, que ficará pendente de revisão.
        }
        const codigoUpa = String(catalog?.codigoUpa || req.body?.codigoUpa || '').trim()
        if (!codigoUpa) {
          return res.status(422).json({ message: 'Informe o código da nova UPA.' })
        }
        property = await RuralProperty.create({
          codigoUpa,
          plusCode,
          name: catalog?.name || String(req.body?.propertyName || '').trim(),
          source: catalog ? 'firebase' : 'operator',
          firebaseKey: catalog?.firebaseKey,
          location: catalog ? { latitude: catalog.latitude, longitude: catalog.longitude } : undefined,
          status: catalog ? 'active' : 'pending_review',
          createdBy: operatorId(req),
        })
      }

      const identity = ruralCpfIdentity(cpf)
      const existing = await RuralAccount.findOne({ $or: [{ username: plusCode }, { cpfHash: identity.cpfHash }] })
      if (existing) return res.status(409).json({ message: 'Proprietário ou Plus Code já possui acesso.' })

      const temporaryPassword = normalizeCpf(cpf)
      const account = await RuralAccount.create({
        username: plusCode,
        passwordHash: await bcrypt.hash(temporaryPassword, 12),
        ...identity,
        propertyId: property._id,
        createdBy: operatorId(req),
      })

      void recordAudit(req, {
        action: 'rotas.owner.create', resourceType: 'rural_account', resourceId: account._id,
        module: 'rotas-rurais', metadata: { codigoUpa: property.codigoUpa, plusCode, propertySource: property.source },
      })
      return res.status(201).json({ account: safeAccount(account), property, temporaryPassword })
    } catch (error) {
      if (error?.code === 11000) return res.status(409).json({ message: 'UPA, CPF ou usuário já cadastrado.' })
      console.error('[rotas] createOwner:', error)
      return res.status(500).json({ message: 'Erro ao criar acesso do proprietário.' })
    }
  }

  static async listManagedProperties(req, res) {
    try {
      const properties = await RuralProperty.find({ status: { $ne: 'inactive' } }).sort({ createdAt: -1 }).limit(500).lean()
      const propertyIds = properties.map((property) => property._id)
      const accounts = await RuralAccount.find({ propertyId: { $in: propertyIds } }).lean()
      const profiles = await RuralProfile.find({ propertyId: { $in: propertyIds } }).lean()
      const accountByProperty = new Map(accounts.map((account) => [String(account.propertyId), safeAccount(account)]))
      const profileByProperty = new Map(profiles.map((profile) => [String(profile.propertyId), profile]))
      return res.status(200).json({
        items: properties.map((property) => ({
          ...property,
          account: accountByProperty.get(String(property._id)) || null,
          profile: profileByProperty.get(String(property._id)) || null,
        })),
      })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao listar propriedades rurais.' })
    }
  }

  static async updateManagedProperty(req, res) {
    try {
      const property = await RuralProperty.findById(req.params.id)
      if (!property || property.status === 'inactive') return res.status(404).json({ message: 'Propriedade não encontrada.' })
      const codigoUpa = String(req.body?.codigoUpa || '').trim()
      if (!codigoUpa) return res.status(422).json({ message: 'Informe o código da UPA.' })
      property.codigoUpa = codigoUpa
      property.name = String(req.body?.name || '').trim()
      await property.save()
      if (req.body?.profile) {
        const currentProfile = await RuralProfile.findOne({ propertyId: property._id })
        if (!currentProfile) return res.status(404).json({ message: 'Cadastro detalhado do proprietário não encontrado.' })
        currentProfile.personal = req.body.profile.personal || {}
        currentProfile.property = req.body.profile.property || {}
        await currentProfile.save()
      }
      void recordAudit(req, {
        action: 'rotas.property.update', resourceType: 'rural_property', resourceId: property._id,
        module: 'rotas-rurais', metadata: { codigoUpa: property.codigoUpa, plusCode: property.plusCode },
      })
      const profile = await RuralProfile.findOne({ propertyId: property._id }).lean()
      return res.status(200).json({ ...property.toObject(), profile })
    } catch (error) {
      if (error?.code === 11000) return res.status(409).json({ message: 'Código da UPA já cadastrado.' })
      return res.status(500).json({ message: 'Erro ao editar propriedade rural.' })
    }
  }

  static async archiveManagedProperty(req, res) {
    try {
      const property = await RuralProperty.findById(req.params.id)
      if (!property || property.status === 'inactive') return res.status(404).json({ message: 'Propriedade não encontrada.' })
      property.status = 'inactive'
      property.reviewedBy = operatorId(req)
      property.reviewedAt = new Date()
      await property.save()
      await RuralAccount.updateMany({ propertyId: property._id }, { $set: { status: 'inactive' } })
      void recordAudit(req, {
        action: 'rotas.property.archive', resourceType: 'rural_property', resourceId: property._id,
        module: 'rotas-rurais', metadata: { codigoUpa: property.codigoUpa, plusCode: property.plusCode },
      })
      return res.status(200).json({ message: 'Propriedade excluída da lista ativa.', id: property._id })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao excluir propriedade rural.' })
    }
  }

  static async listProperties(req, res) {
    try {
      const allowed = ['active', 'pending_review', 'inactive']
      const status = allowed.includes(String(req.query.status)) ? String(req.query.status) : undefined
      const properties = await RuralProperty.find(status ? { status } : {})
        .populate('createdBy', 'name email')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(300)
        .lean()
      return res.status(200).json({ items: properties })
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao listar UPAs para revisão.' })
    }
  }

  static async reviewProperty(req, res) {
    try {
      const status = String(req.body?.status || '')
      if (!['active', 'inactive', 'pending_review'].includes(status)) {
        return res.status(422).json({ message: 'Situação de revisão inválida.' })
      }
      const property = await RuralProperty.findById(req.params.id)
      if (!property) return res.status(404).json({ message: 'UPA não encontrada.' })
      if (status === 'active' && property.source === 'operator') {
        try {
          property.firebaseKey = await publishRuralProperty(property)
          property.publishedAt = new Date()
        } catch (publishError) {
          console.error('[rotas] publishProperty:', publishError.message)
          return res.status(503).json({ message: 'Não foi possível publicar a UPA no Firebase. Ela continua pendente.' })
        }
      }
      property.status = status
      property.reviewedBy = operatorId(req)
      property.reviewedAt = new Date()
      await property.save()
      void recordAudit(req, {
        action: 'rotas.property.review', resourceType: 'rural_property', resourceId: property._id,
        module: 'rotas-rurais', metadata: { status, codigoUpa: property.codigoUpa, plusCode: property.plusCode, firebaseKey: property.firebaseKey },
      })
      return res.status(200).json(property)
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao revisar UPA.' })
    }
  }

  static async login(req, res) {
    const username = normalizePlusCode(req.body?.username)
    const account = await RuralAccount.findOne({ username }).select('+passwordHash')
    if (!account || account.status !== 'active' || !(await bcrypt.compare(String(req.body?.password || ''), account.passwordHash))) {
      return res.status(401).json({ message: 'Usuário ou senha inválidos.' })
    }
    account.lastLoginAt = new Date()
    await account.save()
    const token = jwt.sign({ id: account._id, scope: 'rotas-rurais' }, process.env.JWT_SECRET, { expiresIn: '8h' })
    return res.status(200).json({ token, account: safeAccount(account) })
  }

  static async changePassword(req, res) {
    const password = String(req.body?.password || '')
    if (password.length < 10) return res.status(422).json({ message: 'A nova senha deve ter pelo menos 10 caracteres.' })
    const account = await RuralAccount.findById(req.ruralAccount._id).select('+passwordHash')
    account.passwordHash = await bcrypt.hash(password, 12)
    account.mustChangePassword = false
    await account.save()
    return res.status(200).json({ message: 'Senha alterada com sucesso.' })
  }

  static async getProfile(req, res) {
    const profile = await RuralProfile.findOne({ accountId: req.ruralAccount._id }).lean()
    const property = await RuralProperty.findById(req.ruralAccount.propertyId).lean()
    return res.status(200).json({ account: safeAccount(req.ruralAccount), property, profile })
  }

  static async saveProfile(req, res) {
    if (req.ruralAccount.mustChangePassword) {
      return res.status(403).json({ message: 'Troque a senha temporária antes de preencher o cadastro.' })
    }
    const personal = req.body?.personal || {}
    if (!String(personal.fullName || '').trim() || !String(personal.phone || '').trim()) {
      return res.status(422).json({ message: 'Nome completo e telefone são obrigatórios.' })
    }
    const submit = req.body?.submit === true
    const profile = await RuralProfile.findOneAndUpdate(
      { accountId: req.ruralAccount._id },
      {
        accountId: req.ruralAccount._id,
        propertyId: req.ruralAccount.propertyId,
        personal,
        property: req.body?.property || {},
        status: submit ? 'submitted' : 'draft',
        submittedAt: submit ? new Date() : undefined,
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    )
    return res.status(200).json(profile)
  }
}
