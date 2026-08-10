const path = require('path')
const fs = require('fs')
const ObjectId = require('mongoose').Types.ObjectId

const PontoTuristico = require('../models/PontoTuristico')

const CATEGORIAS = new Set([
  'atracao',
  'restaurante',
  'hotel',
  'comercio',
  'cultura',
  'natureza',
  'servico',
  'clube',
  'religioso',
])

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue
  if (typeof value === 'boolean') return value
  return String(value).toLowerCase() === 'true'
}

function parseCoord(value) {
  if (value === undefined || value === null || value === '') return null
  const normalized = typeof value === 'string' ? value.replace(',', '.').trim() : value
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function isValidLatLng(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

function normalizeFotos(pontoDoc) {
  const fotos = Array.isArray(pontoDoc?.fotos) ? pontoDoc.fotos.filter(Boolean) : []
  if (!fotos.length && pontoDoc?.foto) fotos.push(pontoDoc.foto)
  return fotos
}

function normalizePonto(pontoDoc) {
  const obj = pontoDoc.toObject ? pontoDoc.toObject() : { ...pontoDoc }
  obj.fotos = normalizeFotos(obj)
  obj.foto = obj.fotos[0] || null
  if (typeof obj.dadosHistoricos !== 'string') obj.dadosHistoricos = obj.dadosHistoricos || ''
  if (typeof obj.eventos !== 'string') obj.eventos = obj.eventos || ''
  return obj
}

function getSavedImagePaths(req) {
  const files = []
  if (Array.isArray(req.files)) files.push(...req.files)
  if (req.files && !Array.isArray(req.files)) {
    if (Array.isArray(req.files.fotos)) files.push(...req.files.fotos)
    if (Array.isArray(req.files.foto)) files.push(...req.files.foto)
    else if (req.files.foto) files.push(req.files.foto)
  }
  if (req.file) files.push(req.file)

  return files
    .filter((file) => file && file.filename)
    .map((file) => `/images/misc/${file.filename}`)
}

function removeFileIfExistsFromPublicPath(publicPath) {
  if (!publicPath) return
  const cleaned = publicPath.replace(/^\/images\//, '')
  const uploadBaseDir = process.env.UPLOAD_DIR || path.join(__dirname, '../public')
  const absolute = path.join(uploadBaseDir, cleaned)
  if (fs.existsSync(absolute)) {
    fs.unlinkSync(absolute)
  }
}

function parseFotosField(value) {
  if (value === undefined || value === null || value === '') return null
  if (Array.isArray(value)) return value.filter(Boolean)
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((item) => typeof item === 'string' && item.trim())
  } catch (_) {
    return null
  }
}

module.exports = class PontoTuristicoController {
  static async listActive(req, res) {
    try {
      const pontos = await PontoTuristico.find({ ativo: true }).sort({ destaque: -1, nome: 1 })
      return res.status(200).json({ success: true, data: pontos.map(normalizePonto) })
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Erro ao listar pontos turísticos.' })
    }
  }

  static async listAdmin(req, res) {
    try {
      const pontos = await PontoTuristico.find().sort({ createdAt: -1 })
      return res.status(200).json({ success: true, data: pontos.map(normalizePonto) })
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Erro ao listar pontos turísticos (admin).' })
    }
  }

  static async getById(req, res) {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
      return res.status(422).json({ success: false, error: 'ID inválido.' })
    }

    try {
      const ponto = await PontoTuristico.findById(id)
      if (!ponto) {
        return res.status(404).json({ success: false, error: 'Ponto não encontrado.' })
      }
      return res.status(200).json({ success: true, data: normalizePonto(ponto) })
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Erro ao buscar ponto turístico.' })
    }
  }

  static async create(req, res) {
    const {
      nome,
      categoria = 'atracao',
      descricao = '',
      endereco = '',
      telefone = '',
      site = '',
      horario = '',
      dadosHistoricos = '',
      eventos = '',
      ativo,
      destaque,
      latitude,
      longitude,
    } = req.body

    if (!nome || !String(nome).trim()) {
      return res.status(422).json({ success: false, error: 'Nome é obrigatório.' })
    }
    if (!CATEGORIAS.has(categoria)) {
      return res.status(422).json({ success: false, error: 'Categoria inválida.' })
    }

    const parsedLat = parseCoord(latitude)
    const parsedLng = parseCoord(longitude)
    if (parsedLat === null || parsedLng === null) {
      return res.status(422).json({ success: false, error: 'Latitude e longitude válidas são obrigatórias.' })
    }
    if (!isValidLatLng(parsedLat, parsedLng)) {
      return res.status(422).json({ success: false, error: 'Latitude/longitude fora da faixa permitida.' })
    }

    const uploadedFotos = getSavedImagePaths(req)

    try {
      const ponto = new PontoTuristico({
        nome: String(nome).trim(),
        categoria,
        descricao,
        endereco,
        telefone,
        site,
        horario,
        foto: uploadedFotos[0] || null,
        fotos: uploadedFotos,
        dadosHistoricos,
        eventos,
        latitude: parsedLat,
        longitude: parsedLng,
        ativo: parseBoolean(ativo, true),
        destaque: parseBoolean(destaque, false),
      })

      await ponto.save()
      return res.status(201).json({ success: true, data: normalizePonto(ponto) })
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Erro ao criar ponto turístico.' })
    }
  }

  static async update(req, res) {
    const { id } = req.params

    try {
      const existing = await PontoTuristico.findById(id)
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Ponto não encontrado.' })
      }

      const patch = {}
      if (req.body.nome !== undefined) {
        const nome = String(req.body.nome || '').trim()
        if (nome) patch.nome = nome
      }
      if (req.body.categoria !== undefined) {
        const categoria = String(req.body.categoria || '').trim()
        if (categoria && CATEGORIAS.has(categoria)) {
          patch.categoria = categoria
        }
      }

      ;['descricao', 'endereco', 'telefone', 'site', 'horario', 'dadosHistoricos', 'eventos'].forEach((field) => {
        if (req.body[field] !== undefined) patch[field] = req.body[field]
      })

      if (req.body.latitude !== undefined) {
        const parsedLat = parseCoord(req.body.latitude)
        if (parsedLat !== null) patch.latitude = parsedLat
      }
      if (req.body.longitude !== undefined) {
        const parsedLng = parseCoord(req.body.longitude)
        if (parsedLng !== null) patch.longitude = parsedLng
      }
      const finalLat = patch.latitude !== undefined ? patch.latitude : existing.latitude
      const finalLng = patch.longitude !== undefined ? patch.longitude : existing.longitude
      if (!isValidLatLng(finalLat, finalLng)) {
        return res.status(422).json({ success: false, error: 'Latitude/longitude fora da faixa permitida.' })
      }

      if (req.body.ativo !== undefined) patch.ativo = parseBoolean(req.body.ativo, true)
      if (req.body.destaque !== undefined) patch.destaque = parseBoolean(req.body.destaque, false)

      const existingFotos = normalizeFotos(existing)
      const keptFotos = parseFotosField(req.body.existingFotos)
      const fotosToKeep = keptFotos === null ? existingFotos : keptFotos
      const newFotos = getSavedImagePaths(req)
      const finalFotos = [...fotosToKeep, ...newFotos].filter(Boolean)

      existingFotos.forEach((foto) => {
        if (!fotosToKeep.includes(foto)) removeFileIfExistsFromPublicPath(foto)
      })

      if (newFotos.length || keptFotos !== null) {
        patch.fotos = finalFotos
        patch.foto = finalFotos[0] || null
      }

      const updated = await PontoTuristico.findByIdAndUpdate(id, patch, { new: true })
      return res.status(200).json({ success: true, data: normalizePonto(updated) })
    } catch (error) {
      if (error?.name === 'CastError') {
        return res.status(404).json({ success: false, error: 'Ponto não encontrado.' })
      }
      return res.status(500).json({ success: false, error: 'Erro ao atualizar ponto turístico.' })
    }
  }

  static async remove(req, res) {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
      return res.status(422).json({ success: false, error: 'ID inválido.' })
    }

    try {
      const ponto = await PontoTuristico.findById(id)
      if (!ponto) {
        return res.status(404).json({ success: false, error: 'Ponto não encontrado.' })
      }

      normalizeFotos(ponto).forEach(removeFileIfExistsFromPublicPath)
      await PontoTuristico.findByIdAndDelete(id)
      return res.status(200).json({ success: true, message: 'Ponto removido com sucesso.' })
    } catch (error) {
      return res.status(500).json({ success: false, error: 'Erro ao remover ponto turístico.' })
    }
  }
}
