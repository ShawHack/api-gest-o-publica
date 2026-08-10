// helpers/image-upload.js
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Backup: /data/apicemiterio. Local: public para uploads dentro do projeto.
const BASE_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../public')

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

const imageStorage = multer.diskStorage({
  destination(req, file, cb) {
    // mantém regra por rota (alinhado com backup - subdirs diretos em BASE_DIR)
    const base = (req.baseUrl || '').toLowerCase()
    let folder = 'misc'
    if (base.includes('/users')) folder = 'users'
    else if (base.includes('/sepultados')) folder = 'sepultados'
    else if (base.includes('/services')) folder = 'services'
    else if (base.includes('/pets') || base.includes('/arvores')) folder = 'images_semit_a_pet'

    const uploadDir = path.join(BASE_DIR, folder)
    try { ensureDir(uploadDir); cb(null, uploadDir) } catch (e) { cb(e) }
  },
  filename(req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, unique + path.extname(file.originalname || ''))
  },
})

const imageUpload = multer({
  storage: imageStorage,
  fileFilter(req, file, cb) {
    const mime = String(file.mimetype || '').toLowerCase()
    const ext = path.extname(file.originalname || '').toLowerCase()
    const imageExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp'])
    if (mime.startsWith('image/')) {
      return cb(null, true)
    }
    // Apps mobile (Flutter/Android) às vezes enviam application/octet-stream sem mimetype.
    if (
      (mime === '' || mime === 'application/octet-stream') &&
      imageExts.has(ext)
    ) {
      return cb(null, true)
    }
    return cb(new Error('Por favor, envie apenas arquivos de imagem válidos.'))
  },
  limits: { fileSize: 10 * 1024 * 1024 },
})

module.exports = { imageUpload, BASE_DIR }
