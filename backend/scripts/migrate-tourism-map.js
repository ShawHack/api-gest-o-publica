#!/usr/bin/env node
/**
 * Migra pontos do mapa legado para o catálogo COMTUR.
 * O padrão é somente simulação. Use --apply para criar rascunhos.
 * Nunca publica, altera ou exclui registros legados.
 */
const fs = require('fs')
const path = require('path')
const mongoose = require('../db/conn')
const PontoTuristico = require('../models/PontoTuristico')
const ComturContent = require('../models/ComturContent')

const SOURCE = 'mapaturistico'
const APPLY = process.argv.includes('--apply')
const outputArg = process.argv.find((arg) => arg.startsWith('--output='))
const OUTPUT = outputArg ? outputArg.slice('--output='.length) : '/tmp/tourism-map-migration'
const TYPE_BY_CATEGORY = {
  atracao: 'attraction', restaurante: 'gastronomy', hotel: 'lodging',
  comercio: 'shopping', servico: 'service', cultura: 'attraction',
  natureza: 'attraction', clube: 'attraction', religioso: 'attraction',
}

function slugify(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 150) || 'ponto-turistico'
}

function mediaFor(point) {
  return [...new Set([point.foto, ...(point.fotos || [])].filter(Boolean))]
    .map((url, index) => ({ kind: 'image', title: index ? `${point.nome} — foto ${index + 1}` : point.nome, url, isAccessible: false }))
}

function documentFor(point, slug) {
  return {
    type: TYPE_BY_CATEGORY[point.categoria] || 'attraction', slug,
    title: String(point.nome || '').trim(),
    summary: String(point.descricao || '').trim().slice(0, 2000),
    body: String(point.descricao || '').trim(), status: 'draft', featured: point.destaque === true,
    location: String(point.endereco || '').trim(),
    geo: { lat: point.latitude, lng: point.longitude },
    contact: { phone: String(point.telefone || '').trim(), website: String(point.site || '').trim(), email: '' },
    media: mediaFor(point),
    metadata: {
      category: point.categoria, openingHours: point.horario || '', historicalData: point.dadosHistoricos || '',
      eventsText: point.eventos || '', legacyActive: point.ativo !== false,
      legacyUrl: `/mapaturistico/local.html?id=${point._id}`,
    },
    migration: { source: SOURCE, sourceId: String(point._id), migratedAt: new Date() },
    qr: { enabled: false, code: '', status: 'disabled', installationLocation: '', installedAt: null, lastMaintenanceAt: null },
  }
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI
  if (!uri) throw new Error('MONGODB_URI/MONGO_URI não definida')
  fs.mkdirSync(OUTPUT, { recursive: true })
  await mongoose.connect(uri)

  const points = await PontoTuristico.find({ ativo: { $ne: false } }).sort({ nome: 1 }).lean()
  const existingImports = await ComturContent.find({ 'migration.source': SOURCE }).select('migration.sourceId slug status').lean()
  const occupied = new Map((await ComturContent.find({}).select('slug migration.sourceId').lean()).map((x) => [x.slug, String(x.migration?.sourceId || '')]))
  const imported = new Map(existingImports.map((x) => [String(x.migration.sourceId), x]))
  const report = { mode: APPLY ? 'apply' : 'dry-run', source: SOURCE, generatedAt: new Date().toISOString(), totalLegacyActive: points.length, create: [], skippedExisting: [], warnings: [], created: [] }

  fs.writeFileSync(path.join(OUTPUT, 'legacy-points.json'), JSON.stringify(points, null, 2))
  for (const point of points) {
    const sourceId = String(point._id)
    if (imported.has(sourceId)) { report.skippedExisting.push({ sourceId, slug: imported.get(sourceId).slug, status: imported.get(sourceId).status }); continue }
    let slug = slugify(point.nome)
    if (occupied.has(slug) && occupied.get(slug) !== sourceId) slug = `${slug}-${sourceId.slice(-6)}`
    occupied.set(slug, sourceId)
    const doc = documentFor(point, slug)
    const warning = []
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) warning.push('coordenadas inválidas')
    if (!doc.media.length) warning.push('sem imagem')
    if (!doc.location) warning.push('sem endereço')
    if (warning.length) report.warnings.push({ sourceId, title: doc.title, warnings: warning })
    report.create.push({ sourceId, slug, title: doc.title, type: doc.type })
    if (APPLY) { const created = await ComturContent.create(doc); report.created.push({ id: String(created._id), sourceId, slug, status: created.status }) }
  }

  const reportPath = path.join(OUTPUT, `report-${APPLY ? 'apply' : 'dry-run'}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ reportPath, mode: report.mode, totalLegacyActive: report.totalLegacyActive, wouldCreate: report.create.length, skippedExisting: report.skippedExisting.length, warnings: report.warnings.length, created: report.created.length }, null, 2))
  await mongoose.disconnect()
}

main().catch(async (error) => { console.error(error); try { await mongoose.disconnect() } catch (_) {} process.exit(1) })
