const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { execFile } = require('child_process')
const { BASE_DIR } = require('./image-upload')

const DIR = path.join(BASE_DIR, 'comtur')
const MAX = 25 * 1024 * 1024
const allowed = new Set([
  'application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/x-icon', 'image/vnd.microsoft.icon', 'audio/mpeg', 'video/mp4',
])
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.ico', '.pdf', '.mp3', '.mp4'])

function mimeOf(file) {
  const mime = String(file?.mimetype || '').toLowerCase()
  return mime === 'image/jpg' ? 'image/jpeg' : mime
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    try {
      fs.mkdirSync(DIR, { recursive: true })
      cb(null, DIR)
    } catch (e) {
      const err = new Error('Pasta de imagens do portal indisponível.')
      err.status = 500
      cb(err)
    }
  },
  filename(_req, file, cb) {
    cb(null, `${Date.now()}-${crypto.randomBytes(10).toString('hex')}${path.extname(file.originalname || '').toLowerCase()}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX },
  fileFilter(_req, file, cb) {
    const mime = mimeOf(file)
    const ext = path.extname(file.originalname || '').toLowerCase()
    if (allowed.has(mime) || ALLOWED_EXT.has(ext)) return cb(null, true)
    cb(new Error('Envie PDF, JPEG, PNG, WebP, MP3 ou MP4.'))
  },
}).single('file')

function magicOk(file) {
  const b = fs.readFileSync(file.path).subarray(0, 12)
  const m = mimeOf(file)
  if (m === 'application/pdf') return b.subarray(0, 5).toString() === '%PDF-'
  if (m === 'image/png') return b.subarray(1, 4).toString() === 'PNG'
  if (m === 'image/jpeg') return b[0] === 0xff && b[1] === 0xd8
  if (m === 'image/webp') return b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP'
  if (m.includes('icon')) return b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0
  return true
}

function scan(filePath) {
  return new Promise((resolve, reject) => {
    const bin = process.env.CLAMSCAN_BIN || 'clamscan'
    execFile(bin, ['--no-summary', '--stdout', filePath], { timeout: 12000 }, (error, stdout) => {
      if (!error) return resolve()
      if (error.code === 1) {
        const err = new Error('Arquivo reprovado pelo antivírus')
        err.status = 422
        err.details = String(stdout || '').slice(0, 300)
        return reject(err)
      }
      console.warn('[comtur-upload] antivírus lento ou indisponível; arquivo aceito após validar o formato', error.code || error.signal || error.message)
      return resolve()
    })
  })
}

async function validateAndScan(file) {
  if (!magicOk(file)) {
    const e = new Error('Conteúdo do arquivo não corresponde ao formato declarado')
    e.status = 422
    throw e
  }
  await scan(file.path)
  const hash = crypto.createHash('sha256').update(fs.readFileSync(file.path)).digest('hex')
  return {
    url: `/images/comtur/${file.filename}`,
    hash,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    originalName: file.originalname,
  }
}

module.exports = { upload, validateAndScan, MAX }
