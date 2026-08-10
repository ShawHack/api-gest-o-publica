const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { BASE_DIR } = require('./image-upload')

const MAX_VOTING_PHOTO_BYTES = 5 * 1024 * 1024

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function imageFilter(_req, file, cb) {
  const mime = String(file.mimetype || '').toLowerCase()
  const ext = path.extname(file.originalname || '').toLowerCase()
  const imageExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp'])
  if (mime.startsWith('image/')) return cb(null, true)
  if ((mime === '' || mime === 'application/octet-stream') && imageExts.has(ext)) {
    return cb(null, true)
  }
  return cb(new Error('Envie apenas imagem (JPG, PNG ou WebP).'))
}

function makeImageStorage(subdir) {
  return multer.diskStorage({
    destination(_req, _file, cb) {
      const uploadDir = path.join(BASE_DIR, 'votacao', subdir)
      try {
        ensureDir(uploadDir)
        cb(null, uploadDir)
      } catch (e) {
        cb(e)
      }
    },
    filename(_req, file, cb) {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
      cb(null, unique + path.extname(file.originalname || '.jpg'))
    },
  })
}

const votingPhotoUpload = multer({
  storage: makeImageStorage('candidates'),
  fileFilter: imageFilter,
  limits: { fileSize: MAX_VOTING_PHOTO_BYTES },
})

const votingBannerUpload = multer({
  storage: makeImageStorage('banners'),
  fileFilter: imageFilter,
  limits: { fileSize: MAX_VOTING_PHOTO_BYTES },
})

function votingPhotoPublicUrl(filename) {
  return `/images/votacao/candidates/${filename}`
}

function votingBannerPublicUrl(filename) {
  return `/images/votacao/banners/${filename}`
}

function votingUploadMiddleware(field, uploader) {
  return (req, res, next) => {
    const contentType = String(req.headers['content-type'] || '')
    if (!contentType.includes('multipart/form-data')) return next()
    return uploader.single(field)(req, res, (err) => {
      if (err) {
        const msg =
          err.code === 'LIMIT_FILE_SIZE'
            ? 'Imagem muito grande (máx. 5 MB).'
            : err.message || 'Erro no upload da imagem.'
        return res.status(422).json({ message: msg })
      }
      return next()
    })
  }
}

const votingCandidateUploadMiddleware = votingUploadMiddleware('photo', votingPhotoUpload)
const votingBannerUploadMiddleware = votingUploadMiddleware('banner', votingBannerUpload)

module.exports = {
  MAX_VOTING_PHOTO_BYTES,
  votingPhotoUpload,
  votingBannerUpload,
  votingPhotoPublicUrl,
  votingBannerPublicUrl,
  votingCandidateUploadMiddleware,
  votingBannerUploadMiddleware,
}
