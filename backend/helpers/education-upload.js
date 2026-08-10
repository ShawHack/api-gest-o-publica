const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { BASE_DIR } = require('./image-upload')

const MAX_EDUCATION_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_EDUCATION_DOCUMENT_BYTES = 500 * 1024 * 1024

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

const imageStorage = multer.diskStorage({
  destination(req, _file, cb) {
    const uploadDir = path.join(BASE_DIR, 'education')
    try {
      ensureDir(uploadDir)
      cb(null, uploadDir)
    } catch (e) {
      cb(e)
    }
  },
  filename(_req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, unique + path.extname(file.originalname || ''))
  },
})

const documentStorage = multer.diskStorage({
  destination(req, _file, cb) {
    const uploadDir = path.join(BASE_DIR, 'education', 'documents')
    try {
      ensureDir(uploadDir)
      cb(null, uploadDir)
    } catch (e) {
      cb(e)
    }
  },
  filename(_req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, unique + path.extname(file.originalname || ''))
  },
})

const imageFilter = (_req, file, cb) => {
  const mime = String(file.mimetype || '').toLowerCase()
  const ext = path.extname(file.originalname || '').toLowerCase()
  const imageExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp'])
  if (mime.startsWith('image/')) return cb(null, true)
  if ((mime === '' || mime === 'application/octet-stream') && imageExts.has(ext)) {
    return cb(null, true)
  }
  return cb(new Error('Por favor, envie apenas arquivos de imagem válidos.'))
}

const documentFilter = (_req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]
  if (allowedMimes.includes(file.mimetype)) return cb(null, true)
  return cb(
    new Error('Tipo de arquivo inválido. Apenas imagens e documentos (PDF, Doc, XLS) são permitidos.'),
    false
  )
}

const educationImageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: MAX_EDUCATION_IMAGE_BYTES },
})

const educationDocumentUpload = multer({
  storage: documentStorage,
  fileFilter: documentFilter,
  limits: { fileSize: MAX_EDUCATION_DOCUMENT_BYTES },
})

const postMediaStorage = multer.diskStorage({
  destination(req, file, cb) {
    const subdir =
      file.fieldname === 'attachments'
        ? path.join('education', 'documents')
        : 'education'
    const uploadDir = path.join(BASE_DIR, subdir)
    try {
      ensureDir(uploadDir)
      cb(null, uploadDir)
    } catch (e) {
      cb(e)
    }
  },
  filename(_req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, unique + path.extname(file.originalname || ''))
  },
})

const postMediaFilter = (req, file, cb) => {
  if (file.fieldname === 'cover') return imageFilter(req, file, cb)
  if (file.fieldname === 'attachments') return documentFilter(req, file, cb)
  return cb(new Error('Campo de upload inválido.'), false)
}

const educationPostUpload = multer({
  storage: postMediaStorage,
  fileFilter: postMediaFilter,
  limits: { fileSize: MAX_EDUCATION_DOCUMENT_BYTES },
}).fields([
  { name: 'cover', maxCount: 1 },
  { name: 'attachments', maxCount: 10 },
])

function educationPostUploadMiddleware(req, res, next) {
  const contentType = String(req.headers['content-type'] || '')
  if (!contentType.includes('multipart/form-data')) {
    return next()
  }
  return educationPostUpload(req, res, next)
}

function documentPublicUrl(filename) {
  return `/images/education/documents/${filename}`
}

module.exports = {
  MAX_EDUCATION_IMAGE_BYTES,
  MAX_EDUCATION_DOCUMENT_BYTES,
  educationImageUpload,
  educationDocumentUpload,
  educationPostUpload,
  educationPostUploadMiddleware,
  documentPublicUrl,
}
