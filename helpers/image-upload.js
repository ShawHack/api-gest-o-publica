// helpers/image-upload.js
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const BASE_DIR = process.env.UPLOAD_DIR || '/data/apicemiterio'

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

const imageStorage = multer.diskStorage({
  destination(req, file, cb) {
    // mantém sua regra por rota
    const base = (req.baseUrl || '').toLowerCase()
    let folder = 'misc'
    if (base.includes('/users')) folder = 'users'
    else if (base.includes('/sepultados')) folder = 'sepultados'
    else if (base.includes('/services')) folder = 'services'

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
    if (!/\.(png|jpe?g)$/i.test(file.originalname || '')) {
      return cb(new Error('Por favor, envie apenas arquivos JPG, JPEG ou PNG.'))
    }
    cb(null, true)
  },
  limits: { fileSize: 10 * 1024 * 1024 },
})

module.exports = { imageUpload, BASE_DIR }
