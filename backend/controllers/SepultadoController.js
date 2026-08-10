// controllers/SepultadoController.js
const mongoose = require('mongoose')
const Sepultado = require('../models/Sepultado')

const getToken = require('../helpers/get-token')
const getUserBytoken = require('../helpers/get-user-by-token')
const { recordAudit } = require('../helpers/audit-log')

const ObjectId = mongoose.Types.ObjectId
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// -------------------- Helpers comuns --------------------
const removeAccents = (str) => {
  if (!str) return ''
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

// remove pares cujo valor seja '' ou null (mutável)
const stripEmpty = (obj = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    if (v === '' || v === null) delete obj[k]
  }
  return obj
}

const onlyDigits = (v = '') => String(v).replace(/\D/g, '')

const coerceIdade = (v) => {
  if (v === undefined) return undefined
  const n = Number(onlyDigits(v))
  return Number.isFinite(n) ? n : NaN
}

const isValidDate = (d) => d instanceof Date && !isNaN(d.valueOf())

// aceita dd/MM/yyyy ou ISO e retorna Date; se inválida, retorna null
const parseDateSmart = (s = '') => {
  if (!s) return null
  const str = String(s).trim()
  // dd/MM/yyyy
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) {
    const d = new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00Z`)
    return isValidDate(d) ? d : null
  }
  // ISO ou qualquer coisa que o Date aceite
  const d = new Date(str)
  return isValidDate(d) ? d : null
}

function toPublicProfile(user) {
  if (!user) return null
  return {
    _id: user._id,
    name: user.name,
    image: user.image,
  }
}

function toPublicSepultado(item) {
  const sep = typeof item.toObject === 'function' ? item.toObject() : item
  return {
    ...sep,
    user: toPublicProfile(sep.user),
    adopter: toPublicProfile(sep.adopter),
  }
}

/**
 * Resolve um sepultado aceitando:
 *  - _id (ObjectId)
 *  - id (UUID v4 salvo em campo próprio)
 * Retorna { doc, by } onde by ∈ {'_id','uuid',null}
 */
async function findSepultadoByAnyId(id, select = null) {
  if (ObjectId.isValid(id)) {
    const q = Sepultado.findById(id)
    if (select) q.select(select)
    const doc = await q
    if (doc) return { doc, by: '_id' }
  }
  if (uuidV4.test(id)) {
    const q = Sepultado.findOne({ id })
    if (select) q.select(select)
    const doc = await q
    if (doc) return { doc, by: 'uuid' }
  }
  return { doc: null, by: null }
}

module.exports = class SepultadoController {
  // -------------------- CREATE (admin)
  static async createSepultado(req, res) {
    try {
      const token = getToken(req)
      const user = await getUserBytoken(token)
      if (!user) return res.status(401).json({ message: 'Não autenticado' })
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Somente admin pode criar sepultados' })
      }

      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(422).json({ message: 'Nenhum dado foi enviado. Por favor, preencha o formulário.' })
      }

      // limpeza de vazios
      stripEmpty(req.body)

      const {
        id, cemiterio, chapa, dtFal, dtNasc, idade, mae, nacionalidade, nome, pai,
        quadra, rua, epitafio, tipoSepultura, concessionarios
      } = req.body

      const obrig = { nome, chapa, dtFal, dtNasc, idade, quadra, mae, pai }
      for (const [k, v] of Object.entries(obrig)) {
        if (!v) return res.status(422).json({ message: `O campo ${k} é obrigatório!` })
      }

      // validações fortes
      const idadeNum = coerceIdade(idade)
      if (!Number.isFinite(idadeNum)) return res.status(422).json({ message: 'Idade inválida.' })

      const dtFalDate = parseDateSmart(dtFal)
      const dtNascDate = parseDateSmart(dtNasc)
      if (!dtFalDate || !dtNascDate) return res.status(422).json({ message: 'Data de nascimento/falecimento inválida.' })

      // imagens (create costuma vir como req.files.images com multer.fields)
      const files = req.files?.images || []
      const images = Array.isArray(files) ? files.map(f => f.filename) : []

      const sepultado = new Sepultado({
        id, cemiterio, nome, chapa,
        dtFal: dtFalDate,
        dtNasc: dtNascDate,
        idade: idadeNum, quadra, mae, pai,
        nacionalidade, rua, epitafio, tipoSepultura,
        available: true,
        images,
        user: { _id: user._id, name: user.name, image: user.image, phone: user.phone },
        concessionarios: Array.isArray(concessionarios) ? concessionarios : (concessionarios ? [concessionarios] : [])
      })

      const newSepultado = await sepultado.save()
      await recordAudit(req, {
        action: 'sepultado.create',
        resourceType: 'sepultado',
        resourceId: newSepultado._id,
      })
      return res.status(201).json({ message: 'Sepultado cadastrado com sucesso!', newSepultado })
    } catch (error) {
      if (error.name === 'ValidationError' || error.name === 'CastError') {
        return res.status(422).json({ message: 'Dados inválidos. Verifique os campos preenchidos.' })
      }
      console.error('Erro ao criar sepultado:', error)
      return res.status(500).json({ message: 'Erro ao criar sepultado.' })
    }
  }

  // -------------------- LISTAGEM PÚBLICA (com paginação)
  static async getAll(req, res) {
    try {
      console.log('[getAll] Rota chamada!', req.path, req.query)
      const page = Math.max(1, parseInt(req.query.page || '1', 10))
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)))
      const skip = (page - 1) * limit

      // Listagem pública: mostra todos os sepultados (sem filtro de available)
      // Se no futuro precisar filtrar, pode adicionar: { available: { $ne: false } }
      const query = {}

      const [sepultados, total] = await Promise.all([
        Sepultado.find(query).sort('-createdAt').skip(skip).limit(limit).lean(),
        Sepultado.countDocuments(query)
      ])

      console.log(`[getAll] Página ${page}, encontrados ${sepultados.length} de ${total} sepultados`)

      res.status(200).json({
        sepultados: sepultados.map(toPublicSepultado),
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit))
      })
    } catch (error) {
      console.error('[getAll] Erro ao buscar sepultados:', error)
      res.status(500).json({ message: 'Erro ao buscar os sepultados', error: error.message })
    }
  }

  // -------------------- COMENTÁRIOS
  static async listarComentarios(req, res) {
    try {
      const { id } = req.params
      const page = Math.max(1, parseInt(req.query.page || '1', 10))
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)))

      const { doc: sep } = await findSepultadoByAnyId(id, 'comentarios')
      if (!sep) return res.status(404).json({ message: 'Sepultado não encontrado.' })

      const ordenados = [...(sep.comentarios || [])].sort(
        (a, b) => new Date(b.createdAt || b.data || 0) - new Date(a.createdAt || a.data || 0)
      )
      const total = ordenados.length
      const start = (page - 1) * limit
      const items = ordenados.slice(start, start + limit)

      return res.status(200).json({ items, total, page, limit, hasMore: start + items.length < total })
    } catch (error) {
      console.error('Erro ao listar comentários:', error)
      return res.status(500).json({ message: 'Erro ao listar comentários.' })
    }
  }

  static async adicionarComentario(req, res) {
    const sepultadoId = req.params.id
    const raw =
      (req.body?.mensagem ?? req.body?.comentario ?? req.body?.texto ?? '').toString().trim()

    if (!raw && !req.file) {
      return res.status(422).json({ message: 'O comentário precisa ter texto ou uma imagem.' })
    }

    try {
      const token = getToken(req)
      const user = await getUserBytoken(token)
      if (!user) return res.status(401).json({ message: 'Não autenticado.' })

      const { doc: existe } = await findSepultadoByAnyId(sepultadoId, '_id')
      if (!existe) return res.status(404).json({ message: 'Sepultado não encontrado.' })

      let emojis = []
      if (req.body?.emojis) {
        try {
          emojis = Array.isArray(req.body.emojis) ? req.body.emojis : JSON.parse(req.body.emojis)
        } catch {
          emojis = [String(req.body.emojis)]
        }
      }

      const imagemFile = req.file?.filename || null

      const novo = {
        autor: user?.name || 'Anônimo',
        texto: raw || '',
        user: user._id,
        emojis,
        imagem: imagemFile,
      }

      await Sepultado.updateOne({ _id: existe._id }, { $push: { comentarios: novo } })
      await recordAudit(req, {
        action: 'sepultado.comment_add',
        resourceType: 'sepultado',
        resourceId: existe._id,
      })

      // Retorna o comentário com dados do usuário para facilitar exibição no frontend
      return res.status(201).json({
        ...novo,
        createdAt: new Date(),
        // Inclui dados do usuário para exibir foto imediatamente
        user: {
          _id: user._id,
          name: user.name,
          image: user.image
        },
        autorImage: user.image // Alias para compatibilidade
      })
    } catch (error) {
      console.error('adicionarComentario ERRO:', error)
      return res.status(500).json({ message: 'Erro ao adicionar comentário.', error: error.message })
    }
  }

  // DELETE /sepultados/:id/comentarios/:cid
  static async removerComentario(req, res) {
    try {
      const { id, cid } = req.params
      if (!req.user?._id) return res.status(401).json({ message: 'Não autenticado' })

      const { doc: sepultado } = await findSepultadoByAnyId(id)
      if (!sepultado) return res.status(404).json({ message: 'Sepultado não encontrado.' })

      const comentario = (sepultado.comentarios || []).find(c => String(c._id) === String(cid))
      if (!comentario) return res.status(404).json({ message: 'Comentário não encontrado.' })

      const isOwner = String(comentario.user) === String(req.user._id)
      const isAdmin = req.user.role === 'admin'
      if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Sem permissão para remover este comentário.' })

      await Sepultado.findByIdAndUpdate(sepultado._id, { $pull: { comentarios: { _id: cid } } })
      await recordAudit(req, {
        action: 'sepultado.comment_remove',
        resourceType: 'sepultado',
        resourceId: sepultado._id,
        metadata: { commentId: cid },
      })
      return res.status(200).json({ message: 'Comentário removido com sucesso.' })
    } catch (error) {
      console.error('Erro ao remover comentário:', error)
      return res.status(500).json({ message: 'Erro ao remover comentário.', error: error.message })
    }
  }

  // -------------------- “MEUS SEPULTADOS”
  static async getAllUserSepultados(req, res) {
    try {
      const token = getToken(req)
      const user = await getUserBytoken(token)
      if (!user) return res.status(401).json({ message: 'Não autenticado' })

      const q = (req.query.q || '').trim()
      const page = Math.max(1, parseInt(req.query.page || '1', 10))
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)))
      const skip = (page - 1) * limit

      const role = (user.role || '').toString().trim().toLowerCase()
      const userId = user._id
      let baseQuery = {}

      if (role === 'admin') baseQuery = {}
      else if (role === 'concessionario') baseQuery = { $or: [{ 'user._id': userId }, { concessionarios: userId }] }
      else baseQuery = { 'user._id': userId }

      let searchQuery = {}
      if (q) {
        const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        searchQuery = { $or: [{ nome: regex }, { rua: regex }, { quadra: regex }, { chapa: regex }] }
      }

      const query = Object.keys(searchQuery).length ? { $and: [baseQuery, searchQuery] } : baseQuery

      const [sepults, total] = await Promise.all([
        Sepultado.find(query).sort('-createdAt').skip(skip).limit(limit).lean(),
        Sepultado.countDocuments(query)
      ])

      return res.status(200).json({
        sepults,
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
        q
      })
    } catch (error) {
      console.error('[meussepultados] erro:', error)
      return res.status(500).json({ message: error.message })
    }
  }

  // -------------------- GET por ID (público)
  static async getSepById(req, res) {
    const id = req.params.id
    console.log('[getSepById] Rota chamada!', req.path, 'id:', id)
    try {
      const { doc: sepultado } = await findSepultadoByAnyId(id)
      if (!sepultado) return res.status(404).json({ message: 'Sepultado não encontrado.' })
      return res.status(200).json(toPublicSepultado(sepultado))
    } catch (error) {
      console.error('[getSepById] Erro:', error)
      res.status(500).json({ message: 'Erro ao buscar sepultado.' })
    }
  }

  // -------------------- DELETE (admin)
  static async removeSepById(req, res) {
    const rawId = req.params.id
    try {
      const { doc: sepultado } = await findSepultadoByAnyId(rawId, '_id')
      if (!sepultado) return res.status(404).json({ message: 'Sepultado não encontrado!' })

      const token = getToken(req)
      const user = await getUserBytoken(token)
      if (!user) return res.status(401).json({ message: 'Não autenticado' })
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Somente admin pode excluir sepultados' })
      }

      await Sepultado.findByIdAndDelete(sepultado._id)
      await recordAudit(req, {
        action: 'sepultado.delete',
        resourceType: 'sepultado',
        resourceId: sepultado._id,
      })
      return res.status(204).send()
    } catch (error) {
      console.error('Erro ao remover sepultado:', error)
      return res.status(500).json({ message: error.message })
    }
  }

  // -------------------- UPDATE
  static async updateSep(req, res) {
    const rawId = req.params.id
    try {
      const { doc: sep } = await findSepultadoByAnyId(rawId, 'concessionarios user')
      if (!sep) return res.status(404).json({ message: 'Registro não encontrado!' })

      const token = getToken(req)
      const user = await getUserBytoken(token)
      if (!user) return res.status(401).json({ message: 'Não autenticado' })

      const isAdmin = user.role === 'admin'
      const isConcessionario = user.role === 'concessionario'
      const isAtribuido = isConcessionario && (sep.concessionarios || []).some(u => String(u) === String(user._id))
      if (!isAdmin && !isAtribuido) {
        return res.status(403).json({ message: 'Sem permissão para editar este registro' })
      }

      const dadosEnviados = stripEmpty({ ...(req.body || {}) })
      const updatedData = {}
      const camposPermitidos = [
        'nome', 'cemiterio', 'chapa', 'idade', 'dtFal', 'dtNasc', 'mae',
        'nacionalidade', 'pai', 'quadra', 'rua', 'epitafio', 'tipoSepultura',
        'available'
      ]

      // Validações/normalizações específicas
      if (dadosEnviados.idade !== undefined) {
        const idadeNum = coerceIdade(dadosEnviados.idade)
        if (!Number.isFinite(idadeNum)) {
          return res.status(422).json({ message: 'Idade inválida.' })
        }
        updatedData.idade = idadeNum
      }

      if (dadosEnviados.dtNasc !== undefined) {
        const d = parseDateSmart(dadosEnviados.dtNasc)
        if (!d) return res.status(422).json({ message: 'Data de nascimento inválida.' })
        updatedData.dtNasc = d
      }
      if (dadosEnviados.dtFal !== undefined) {
        const d = parseDateSmart(dadosEnviados.dtFal)
        if (!d) return res.status(422).json({ message: 'Data de falecimento inválida.' })
        updatedData.dtFal = d
      }

      // Copia os demais campos permitidos
      for (const campo of camposPermitidos) {
        if (campo in dadosEnviados && !(campo in updatedData)) {
          updatedData[campo] = dadosEnviados[campo]
        }
      }

      if (updatedData.nome === '') {
        return res.status(422).json({ message: 'O campo nome não pode ser vazio.' })
      }

      // arquivos (suporta array direto ou fields.images)
      let filesArr = []
      if (Array.isArray(req.files)) filesArr = req.files
      else if (req.files && Array.isArray(req.files.images)) filesArr = req.files.images

      if (filesArr.length > 0) {
        updatedData.images = filesArr.map(f => f.filename)
      }

      if (isAdmin && dadosEnviados.concessionarios !== undefined) {
        updatedData.concessionarios = Array.isArray(dadosEnviados.concessionarios)
          ? dadosEnviados.concessionarios
          : [dadosEnviados.concessionarios]
      }

      const sepultadoAtualizado = await Sepultado.findByIdAndUpdate(
        sep._id,
        { $set: updatedData },
        { new: true }
      )
      await recordAudit(req, {
        action: 'sepultado.update',
        resourceType: 'sepultado',
        resourceId: sep._id,
        metadata: { fields: Object.keys(updatedData) },
      })

      return res.status(200).json({ message: 'Registro atualizado com sucesso!', sepultado: sepultadoAtualizado })
    } catch (error) {
      if (error.name === 'ValidationError' || error.name === 'CastError') {
        return res.status(422).json({ message: 'Dados inválidos. Verifique idade e datas.' })
      }
      console.error('Erro ao atualizar sepultado:', error)
      return res.status(500).json({ message: 'Ocorreu um erro interno ao atualizar o registro.' })
    }
  }

  // -------------------- SCHEDULE (agendar visita)
  static async schedule(req, res) {
    try {
      const { doc: sepultado } = await findSepultadoByAnyId(req.params.id)
      if (!sepultado) return res.status(404).json({ message: 'Registro não encontrado!' })

      const token = getToken(req)
      const user = await getUserBytoken(token)
      if (!user) return res.status(401).json({ message: 'Não autenticado' })

      if (sepultado.user._id.equals(user._id)) {
        return res.status(422).json({ message: 'Você já é o usuário responsavel por este sepultado' })
      }

      if (sepultado.adopter && sepultado.adopter._id.equals(user._id)) {
        return res.status(422).json({ message: 'Você já solicitou a adoção de responsabilidade sobre este sepultado!' })
      }

      sepultado.adopter = { _id: user._id, name: user.name, image: user.image }

      await Sepultado.findByIdAndUpdate(sepultado._id, sepultado)
      return res.status(200).json({
        message: `A visita foi agendada com sucesso, entre em contato com o ${sepultado.cemiterio}, pelo telefone (14) 3471-0233`
      })
    } catch (error) {
      console.error('Erro ao agendar visita:', error)
      return res.status(500).json({ message: error.message })
    }
  }

  // -------------------- CONCLUDE ADOPTION
  static async concludeAdoption(req, res) {
    try {
      const { doc: sepultado } = await findSepultadoByAnyId(req.params.id)
      if (!sepultado) return res.status(404).json({ message: 'Sepultado não encontrado' })

      const token = getToken(req)
      const user = await getUserBytoken(token)
      if (!user) return res.status(401).json({ message: 'Não autenticado' })

      if (String(sepultado.user._id) !== String(user._id)) {
        return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para concluir esta adoção.' })
      }

      sepultado.available = false
      await Sepultado.findByIdAndUpdate(sepultado._id, sepultado)

      return res.status(200).json({ message: `Você agora é o responsável pelo sepultado: ${sepultado.nome}` })
    } catch (error) {
      console.error('Erro ao concluir adoção:', error)
      return res.status(500).json({ message: 'Erro ao concluir a adoção.' })
    }
  }

  // -------------------- SEARCH (pipeline)
  static async searchSepultados(req, res) {
    const {
      q,
      limit = 20,
      page = 1,
      rua,
      quadra,
      chapa,
      setor,
      ordem = 'relevancia',
      anoFalecimento,
      comFoto,
    } = req.query

    const originalTerm = String(q || '').trim()
    if (!originalTerm || originalTerm.length < 2) {
      return res.status(400).json({
        message: 'Informe pelo menos 2 caracteres para pesquisar.',
      })
    }

    try {
      const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50)
      const pageNum = Math.max(parseInt(page, 10) || 1, 1)
      const skip = (pageNum - 1) * limitNum
      const searchWords = originalTerm.split(/\s+/).filter(Boolean)

      const andClauses = searchWords.map((word) => {
        const normalizedWord = removeAccents(word)
        const regex = new RegExp(normalizedWord, 'i')
        return {
          $or: [
            { nome: regex },
            { rua: regex },
            { quadra: regex },
            { chapa: regex },
          ],
        }
      })

      if (rua && String(rua).trim()) {
        andClauses.push({ rua: new RegExp(removeAccents(String(rua).trim()), 'i') })
      }
      if (quadra && String(quadra).trim()) {
        andClauses.push({ quadra: new RegExp(removeAccents(String(quadra).trim()), 'i') })
      }
      if (chapa && String(chapa).trim()) {
        andClauses.push({ chapa: new RegExp(removeAccents(String(chapa).trim()), 'i') })
      }
      if (setor && String(setor).trim()) {
        andClauses.push({
          $or: [
            { quadraNome: new RegExp(removeAccents(String(setor).trim()), 'i') },
            { quadra: new RegExp(removeAccents(String(setor).trim()), 'i') },
          ],
        })
      }
      if (anoFalecimento && String(anoFalecimento).trim()) {
        andClauses.push({ dtFal: new RegExp(String(anoFalecimento).trim()) })
      }
      if (comFoto === 'true' || comFoto === '1') {
        andClauses.push({
          images: {
            $elemMatch: {
              $exists: true,
              $nin: [null, '', 'null', 'undefined', '/'],
            },
          },
        })
      }

      const matchQuery = andClauses.length ? { $and: andClauses } : {}
      const startsWithRegex = new RegExp(`^${removeAccents(originalTerm)}`, 'i')

      let sortStage
      if (ordem === 'nome') {
        sortStage = { nome: 1 }
      } else if (ordem === 'recentes') {
        sortStage = { updatedAt: -1, nome: 1 }
      } else {
        sortStage = { score: -1, nome: 1 }
      }

      const pipeline = [
        { $match: matchQuery },
        {
          $addFields: {
            score: {
              $cond: {
                if: { $regexMatch: { input: '$nome', regex: startsWithRegex } },
                then: 15,
                else: {
                  $cond: {
                    if: {
                      $regexMatch: {
                        input: '$nome',
                        regex: new RegExp(removeAccents(originalTerm), 'i'),
                      },
                    },
                    then: 10,
                    else: 5,
                  },
                },
              },
            },
          },
        },
        { $sort: sortStage },
        {
          $group: {
            _id: '$_id',
            doc: { $first: '$$ROOT' },
          },
        },
        { $replaceRoot: { newRoot: '$doc' } },
        { $sort: sortStage },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              { $skip: skip },
              { $limit: limitNum },
              {
                $project: {
                  _id: 1,
                  nome: 1,
                  rua: 1,
                  quadra: 1,
                  chapa: 1,
                  dtNasc: 1,
                  dtFal: 1,
                  tipoSepultura: 1,
                  quadraNome: 1,
                  plusCodeQuadra: 1,
                  plusCodePreciso: 1,
                  location: 1,
                  updatedAt: 1,
                  images: { $slice: ['$images', 1] },
                },
              },
            ],
          },
        },
      ]

      const [result] = await Sepultado.aggregate(pipeline)
      const total = result?.metadata?.[0]?.total || 0
      const sepultados = result?.data || []
      const pages = Math.max(Math.ceil(total / limitNum), 1)

      return res.status(200).json({
        sepultados,
        sepultado: sepultados,
        total,
        page: pageNum,
        pages,
        limit: limitNum,
        searchTerm: originalTerm,
        ordem,
      })
    } catch (error) {
      console.error('Erro na pesquisa:', error)
      return res.status(500).json({ message: 'Erro interno do servidor ao realizar a pesquisa.' })
    }
  }

  // -------------------- SUGESTÕES
  static async getSuggestions(req, res) {
    const { q } = req.query
    if (!q || q.trim() === '' || q.trim().length < 2) {
      return res.status(200).json({ suggestions: [] })
    }

    try {
      const searchTerm = removeAccents(q.trim())
      const originalTerm = q.trim()

      const suggestions = await Sepultado.find(
        {
          $or: [
            { nome: { $regex: `^${originalTerm}`, $options: 'i' } },
            { nome: { $regex: `^${searchTerm}`, $options: 'i' } },
            { nome: { $regex: originalTerm, $options: 'i' } },
            { nome: { $regex: searchTerm, $options: 'i' } },
          ]
        },
        { nome: 1, rua: 1, quadra: 1, chapa: 1, images: { $slice: 1 } }
      )
        .sort({ nome: 1 })
        .limit(8)

      const uniqueSuggestions = suggestions
        .filter((item, idx, self) => idx === self.findIndex(t => t._id.toString() === item._id.toString()))
        .slice(0, 5)

      return res.status(200).json({ suggestions: uniqueSuggestions, total: uniqueSuggestions.length, searchTerm: originalTerm })
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error)
      return res.status(500).json({ suggestions: [] })
    }
  }

  // -------------------- AUTOCOMPLETE
  static async getAutocomplete(req, res) {
    const { q } = req.query
    if (!q || q.trim() === '' || q.trim().length < 2) {
      return res.status(200).json({ autocomplete: [] })
    }

    try {
      const searchTerm = removeAccents(q.trim())
      const originalTerm = q.trim()

      const nomes = await Sepultado.distinct('nome', {
        $or: [{ nome: { $regex: searchTerm, $options: 'i' } }, { nome: { $regex: originalTerm, $options: 'i' } }]
      })

      const ruas = await Sepultado.distinct('rua', {
        $and: [
          { rua: { $ne: null, $ne: '' } },
          { $or: [{ rua: { $regex: searchTerm, $options: 'i' } }, { rua: { $regex: originalTerm, $options: 'i' } }] }
        ]
      })

      const quadras = await Sepultado.distinct('quadra', {
        $and: [
          { quadra: { $ne: null, $ne: '' } },
          { $or: [{ quadra: { $regex: searchTerm, $options: 'i' } }, { quadra: { $regex: originalTerm, $options: 'i' } }] }
        ]
      })

      const allTerms = [...nomes.slice(0, 4), ...ruas.slice(0, 3), ...quadras.slice(0, 3)]
      const autocomplete = [...new Set(allTerms)].slice(0, 8)

      return res.status(200).json({ autocomplete, searchTerm: originalTerm })
    } catch (error) {
      console.error('Erro no autocomplete:', error)
      return res.status(500).json({ autocomplete: [] })
    }
  }

  // -------------------- ATRIBUIR / DESATRIBUIR CONCESSIONÁRIO
  static async assignConcessionario(req, res) {
    try {
      const rawId = req.params.id
      const { userId } = req.body || {}

      const token = getToken(req)
      const user = await getUserBytoken(token)
      if (!user) return res.status(401).json({ message: 'Não autenticado' })

      const { doc: sep } = await findSepultadoByAnyId(rawId, 'concessionarios')
      if (!sep) return res.status(404).json({ message: 'Sepultado não encontrado!' })

      const isAdmin = user.role === 'admin'
      const isConcessionario = user.role === 'concessionario'

      let targetUserId = isAdmin ? userId : user._id
      if (!targetUserId || !ObjectId.isValid(String(targetUserId))) {
        return res.status(422).json({ message: 'userId inválido (ou ausente).' })
      }
      if (!isAdmin && !isConcessionario) return res.status(403).json({ message: 'Sem permissão para atribuir.' })
      if (isConcessionario && String(targetUserId) !== String(user._id)) {
        return res.status(403).json({ message: 'Concessionário só pode se atribuir a si próprio.' })
      }

      const updated = await Sepultado.findByIdAndUpdate(
        sep._id,
        { $addToSet: { concessionarios: targetUserId } },
        { new: true, select: 'concessionarios' }
      )
      await recordAudit(req, {
        action: 'sepultado.assign_concessionario',
        resourceType: 'sepultado',
        resourceId: sep._id,
        metadata: { userId: String(targetUserId) },
      })

      return res.status(200).json({ message: 'Concessionário atribuído com sucesso!', concessionarios: updated.concessionarios })
    } catch (error) {
      console.error('assignConcessionario erro:', error)
      return res.status(500).json({ message: error.message })
    }
  }

  static async unassignConcessionario(req, res) {
    try {
      const rawId = req.params.id
      const { userId } = req.body || {}

      const token = getToken(req)
      const user = await getUserBytoken(token)
      if (!user) return res.status(401).json({ message: 'Não autenticado' })

      const { doc: sep } = await findSepultadoByAnyId(rawId, 'concessionarios')
      if (!sep) return res.status(404).json({ message: 'Sepultado não encontrado!' })

      const isAdmin = user.role === 'admin'
      const isConcessionario = user.role === 'concessionario'

      let targetUserId = isAdmin ? userId : user._id
      if (!targetUserId || !ObjectId.isValid(String(targetUserId))) {
        return res.status(422).json({ message: 'userId inválido (ou ausente).' })
      }
      if (!isAdmin && !isConcessionario) return res.status(403).json({ message: 'Sem permissão para remover atribuição.' })
      if (isConcessionario && String(targetUserId) !== String(user._id)) {
        return res.status(403).json({ message: 'Concessionário só pode remover a própria atribuição.' })
      }

      const updated = await Sepultado.findByIdAndUpdate(
        sep._id,
        { $pull: { concessionarios: targetUserId } },
        { new: true, select: 'concessionarios' }
      )
      await recordAudit(req, {
        action: 'sepultado.unassign_concessionario',
        resourceType: 'sepultado',
        resourceId: sep._id,
        metadata: { userId: String(targetUserId) },
      })

      return res.status(200).json({ message: 'Atribuição removida com sucesso!', concessionarios: updated.concessionarios })
    } catch (error) {
      console.error('unassignConcessionario erro:', error)
      return res.status(500).json({ message: error.message })
    }
  }

  // -------------------- PLACEHOLDER
  static async getAllInformacoes(req, res) {
    try {
      return res.status(200).json({ sepults: [] })
    } catch (error) {
      return res.status(500).json({ message: error.message })
    }
  }
}
