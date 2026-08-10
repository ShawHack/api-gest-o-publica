const ObjectId = require('mongoose').Types.ObjectId

const CulturaSavedEvent = require('../models/CulturaSavedEvent')
const CulturaPost = require('../models/CulturaPost')
const { ok, err } = require('../helpers/cultura-service')

module.exports = class CulturaSavedEventController {
  static async listMine(req, res) {
    try {
      const userId = req.user.id
      const saved = await CulturaSavedEvent.find({ userId }).sort({ createdAt: -1 }).lean()
      const postIds = saved.map((s) => s.postId)
      const posts = await CulturaPost.find({
        _id: { $in: postIds },
        status: 'published',
      }).lean()
      const postMap = new Map(posts.map((p) => [String(p._id), p]))
      const eventosSalvos = saved
        .map((s) => String(s.postId))
        .filter((id) => postMap.has(id))

      return ok(res, 200, {
        data: { eventosSalvos, posts: posts.map((p) => p) },
        eventosSalvos,
      })
    } catch (error) {
      console.error('[CulturaSavedEventController.listMine]', error)
      return err(res, 500, 'Erro ao listar eventos salvos')
    }
  }

  static async toggle(req, res) {
    try {
      const userId = req.user.id
      const { postId } = req.params
      if (!ObjectId.isValid(postId)) return err(res, 422, 'ID do evento inválido')

      const post = await CulturaPost.findOne({ _id: postId, status: 'published' })
      if (!post) return err(res, 404, 'Evento não encontrado')

      const existing = await CulturaSavedEvent.findOne({ userId, postId })
      if (existing) {
        await CulturaSavedEvent.deleteOne({ _id: existing._id })
      } else {
        await CulturaSavedEvent.create({ userId, postId })
      }

      const saved = await CulturaSavedEvent.find({ userId }).lean()
      const eventosSalvos = saved.map((s) => String(s.postId))

      return ok(res, 200, {
        message: 'Eventos atualizados',
        eventosSalvos,
        data: { eventosSalvos },
      })
    } catch (error) {
      console.error('[CulturaSavedEventController.toggle]', error)
      return err(res, 500, 'Erro ao atualizar eventos do usuário')
    }
  }
}
