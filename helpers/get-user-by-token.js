const jwt = require('jsonwebtoken')
const User = require("../models/User")

const getUserByToken = async (token) => {
  if (!token) {
    console.log('❌ Token não fornecido para getUserByToken');
    return null;
  }
console.log("Verificando com JWT_SECRET:", process.env.JWT_SECRET);
  try {
    // verifica token
  const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("❌ JWT_SECRET não definido no ambiente");
}
const decoded = jwt.verify(token, JWT_SECRET);

    const userId = decoded.id;

    if (!userId) {
      console.log('❌ ID do usuário não encontrado no token decodificado');
      return null;
    }

    // busca usuário no banco
    const user = await User.findById(userId).select("-password");
    
    if (!user) {
      console.log('❌ Usuário não encontrado no banco de dados para ID:', userId);
    return null;
    }

    console.log('✅ Usuário autenticado:', user.name || user.email || userId);
    return user;
  } catch (err) {
    console.error("❌ Erro ao verificar token:", err.message);
    
    // Log mais específico do tipo de erro
    if (err.name === 'TokenExpiredError') {
      console.error('❌ Token expirado');
    } else if (err.name === 'JsonWebTokenError') {
      console.error('❌ Token malformado ou assinatura inválida');
    } else if (err.name === 'NotBeforeError') {
      console.error('❌ Token ainda não é válido');
    }
    
    return null;
  }
}

module.exports = getUserByToken;