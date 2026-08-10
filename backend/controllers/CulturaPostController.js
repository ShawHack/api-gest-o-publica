const ObjectId = require('mongoose').Types.ObjectId

const CulturaPost = require('../models/CulturaPost')
const CulturaCategory = require('../models/CulturaCategory')
const { POST_FORMATOS, POST_STATUSES } = require('../helpers/cultura-constants')
const { recordAudit, recordChange } = require('../helpers/audit-log')
const {
  parseBoolean,
  parsePagination,
  paginatedResponse,
  ok,
  err,
} = require('../helpers/cultura-service')

function parseJsonField(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  if (Array.isArray(value)) return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function normalizePost(doc) {
  if (!doc) return doc
  const post = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc }
  return post
}

function buildPublicFilter(query) {
  const filter = { status: 'published' }
  if (query.tipo) filter.tipo = query.tipo
  if (query.formato) filter.formato = query.formato
  if (query.emCartazTeatro !== undefined && query.emCartazTeatro !== '') {
    filter.emCartazTeatro = parseBoolean(query.emCartazTeatro)
  }
  return filter
}

function applyUploadsToPost(post, req) {
  if (!req.files) return
  if (req.files.banner?.[0]) {
    post.bannerUrl = `/images/cultura/${req.files.banner[0].filename}`
  }
  if (req.files.imagens?.length) {
    post.imagensUrl = req.files.imagens.map((f) => `/images/cultura/${f.filename}`)
  }
}

function validatePostBody(body, { partial = false } = {}) {
  const errors = []
  const { titulo, tipo, formato, descricao } = body
  if (!partial || titulo !== undefined) {
    if (!titulo || !String(titulo).trim()) errors.push('Título é obrigatório')
  }
  if (!partial || tipo !== undefined) {
    if (!tipo || !String(tipo).trim()) errors.push('Categoria é obrigatória')
  }
  if (!partial || formato !== undefined) {
    const fmt = parseJsonField(formato, formato)
    if (!Array.isArray(fmt) || fmt.length === 0) {
      errors.push('Formato é obrigatório')
    } else if (!fmt.every((f) => POST_FORMATOS.includes(f))) {
      errors.push('Formato inválido')
    }
  }
  if (!partial || descricao !== undefined) {
    if (!descricao || !String(descricao).trim()) errors.push('Descrição é obrigatória')
  }
  return errors
}

module.exports = class CulturaPostController {
  static async overview(_req, res) {
    return ok(res, 200, {
      data: {
        module: 'cultura',
        name: 'Garça Cidade de Culturas',
        publicPaths: ['/cultura/posts', '/cultura/categories'],
      },
    })
  }

  static async listPublic(req, res) {
    try {
      const filter = buildPublicFilter(req.query)
      const sort = { publishedAt: -1, createdAt: -1 }

      if (!req.query.page && !req.query.limit) {
        const items = await CulturaPost.find(filter).sort(sort).lean()
        return res.json(items.map(normalizePost))
      }

      const { page, limit, skip } = parsePagination(req.query, { maxLimit: 100 })
      const [items, total] = await Promise.all([
        CulturaPost.find(filter).sort(sort).skip(skip).limit(limit).lean(),
        CulturaPost.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items.map(normalizePost), total, page, limit))
    } catch (error) {
      console.error('[CulturaPostController.listPublic]', error)
      return err(res, 500, 'Erro ao listar publicações')
    }
  }

  static async getByIdPublic(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')
      const post = await CulturaPost.findOne({ _id: id, status: 'published' }).lean()
      if (!post) return err(res, 404, 'Publicação não encontrada')
      if (req.query.wrap === 'true') {
        return ok(res, 200, { data: normalizePost(post) })
      }
      return res.json(normalizePost(post))
    } catch (error) {
      console.error('[CulturaPostController.getByIdPublic]', error)
      return err(res, 500, 'Erro ao carregar publicação')
    }
  }

  static async listAdmin(req, res) {
    try {
      const { page, limit, skip } = parsePagination(req.query, { maxLimit: 100 })
      const filter = {}
      if (req.query.status && POST_STATUSES.includes(req.query.status)) {
        filter.status = req.query.status
      }
      const [items, total] = await Promise.all([
        CulturaPost.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        CulturaPost.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items.map(normalizePost), total, page, limit))
    } catch (error) {
      console.error('[CulturaPostController.listAdmin]', error)
      return err(res, 500, 'Erro ao listar publicações')
    }
  }

  static async getByIdAdmin(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')
      const post = await CulturaPost.findById(id).lean()
      if (!post) return err(res, 404, 'Publicação não encontrada')
      return ok(res, 200, { data: normalizePost(post) })
    } catch (error) {
      console.error('[CulturaPostController.getByIdAdmin]', error)
      return err(res, 500, 'Erro ao carregar publicação')
    }
  }

  static async create(req, res) {
    try {
      const errors = validatePostBody(req.body)
      if (errors.length) return err(res, 422, errors[0])

      const formato = parseJsonField(req.body.formato, [])
      const datasHorarios = parseJsonField(req.body.datasHorarios, [])
      const status = POST_STATUSES.includes(req.body.status) ? req.body.status : 'published'

      const post = new CulturaPost({
        titulo: req.body.titulo,
        tipo: req.body.tipo,
        formato,
        descricao: req.body.descricao,
        corTituloCapa: req.body.corTituloCapa || '#ffffff',
        videoUrl: req.body.videoUrl || '',
        emCartazTeatro: parseBoolean(req.body.emCartazTeatro),
        datasHorarios,
        status,
        publishedAt: status === 'published' ? new Date() : null,
        createdBy: req.user.id,
      })

      applyUploadsToPost(post, req)
      await post.save()

      await recordAudit(req, {
        action: 'cultura.post.create',
        resourceType: 'cultura_post',
        resourceId: post._id,
        module: 'cultura',
        eventType: 'CREATE',
      })

      return ok(res, 201, { message: 'Postagem criada com sucesso!', data: normalizePost(post), post: normalizePost(post) })
    } catch (error) {
      console.error('[CulturaPostController.create]', error)
      return err(res, 500, 'Erro ao criar publicação')
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const post = await CulturaPost.findById(id)
      if (!post) return err(res, 404, 'Publicação não encontrada')

      const errors = validatePostBody(req.body, { partial: true })
      if (errors.length) return err(res, 422, errors[0])

      const before = post.toObject()
      if (req.body.titulo !== undefined) post.titulo = req.body.titulo
      if (req.body.tipo !== undefined) post.tipo = req.body.tipo
      if (req.body.formato !== undefined) post.formato = parseJsonField(req.body.formato, post.formato)
      if (req.body.descricao !== undefined) post.descricao = req.body.descricao
      if (req.body.corTituloCapa !== undefined) post.corTituloCapa = req.body.corTituloCapa
      if (req.body.videoUrl !== undefined) post.videoUrl = req.body.videoUrl
      if (req.body.emCartazTeatro !== undefined) {
        post.emCartazTeatro = parseBoolean(req.body.emCartazTeatro)
      }
      if (req.body.datasHorarios !== undefined) {
        post.datasHorarios = parseJsonField(req.body.datasHorarios, [])
      }
      if (req.body.status !== undefined && POST_STATUSES.includes(req.body.status)) {
        post.status = req.body.status
        if (req.body.status === 'published' && !post.publishedAt) {
          post.publishedAt = new Date()
        }
      }

      applyUploadsToPost(post, req)
      await post.save()

      await recordChange(req, {
        action: 'cultura.post.update',
        resourceType: 'cultura_post',
        resourceId: post._id,
        module: 'cultura',
        before,
        after: post.toObject(),
      })

      return ok(res, 200, { message: 'Postagem atualizada com sucesso!', data: normalizePost(post), post: normalizePost(post) })
    } catch (error) {
      console.error('[CulturaPostController.update]', error)
      return err(res, 500, 'Erro ao atualizar publicação')
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const post = await CulturaPost.findByIdAndDelete(id)
      if (!post) return err(res, 404, 'Publicação não encontrada')

      await recordAudit(req, {
        action: 'cultura.post.delete',
        resourceType: 'cultura_post',
        resourceId: id,
        module: 'cultura',
        eventType: 'DELETE',
      })

      return ok(res, 200, { message: 'Postagem deletada com sucesso.' })
    } catch (error) {
      console.error('[CulturaPostController.remove]', error)
      return err(res, 500, 'Erro ao excluir publicação')
    }
  }
}
