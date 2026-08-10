// routes/sepultados.js - Versão otimizada para pesquisa + comentários autenticados + atribuição de concessionário

const express = require('express')
const router = express.Router()

const SepultadoController = require('../controllers/SepultadoController')

// middlewares
const verifyToken = require('../helpers/verify-token')
const { imageUpload } = require('../helpers/image-upload')
const { requireRole, canEditSepultado } = require('../helpers/authz')
const Sepultado = require('../models/Sepultado')








// antispam + moderação
// 1. Importe o ipKeyGenerator junto com o rateLimit
const { rateLimit, ipKeyGenerator } = require('express-rate-limit') 
const { bannedWordsGuard } = require('../helpers/moderation')


// Validador leve de :id (aceita ObjectId OU UUID v4)
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const isObjectId = (s) => require('mongoose').Types.ObjectId.isValid(s)
function validateIdParam(req, res, next) {
  const { id } = req.params
  if (!id || (!isObjectId(id) && !uuidV4.test(id))) {
    return res.status(400).json({ message: 'Parâmetro :id inválido (esperado ObjectId ou UUID v4).' })
  }
  return next()
}












const commentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,              // máx 5 comentários / min
  
  // 2. Modifique o keyGenerator para usar a função segura
  keyGenerator: (req, res) => {
    // Se o usuário estiver logado, use o ID dele (sua lógica original está perfeita)
    if (req.user?._id) {
      return req.user._id.toString()
    }
    // Para usuários anônimos, use o ipKeyGenerator para obter o IP de forma segura
    return ipKeyGenerator(req, res)
  },

  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas mensagens. Tente novamente em 1 minuto.' },
})











// -------------------- Pesquisa (públicas) --------------------
router.get('/pesquisa', SepultadoController.searchSepultados)
router.get('/sugestoes', SepultadoController.getSuggestions)
router.get('/autocomplete', SepultadoController.getAutocomplete)

// -------------------- Criar (somente admin) --------------------
router.post(
  '/create',
  verifyToken,
  requireRole('admin'),
  imageUpload.fields([{ name: 'images', maxCount: 5 }]),
  SepultadoController.createSepultado
)

// -------------------- Listagens e detalhes --------------------
router.get('/', SepultadoController.getAll)
router.get('/meussepultados', verifyToken, SepultadoController.getAllUserSepultados)
router.get('/:id', SepultadoController.getSepById)

// -------------------- Comentários --------------------
// Listar comentários (público) - suporta paginação ?page=&limit=
router.get('/:id/comentarios', SepultadoController.listarComentarios)

// Adicionar comentário (autenticado + antispam + filtro)
router.post(
  '/:id/comentarios',
  verifyToken,
  commentLimiter,
  bannedWordsGuard,
  SepultadoController.adicionarComentario
)

// (Opcional) Alias compatível no singular
router.post(
  '/:id/comentario',
  verifyToken,
  commentLimiter,
  bannedWordsGuard,
  SepultadoController.adicionarComentario
)

// Remover comentário (autor do comentário ou admin)
router.delete(
  '/:id/comentarios/:cid',
  verifyToken,
  SepultadoController.removerComentario
)

// -------------------- Atribuição de concessionário (somente admin) --------------------
// Adiciona um userId ao array "concessionarios" (evita duplicatas com $addToSet)
router.patch(
  '/:id/atribuir/:userId',
  verifyToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { id, userId } = req.params
      const sep = await Sepultado.findByIdAndUpdate(
        id,
        { $addToSet: { concessionarios: userId } },
        { new: true }
      ).populate('concessionarios', 'name email')

      if (!sep) return res.status(404).json({ message: 'Sepultado não encontrado' })
      return res.status(200).json({ message: 'Concessionário atribuído com sucesso', sep })
    } catch (err) {
      console.error('[atribuir] erro:', err)
      return res.status(500).json({ message: 'Erro ao atribuir concessionário', error: err.message })
    }
  }
)

// Remove um userId do array "concessionarios"
router.patch(
  '/:id/desatribuir/:userId',
  verifyToken,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { id, userId } = req.params
      const sep = await Sepultado.findByIdAndUpdate(
        id,
        { $pull: { concessionarios: userId } },
        { new: true }
      ).populate('concessionarios', 'name email')

      if (!sep) return res.status(404).json({ message: 'Sepultado não encontrado' })
      return res.status(200).json({ message: 'Concessionário removido com sucesso', sep })
    } catch (err) {
      console.error('[desatribuir] erro:', err)
      return res.status(500).json({ message: 'Erro ao remover concessionário', error: err.message })
    }
  }
)

// -------------------- Remover registro (somente admin) --------------------
router.delete('/:id', verifyToken, requireRole('admin'), SepultadoController.removeSepById)

// -------------------- Atualizar registro --------------------
// Regra:
// - admin: sempre pode
// - concessionario: só se atribuído
router.patch(
  '/:id',
  verifyToken,
  imageUpload.array('images'),
  async (req, res, next) => {
    if (req.user.role === 'admin') return next()
    if (req.user.role === 'concessionario') {
      const current = await Sepultado.findById(req.params.id).select('concessionarios')
      if (!current) return res.status(404).json({ message: 'Não encontrado' })
      if (!canEditSepultado(req.user, current)) {
        return res.status(403).json({ message: 'Sem permissão para editar este registro' })
      }
      // impedir alteração de responsáveis pelo concessionário
      if (req.body) {
        delete req.body.concessionarios
        delete req.body.user
      }
      return next()
    }
    // usuário comum não edita
    return res.status(403).json({ message: 'Sem permissão' })
  },
  SepultadoController.updateSep
)

// -------------------- Ações diversas --------------------
router.patch('/schedule/:id', verifyToken, SepultadoController.schedule)
router.patch('/conclude/:id', verifyToken, SepultadoController.concludeAdoption)

module.exports = router
