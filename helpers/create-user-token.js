const jwt = require("jsonwebtoken")

const createUserToken = async (user, req, res) => {
  try {
    // Cria token com expiração
    const token = jwt.sign(
      { 
        id: user._id, 
        name: user.name, 
        role: user.role 
      },
      process.env.JWT_SECRET ,
      { expiresIn: "7d" } // ajusta conforme sua necessidade
    )

    // Retorno padrão
    res.status(200).json({
      message: "Você está autenticado",
      token,
      userId: user._id,
      role: user.role,
      name: user.name,
      email: user.email
    })
  } catch (err) {
    res.status(500).json({ message: "Erro ao gerar token", error: err.message })
  }
}

module.exports = createUserToken
