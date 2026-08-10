const ObjectId = require('mongoose').Types.ObjectId

const EducationEarlyChildhoodPolicy = require('../models/EducationEarlyChildhoodPolicy')
const { recordAudit, recordChange } = require('../helpers/audit-log')
const { documentPublicUrl } = require('../helpers/education-upload')
const {
  parsePagination,
  paginatedResponse,
  ok,
  err,
  canManageModule,
} = require('../helpers/education-service')

module.exports = class EducationEarlyChildhoodPolicyController {
  static async listPublic(req, res) {
    try {
      const { page, limit, skip } = parsePagination(req.query, { maxLimit: 100 })
      const [items, total] = await Promise.all([
        EducationEarlyChildhoodPolicy.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationEarlyChildhoodPolicy.countDocuments(),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationEarlyChildhoodPolicyController.listPublic]', error)
      return err(res, 500, 'Erro ao listar políticas de educação infantil')
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')
      const item = await EducationEarlyChildhoodPolicy.findById(id).lean()
      if (!item) return err(res, 404, 'Documento não encontrado')
      return ok(res, 200, { data: item })
    } catch (error) {
      console.error('[EducationEarlyChildhoodPolicyController.getById]', error)
      return err(res, 500, 'Erro ao carregar documento')
    }
  }

  static async listAdmin(req, res) {
    try {
      if (!canManageModule(req.educationContext)) {
        return err(res, 403, 'Sem permissão para gerenciar a Política Municipal de Qualidade e Equidade da Educação Infantil')
      }
      const { page, limit, skip } = parsePagination(req.query, { maxLimit: 100 })
      const [items, total] = await Promise.all([
        EducationEarlyChildhoodPolicy.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationEarlyChildhoodPolicy.countDocuments(),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationEarlyChildhoodPolicyController.listAdmin]', error)
      return err(res, 500, 'Erro ao listar políticas de educação infantil')
    }
  }

  static async create(req, res) {
    try {
      if (!canManageModule(req.educationContext)) {
        return err(res, 403, 'Sem permissão para cadastrar a política de educação infantil')
      }

      const { title } = req.body
      if (!title || !String(title).trim()) {
        return err(res, 422, 'Título é obrigatório')
      }

      let fileUrl = req.body.fileUrl || ''
      if (req.file) fileUrl = documentPublicUrl(req.file.filename)
      if (!fileUrl) return err(res, 422, 'Arquivo PDF é obrigatório')

      const item = await EducationEarlyChildhoodPolicy.create({
        title: String(title).trim(),
        fileUrl,
        createdBy: req.user.id,
      })

      await recordAudit(req, {
        action: 'education.early_childhood_policy.create',
        resourceType: 'education_early_childhood_policy',
        resourceId: item._id,
        module: 'education',
        eventType: 'CREATE',
      })

      return ok(res, 201, { data: item })
    } catch (error) {
      console.error('[EducationEarlyChildhoodPolicyController.create]', error)
      return err(res, 500, 'Erro ao cadastrar documento')
    }
  }

  static async update(req, res) {
    try {
      if (!canManageModule(req.educationContext)) {
        return err(res, 403, 'Sem permissão')
      }

      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const item = await EducationEarlyChildhoodPolicy.findById(id)
      if (!item) return err(res, 404, 'Documento não encontrado')

      const before = item.toObject()
      if (req.body.title) item.title = String(req.body.title).trim()
      if (req.file) item.fileUrl = documentPublicUrl(req.file.filename)

      await item.save()

      await recordChange(req, {
        before,
        after: item.toObject(),
        resourceType: 'education_early_childhood_policy',
        resourceId: item._id,
        module: 'education',
      })

      return ok(res, 200, { data: item })
    } catch (error) {
      console.error('[EducationEarlyChildhoodPolicyController.update]', error)
      return err(res, 500, 'Erro ao atualizar documento')
    }
  }

  static async remove(req, res) {
    try {
      if (!canManageModule(req.educationContext)) {
        return err(res, 403, 'Sem permissão')
      }
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')
      const item = await EducationEarlyChildhoodPolicy.findByIdAndDelete(id)
      if (!item) return err(res, 404, 'Documento não encontrado')

      await recordAudit(req, {
        action: 'education.early_childhood_policy.delete',
        resourceType: 'education_early_childhood_policy',
        resourceId: id,
        module: 'education',
        eventType: 'DELETE',
      })

      return ok(res, 200, { message: 'Documento removido' })
    } catch (error) {
      console.error('[EducationEarlyChildhoodPolicyController.remove]', error)
      return err(res, 500, 'Erro ao remover documento')
    }
  }
}
