const ObjectId = require('mongoose').Types.ObjectId

const CulturaCategory = require('../models/CulturaCategory')
const CulturaPost = require('../models/CulturaPost')
const { recordAudit } = require('../helpers/audit-log')
const { ok, err } = require('../helpers/cultura-service')

module.exports = class CulturaCategoryController {
  static async listPublic(_req, res) {
    try {
      const categories = await CulturaCategory.find({ isActive: true }).sort({ nome: 1 }).lean()
      return res.json(categories)
    } catch (error) {
      console.error('[CulturaCategoryController.listPublic]', error)
      return err(res, 500, 'Erro ao listar categorias')
    }
  }

  static async listAdmin(_req, res) {
    try {
      const categories = await CulturaCategory.find().sort({ nome: 1 }).lean()
      return ok(res, 200, { data: categories })
    } catch (error) {
      console.error('[CulturaCategoryController.listAdmin]', error)
      return err(res, 500, 'Erro ao listar categorias')
    }
  }

  static async create(req, res) {
    try {
      const { nome, cor } = req.body
      if (!nome || !String(nome).trim()) return err(res, 422, 'Nome é obrigatório')

      const exists = await CulturaCategory.findOne({
        nome: new RegExp(`^${String(nome).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      })
      if (exists) return err(res, 400, 'Categoria já existe.')

      const category = await CulturaCategory.create({
        nome: String(nome).trim(),
        cor: cor || '#3b82f6',
      })

      await recordAudit(req, {
        action: 'cultura.category.create',
        resourceType: 'cultura_category',
        resourceId: category._id,
        module: 'cultura',
        eventType: 'CREATE',
      })

      return ok(res, 201, { data: category })
    } catch (error) {
      console.error('[CulturaCategoryController.create]', error)
      return err(res, 500, 'Erro ao criar categoria')
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const inUse = await CulturaPost.countDocuments({ tipo: { $exists: true } })
      void inUse

      const deleted = await CulturaCategory.findByIdAndDelete(id)
      if (!deleted) return err(res, 404, 'Categoria não encontrada')

      await recordAudit(req, {
        action: 'cultura.category.delete',
        resourceType: 'cultura_category',
        resourceId: id,
        module: 'cultura',
        eventType: 'DELETE',
      })

      return ok(res, 200, { message: 'Categoria apagada.' })
    } catch (error) {
      console.error('[CulturaCategoryController.remove]', error)
      return err(res, 500, 'Erro ao apagar categoria')
    }
  }
}
