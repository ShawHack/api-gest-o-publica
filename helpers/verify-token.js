// helpers/verify-token.js
const jwt = require('jsonwebtoken')
const getToken = require('./get-token-js')
const User = require('../models/User')


console.log("🔐 JWT_SECRET lido do .env:", process.env.JWT_SECRET);



// Garante que a variável esteja definida no ambiente
const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  console.error("❌ ERRO: JWT_SECRET não está definido. Adicione JWT_SECRET=semit@2025 no arquivo .env")
  process.exit(1) // Encerra o servidor imediatamente
}

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({ message: 'Acesso Negado!' })
    }

    const token = getToken(req)
    if (!token) {
      return res.status(401).json({ message: 'Acesso Negado!' })
    }

    // Verifica o token com o segredo correto
    const decoded = jwt.verify(token, JWT_SECRET)

    const userId = String(decoded.id || decoded._id || '')
    if (!userId) {
      return res.status(401).json({ message: 'Token inválido!' })
    }

    // Busca o usuário no banco
    const userDoc = await User.findById(userId).select('_id name role')
    if (!userDoc) {
      return res.status(401).json({ message: 'Usuário não encontrado / sessão inválida.' })
    }

    // Popula req.user com os dados do usuário autenticado
    req.user = {
      _id: userDoc._id.toString(),
      id: userDoc._id.toString(),
      name: userDoc.name,
      role: (userDoc.role || 'usuario').toString(),
    }

    return next()

  } catch (err) {
    const status = err?.name === 'TokenExpiredError' ? 401 : 400
    return res.status(status).json({
      message: err.name === 'TokenExpiredError'
        ? 'Sessão expirada. Faça login novamente.'
        : 'Token inválido!',
    })
  }
}

module.exports = verifyToken
