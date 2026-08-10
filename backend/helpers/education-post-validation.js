const ObjectId = require('mongoose').Types.ObjectId

const { POST_TYPES, POST_STATUSES, FEATURED_MEDIA_TYPES } = require('./education-constants')
const { extractYouTubeVideoId, normalizeExternalUrl, isValidExternalUrl } = require('./education-post-media')

function fieldError(errors, field, message) {
  if (!message) return
  if (!errors[field]) errors[field] = []
  errors[field].push(message)
}

function normalizePostBody(body = {}) {
  return {
    educationEntityId: String(body.educationEntityId || '').trim(),
    title: String(body.title || '').trim(),
    slug: String(body.slug || '').trim(),
    type: String(body.type || '').trim(),
    summary: body.summary !== undefined ? String(body.summary) : '',
    content: body.content !== undefined ? String(body.content) : '',
    authorName: String(body.authorName || '').trim(),
    sourceUrl: normalizeExternalUrl(body.sourceUrl),
    status: String(body.status || '').trim(),
    featuredMediaType: String(body.featuredMediaType || '').trim(),
    youtubeUrl: String(body.youtubeUrl || '').trim(),
    featured: body.featured,
  }
}

function validatePostInput(body, { entity = null, partial = false } = {}) {
  const errors = {}
  const data = normalizePostBody(body)

  if (!partial || data.educationEntityId) {
    if (!data.educationEntityId) {
      fieldError(errors, 'educationEntityId', 'A unidade ou conselho é obrigatório.')
    } else if (!ObjectId.isValid(data.educationEntityId)) {
      fieldError(errors, 'educationEntityId', 'ID da entidade inválido.')
    }
  }

  if (!partial || data.title) {
    if (!data.title) {
      fieldError(errors, 'title', 'O título é obrigatório.')
    }
  }

  if (!partial || data.type) {
    if (!data.type) {
      fieldError(errors, 'type', 'O tipo da publicação é obrigatório.')
    } else if (!POST_TYPES.includes(data.type)) {
      fieldError(errors, 'type', 'Tipo de publicação inválido.')
    }
  }

  if (data.status && !POST_STATUSES.includes(data.status)) {
    fieldError(errors, 'status', 'Status de publicação inválido.')
  }

  if (data.featuredMediaType && !FEATURED_MEDIA_TYPES.includes(data.featuredMediaType)) {
    fieldError(errors, 'featuredMediaType', 'Tipo de destaque visual inválido.')
  }

  if (data.youtubeUrl && !extractYouTubeVideoId(data.youtubeUrl)) {
    fieldError(errors, 'youtubeUrl', 'Link do YouTube inválido.')
  }

  if (data.sourceUrl && !isValidExternalUrl(data.sourceUrl)) {
    fieldError(errors, 'sourceUrl', 'Link externo inválido. Informe uma URL completa (ex.: https://site.exemplo/...).')
  }

  if (entity) {
    if (data.type === 'conselhos' && entity.type !== 'conselho') {
      fieldError(
        errors,
        'educationEntityId',
        'Publicações do tipo Conselhos devem estar vinculadas a um conselho cadastrado.'
      )
    }
    if (data.type && data.type !== 'conselhos' && entity.type === 'conselho') {
      fieldError(
        errors,
        'type',
        'Selecione o tipo Conselhos para publicar em um conselho municipal.'
      )
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data,
  }
}

module.exports = {
  normalizePostBody,
  validatePostInput,
}
