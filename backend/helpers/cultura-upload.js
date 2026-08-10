const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { BASE_DIR } = require('./image-upload')

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

const imageStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    const uploadDir = path.join(BASE_DIR, 'cultura')
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

const culturaImageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter,
})

const culturaPostUploadMiddleware = culturaImageUpload.fields([
  { name: 'banner', maxCount: 1 },
  { name: 'imagens', maxCount: 10 },
])

function ensureCulturaUploadDirs() {
  ensureDir(path.join(BASE_DIR, 'cultura'))
}

module.exports = {
  culturaImageUpload,
  culturaPostUploadMiddleware,
  ensureCulturaUploadDirs,
}
