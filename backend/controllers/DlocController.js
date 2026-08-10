// controllers/DLocController.js
const DLoc = require('../models/Dloc')

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

module.exports = class DLocController {
  static async getByQuadra(req, res) {
    try {
      // Decodifica a URL caso tenha sido codificada (com tratamento de erro)
      let raw
      try {
        raw = decodeURIComponent(String(req.params.quadra || '')).trim()
      } catch (e) {
        // Se falhar a decodificação, usa o valor original
        raw = String(req.params.quadra || '').trim()
      }
      if (!raw) return res.status(422).json({ message: 'Quadra é obrigatória.' })

      // Normalizar: quadras 1-9 podem ter ou não zero à frente
      // No banco estão armazenadas sem zero ("1", "9"), mas aceitamos "01", "09"
      // Remove zeros à frente de números 1-9 (normaliza "01" -> "1", "09" -> "9")
      let searchQuadra = raw
      const numMatch = raw.match(/^0+([1-9])$/)
      if (numMatch) {
        // Quadra com zero à frente de 1-9: normaliza para sem zero
        searchQuadra = numMatch[1]
      }

      // Tenta match exato primeiro (mais rápido e preciso)
      let doc = await DLoc.findOne({
        quadra: searchQuadra,
        available: { $ne: false },
      })

      // Se não encontrou com match exato, tenta regex (case-insensitive)
      if (!doc) {
        doc = await DLoc.findOne({
          quadra: { $regex: new RegExp(`^${escapeRegex(searchQuadra)}$`, 'i') },
          available: { $ne: false },
        })
      }

      // 2) Fallback: match parcial (contém token) - apenas se não encontrou com match exato
      if (!doc) {
        const re = new RegExp(`(^|[\\s,])${escapeRegex(searchQuadra)}([\\s,]|$)`, 'i')
        doc = await DLoc.findOne({ quadra: { $regex: re }, available: { $ne: false } })
      }

      const plus = doc?.['_extra']?.pluscode
      if (!plus) return res.status(404).json({ message: 'Plus code não encontrado para esta quadra.' })

      return res.status(200).json({ pluscode: plus }) // **cru**, ex.: "Q8JG+QJW Garça, SP"
    } catch (err) {
      return res.status(500).json({ message: 'Erro ao localizar plus code.', error: err.message })
    }
  }
}
