const ComturBranding = require('../models/ComturBranding')
const { DEFAULT_BRANDING, mergeBranding } = require('../helpers/comtur-branding')
const { recordAudit, recordChange } = require('../helpers/audit-service')
const { validateAndScan } = require('../helpers/comtur-upload')
const fs = require('fs')

const actorId = req => req.user?._id || req.user?.id || null
const publicData = doc => ({ ...DEFAULT_BRANDING, ...(doc?.value || {}), version: doc?.version || 1, updatedAt: doc?.updatedAt || null })
const ASSET_FIELDS = { logo: 'logoUrl', favicon: 'faviconUrl', hero: 'heroImageUrl' }

async function persist(req, value) {
  let doc = await ComturBranding.findOne({ key: 'default' })
  const before = doc?.toObject() || { value: DEFAULT_BRANDING, version: 0 }
  if (!doc) {
    doc = new ComturBranding({ key: 'default', value, version: 1, updatedBy: actorId(req) })
  } else {
    doc.history.push({ version: doc.version, value: doc.value, createdBy: doc.updatedBy })
    doc.history = doc.history.slice(-20)
    doc.version += 1
    doc.value = value
    doc.updatedBy = actorId(req)
  }
  await doc.save()
  await recordChange(req, { action: 'comtur.branding.update', module: 'comtur', resourceType: 'comtur_branding', resourceId: doc._id, before, after: doc.toObject() })
  return doc
}

module.exports = class ComturBrandingController {
  static async getPublic(_req, res) {
    try {
      res.set('Cache-Control', 'no-store')
      const doc = await ComturBranding.findOne({ key: 'default' }).lean()
      return res.json({ data: publicData(doc) })
    } catch (e) {
      console.error('[ComturBranding.getPublic]', e)
      return res.status(500).json({ error: 'Erro ao carregar identidade visual' })
    }
  }

  static async getAdmin(_req, res) {
    try {
      const doc = await ComturBranding.findOne({ key: 'default' }).lean()
      return res.json({
        data: publicData(doc),
        history: (doc?.history || []).slice().reverse().map((v) => ({ version: v.version, createdAt: v.createdAt, createdBy: v.createdBy })),
      })
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao carregar identidade visual' })
    }
  }

  static async update(req, res) {
    try {
      const doc = await ComturBranding.findOne({ key: 'default' })
      const body = { ...(req.body || {}) }
      delete body.logoUrl
      delete body.faviconUrl
      delete body.heroImageUrl
      const normalized = mergeBranding(doc?.value || DEFAULT_BRANDING, body)
      if (normalized.error) return res.status(422).json({ error: normalized.error })
      const saved = await persist(req, normalized.value)
      return res.json({ data: publicData(saved) })
    } catch (e) {
      console.error('[ComturBranding.update]', e)
      return res.status(500).json({ error: 'Erro ao atualizar identidade visual' })
    }
  }

  static async attachAsset(req, res) {
    const field = ASSET_FIELDS[req.params.kind]
    if (!field) return res.status(422).json({ error: 'Tipo de arquivo inválido' })
    if (!req.file) return res.status(422).json({ error: 'Escolha o arquivo do banner, logo ou favicon.' })
    try {
      const media = await validateAndScan(req.file)
      const current = await ComturBranding.findOne({ key: 'default' })
      const normalized = mergeBranding(current?.value || DEFAULT_BRANDING, { [field]: media.url })
      if (normalized.error) return res.status(422).json({ error: normalized.error })
      const saved = await persist(req, normalized.value)
      await recordAudit(req, {
        action: 'comtur.branding.asset',
        module: 'comtur',
        resourceType: 'comtur_branding',
        resourceId: saved._id,
        eventType: 'UPLOAD',
        metadata: { field, url: media.url, hash: media.hash, mimeType: media.mimeType, sizeBytes: media.sizeBytes },
      })
      return res.status(201).json({ data: publicData(saved), asset: media })
    } catch (e) {
      try { fs.unlinkSync(req.file.path) } catch (_) {}
      console.error('[ComturBranding.attachAsset]', e)
      return res.status(e.status || 500).json({ error: e.message || 'Não foi possível publicar o arquivo.' })
    }
  }

  static async restore(req, res) {
    try {
      const version = Number(req.params.version)
      const doc = await ComturBranding.findOne({ key: 'default' })
      if (!doc) return res.status(404).json({ error: 'Identidade visual não encontrada' })
      const snapshot = doc.history.find((item) => item.version === version)
      if (!snapshot) return res.status(404).json({ error: 'Versão não encontrada' })
      doc.history.push({ version: doc.version, value: doc.value, createdBy: doc.updatedBy })
      doc.history = doc.history.slice(-20)
      doc.version += 1
      doc.value = snapshot.value
      doc.updatedBy = actorId(req)
      await doc.save()
      await recordAudit(req, { action: 'comtur.branding.restore', module: 'comtur', resourceType: 'comtur_branding', resourceId: doc._id, eventType: 'UPDATE', metadata: { restoredVersion: version, newVersion: doc.version } })
      return res.json({ data: publicData(doc) })
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao restaurar identidade visual' })
    }
  }
}
