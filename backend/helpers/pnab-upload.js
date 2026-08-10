const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { PNAB_UPLOAD_ROOT } = require('./pnab-service')

const tempDir = path.join(PNAB_UPLOAD_ROOT, '_tmp')

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    try {
      fs.mkdirSync(tempDir, { recursive: true })
      cb(null, tempDir)
    } catch (e) {
      cb(e)
    }
  },
  filename(_req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, unique + path.extname(file.originalname || ''))
  },
})

const pnabUpload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } })

module.exports = { pnabUpload }
