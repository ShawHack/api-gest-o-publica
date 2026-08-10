/** Utilitários de mídia para publicações do módulo Educação. */

const { documentPublicUrl } = require('./education-upload')
const { POST_ATTACHMENT_TYPES } = require('./education-constants')

const FEATURED_MEDIA_TYPES = ['none', 'image', 'youtube']

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/

function normalizeExternalUrl(input) {
  if (!input || typeof input !== 'string') return ''
  const raw = input.trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^\/\//.test(raw)) return `https:${raw}`
  return `https://${raw.replace(/^\/+/, '')}`
}

function isValidExternalUrl(input) {
  if (!input || typeof input !== 'string') return false
  try {
    const url = new URL(input.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function extractYouTubeVideoId(input) {
  if (!input || typeof input !== 'string') return null
  const raw = input.trim()
  if (!raw) return null

  if (YOUTUBE_ID_RE.test(raw)) return raw

  let url
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase()

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0]
    return YOUTUBE_ID_RE.test(id) ? id : null
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v')
      return id && YOUTUBE_ID_RE.test(id) ? id : null
    }
    const parts = url.pathname.split('/').filter(Boolean)
    const embedIdx = parts.indexOf('embed')
    if (embedIdx >= 0 && parts[embedIdx + 1] && YOUTUBE_ID_RE.test(parts[embedIdx + 1])) {
      return parts[embedIdx + 1]
    }
    const shortsIdx = parts.indexOf('shorts')
    if (shortsIdx >= 0 && parts[shortsIdx + 1] && YOUTUBE_ID_RE.test(parts[shortsIdx + 1])) {
      return parts[shortsIdx + 1]
    }
  }

  return null
}

function youtubeThumbnailUrl(videoId, quality = 'hqdefault') {
  if (!videoId) return ''
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`
}

function youtubeEmbedUrl(videoId) {
  if (!videoId) return ''
  return `https://www.youtube-nocookie.com/embed/${videoId}`
}

function resolveFeaturedMediaType(body, hasCoverUpload) {
  const explicit = String(body?.featuredMediaType || '').toLowerCase()
  if (FEATURED_MEDIA_TYPES.includes(explicit)) return explicit
  if (extractYouTubeVideoId(body?.youtubeUrl)) return 'youtube'
  if (hasCoverUpload || body?.coverImageUrl) return 'image'
  return 'none'
}

function applyPostMediaFromRequest(post, body, { coverImageUrl = '' } = {}) {
  const videoId = extractYouTubeVideoId(body?.youtubeUrl)
  const featuredMediaType = resolveFeaturedMediaType(body, !!coverImageUrl)

  post.featuredMediaType = featuredMediaType
  post.youtubeUrl = videoId ? (body.youtubeUrl || '').trim() : ''
  post.youtubeVideoId = videoId || ''

  if (coverImageUrl) {
    post.coverImageUrl = coverImageUrl
  } else if (body.coverImageUrl !== undefined) {
    post.coverImageUrl = body.coverImageUrl || ''
  }

  if (featuredMediaType === 'youtube' && videoId && !post.coverImageUrl) {
    post.coverImageUrl = youtubeThumbnailUrl(videoId)
  }

  if (featuredMediaType === 'image' && !post.coverImageUrl && !videoId) {
    post.featuredMediaType = post.coverImageUrl ? 'image' : 'none'
  }

  if (featuredMediaType === 'youtube' && !videoId) {
    post.featuredMediaType = post.coverImageUrl ? 'image' : 'none'
    post.youtubeUrl = ''
    post.youtubeVideoId = ''
  }
}

function normalizePostMedia(post) {
  if (!post || typeof post !== 'object') return post
  const obj = { ...post }
  const videoId = obj.youtubeVideoId || extractYouTubeVideoId(obj.youtubeUrl)

  if (obj.featuredMediaType === 'youtube' && videoId) {
    obj.youtubeVideoId = videoId
    obj.embedUrl = youtubeEmbedUrl(videoId)
    obj.thumbnailUrl = obj.coverImageUrl || youtubeThumbnailUrl(videoId)
  } else if (obj.coverImageUrl) {
    obj.thumbnailUrl = obj.coverImageUrl
    obj.embedUrl = ''
  } else {
    obj.thumbnailUrl = ''
    obj.embedUrl = ''
  }

  return obj
}

function parseJsonField(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function getPostCoverImageUrl(req) {
  const cover = req.files?.cover?.[0]
  if (cover?.filename) return `/images/education/${cover.filename}`
  return ''
}

function getPostAttachmentFiles(req) {
  if (Array.isArray(req.files?.attachments)) {
    return req.files.attachments.filter((f) => f?.filename)
  }
  if (!Array.isArray(req.files)) return []
  return req.files.filter((f) => f?.fieldname === 'attachments' && f?.filename)
}

function normalizeAttachmentMeta(info = {}, file = null, order = 0) {
  const documentType = POST_ATTACHMENT_TYPES.includes(info.documentType) ? info.documentType : 'outro'
  const title = String(
    info.title || file?.originalname?.replace(/\.pdf$/i, '') || 'Documento PDF'
  ).trim()
  const description = String(info.description || '').trim()
  let documentDate = null
  if (info.documentDate) {
    const parsed = new Date(info.documentDate)
    if (!Number.isNaN(parsed.getTime())) documentDate = parsed
  }
  return {
    title,
    documentType,
    description,
    documentDate,
    order,
  }
}

function buildPostAttachmentsFromRequest(req, existing = []) {
  const meta = parseJsonField(req.body.attachmentsMeta, [])
  const keep = parseJsonField(req.body.existingAttachments, existing)
  const kept = Array.isArray(keep)
    ? keep
      .filter((d) => d?.fileUrl)
      .map((d, index) => {
        const fileUrl = String(d.fileUrl || '').trim()
        const normalizedUrl = fileUrl.startsWith('/')
          ? fileUrl
          : normalizeExternalUrl(fileUrl)
        return {
          ...normalizeAttachmentMeta(d, null, index),
          fileUrl: normalizedUrl,
          originalName: String(d.originalName || '').trim(),
        }
      })
      .filter((d) => d.fileUrl.startsWith('/') || isValidExternalUrl(d.fileUrl))
    : []

  const uploaded = getPostAttachmentFiles(req)
  const newDocs = uploaded.map((file, index) => {
    const info = meta[index] || {}
    return {
      ...normalizeAttachmentMeta(info, file, kept.length + index),
      fileUrl: documentPublicUrl(file.filename),
      originalName: file.originalname || file.filename,
    }
  })

  return [...kept, ...newDocs]
}

module.exports = {
  FEATURED_MEDIA_TYPES,
  normalizeExternalUrl,
  isValidExternalUrl,
  extractYouTubeVideoId,
  youtubeThumbnailUrl,
  youtubeEmbedUrl,
  resolveFeaturedMediaType,
  applyPostMediaFromRequest,
  normalizePostMedia,
  getPostCoverImageUrl,
  buildPostAttachmentsFromRequest,
}
