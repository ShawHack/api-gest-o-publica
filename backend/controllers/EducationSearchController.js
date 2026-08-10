const EducationEntity = require('../models/EducationEntity')
const EducationPost = require('../models/EducationPost')
const EducationDocument = require('../models/EducationDocument')
const EducationLegislation = require('../models/EducationLegislation')
const EducationGallery = require('../models/EducationGallery')
const { escapeRegex, ok, err } = require('../helpers/education-service')

const SEARCH_TYPES = new Set(['all', 'entities', 'news', 'documents', 'legislation', 'galleries'])
const NEWS_TYPES = new Set(['noticia', 'comunicado', 'aviso', 'destaque', 'mensagem_institucional'])

function textRegex(q) {
  return new RegExp(escapeRegex(q), 'i')
}

module.exports = class EducationSearchController {
  static async search(req, res) {
    try {
      const q = (req.query.q || '').trim()
      if (!q || q.length < 2) return err(res, 422, 'Informe ao menos 2 caracteres para buscar')

      const type = SEARCH_TYPES.has(req.query.type) ? req.query.type : 'all'
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 20)
      const regex = textRegex(q)
      const data = {}

      if (type === 'all' || type === 'entities') {
        data.entities = await EducationEntity.find({
          isActive: true,
          $or: [{ name: regex }, { neighborhood: regex }, { description: regex }],
        })
          .select('name slug type neighborhood')
          .sort({ name: 1 })
          .limit(limit)
          .lean()
      }

      if (type === 'all' || type === 'news') {
        data.news = await EducationPost.find({
          status: 'published',
          type: { $in: [...NEWS_TYPES] },
          $or: [{ title: regex }, { summary: regex }, { content: regex }],
        })
          .populate('educationEntityId', 'name slug type')
          .sort({ publishedAt: -1 })
          .limit(limit)
          .lean()
      }

      if (type === 'all' || type === 'documents') {
        data.documents = await EducationDocument.find({
          status: 'published',
          visibility: 'public',
          $or: [{ title: regex }, { description: regex }, { sessionNumber: regex }],
        })
          .populate('educationEntityId', 'name slug type councilCode')
          .sort({ publishedAt: -1 })
          .limit(limit)
          .lean()
      }

      if (type === 'all' || type === 'legislation') {
        data.legislation = await EducationLegislation.find({
          status: 'published',
          $or: [{ title: regex }, { description: regex }, { number: regex }],
        })
          .populate('educationEntityId', 'name slug type councilCode')
          .sort({ publicationDate: -1, year: -1 })
          .limit(limit)
          .lean()
      }

      if (type === 'all' || type === 'galleries') {
        data.galleries = await EducationGallery.find({
          $or: [{ title: regex }, { description: regex }],
        })
          .populate('educationEntityId', 'name slug type')
          .sort({ eventDate: -1 })
          .limit(limit)
          .lean()
      }

      const total = Object.values(data).reduce((sum, items) => sum + (items?.length || 0), 0)

      return ok(res, 200, { data, total, query: q, type })
    } catch (error) {
      console.error('[EducationSearchController.search]', error)
      return err(res, 500, 'Erro na busca')
    }
  }
}
