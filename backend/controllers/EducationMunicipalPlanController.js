const ObjectId = require('mongoose').Types.ObjectId

const EducationMunicipalPlan = require('../models/EducationMunicipalPlan')
const { recordAudit, recordChange } = require('../helpers/audit-log')
const { documentPublicUrl } = require('../helpers/education-upload')
const {
  parsePagination,
  paginatedResponse,
  ok,
  err,
  canManageModule,
} = require('../helpers/education-service')

module.exports = class EducationMunicipalPlanController {
  static async listPublic(req, res) {
    try {
      const { page, limit, skip } = parsePagination(req.query, { maxLimit: 100 })
      const [items, total] = await Promise.all([
        EducationMunicipalPlan.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationMunicipalPlan.countDocuments(),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationMunicipalPlanController.listPublic]', error)
      return err(res, 500, 'Erro ao listar planos municipais')
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')
      const item = await EducationMunicipalPlan.findById(id).lean()
      if (!item) return err(res, 404, 'Documento não encontrado')
      return ok(res, 200, { data: item })
    } catch (error) {
      console.error('[EducationMunicipalPlanController.getById]', error)
      return err(res, 500, 'Erro ao carregar documento')
    }
  }

  static async listAdmin(req, res) {
    try {
      if (!canManageModule(req.educationContext)) {
        return err(res, 403, 'Sem permissão para gerenciar o Plano Municipal da Educação')
      }
      const { page, limit, skip } = parsePagination(req.query, { maxLimit: 100 })
      const [items, total] = await Promise.all([
        EducationMunicipalPlan.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationMunicipalPlan.countDocuments(),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationMunicipalPlanController.listAdmin]', error)
      return err(res, 500, 'Erro ao listar planos municipais')
    }
  }

  static async create(req, res) {
    try {
      if (!canManageModule(req.educationContext)) {
        return err(res, 403, 'Sem permissão para cadastrar o Plano Municipal da Educação')
      }

      const { title } = req.body
      if (!title || !String(title).trim()) {
        return err(res, 422, 'Título é obrigatório')
      }

      let fileUrl = req.body.fileUrl || ''
      if (req.file) fileUrl = documentPublicUrl(req.file.filename)
      if (!fileUrl) return err(res, 422, 'Arquivo PDF é obrigatório')

      const item = await EducationMunicipalPlan.create({
        title: String(title).trim(),
        fileUrl,
        createdBy: req.user.id,
      })

      await recordAudit(req, {
        action: 'education.municipal_plan.create',
        resourceType: 'education_municipal_plan',
        resourceId: item._id,
        module: 'education',
        eventType: 'CREATE',
      })

      return ok(res, 201, { data: item })
    } catch (error) {
      console.error('[EducationMunicipalPlanController.create]', error)
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

      const item = await EducationMunicipalPlan.findById(id)
      if (!item) return err(res, 404, 'Documento não encontrado')

      const before = item.toObject()
      if (req.body.title) item.title = String(req.body.title).trim()
      if (req.file) item.fileUrl = documentPublicUrl(req.file.filename)

      await item.save()

      await recordChange(req, {
        before,
        after: item.toObject(),
        resourceType: 'education_municipal_plan',
        resourceId: item._id,
        module: 'education',
      })

      return ok(res, 200, { data: item })
    } catch (error) {
      console.error('[EducationMunicipalPlanController.update]', error)
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
      const item = await EducationMunicipalPlan.findByIdAndDelete(id)
      if (!item) return err(res, 404, 'Documento não encontrado')

      await recordAudit(req, {
        action: 'education.municipal_plan.delete',
        resourceType: 'education_municipal_plan',
        resourceId: id,
        module: 'education',
        eventType: 'DELETE',
      })

      return ok(res, 200, { message: 'Documento removido' })
    } catch (error) {
      console.error('[EducationMunicipalPlanController.remove]', error)
      return err(res, 500, 'Erro ao remover documento')
    }
  }
}
