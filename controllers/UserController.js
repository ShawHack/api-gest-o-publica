// controllers/UserController.js
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const mongoose = require('mongoose')

const User = require('../models/User')
const getToken = require('../helpers/get-token-js')
const getUserByToken = require('../helpers/get-user-by-token')
const { sendMail } = require('../helpers/mailer')

// --- Helpers ---
const validateCPF = require('../helpers/validate-cpf')
const validatePassword = require('../helpers/validate-password')

// Helpers de resposta padronizada
function ok(res, message, extra = {}, status = 200) {
  return res.status(status).json({ ok: true, message, ...extra })
}
function err(res, status, message, field) {
  const body = { ok: false, message }
  if (field) body.field = field
  return res.status(status).json(body)
}

// Normaliza o papel para uma das três opções em minúsculas
const normalizeRole = (r) => String(r ?? 'usuario').trim().toLowerCase()

// Gera JWT com dados essenciais
const createUserToken = (user) => {
  return jwt.sign(
    { name: user.name, id: user._id, role: normalizeRole(user.role) },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  )
}

module.exports = class UserController {
  // ===============================================
  //                REGISTRO & VERIFICAÇÃO
  // ===============================================

  static async register(req, res) {
    const {
      name,
      email,
      phone,
      cpf,
      password,
      confirmpassword,

      // >>> novos campos vindos do front
      acceptedTermsAt,
      acceptedTermsVersion,
      // Opcional, se decidir enviar:
      // acceptedTermsIp,
      // acceptedTermsUserAgent,
    } = req.body || {}

    // --- Validações ---
    if (!name) return err(res, 422, 'O nome é obrigatório.', 'name')
    if (!email) return err(res, 422, 'O e-mail é obrigatório.', 'email')
    if (!phone) return err(res, 422, 'O telefone é obrigatório.', 'phone')
    if (!cpf) return err(res, 422, 'O CPF é obrigatório.', 'cpf')
    if (!validateCPF(cpf)) return err(res, 422, 'O CPF é inválido!', 'cpf')
    if (!password) return err(res, 422, 'A senha é obrigatória.', 'password')
    if (password !== confirmpassword) {
      return err(res, 422, 'As senhas não conferem.', 'confirmpassword')
    }
    if (!validatePassword(password)) {
      return err(
        res,
        422,
        'A senha deve ter no mínimo 6 caracteres, incluindo maiúscula, minúscula, número e caractere especial.',
        'password'
      )
    }

    // >>> Validação do aceite dos Termos (persistência obrigatória no registro público)
    if (!acceptedTermsAt) {
      // campo para o front exibir no checkbox
      return err(res, 422, 'Você precisa aceitar os Termos de Uso para continuar.', 'agreeTerms')
    }

    // --- Checagem de duplicidade ---
    const [emailExists, cpfExists] = await Promise.all([
      User.findOne({ email }).lean(),
      User.findOne({ cpf }).lean(),
    ])
    if (emailExists) return err(res, 422, 'E-mail informado já está em uso.', 'email')
    if (cpfExists) return err(res, 422, 'CPF já cadastrado.', 'cpf')

    // --- Preparação do usuário ---
    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    // Criamos o token ANTES de criar o objeto do usuário
    const verificationToken = crypto.randomBytes(32).toString('hex')

    const user = new User({
      name,
      email,
      phone,
      cpf,
      password: passwordHash,

      emailVerifyToken: verificationToken,
      emailVerifyExpires: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h
      role: 'usuario',

      // >>> persistência do aceite
      acceptedTermsAt: new Date(acceptedTermsAt),
      acceptedTermsVersion: acceptedTermsVersion || '1.0',
      // acceptedTermsIp: req.ip,
      // acceptedTermsUserAgent: req.headers['user-agent'],
    })

    try {
      // --- Salvar no banco ---
      await user.save()

      // --- Montar link ---
      const link = `${process.env.APP_URL}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(
        email
      )}`

      // --- Enviar e-mail ---
      sendMail({
        to: email,
        subject: 'Confirme seu e-mail',
        html: `
          <p>Olá ${name},</p>
          <p>Confirme seu e-mail clicando no link abaixo (válido por 24h):</p>
          <p><a href="${link}">${link}</a></p>
        `,
      })

      return ok(res, 'Cadastro realizado! Enviamos um e-mail para ativar a conta.', {}, 201)
    } catch (error) {
      console.error('[register] Erro inesperado:', error)
      return err(res, 500, 'Ocorreu um erro inesperado ao processar seu cadastro.')
    }
  }

  static async resendVerification(req, res) {
    try {
      const { email } = req.body || {}
      if (!email) return res.status(422).json({ ok: false, message: 'E-mail é obrigatório.' })

      const user = await User.findOne({ email })
      if (!user) return res.status(404).json({ ok: false, message: 'Usuário não encontrado.' })
      if (user.emailVerified) return res.json({ ok: true, message: 'E-mail já verificado.' })

      user.emailVerifyToken = crypto.randomBytes(32).toString('hex')
      user.emailVerifyExpires = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24h
      await user.save()

      const link = `${process.env.APP_URL}/auth/verify-email?token=${user.emailVerifyToken}&email=${encodeURIComponent(
        user.email
      )}`

      await sendMail({
        to: user.email,
        subject: 'Confirme seu e-mail',
        html: `
          <p>Olá ${user.name},</p>
          <p>Confirme seu e-mail clicando no link abaixo (válido por 24h):</p>
          <p><a href="${link}">${link}</a></p>
        `,
      })

      return res.json({ ok: true, message: 'Se o e-mail existir, reenviamos o link de verificação.' })
    } catch (e) {
      return res.status(500).json({ ok: false, message: 'Erro ao reenviar verificação.' })
    }
  }

  static async verifyEmail(req, res) {
    try {
      const { token, email } = req.query
      console.log('[verifyEmail] Tentativa de verificação:', { token, email })

      if (!token || !email) {
        console.log('[verifyEmail] Token ou email ausente')
        return err(res, 400, 'Link inválido ou incompleto.')
      }

      console.log('[verifyEmail] Procurando usuário com email:', email)
      const userByEmail = await User.findOne({ email: email })
      console.log('[verifyEmail] Usuário encontrado:', userByEmail ? 'SIM' : 'NÃO')

      if (userByEmail) {
        console.log('[verifyEmail] Token no banco:', userByEmail.emailVerifyToken)
        console.log('[verifyEmail] Token recebido:', token)
        console.log('[verifyEmail] Tokens coincidem:', userByEmail.emailVerifyToken === token)
        console.log('[verifyEmail] Data de expiração:', userByEmail.emailVerifyExpires)
        console.log('[verifyEmail] Data atual:', new Date())
        console.log('[verifyEmail] Token expirado?', userByEmail.emailVerifyExpires < new Date())
      }

      const user = await User.findOne({
        email: email,
        emailVerifyToken: token,
        emailVerifyExpires: { $gt: new Date() },
      })

      console.log('[verifyEmail] Usuário com token válido:', user ? 'SIM' : 'NÃO')

      if (!user) {
        console.log('[verifyEmail] Token inválido ou expirado')
        return err(res, 400, 'Token inválido ou expirado. Por favor, tente se cadastrar novamente ou solicitar um novo link.')
      }

      user.emailVerified = true
      user.emailVerifyToken = undefined
      user.emailVerifyExpires = undefined
      await user.save()

      console.log('[verifyEmail] Email verificado com sucesso para:', email)
      return ok(res, 'E-mail verificado com sucesso. Você já pode fazer login.')
    } catch (error) {
      console.error('[verifyEmail] Erro ao verificar e-mail:', error)
      return err(res, 500, 'Ocorreu um erro interno ao verificar seu e-mail.')
    }
  }

  // ===============================================
  //                     LOGIN
  // ===============================================

  static async login(req, res) {
    const { email, password } = req.body

    if (!email) return err(res, 422, 'O e-mail é obrigatório.', 'email')
    if (!password) return err(res, 422, 'A senha é obrigatória.', 'password')

    const user = await User.findOne({ email })
    if (!user) return err(res, 422, 'E-mail ou senha inválidos.')

    const checkPassword = await bcrypt.compare(password, user.password)
    if (!checkPassword) return err(res, 422, 'E-mail ou senha inválidos.')

    // >>> Verificação de e-mail obrigatória
    if (!user.emailVerified) {
      return err(res, 403, 'Você precisa verificar seu e-mail antes de fazer login. Verifique sua caixa de entrada.')
    }

    try {
      const token = createUserToken(user)
      return ok(res, 'Login realizado com sucesso!', { token, userId: user._id })
    } catch (error) {
      console.error('[login] Erro ao gerar token:', error)
      return err(res, 500, 'Erro interno do servidor.')
    }
  }

  // ===============================================
  //                   USUÁRIO ATUAL
  // ===============================================

  static async checkUser(req, res) {
    let currentUser

    if (req.headers.authorization) {
      const token = getToken(req)
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      currentUser = await User.findById(decoded.id)
      currentUser.password = undefined
    } else {
      currentUser = null
    }

    res.status(200).json(currentUser)
  }

  static async getUserById(req, res) {
    const id = req.params.id

    const user = await User.findById(id)

    if (!user) {
      return res.status(422).json({ message: 'Usuário não encontrado!' })
    }

    res.status(200).json({ user })
  }

  // ===============================================
  //                   EDIÇÃO DE PERFIL
  // ===============================================

  static async editUser(req, res) {
    const { id } = req.params

    // Busca usuário alvo
    const user = await User.findById(id)
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado!' })
    }

    const { name, email, phone, password, confirmpassword } = req.body

    if (req.file) {
      user.image = req.file.filename
    }

    // validações
    if (!name) {
      res.status(422).json({ message: 'O nome é obrigatório!' })
      return
    }

    user.name = name

    if (!email) {
      res.status(422).json({ message: 'O e-mail é obrigatório!' })
      return
    }

    // check if user exists (duplicidade)
    const userExists = await User.findOne({ email: email })

    console.log('--- DEBUG EDIT USER ---');
    console.log('Target User ID:', user._id.toString());
    console.log('Target Email:', user.email);
    console.log('New Email:', email);
    if (userExists) {
      console.log('Conflict User Found ID:', userExists._id.toString());
      console.log('Conflict User Found Email:', userExists.email);
      console.log('Match?', userExists._id.toString() === user._id.toString());
    } else {
      console.log('No conflict found.');
    }

    // Se existe alguém com esse email E esse alguém não é o usuário sendo editado
    if (userExists && userExists._id.toString() !== user._id.toString()) {
      res.status(422).json({
        message: 'Por favor, utilize outro e-mail!',
      })
      return
    }

    user.email = email

    if (!phone) {
      res.status(422).json({ message: 'O telefone é obrigatório!' })
      return
    }

    user.phone = phone

    // check if password match
    if (password != confirmpassword) {
      res.status(422).json({ error: 'As senhas não conferem.' })
      return

      // change password
    } else if (password == confirmpassword && password != null) {
      // creating password
      const salt = await bcrypt.genSalt(12)
      const reqPassword = req.body.password

      const passwordHash = await bcrypt.hash(reqPassword, salt)

      user.password = passwordHash
    }

    try {
      // returns user updated data
      await User.findOneAndUpdate(
        { _id: user._id },
        { $set: user },
        { new: true }
      )

      res.status(200).json({
        message: 'Usuário atualizado com sucesso!',
      })
    } catch (error) {
      res.status(500).json({ message: error })
      return
    }
  }

  // ===============================================
  //                   GESTÃO DE USUÁRIOS (ADMIN)
  // ===============================================

  static async getAllUsers(req, res) {
    try {
      const token = getToken(req)
      const currentUser = await getUserByToken(token)

      // Apenas admin pode listar usuários
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado.' })
      }

      const { q = '', page = 1, limit = 20 } = req.query
      const pageNum = Math.max(1, parseInt(page, 10))
      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)))
      const skip = (pageNum - 1) * limitNum

      // Filtro de busca
      const filter = {}
      if (q.trim()) {
        const regex = new RegExp(q.trim(), 'i')
        filter.$or = [
          { name: regex },
          { email: regex },
          { cpf: regex }
        ]
      }

      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-password')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        User.countDocuments(filter)
      ])

      // Contadores por role (considerando o filtro)
      const roleCounts = await User.aggregate([
        { $match: filter },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ])

      const counts = { total, usuario: 0, concessionario: 0, admin: 0 }
      roleCounts.forEach(({ _id, count }) => {
        if (_id === 'usuario') counts.usuario = count
        else if (_id === 'concessionario') counts.concessionario = count
        else if (_id === 'admin') counts.admin = count
      })

      res.status(200).json({
        users,
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.max(1, Math.ceil(total / limitNum)),
        roleCounts: counts
      })
    } catch (error) {
      console.error('[getAllUsers] Erro:', error)
      res.status(500).json({ message: 'Erro interno do servidor.' })
    }
  }

  static async deleteUser(req, res) {
    try {
      const token = getToken(req)
      const currentUser = await getUserByToken(token)

      // Apenas admin pode excluir usuários
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado.' })
      }

      const { id } = req.params

      // Não pode excluir a si mesmo
      if (currentUser._id.toString() === id) {
        return res.status(400).json({ message: 'Você não pode excluir sua própria conta.' })
      }

      const user = await User.findById(id)
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado.' })
      }

      await User.findByIdAndDelete(id)

      res.status(200).json({ message: 'Usuário excluído com sucesso.' })
    } catch (error) {
      console.error('[deleteUser] Erro:', error)
      res.status(500).json({ message: 'Erro interno do servidor.' })
    }
  }

  static async updateUserRole(req, res) {
    try {
      const token = getToken(req)
      const currentUser = await getUserByToken(token)

      // Apenas admin pode alterar roles
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado.' })
      }

      const { id } = req.params
      const { role } = req.body

      // Validar role
      const validRoles = ['usuario', 'concessionario', 'admin']
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Role inválido.' })
      }

      // Não pode alterar o próprio role
      if (currentUser._id.toString() === id) {
        return res.status(400).json({ message: 'Você não pode alterar seu próprio papel.' })
      }

      const user = await User.findById(id)
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado.' })
      }

      user.role = role
      await user.save()

      res.status(200).json({ message: 'Papel do usuário atualizado com sucesso.' })
    } catch (error) {
      console.error('[updateUserRole] Erro:', error)
      res.status(500).json({ message: 'Erro interno do servidor.' })
    }
  }

  // ===============================================
  //                   RESET DE SENHA
  // ===============================================

  static async forgotPassword(req, res) {
    try {
      const { email } = req.body

      if (!email) {
        return res.status(422).json({ message: 'E-mail é obrigatório.' })
      }

      const user = await User.findOne({ email })
      if (!user) {
        // Por segurança, sempre retorna sucesso
        return res.status(200).json({ message: 'Se o e-mail existir, você receberá as instruções.' })
      }

      // Gerar token de reset
      const resetToken = crypto.randomBytes(32).toString('hex')
      user.resetPasswordToken = resetToken
      user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 60) // 1h
      await user.save()

      const resetLink = `${process.env.APP_URL}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`

      await sendMail({
        to: email,
        subject: 'Redefinir senha',
        html: `
          <p>Olá ${user.name},</p>
          <p>Você solicitou a redefinição de sua senha. Clique no link abaixo (válido por 1h):</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>Se você não solicitou esta redefinição, ignore este e-mail.</p>
        `,
      })

      res.status(200).json({ message: 'Se o e-mail existir, você receberá as instruções.' })
    } catch (error) {
      console.error('[forgotPassword] Erro:', error)
      res.status(500).json({ message: 'Erro interno do servidor.' })
    }
  }

  static async resetPassword(req, res) {
    try {
      let { token, email, password, confirmpassword, novaSenha } = req.body;
      if (novaSenha && !password) { password = novaSenha; confirmpassword = novaSenha; }

      if (!token || !email || !password || !confirmpassword) {
        return res.status(422).json({ message: 'Todos os campos são obrigatórios.' })
      }

      if (password !== confirmpassword) {
        return res.status(422).json({ message: 'As senhas não conferem.' })
      }

      if (!validatePassword(password)) {
        return res.status(422).json({
          message: 'A senha deve ter no mínimo 6 caracteres, incluindo maiúscula, minúscula, número e caractere especial.'
        })
      }

      const user = await User.findOne({
        email,
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() }
      })

      if (!user) {
        return res.status(400).json({ message: 'Token inválido ou expirado.' })
      }

      // Atualizar senha
      const salt = await bcrypt.genSalt(12)
      const passwordHash = await bcrypt.hash(password, salt)

      user.password = passwordHash
      user.resetPasswordToken = undefined
      user.resetPasswordExpires = undefined
      await user.save()

      res.status(200).json({ message: 'Senha redefinida com sucesso. Você já pode fazer login.' })
    } catch (error) {
      console.error('[resetPassword] Erro:', error)
      res.status(500).json({ message: 'Erro interno do servidor.' })
    }
  }

  // ===============================================
  //                   FUNÇÕES LEGADAS (COMPATIBILIDADE)
  // ===============================================

  // Alias para getAllUsers (compatibilidade com rotas antigas)
  static async list(req, res) {
    return UserController.getAllUsers(req, res)
  }

  // Alias para deleteUser (compatibilidade com rotas antigas)
  static async remove(req, res) {
    return UserController.deleteUser(req, res)
  }

  // Alias para updateUserRole (compatibilidade com rotas antigas)
  static async setRole(req, res) {
    return UserController.updateUserRole(req, res)
  }

  // Função para criar usuário como admin (compatibilidade)
  static async adminCreateUser(req, res) {
    try {
      const token = getToken(req)
      const currentUser = await getUserByToken(token)

      // Apenas admin pode criar usuários
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado.' })
      }

      const {
        name,
        email,
        phone,
        cpf,
        password,
        role = 'usuario'
      } = req.body

      // Validações básicas
      if (!name || !email || !phone || !cpf || !password) {
        return res.status(422).json({ message: 'Todos os campos são obrigatórios.' })
      }

      if (!validateCPF(cpf)) {
        return res.status(422).json({ message: 'CPF inválido.' })
      }

      if (!validatePassword(password)) {
        return res.status(422).json({
          message: 'A senha deve ter no mínimo 6 caracteres, incluindo maiúscula, minúscula, número e caractere especial.'
        })
      }

      // Verificar duplicidade
      const [emailExists, cpfExists] = await Promise.all([
        User.findOne({ email }).lean(),
        User.findOne({ cpf }).lean(),
      ])

      if (emailExists) {
        return res.status(422).json({ message: 'E-mail já está em uso.' })
      }

      if (cpfExists) {
        return res.status(422).json({ message: 'CPF já cadastrado.' })
      }

      // Criar usuário
      const salt = await bcrypt.genSalt(12)
      const passwordHash = await bcrypt.hash(password, salt)

      const user = new User({
        name,
        email,
        phone,
        cpf,
        password: passwordHash,
        role: ['usuario', 'concessionario', 'admin'].includes(role) ? role : 'usuario',
        emailVerified: true, // Admin criado já verificado
        acceptedTermsAt: new Date(),
        acceptedTermsVersion: '1.0'
      })

      if (req.file) {
        user.image = req.file.filename
      }

      await user.save()

      res.status(201).json({ message: 'Usuário criado com sucesso.' })
    } catch (error) {
      console.error('[adminCreateUser] Erro:', error)
      res.status(500).json({ message: 'Erro interno do servidor.' })
    }
  }

  // Função para listar concessionários (compatibilidade)
  static async listConcessionarios(req, res) {
    try {
      const token = getToken(req)
      const currentUser = await getUserByToken(token)

      // Apenas admin pode listar concessionários
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado.' })
      }

      const concessionarios = await User.find({ role: 'concessionario' })
        .select('-password')
        .sort({ name: 1 })
        .lean()

      res.status(200).json(concessionarios)
    } catch (error) {
      console.error('[listConcessionarios] Erro:', error)
      res.status(500).json({ message: 'Erro interno do servidor.' })
    }
  }
}