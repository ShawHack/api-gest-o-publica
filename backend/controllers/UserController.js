// controllers/UserController.js
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const mongoose = require('mongoose')

const User = require('../models/User')
const getToken = require('../helpers/get-token')
const getUserByToken = require('../helpers/get-user-by-token')
const { sendMail, sendMailDirect, isMailAccepted } = require('../helpers/mailer')
const {
  notifyVerificationLink,
  notifyAccessReleased,
} = require('../helpers/cadastro-notifier')
const { recordAudit, recordSecurity, recordChange, maskValue } = require('../helpers/audit-log')
const {
  signAccess,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  ACCESS_TTL,
} = require('../helpers/memorial-auth-tokens')

// --- Helpers ---
const validateCPF = require('../helpers/validate-cpf')
const validatePassword = require('../helpers/validate-password')
const resolveRegisterCpf = require('../helpers/resolve-register-cpf')

// Helpers de resposta padronizada
function ok(res, message, extra = {}, status = 200) {
  return res.status(status).json({ ok: true, message, ...extra })
}
function err(res, status, message, field) {
  const body = { ok: false, message }
  if (field) body.field = field
  return res.status(status).json(body)
}

function normalizeEmail(e) {
  return String(e || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase()
}

/** URL pública do memorial (link no e-mail de verificação). Sem trailing slash. */
function getPublicAppUrl() {
  const raw = (process.env.APP_URL || process.env.FRONTEND_URL || '').trim()
  return raw.replace(/\/+$/, '')
}

/** Se APP_URL não estiver no .env, infere a partir do proxy (Nginx + X-Forwarded-Proto). */
function inferPublicBaseFromRequest(req) {
  if (!req || !req.get) return ''
  const host = String(req.get('host') || '').trim()
  if (!host) return ''
  const xfProto = req.get('x-forwarded-proto')
  const proto = String(xfProto || req.protocol || 'https')
    .split(',')[0]
    .trim()
  if (!proto) return ''
  return `${proto}://${host}`.replace(/\/+$/, '')
}

/** Garça Pet envia client: 'garcapet'; Memorial mantém /auth/verify-email por padrão. */
function resolveAuthClient(req) {
  const client = String(req.body?.client || '').trim().toLowerCase()
  if (client === 'garcapet') return 'garcapet'
  const ref = String(req.headers.referer || req.headers.referrer || '').toLowerCase()
  if (ref.includes('/garcapet')) return 'garcapet'
  return ''
}

function emailVerifyLinkPath(req) {
  return resolveAuthClient(req) === 'garcapet'
    ? '/garcapet/auth/verify-email'
    : '/auth/verify-email'
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toSafeUser(userDoc, { includeContact = false } = {}) {
  if (!userDoc) return null
  const user = typeof userDoc.toObject === 'function' ? userDoc.toObject() : userDoc
  const base = {
    _id: user._id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    userType: user.userType,
    instituteName: user.instituteName,
    isAdmin: !!user.isAdmin,
    isSamaMember: !!user.isSamaMember,
    canManageTrees: !!user.canManageTrees,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
  // Contato só para o próprio perfil (login / checkuser), não em listagens públicas
  if (includeContact) {
    base.phone = user.phone || ''
    base.whatsapp = user.whatsapp || ''
    base.telefone = user.phone || ''
  }
  return base
}

/** Busca usuário por e-mail (minúsculas + espaços + caixa mista + pequenas diferenças de Unicode). */
async function findUserByEmailLoose(email) {
  const norm = normalizeEmail(email)
  if (!norm) return null
  let u = await User.findOne({ email: norm })
  if (u) return u
  u = await User.findOne({
    email: { $regex: new RegExp(`^\\s*${escapeRegex(norm)}\\s*$`, 'i') },
  })
  if (u) return u
  // Registros com espaço invisível / formatação no campo `email` (a busca admin usa regex parcial e acha)
  u = await User.findOne({
    $expr: {
      $eq: [norm, { $toLower: { $trim: { input: '$email' } } }],
    },
  })
  if (u) return u
  try {
    u = await User.findOne({
      $expr: {
        $eq: [
          norm,
          {
            $toLower: {
              $trim: {
                input: {
                  $replaceAll: { input: '$email', find: '\u200b', replacement: '' },
                },
              },
            },
          },
        ],
      },
    })
  } catch (e) {
    console.warn('[findUserByEmailLoose] Fallback ZWSP ($replaceAll):', e?.message || e)
  }
  return u || null
}

const EMAIL_VERIFY_TTL_MS = 1000 * 60 * 60 * 72 // 72h — reduz “link expirou” por atraso do e-mail

// Normaliza o papel para uma das três opções em minúsculas
const normalizeRole = (r) => String(r ?? 'usuario').trim().toLowerCase()

module.exports = class UserController {
  // ===============================================
  //                REGISTRO & VERIFICAÇÃO
  // ===============================================

  static async register(req, res) {
    const {
      name,
      email,
      phone,
      password,
      confirmpassword,

      // >>> novos campos vindos do front
      acceptedTermsAt,
      acceptedTermsVersion,
      // Opcional, se decidir enviar:
      // acceptedTermsIp,
      // acceptedTermsUserAgent,
    } = req.body || {}

    const cpf = resolveRegisterCpf(req.body)

    const emailNorm = normalizeEmail(email)

    // --- Validações ---
    if (!name) return err(res, 422, 'O nome é obrigatório.', 'name')
    if (!emailNorm) return err(res, 422, 'O e-mail é obrigatório.', 'email')
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

    // --- Checagem de duplicidade (cpf OU cpf_cnpj — evita duplo cadastro SAMA/Memorial) ---
    const [emailTaken, cpfExists] = await Promise.all([
      findUserByEmailLoose(emailNorm),
      User.findOne({ $or: [{ cpf }, { cpf_cnpj: cpf }] }).lean(),
    ])
    if (emailTaken) return err(res, 422, 'E-mail informado já está em uso.', 'email')
    if (cpfExists) return err(res, 422, 'CPF já cadastrado.', 'cpf')

    // --- Preparação do usuário ---
    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    // Criamos o token ANTES de criar o objeto do usuário
    const verificationToken = crypto.randomBytes(32).toString('hex')

    const user = new User({
      name,
      email: emailNorm,
      phone,
      cpf,
      ...(cpf.length === 11 ? { cpf_cnpj: cpf } : {}),
      password: passwordHash,

      emailVerifyToken: verificationToken,
      emailVerifyExpires: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
      role: 'usuario',

      // >>> persistência do aceite
      acceptedTermsAt: new Date(acceptedTermsAt),
      acceptedTermsVersion: acceptedTermsVersion || '2.0',
      // acceptedTermsIp: req.ip,
      // acceptedTermsUserAgent: req.headers['user-agent'],
    })

    try {
      // --- Salvar no banco ---
      await user.save()

      // --- Montar link (APP_URL/FRONTEND_URL ou inferência via headers do proxy) ---
      const envBase = getPublicAppUrl()
      const inferredBase = inferPublicBaseFromRequest(req)
      const publicBase = envBase || inferredBase
      if (!envBase && !inferredBase) {
        console.error(
          '[register] APP_URL/FRONTEND_URL não definidos e host da requisição ausente: defina APP_URL no .env (ex.: https://api.garca.sp.gov.br).'
        )
      } else if (!envBase) {
        console.warn('[register] APP_URL ausente; usando URL inferida do pedido HTTP para o link de verificação.')
      }
      const verifyPath = emailVerifyLinkPath(req)
      const link = `${publicBase || ''}${verifyPath}?token=${verificationToken}&email=${encodeURIComponent(emailNorm)}`

      // --- Enviar e-mail (direto: verificação não pode ficar só na fila silenciosa) ---
      const mailResult = await sendMailDirect({
        to: emailNorm,
        subject: 'Confirme seu e-mail',
        html: `
          <p>Olá ${name},</p>
          <p>Confirme seu e-mail clicando no link abaixo (válido por 72 horas):</p>
          <p><a href="${link}">${link}</a></p>
        `,
      })
      const emailSent = isMailAccepted(mailResult)
      if (mailResult?.ignored) {
        console.error(
          '[register] E-mail de verificação NÃO foi enviado: SMTP não configurado. Defina SMTP_HOST, SMTP_USER e SMTP_PASS no .env do container da API.'
        )
      } else if (mailResult?.error) {
        console.error('[register] E-mail de verificação NÃO foi enviado (erro SMTP):', mailResult.message)
      } else if (mailResult?.queued) {
        console.error('[register] E-mail ficou só na fila (não deveria); use sendMailDirect.')
      } else {
        console.log('[register] E-mail de verificação aceito pelo SMTP:', mailResult?.messageId || mailResult?.response || 'ok')
      }

      let whatsappQueued = false
      let whatsappSent = false
      try {
        const wa = await notifyVerificationLink({ phone: user.phone, name, link })
        whatsappQueued = !!(wa && wa.queued)
        whatsappSent = !!(wa && !wa.error && !wa.ignored && !wa.skipped && !wa.queued)
      } catch (waErr) {
        console.error('[register] WhatsApp verificação falhou (não bloqueia cadastro):', waErr?.message || waErr)
      }

      req.user = {
        _id: user._id.toString(),
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      }
      void recordAudit(req, {
        action: 'auth.register',
        resourceType: 'user',
        resourceId: user._id,
        module: 'auth',
        eventType: 'CREATE',
        metadata: { emailSent, whatsappQueued, whatsappSent },
      })
      const registerMsg = user.phone
        ? 'Cadastro realizado! Enviamos um e-mail e uma mensagem no WhatsApp para ativar a conta.'
        : 'Cadastro realizado! Enviamos um e-mail para ativar a conta.'
      return ok(res, registerMsg, { emailSent, whatsappQueued, whatsappSent }, 201)
    } catch (error) {
      console.error('[register] Erro inesperado:', error)
      return err(res, 500, 'Ocorreu um erro inesperado ao processar seu cadastro.')
    }
  }

  static async resendVerification(req, res) {
    try {
      const { email } = req.body || {}
      const emailNorm = normalizeEmail(email)
      if (!emailNorm) return res.status(422).json({ ok: false, message: 'E-mail é obrigatório.' })

      const user = await findUserByEmailLoose(emailNorm)
      if (!user) return res.status(404).json({ ok: false, message: 'Usuário não encontrado.' })
      if (user.emailVerified) return res.json({ ok: true, message: 'E-mail já verificado.' })

      user.emailVerifyToken = crypto.randomBytes(32).toString('hex')
      user.emailVerifyExpires = new Date(Date.now() + EMAIL_VERIFY_TTL_MS)
      if (user.email !== emailNorm) user.email = emailNorm
      await user.save()

      const envBase = getPublicAppUrl()
      const inferredBase = inferPublicBaseFromRequest(req)
      const publicBase = envBase || inferredBase
      if (!envBase && inferredBase) {
        console.warn('[resendVerification] APP_URL ausente; link inferido do pedido HTTP.')
      }
      const verifyPath = emailVerifyLinkPath(req)
      const link = `${publicBase || ''}${verifyPath}?token=${user.emailVerifyToken}&email=${encodeURIComponent(emailNorm)}`

      const mailResult = await sendMailDirect({
        to: emailNorm,
        subject: 'Confirme seu e-mail',
        html: `
          <p>Olá ${user.name},</p>
          <p>Confirme seu e-mail clicando no link abaixo (válido por 72 horas):</p>
          <p><a href="${link}">${link}</a></p>
        `,
      })
      if (mailResult?.ignored) {
        console.error('[resendVerification] SMTP não configurado (SMTP_HOST, SMTP_USER, SMTP_PASS).')
        return res.status(503).json({
          ok: false,
          message: 'Serviço de e-mail não está configurado. Tente novamente mais tarde ou contate o suporte.',
        })
      }
      if (mailResult?.error) {
        console.error('[resendVerification] Falha SMTP:', mailResult.message)
        return res.status(503).json({
          ok: false,
          message: 'Não foi possível enviar o e-mail no momento. Tente novamente mais tarde.',
        })
      }
      console.log(
        '[resendVerification] E-mail aceito pelo SMTP:',
        mailResult?.messageId || mailResult?.response || 'ok'
      )

      let whatsappQueued = false
      let whatsappSent = false
      try {
        const wa = await notifyVerificationLink({
          phone: user.phone,
          name: user.name,
          link,
        })
        whatsappQueued = !!(wa && wa.queued)
        whatsappSent = !!(wa && !wa.error && !wa.ignored && !wa.skipped && !wa.queued)
      } catch (waErr) {
        console.error(
          '[resendVerification] WhatsApp verificação falhou (não bloqueia reenvio):',
          waErr?.message || waErr
        )
      }

      const resendMsg = user.phone
        ? 'Se o e-mail existir, reenviamos o link de verificação por e-mail e WhatsApp.'
        : 'Se o e-mail existir, reenviamos o link de verificação.'
      return res.json({ ok: true, message: resendMsg, whatsappQueued, whatsappSent })
    } catch (e) {
      return res.status(500).json({ ok: false, message: 'Erro ao reenviar verificação.' })
    }
  }

  static async verifyEmail(req, res) {
    try {
      const token = String(req.query.token || '').trim()
      const emailNorm = normalizeEmail(req.query.email)

      if (!token || !emailNorm) {
        return err(res, 400, 'Link inválido ou incompleto.')
      }

      const user = await findUserByEmailLoose(emailNorm)
      if (!user) {
        return err(
          res,
          400,
          'Não encontramos cadastro para este link. Confira o endereço ou faça um novo cadastro.'
        )
      }

      if (user.emailVerified) {
        return ok(
          res,
          'Este e-mail já foi verificado anteriormente. Você pode fazer login normalmente.'
        )
      }

      const now = new Date()
      if (!user.emailVerifyExpires || user.emailVerifyExpires <= now) {
        return err(
          res,
          400,
          'O prazo deste link expirou. Na tela de login, solicite um novo e-mail de verificação (link válido por 72 horas).'
        )
      }

      if (!user.emailVerifyToken || user.emailVerifyToken !== token) {
        return err(
          res,
          400,
          'Este link não é mais válido (pode ter sido substituído por um e-mail mais novo). Abra o link mais recente ou solicite um novo na tela de login.'
        )
      }

      user.emailVerified = true
      user.emailVerifyToken = undefined
      user.emailVerifyExpires = undefined
      if (user.email !== emailNorm) user.email = emailNorm
      await user.save()

      void notifyAccessReleased({ phone: user.phone, name: user.name }).catch((waErr) => {
        console.error(
          '[verifyEmail] WhatsApp acesso liberado falhou (não bloqueia verificação):',
          waErr?.message || waErr
        )
      })

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

    const user = await findUserByEmailLoose(email)
    if (!user) {
      void recordSecurity(req, {
        action: 'auth.login_failed',
        resourceType: 'user',
        module: 'auth',
        metadata: { reason: 'invalid_credentials', attemptedEmail: maskValue('email', normalizeEmail(email)) },
      })
      return err(res, 422, 'E-mail ou senha inválidos.')
    }

    const checkPassword = await bcrypt.compare(password, user.password)
    if (!checkPassword) {
      void recordSecurity(req, {
        action: 'auth.login_failed',
        resourceType: 'user',
        resourceId: user._id,
        module: 'auth',
        metadata: { reason: 'invalid_credentials', attemptedEmail: maskValue('email', user.email) },
      })
      return err(res, 422, 'E-mail ou senha inválidos.')
    }

    if (!user.emailVerified) {
      void recordSecurity(req, {
        action: 'auth.login_denied',
        resourceType: 'user',
        resourceId: user._id,
        module: 'auth',
        metadata: { reason: 'email_not_verified' },
        actor: { _id: user._id, id: user._id, name: user.name, email: user.email, role: user.role },
      })
      return err(res, 403, 'Você precisa verificar seu e-mail antes de fazer login. Verifique sua caixa de entrada.')
    }

    try {
      const token = signAccess(user)
      const refreshToken = await issueRefreshToken(user._id)
      req.user = {
        _id: user._id.toString(),
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
      }
      void recordAudit(req, {
        action: 'auth.login_success',
        resourceType: 'user',
        resourceId: user._id,
        module: 'auth',
        eventType: 'LOGIN',
      })
      return ok(res, 'Login realizado com sucesso!', {
        token,
        accessToken: token,
        refreshToken,
        expiresIn: ACCESS_TTL,
        userId: user._id,
        role: normalizeRole(user.role),
        // Contato do próprio usuário — app de iluminação usa no notify WhatsApp/e-mail
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        whatsapp: user.whatsapp || user.phone || '',
        user: toSafeUser(user, { includeContact: true }),
      })
    } catch (error) {
      console.error('[login] Erro ao gerar token:', error)
      return err(res, 500, 'Erro interno do servidor.')
    }
  }

  static async refresh(req, res) {
    try {
      const { refreshToken } = req.body || {}
      const rotated = await rotateRefreshToken(refreshToken)
      if (!rotated) {
        void recordSecurity(req, {
          action: 'auth.refresh_failed',
          resourceType: 'session',
          module: 'auth',
          metadata: { reason: 'invalid_refresh_token' },
        })
        return err(res, 401, 'Sessão inválida ou expirada.')
      }
      const { user, accessToken, refreshToken: newRefresh } = rotated
      req.user = {
        _id: user._id.toString(),
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
      }
      void recordAudit(req, {
        action: 'auth.refresh_success',
        resourceType: 'session',
        resourceId: user._id,
        module: 'auth',
        eventType: 'LOGIN',
      })
      return ok(res, 'Sessão renovada.', {
        token: accessToken,
        accessToken,
        refreshToken: newRefresh,
        expiresIn: ACCESS_TTL,
        userId: user._id,
        role: normalizeRole(user.role),
      })
    } catch (error) {
      console.error('[refresh] Erro:', error)
      return err(res, 500, 'Erro interno do servidor.')
    }
  }

  static async logout(req, res) {
    try {
      const { refreshToken } = req.body || {}
      await revokeRefreshToken(refreshToken)
      const token = getToken(req)
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET)
          const uid = decoded.id || decoded._id
          if (uid) {
            const u = await User.findById(uid).select('name email role')
            if (u) {
              req.user = {
                _id: u._id.toString(),
                id: u._id.toString(),
                name: u.name,
                email: u.email,
                role: u.role,
              }
            }
          }
        } catch (_e) {
          // logout mesmo com access token expirado
        }
      }
      void recordAudit(req, {
        action: 'auth.logout',
        resourceType: 'session',
        resourceId: req.user?.id,
        module: 'auth',
        eventType: 'LOGOUT',
      })
      return ok(res, 'Sessão encerrada.')
    } catch (error) {
      console.error('[logout] Erro:', error)
      return err(res, 500, 'Erro interno do servidor.')
    }
  }

  // ===============================================
  //                   USUÁRIO ATUAL
  // ===============================================

  static async checkUser(req, res) {
    try {
      let currentUser = null
      if (req.headers.authorization) {
        const token = getToken(req)
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET)
          currentUser = await User.findById(decoded.id)
        }
      }
      if (!currentUser) return res.status(200).json(null)
      // Mantém documento na raiz (compat) + user tipado com contato do próprio perfil
      const safe = toSafeUser(currentUser, { includeContact: true })
      return res.status(200).json({
        ...safe,
        user: safe,
        role: normalizeRole(currentUser.role),
      })
    } catch (error) {
      return res.status(200).json(null)
    }
  }

  static async getUserById(req, res) {
    try {
      const id = req.params.id
      const user = await User.findById(id)

      if (!user) {
        return res.status(422).json({ message: 'Usuário não encontrado!' })
      }
      await recordAudit(req, {
        action: 'user.read',
        resourceType: 'user',
        resourceId: id,
      })
      res.status(200).json({ user: toSafeUser(user) })
    } catch (error) {
      return res.status(400).json({ message: 'ID de usuário inválido!' })
    }
  }

  // ===============================================
  //                   EDIÇÃO DE PERFIL
  // ===============================================

  static async editUser(req, res) {
    const token = getToken(req)
    const currentUser = await getUserByToken(token)

    // Pega o ID do usuário a ser editado (da URL)
    const targetUserId = req.params.id

    // Se admin está editando outro usuário, busca esse usuário
    // Se está editando a si mesmo, usa o próprio usuário
    let user
    if (targetUserId && targetUserId !== currentUser._id.toString()) {
      // Admin editando outro usuário
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: 'Sem permissão para editar este usuário.' })
      }
      user = await User.findById(targetUserId)
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado.' })
      }
    } else {
      user = currentUser
    }

    const before = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      image: user.image,
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

    // check if email belongs to another user (not the one being edited)
    const userExists = await User.findOne({ email: email, _id: { $ne: user._id } })

    if (userExists) {
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
      await User.findOneAndUpdate(
        { _id: user._id },
        { $set: user },
        { new: true }
      )

      req.user = {
        _id: currentUser._id.toString(),
        id: currentUser._id.toString(),
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      }
      const after = {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        image: user.image,
      }
      if (password) {
        after.password = '[changed]'
        before.password = '[changed]'
      }
      void recordChange(req, {
        action: 'user.update',
        resourceType: 'user',
        resourceId: user._id,
        module: 'auth',
        before,
        after,
        fields: ['name', 'email', 'phone', 'role', 'image', 'password'],
        metadata: { targetUserId: String(user._id), editedByAdmin: String(targetUserId) !== String(currentUser._id) },
      })

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

      const counts = { total, usuario: 0, concessionario: 0, admin: 0, iluminacao_admin: 0, admin_votacao: 0, sama: 0 }
      roleCounts.forEach(({ _id, count }) => {
        if (_id === 'usuario') counts.usuario = count
        else if (_id === 'concessionario') counts.concessionario = count
        else if (_id === 'admin') counts.admin = count
        else if (_id === 'iluminacao_admin') counts.iluminacao_admin = count
        else if (_id === 'admin-votacao') counts.admin_votacao = count
        else if (_id === 'sama') counts.sama = count
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
      await recordAudit(req, {
        action: 'user.delete',
        resourceType: 'user',
        resourceId: id,
      })

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
      const normalizedRole = String(req.body?.role || '').trim().toLowerCase()

      // Validar role
      const validRoles = ['usuario', 'concessionario', 'admin', 'iluminacao_admin', 'rotas_operador', 'rotas_admin', 'admin-votacao', 'sama']
      if (!validRoles.includes(normalizedRole)) {
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

      user.role = normalizedRole
      // Regra automática: usuário SAMA sempre pode gerenciar árvores
      if (normalizedRole === 'sama') {
        user.canManageTrees = true
        user.isSamaMember = true
      }
      await user.save()
      await recordAudit(req, {
        action: 'user.update_role',
        resourceType: 'user',
        resourceId: id,
        metadata: { role: normalizedRole },
      })

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
      const { email, client } = req.body || {}
      const emailNorm = normalizeEmail(email)

      if (!emailNorm) {
        return res.status(422).json({ message: 'E-mail é obrigatório.' })
      }

      const user = await findUserByEmailLoose(emailNorm)
      if (!user) {
        // Mesma mensagem ao cliente (não revela se o e-mail está cadastrado).
        // Log interno ajuda a distinguir “SMTP falhou” de “não há conta com este e-mail”.
        console.warn(
          '[forgotPassword] Nenhum usuário encontrado; e-mail de reset não enviado.',
          emailNorm
        )
        return res.status(200).json({ message: 'Se o e-mail existir, você receberá as instruções.' })
      }

      // Gerar token de reset
      const resetToken = crypto.randomBytes(32).toString('hex')
      user.resetPasswordToken = resetToken
      user.resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 60) // 1h
      await user.save()
      await recordAudit(req, {
        action: 'user.forgot_password',
        resourceType: 'user',
        resourceId: user._id,
        metadata: { role: user.role, userType: user.userType },
      })

      const envBase = getPublicAppUrl()
      const inferredBase = inferPublicBaseFromRequest(req)
      const baseUrl = envBase || inferredBase || ''
      const resetPath =
        String(client || '').trim().toLowerCase() === 'garcapet'
          ? '/garcapet/auth/reset-password'
          : '/auth/reset-password'
      const resetLink = `${baseUrl}${resetPath}?token=${resetToken}&email=${encodeURIComponent(emailNorm)}`

      const mailResult = await sendMailDirect({
        to: emailNorm,
        subject: 'Redefinir senha',
        html: `
          <p>Olá ${user.name},</p>
          <p>Você solicitou a redefinição de sua senha. Clique no link abaixo (válido por 1h):</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>Se você não solicitou esta redefinição, ignore este e-mail.</p>
        `,
      })

      if (mailResult?.ignored) {
        console.error(
          '[forgotPassword] Mailer sem SMTP: reset não enviado (configure SMTP_*).',
          emailNorm
        )
      } else if (mailResult?.error) {
        console.error(
          '[forgotPassword] Falha SMTP ao enviar reset:',
          mailResult.message || mailResult,
          emailNorm
        )
      } else {
        console.log('[forgotPassword] Reset aceito pelo SMTP:', mailResult?.messageId || mailResult?.response || 'ok')
      }

      res.status(200).json({ message: 'Se o e-mail existir, você receberá as instruções.' })
    } catch (error) {
      console.error('[forgotPassword] Erro:', error)
      res.status(500).json({ message: 'Erro interno do servidor.' })
    }
  }

  static async resetPassword(req, res) {
    try {
      let { token, email, password, confirmpassword, novaSenha } = req.body
      if (novaSenha && !password) {
        password = novaSenha;
        confirmpassword = novaSenha; // Frontend didn't send confirmpassword originally but verified locally
      }

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

      const emailNorm = normalizeEmail(email)
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      })

      if (!user || normalizeEmail(user.email) !== emailNorm) {
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

      const normalizedRole = String(role || 'usuario').trim().toLowerCase()

      const user = new User({
        name,
        email,
        phone,
        cpf,
        password: passwordHash,
        role: ['usuario', 'concessionario', 'admin', 'iluminacao_admin', 'rotas_operador', 'rotas_admin', 'admin-votacao', 'sama'].includes(normalizedRole)
          ? normalizedRole
          : 'usuario',
        canManageTrees: normalizedRole === 'sama',
        isSamaMember: normalizedRole === 'sama',
        emailVerified: true, // Admin criado já verificado
        acceptedTermsAt: new Date(),
        acceptedTermsVersion: '2.0'
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

  // ===============================================
  //          MÉTODOS ESPECÍFICOS SEMIT_A_PET
  // ===============================================

  // Listar institutos (para SEMIT_A_PET)
  static async getInstitutes(req, res) {
    try {
      const institutes = await User.find({ userType: 'Instituto' })
        .select('-password')
        .sort({ instituteName: 1 })
        .lean()

      res.status(200).json({ institutes })
    } catch (error) {
      console.error('[getInstitutes] Erro:', error)
      res.status(500).json({ message: 'Erro ao buscar institutos.' })
    }
  }

  // Admin criar usuário (SEMIT_A_PET)
  static async createUserByAdmin(req, res) {
    try {
      const token = getToken(req)
      const requester = await getUserByToken(token)

      if (!requester || !requester.isAdmin) {
        return res.status(403).json({ message: 'Acesso negado!' })
      }

      let { name, email, phone, password, userType, instituteName, cpf_cnpj, isAdmin } = req.body

      // Normalize
      if (email) email = email.toLowerCase().trim()
      if (cpf_cnpj) cpf_cnpj = cpf_cnpj.replace(/\D/g, '')

      // Validations
      if (!name || !email || !phone || !password || !userType || !cpf_cnpj) {
        return res.status(422).json({ message: 'Todos os campos são obrigatórios' })
      }

      const userExists = await User.findOne({ email: email })
      if (userExists) return res.status(422).json({ message: 'E-mail já cadastrado' })

      const cpfCnpjExists = await User.findOne({ cpf_cnpj: cpf_cnpj })
      if (cpfCnpjExists) return res.status(422).json({ message: 'CPF/CNPJ já cadastrado' })

      const salt = await bcrypt.genSalt(12)
      const passwordHash = await bcrypt.hash(password, salt)

      const user = new User({
        name,
        email,
        phone,
        password: passwordHash,
        userType,
        instituteName: userType === 'Instituto' ? instituteName : null,
        cpf_cnpj,
        isAdmin: isAdmin === true || isAdmin === 'true',
        createdBy: requester._id,
        isSamaMember: false,
        emailVerified: true // Admin-created users are pre-verified
      })

      await user.save()
      res.status(201).json({ message: 'Usuário criado com sucesso pelo administrador!' })
      await recordAudit(req, {
        action: 'user.admin_create',
        resourceType: 'user',
        resourceId: user._id,
        metadata: { userType, isAdmin: !!user.isAdmin },
      })

    } catch (error) {
      console.error('[createUserByAdmin] Erro:', error)
      res.status(500).json({ message: 'Erro ao criar usuário.' })
    }
  }

  // Admin deletar usuário criado por ele (SEMIT_A_PET)
  static async deleteUserByAdmin(req, res) {
    try {
      const token = getToken(req)
      const requester = await getUserByToken(token)

      if (!requester || !requester.isAdmin) {
        return res.status(403).json({ message: 'Acesso negado!' })
      }

      const { id } = req.params

      const userToDelete = await User.findById(id)
      if (!userToDelete) {
        return res.status(404).json({ message: 'Usuário não encontrado!' })
      }

      // Check if requester is the creator
      if (!userToDelete.createdBy || userToDelete.createdBy.toString() !== requester._id.toString()) {
        return res.status(403).json({ message: 'Você não tem permissão para remover este usuário pois ele não foi cadastrado por você.' })
      }

      await User.findByIdAndDelete(id)
      await recordAudit(req, {
        action: 'user.admin_delete',
        resourceType: 'user',
        resourceId: id,
      })
      res.status(200).json({ message: 'Usuário removido com sucesso!' })

    } catch (error) {
      console.error('[deleteUserByAdmin] Erro:', error)
      res.status(500).json({ message: 'Erro ao remover usuário.' })
    }
  }

  // Alternar permissão de gerenciamento de árvores (SEMIT_A_PET)
  static async toggleTreePermission(req, res) {
    try {
      const token = getToken(req)
      const requester = await getUserByToken(token)

      if (!requester || !requester.isAdmin) {
        return res.status(403).json({ message: 'Acesso negado!' })
      }

      const { id } = req.params

      const userToUpdate = await User.findById(id)
      if (!userToUpdate) {
        return res.status(404).json({ message: 'Usuário não encontrado!' })
      }

      userToUpdate.canManageTrees = !userToUpdate.canManageTrees
      await userToUpdate.save()
      await recordAudit(req, {
        action: 'user.toggle_tree_permission',
        resourceType: 'user',
        resourceId: id,
        metadata: { canManageTrees: userToUpdate.canManageTrees },
      })

      res.status(200).json({
        message: `Permissão de gestão de árvores ${userToUpdate.canManageTrees ? 'ativada' : 'desativada'} com sucesso!`,
        canManageTrees: userToUpdate.canManageTrees
      })

    } catch (error) {
      console.error('[toggleTreePermission] Erro:', error)
      res.status(500).json({ message: 'Erro ao atualizar permissão.' })
    }
  }

  // Listar todos os usuários criados pelo admin (SEMIT_A_PET)
  static async getAllUsersByAdmin(req, res) {
    try {
      const token = getToken(req)
      const user = await getUserByToken(token)

      if (!user.isAdmin) {
        return res.status(403).json({ message: 'Acesso negado!' })
      }

      // Admin vê apenas usuários que ele criou (excluindo ele mesmo)
      const users = await User.find({
        createdBy: user._id,
        _id: { $ne: user._id }
      }).select('-password').sort('-createdAt')

      res.status(200).json({ users })
    } catch (error) {
      console.error('[getAllUsersByAdmin] Erro:', error)
      res.status(500).json({ message: 'Erro ao buscar usuários.' })
    }
  }
}
