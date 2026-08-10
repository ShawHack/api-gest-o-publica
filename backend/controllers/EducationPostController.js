const ObjectId = require('mongoose').Types.ObjectId

const EducationPost = require('../models/EducationPost')
const EducationEntity = require('../models/EducationEntity')
const { POST_TYPES, POST_STATUSES } = require('../helpers/education-constants')
const { recordAudit, recordChange } = require('../helpers/audit-log')
const { canAccessEntity } = require('../helpers/education-auth')
const {
  escapeRegex,
  parseBoolean,
  parsePagination,
  uniquePostSlug,
  paginatedResponse,
  ok,
  err,
  validationErr,
  canApproveEducationContent,
} = require('../helpers/education-service')
const {
  extractYouTubeVideoId,
  applyPostMediaFromRequest,
  normalizePostMedia,
  normalizeExternalUrl,
  getPostCoverImageUrl,
  buildPostAttachmentsFromRequest,
} = require('../helpers/education-post-media')
const { validatePostInput } = require('../helpers/education-post-validation')

const NEWS_TYPES = new Set([
  'noticia',
  'comunicado',
  'aviso',
  'destaque',
  'mensagem_institucional',
  'conselhos',
  'evento',
  'projeto',
  'campanha',
])

module.exports = class EducationPostController {
  static async listPublic(req, res) {
    try {
      const { page, limit, skip } = parsePagination(req.query)
      const filter = { status: 'published' }
      if (req.query.type) filter.type = req.query.type
      if (req.query.entitySlug) {
        const entity = await EducationEntity.findOne({ slug: req.query.entitySlug, isActive: true }).select('_id')
        if (!entity) return err(res, 404, 'Unidade não encontrada')
        filter.educationEntityId = entity._id
      }
      if (req.query.q) {
        filter.title = new RegExp(escapeRegex(req.query.q), 'i')
      }
      if (req.query.featured !== undefined && req.query.featured !== '') {
        filter.featured = parseBoolean(req.query.featured)
      }
      const [items, total] = await Promise.all([
        EducationPost.find(filter)
          .populate('educationEntityId', 'name slug type')
          .sort({ publishedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationPost.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items.map(normalizePostMedia), total, page, limit))
    } catch (error) {
      console.error('[EducationPostController.listPublic]', error)
      return err(res, 500, 'Erro ao listar publicações')
    }
  }

  static async listNews(req, res) {
    req.query.type = req.query.type || undefined
    const originalQuery = { ...req.query }
    if (!originalQuery.type) {
      const featuredParam = req.query.featured
      const hasFeaturedFilter = featuredParam !== undefined && featuredParam !== ''
      const onlyFeatured = hasFeaturedFilter && parseBoolean(featuredParam)
      const { page, limit, skip } = parsePagination(req.query, { maxLimit: 50 })
      const filter = { status: 'published' }
      if (!onlyFeatured) {
        filter.type = { $in: [...NEWS_TYPES] }
      }
      if (req.query.entitySlug) {
        const entity = await EducationEntity.findOne({ slug: req.query.entitySlug }).select('_id')
        if (entity) filter.educationEntityId = entity._id
      }
      if (hasFeaturedFilter) {
        filter.featured = parseBoolean(featuredParam)
      }
      const [items, total] = await Promise.all([
        EducationPost.find(filter)
          .populate('educationEntityId', 'name slug type')
          .sort({ publishedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationPost.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items.map(normalizePostMedia), total, page, limit))
    }
    return EducationPostController.listPublic(req, res)
  }

  static async getBySlug(req, res) {
    try {
      const filter = { slug: req.params.slug, status: 'published' }
      if (req.query.entitySlug) {
        const entity = await EducationEntity.findOne({ slug: req.query.entitySlug }).select('_id')
        if (entity) filter.educationEntityId = entity._id
      }
      const post = await EducationPost.findOne(filter)
        .populate('educationEntityId', 'name slug type')
        .lean()
      if (!post) return err(res, 404, 'Publicação não encontrada')
      return ok(res, 200, { data: normalizePostMedia(post) })
    } catch (error) {
      console.error('[EducationPostController.getBySlug]', error)
      return err(res, 500, 'Erro ao carregar publicação')
    }
  }

  static async listAdmin(req, res) {
    try {
      const ctx = req.educationContext
      const { page, limit, skip } = parsePagination(req.query)
      const filter = {}
      if (req.query.status) filter.status = req.query.status
      if (req.query.type) filter.type = req.query.type
      if (req.query.entityId) filter.educationEntityId = req.query.entityId

      if (!ctx.isGlobalAdmin && !ctx.isEducationAdmin) {
        const ids = (ctx.assignments || [])
          .filter((a) => a.educationEntityId)
          .map((a) => a.educationEntityId)
        if (ctx.assignments.some((a) => a.role === 'education_secretary')) {
          // secretaria vê tudo
        } else {
          filter.educationEntityId = { $in: ids }
        }
      }

      const [items, total] = await Promise.all([
        EducationPost.find(filter)
          .populate('educationEntityId', 'name slug type')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        EducationPost.countDocuments(filter),
      ])
      return res.json(paginatedResponse(items, total, page, limit))
    } catch (error) {
      console.error('[EducationPostController.listAdmin]', error)
      return err(res, 500, 'Erro ao listar publicações')
    }
  }

  static async create(req, res) {
    try {
      const entity = req.body?.educationEntityId
        ? await EducationEntity.findById(req.body.educationEntityId).select('type')
        : null

      const validation = validatePostInput(req.body, { entity })
      if (!validation.valid) {
        return validationErr(res, validation.errors)
      }

      const {
        educationEntityId,
        title,
        type,
        summary,
        content,
      } = validation.data

      const ctx = req.educationContext
      if (!entity) return err(res, 404, 'Entidade não encontrada')
      if (!canAccessEntity(ctx, educationEntityId, { action: 'create', entityType: entity.type })) {
        return err(res, 403, 'Sem permissão para esta unidade')
      }

      const slug = await uniquePostSlug(educationEntityId, req.body.slug || title)
      let status = POST_STATUSES.includes(req.body.status) ? req.body.status : 'draft'
      if (status === 'published' && !canApproveEducationContent(ctx)) {
        return err(res, 403, 'Sem permissão para publicar diretamente. Salve como rascunho.')
      }

      const post = new EducationPost({
        educationEntityId,
        title,
        slug,
        summary: summary || '',
        content: content || '',
        authorName: String(req.body.authorName || '').trim(),
        sourceUrl: normalizeExternalUrl(req.body.sourceUrl),
        type,
        status,
        featured: parseBoolean(req.body.featured),
        createdBy: req.user.id,
        publishedAt: status === 'published' ? new Date() : null,
      })

      applyPostMediaFromRequest(post, req.body, { coverImageUrl: getPostCoverImageUrl(req) })
      post.attachments = buildPostAttachmentsFromRequest(req, [])
      if (status === 'published') {
        post.approvedBy = req.user.id
      }
      await post.save()

      await recordAudit(req, {
        action: status === 'published' ? 'education.post.publish' : 'education.post.create',
        resourceType: 'education_post',
        resourceId: post._id,
        module: 'education',
        eventType: status === 'published' ? 'APPROVE' : 'CREATE',
      })

      return ok(res, 201, { data: post })
    } catch (error) {
      console.error('[EducationPostController.create]', error)
      if (error?.code === 11000) {
        return err(res, 409, 'Já existe uma publicação com este slug nesta unidade')
      }
      const detail = process.env.NODE_ENV !== 'production' ? error.message : undefined
      return err(res, 500, detail || 'Erro ao criar publicação')
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const post = await EducationPost.findById(id)
      if (!post) return err(res, 404, 'Publicação não encontrada')

      const entity = await EducationEntity.findById(post.educationEntityId).select('type')
      const ctx = req.educationContext
      if (!canAccessEntity(ctx, post.educationEntityId, { action: 'write', entityType: entity?.type })) {
        return err(res, 403, 'Sem permissão para esta unidade')
      }

      const before = post.toObject()

      const validation = validatePostInput(req.body, { entity, partial: true })
      if (!validation.valid) {
        return validationErr(res, validation.errors)
      }

      if (req.body.title) post.title = validation.data.title
      if (req.body.summary !== undefined) post.summary = req.body.summary
      if (req.body.content !== undefined) post.content = req.body.content
      if (req.body.authorName !== undefined) post.authorName = String(req.body.authorName || '').trim()
      if (req.body.sourceUrl !== undefined) {
        post.sourceUrl = normalizeExternalUrl(req.body.sourceUrl)
      }
      if (req.body.type && POST_TYPES.includes(req.body.type)) {
        post.type = req.body.type
      }
      if (req.body.status && POST_STATUSES.includes(req.body.status)) {
        const nextStatus = req.body.status
        if (nextStatus === 'published' && post.status !== 'published' && !canApproveEducationContent(ctx)) {
          return err(res, 403, 'Sem permissão para publicar esta publicação.')
        }
        post.status = nextStatus
      }
      if (req.body.featured !== undefined) post.featured = parseBoolean(req.body.featured)
      if (req.body.slug) post.slug = await uniquePostSlug(post.educationEntityId, req.body.slug, id)

      applyPostMediaFromRequest(post, req.body, { coverImageUrl: getPostCoverImageUrl(req) })
      if (
        req.body.existingAttachments !== undefined ||
        (Array.isArray(req.files?.attachments) && req.files.attachments.length > 0) ||
        req.body.attachmentsMeta
      ) {
        post.attachments = buildPostAttachmentsFromRequest(req, post.attachments || [])
      }

      await post.save()
      await recordChange(req, {
        before,
        after: post.toObject(),
        resourceType: 'education_post',
        resourceId: post._id,
        module: 'education',
      })

      return ok(res, 200, { data: post })
    } catch (error) {
      console.error('[EducationPostController.update]', error)
      return err(res, 500, 'Erro ao atualizar publicação')
    }
  }

  static async publish(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const post = await EducationPost.findById(id)
      if (!post) return err(res, 404, 'Publicação não encontrada')

      const ctx = req.educationContext
      const canApprove = ctx.isGlobalAdmin || ctx.isEducationAdmin ||
        ctx.assignments?.some((a) => a.role === 'education_secretary' || a.role === 'education_admin')

      if (!canApprove && post.status === 'pending_review') {
        return err(res, 403, 'Aguardando aprovação da Secretaria')
      }

      if (!canAccessEntity(ctx, post.educationEntityId, { action: 'approve' }) &&
          !canAccessEntity(ctx, post.educationEntityId, { action: 'write' })) {
        return err(res, 403, 'Sem permissão')
      }

      post.status = 'published'
      post.publishedAt = new Date()
      post.approvedBy = req.user.id
      await post.save()

      await recordAudit(req, {
        action: 'education.post.publish',
        resourceType: 'education_post',
        resourceId: post._id,
        module: 'education',
        eventType: 'APPROVE',
      })

      return ok(res, 200, { data: post })
    } catch (error) {
      console.error('[EducationPostController.publish]', error)
      return err(res, 500, 'Erro ao publicar')
    }
  }

  static async archive(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const post = await EducationPost.findById(id)
      if (!post) return err(res, 404, 'Publicação não encontrada')

      const ctx = req.educationContext
      if (!canAccessEntity(ctx, post.educationEntityId, { action: 'write' }) &&
          !ctx.isEducationAdmin && !ctx.isGlobalAdmin) {
        return err(res, 403, 'Sem permissão')
      }

      post.status = 'archived'
      await post.save()

      await recordAudit(req, {
        action: 'education.post.archive',
        resourceType: 'education_post',
        resourceId: post._id,
        module: 'education',
        eventType: 'UPDATE',
      })

      return ok(res, 200, { data: post })
    } catch (error) {
      console.error('[EducationPostController.archive]', error)
      return err(res, 500, 'Erro ao arquivar')
    }
  }

  static async remove(req, res) {
    try {
      const { id } = req.params
      if (!ObjectId.isValid(id)) return err(res, 422, 'ID inválido')

      const post = await EducationPost.findById(id)
      if (!post) return err(res, 404, 'Publicação não encontrada')

      const ctx = req.educationContext
      if (!canAccessEntity(ctx, post.educationEntityId, { action: 'delete' }) &&
          !ctx.isEducationAdmin && !ctx.isGlobalAdmin) {
        return err(res, 403, 'Sem permissão')
      }

      await post.deleteOne()
      await recordAudit(req, {
        action: 'education.post.delete',
        resourceType: 'education_post',
        resourceId: id,
        module: 'education',
        eventType: 'DELETE',
      })

      return ok(res, 200, { message: 'Publicação removida' })
    } catch (error) {
      console.error('[EducationPostController.remove]', error)
      return err(res, 500, 'Erro ao remover publicação')
    }
  }
}
