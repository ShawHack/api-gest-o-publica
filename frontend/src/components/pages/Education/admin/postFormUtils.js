/** Utilitários do formulário de publicações (admin). */

import { isValidExternalUrl, normalizeExternalUrl } from '../educationUtils'

export const EMPTY_ATTACHMENT_META = {
  title: '',
  documentType: 'outro',
  description: '',
  documentDate: '',
}

function formatDocumentDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export function postAttachmentsToForm(post) {
  return (post?.attachments || []).map((doc) => ({
    title: doc.title || '',
    documentType: doc.documentType || 'outro',
    description: doc.description || '',
    documentDate: formatDocumentDate(doc.documentDate),
    fileUrl: doc.fileUrl || '',
    originalName: doc.originalName || '',
    order: doc.order ?? 0,
  }))
}

export function postToForm(post) {
  return {
    educationEntityId: post.educationEntityId?._id || post.educationEntityId || '',
    title: post.title || '',
    slug: post.slug || '',
    type: post.type || 'comunicado',
    summary: post.summary || '',
    content: post.content || '',
    authorName: post.authorName || '',
    sourceUrl: post.sourceUrl || '',
    featuredMediaType: post.featuredMediaType || 'image',
    youtubeUrl: post.youtubeUrl || '',
    featured: !!post.featured,
  }
}

export function appendPostAttachmentsToFormData(formData, {
  existingAttachments = [],
  newPdfFiles = [],
  attachmentsMeta = [],
} = {}) {
  if (existingAttachments.length) {
    formData.append('existingAttachments', JSON.stringify(existingAttachments))
  }
  if (attachmentsMeta.length) {
    formData.append('attachmentsMeta', JSON.stringify(attachmentsMeta))
  }
  newPdfFiles.forEach((file) => {
    formData.append('attachments', file)
  })
}

export function defaultMetaFromFile(file) {
  return {
    ...EMPTY_ATTACHMENT_META,
    title: file.name.replace(/\.pdf$/i, ''),
  }
}

export function postFormNeedsMultipart({ coverFile, newPdfFiles = [] } = {}) {
  return Boolean(coverFile) || newPdfFiles.length > 0
}

export function validatePostEntityLink(postForm, entities = []) {
  const entity = entities.find((e) => String(e._id) === String(postForm.educationEntityId))
  if (!entity) return null
  if (postForm.type === 'conselhos' && entity.type !== 'conselho') {
    return 'Publicações do tipo Conselhos devem estar vinculadas a um conselho cadastrado.'
  }
  if (postForm.type !== 'conselhos' && entity.type === 'conselho') {
    return 'Selecione o tipo "Conselhos" para publicar em um conselho municipal.'
  }
  return null
}

export function preparePostFormForSubmit(postForm) {
  const prepared = {
    ...postForm,
    sourceUrl: normalizeExternalUrl(postForm.sourceUrl),
  }
  if (prepared.youtubeUrl) {
    prepared.youtubeUrl = prepared.youtubeUrl.trim()
  }
  return prepared
}

export function validatePostExternalLinks(postForm, existingAttachments = []) {
  const sourceUrl = String(postForm.sourceUrl || '').trim()
  if (sourceUrl) {
    const normalized = normalizeExternalUrl(sourceUrl)
    if (!isValidExternalUrl(normalized)) {
      return 'Link externo inválido. Ex.: https://www.exemplo.gov.br/pagina'
    }
  }

  for (const doc of existingAttachments) {
    const url = String(doc.fileUrl || '').trim()
    if (!url) {
      if (!doc.originalName || doc.originalName === 'Link externo') {
        return 'Informe a URL de todos os links externos adicionados.'
      }
      continue
    }
    if (url.startsWith('/')) continue
    const normalized = normalizeExternalUrl(url)
    if (!isValidExternalUrl(normalized)) {
      return 'Há um link externo de documento inválido. Verifique a URL informada.'
    }
  }

  return null
}

function appendPostFields(formData, postForm) {
  Object.entries(postForm).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      formData.append(key, String(value))
    }
  })
}

export function buildPostJsonPayload(postForm, {
  publish = false,
  editingPostId = null,
  editingPostStatus = null,
  existingAttachments = [],
} = {}) {
  const payload = preparePostFormForSubmit(postForm)
  if (editingPostId) {
    if (publish) payload.status = 'published'
  } else {
    payload.status = publish ? 'published' : 'draft'
  }
  if (existingAttachments.length) {
    payload.existingAttachments = existingAttachments.map((doc) => {
      const fileUrl = String(doc.fileUrl || '').trim()
      if (!fileUrl || fileUrl.startsWith('/')) return doc
      return { ...doc, fileUrl: normalizeExternalUrl(fileUrl) }
    })
  }
  return payload
}

export function buildPostFormData(postForm, {
  publish = false,
  editingPostId = null,
  coverFile = null,
  existingAttachments = [],
  newPdfFiles = [],
  attachmentsMeta = [],
} = {}) {
  const formData = new FormData()
  appendPostFields(formData, preparePostFormForSubmit(postForm))
  if (coverFile) formData.append('cover', coverFile)
  appendPostAttachmentsToFormData(formData, {
    existingAttachments: existingAttachments.map((doc) => {
      const fileUrl = String(doc.fileUrl || '').trim()
      if (!fileUrl || fileUrl.startsWith('/')) return doc
      return { ...doc, fileUrl: normalizeExternalUrl(fileUrl) }
    }),
    newPdfFiles,
    attachmentsMeta,
  })
  if (editingPostId) {
    if (publish) formData.append('status', 'published')
  } else {
    formData.append('status', publish ? 'published' : 'draft')
  }
  return formData
}

export function extractPostSubmitError(err) {
  const data = err?.response?.data
  if (data?.errors && typeof data.errors === 'object') {
    const lines = Object.entries(data.errors).flatMap(([field, messages]) => {
      const list = Array.isArray(messages) ? messages : [messages]
      return list.filter(Boolean).map((msg) => `${field}: ${msg}`)
    })
    if (lines.length) return lines.join(' ')
  }
  return data?.error || data?.message || err?.message || 'Erro ao salvar publicação.'
}
