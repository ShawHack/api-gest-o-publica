const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const PnabMedia = require('../models/PnabMedia')
const PnabAudit = require('../models/PnabAudit')
const { BASE_DIR } = require('./image-upload')
const { isCulturaStaff } = require('./cultura-service')

const PNAB_UPLOAD_ROOT = path.join(BASE_DIR, 'cultura', 'pnab')

function ensurePnabUploadDirs() {
  fs.mkdirSync(PNAB_UPLOAD_ROOT, { recursive: true })
}

function pnabUserName(user) {
  if (!user) return 'Sistema'
  return user.name || user.nome || user.email || 'Admin'
}

function isPnabStaff(req) {
  return isCulturaStaff(req.culturaContext || {})
}

async function logPnabAudit(req, action, contentType, contentId, details) {
  try {
    const user = req.user || null
    const audit = new PnabAudit({
      userId: user ? String(user.id || user._id) : null,
      userEmail: user?.email || 'system@garca.sp.gov.br',
      userName: pnabUserName(user),
      action,
      contentType,
      contentId,
      details,
    })
    await audit.save()
  } catch (error) {
    console.error('[PNAB] Erro ao gravar auditoria:', error.message)
  }
}

async function organizeAndIndexFile(file, req, customCat = null) {
  const tempPath = file.path
  const fileContent = fs.readFileSync(tempPath)
  const hash = crypto.createHash('sha256').update(fileContent).digest('hex')

  const existingMedia = await PnabMedia.findOne({ hash, deleted: false })
  if (existingMedia) {
    try { fs.unlinkSync(tempPath) } catch (_) {}
    return existingMedia.url
  }

  const ext = path.extname(file.originalname).toLowerCase()
  let categoria = customCat || 'Imagem'
  if (['.pdf'].includes(ext)) categoria = 'PDF'
  else if (['.doc', '.docx'].includes(ext)) categoria = 'Word'
  else if (['.xls', '.xlsx', '.ods'].includes(ext)) categoria = 'Planilhas'
  else if (['.zip'].includes(ext)) categoria = 'ZIP'
  else if (['.rar'].includes(ext)) categoria = 'RAR'
  else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) categoria = 'Imagem'
  else if (['.mp4', '.avi', '.mov'].includes(ext)) categoria = 'Vídeo'
  else if (['.mp3', '.wav', '.ogg'].includes(ext)) categoria = 'Áudio'
  else if (['.svg'].includes(ext)) categoria = 'SVG'

  const ano = req.body.anoName || 'geral'
  const edital = req.body.editalTitle || 'geral'
  const safeAno = ano.toString().replace(/[^a-zA-Z0-9_-]/g, '_')
  const safeEdital = edital.toString().replace(/[^a-zA-Z0-9_-]/g, '_')
  const safeCat = categoria.replace(/[^a-zA-Z0-9_-]/g, '_')

  const targetDir = path.join(PNAB_UPLOAD_ROOT, safeAno, safeEdital, safeCat)
  fs.mkdirSync(targetDir, { recursive: true })

  const finalPath = path.join(targetDir, file.filename)
  fs.renameSync(tempPath, finalPath)

  const relativeUrl = `/uploads/pnab/${safeAno}/${safeEdital}/${safeCat}/${file.filename}`

  const newMedia = new PnabMedia({
    filename: file.filename,
    originalName: file.originalname,
    url: relativeUrl,
    sizeBytes: file.size,
    mimeType: file.mimetype,
    categoria,
    ano: req.body.anoName || 'geral',
    programa: req.body.programa || 'PNAB',
    hash,
  })
  await newMedia.save()

  return relativeUrl
}

module.exports = {
  PNAB_UPLOAD_ROOT,
  ensurePnabUploadDirs,
  pnabUserName,
  isPnabStaff,
  logPnabAudit,
  organizeAndIndexFile,
}
