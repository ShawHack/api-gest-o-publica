const multer = require('multer')
const path = require('path')
const fs = require('fs')

let BASE_DIR
try {
  ({ BASE_DIR } = require('./image-upload'))
} catch {
  BASE_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../public')
}

const MAX_BANNER_BYTES = 5 * 1024 * 1024

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function imageFilter(_req, file, cb) {
  const mime = String(file.mimetype || '').toLowerCase()
  const ext = path.extname(file.originalname || '').toLowerCase()
  const imageExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp'])
  if (mime.startsWith('image/') && imageExts.has(ext || path.extname(`.${mime.split('/')[1] || ''}`))) return cb(null, true)
  if (mime.startsWith('image/')) return cb(null, true)
  if ((mime === '' || mime === 'application/octet-stream') && imageExts.has(ext)) return cb(null, true)
  return cb(new Error('Envie uma imagem JPG, PNG, GIF ou WebP.'))
}

const agendaBannerUpload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      const uploadDir = path.join(BASE_DIR, 'agenda')
      try {
        ensureDir(uploadDir)
        cb(null, uploadDir)
      } catch (error) {
        cb(error)
      }
    },
    filename(_req, file, cb) {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
      const ext = path.extname(file.originalname || '.jpg') || '.jpg'
      cb(null, unique + ext.toLowerCase())
    },
  }),
  fileFilter: imageFilter,
  limits: { fileSize: MAX_BANNER_BYTES },
})

function agendaBannerPublicUrl(filename) {
  return `/images/agenda/${filename}`
}

module.exports = { agendaBannerUpload, agendaBannerPublicUrl, MAX_BANNER_BYTES }
