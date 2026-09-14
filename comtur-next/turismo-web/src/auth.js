const TOKEN_KEY = 'token'
const REFRESH_KEY = 'memorial_refresh'
const USER_KEY = 'user'
const DASHBOARD_KEY = 'semit_dashboard_token'
const DASHBOARD_REFRESH_KEY = 'semit_dashboard_refresh'

export function maskCpf(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function maskPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11)
  if (digits.length > 10) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (digits.length > 6) return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  if (digits.length > 2) return digits.replace(/(\d{2})(\d{0,5})/, '($1) $2')
  return digits
}

export function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY) || localStorage.getItem('auth') || sessionStorage.getItem(USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const u = parsed?.user || parsed
    if (!u || (!u.nome && !u.name && !u.email)) return null
    return {
      ...u,
      nome: u.nome || u.name || '',
      name: u.name || u.nome || '',
      image: u.image || u.photo || u.foto || u.photoUrl || u.avatarUrl || '',
    }
  } catch {
    return null
  }
}

export function readToken() {
  if (typeof window === 'undefined') return ''
  return (
    sessionStorage.getItem(DASHBOARD_KEY) ||
    localStorage.getItem(TOKEN_KEY) ||
    sessionStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem(DASHBOARD_KEY) ||
    ''
  )
}

export function readRefreshToken() {
  if (typeof window === 'undefined') return ''
  return (
    sessionStorage.getItem(DASHBOARD_REFRESH_KEY) ||
    localStorage.getItem(REFRESH_KEY) ||
    sessionStorage.getItem(REFRESH_KEY) ||
    localStorage.getItem(DASHBOARD_REFRESH_KEY) ||
    ''
  )
}

export function userAvatarUrl(user) {
  const raw = user?.image || user?.photo || user?.foto || user?.photoUrl || user?.avatarUrl || ''
  if (!raw) return ''
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) return raw
  if (raw.startsWith('/')) return raw
  if (raw.startsWith('users/')) return `/images/${raw}`
  if (raw.startsWith('images/')) return `/${raw}`
  return `/images/users/${raw}`
}

export function getUserInitials(name = '') {
  const clean = String(name || '').trim()
  if (!clean) return 'U'
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function storeSession(data, email) {
  const token = data?.token || data?.accessToken || ''
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
    sessionStorage.setItem(DASHBOARD_KEY, token)
  }
  if (data?.refreshToken) {
    localStorage.setItem(REFRESH_KEY, data.refreshToken)
    sessionStorage.setItem(DASHBOARD_REFRESH_KEY, data.refreshToken)
  }
  const rawUser = data?.user || data || {}
  const img = rawUser.image || data?.image || data?.photo || ''
  localStorage.setItem(USER_KEY, JSON.stringify({
    id: data?.userId || rawUser._id || rawUser.id,
    nome: data?.name || rawUser.name || '',
    name: data?.name || rawUser.name || '',
    email: email || data?.email || rawUser.email || '',
    image: img,
    photo: img,
    role: data?.role || rawUser.role || 'usuario',
  }))
}

export function clearSession() {
  const keys = [
    TOKEN_KEY,
    REFRESH_KEY,
    USER_KEY,
    'auth',
    DASHBOARD_KEY,
    DASHBOARD_REFRESH_KEY,
    'semit_dashboard_user',
    'semit_user',
    'garca_admin_logged_in',
    'garca_admin_role',
    'garca_admin_name',
  ]
  keys.forEach((k) => {
    try {
      localStorage.removeItem(k)
      sessionStorage.removeItem(k)
    } catch {}
  })
}

export function isManager(user = readUser()) {
  const role = String(user?.role || '').trim().toLowerCase()
  return role === 'admin' || role === 'admin_comtur' || role === 'admin-comtur' || role === 'secretario' || role === 'secretário'
}

async function tryRefreshToken() {
  const refresh = readRefreshToken()
  if (!refresh) return null
  try {
    const res = await fetch('/api/users/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    })
    const data = await res.json().catch(() => ({}))
    const token = data.token || data.accessToken
    if (res.ok && token) {
      localStorage.setItem(TOKEN_KEY, token)
      sessionStorage.setItem(DASHBOARD_KEY, token)
      if (data.refreshToken) {
        localStorage.setItem(REFRESH_KEY, data.refreshToken)
        sessionStorage.setItem(DASHBOARD_REFRESH_KEY, data.refreshToken)
      }
      return token
    }
  } catch {}
  return null
}

export async function fetchCurrentUser() {
  let token = readToken()
  let user = null

  if (token) {
    try {
      const res = await fetch('/api/users/checkuser', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const raw = data?.user || data
        if (raw && (raw.name || raw.nome || raw.email)) {
          user = raw
        }
      }
    } catch {}
  }

  // If token was expired or checkuser returned null, try refresh token
  if (!user) {
    const newToken = await tryRefreshToken()
    if (newToken) {
      try {
        const res = await fetch('/api/users/checkuser', {
          headers: { Authorization: `Bearer ${newToken}` },
        })
        if (res.ok) {
          const data = await res.json()
          const raw = data?.user || data
          if (raw && (raw.name || raw.nome || raw.email)) {
            user = raw
          }
        }
      } catch {}
    }
  }

  const current = readUser() || {}

  // If still no user from checkuser, but we have userId from localStorage, try /api/users/:id
  if (!user && (current.id || current._id)) {
    const activeToken = readToken()
    if (activeToken) {
      try {
        const res = await fetch(`/api/users/${current.id || current._id}`, {
          headers: { Authorization: `Bearer ${activeToken}` },
        })
        if (res.ok) {
          const data = await res.json()
          const raw = data?.user || data
          if (raw && (raw.name || raw.nome || raw.email)) {
            user = raw
          }
        }
      } catch {}
    }
  }

  if (user) {
    const img = user.image || user.photo || user.foto || current.image || ''
    const updated = {
      ...current,
      id: user._id || user.id || current.id,
      _id: user._id || user.id || current.id,
      nome: user.name || user.nome || current.nome,
      name: user.name || user.nome || current.name,
      email: user.email || current.email,
      image: img,
      photo: img,
      role: user.role || current.role || 'usuario',
    }
    localStorage.setItem(USER_KEY, JSON.stringify(updated))
    return updated
  }

  return readUser()
}

async function readBody(response) {
  return response.json().catch(() => ({}))
}

export async function loginWithEmail(email, password) {
  const response = await fetch('/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  })
  const data = await readBody(response)
  if (!response.ok) throw new Error(data.message || data.error || 'Não foi possível entrar.')
  storeSession(data, email.trim().toLowerCase())
  return data
}

export function validateRegister(values, agreeTerms) {
  const errors = {}
  const name = String(values.name || '').trim()
  const email = String(values.email || '').trim().toLowerCase()
  const cpf = String(values.cpf || '').replace(/\D/g, '')
  const phone = String(values.phone || '').replace(/\D/g, '')
  const password = String(values.password || '')
  const confirmpassword = String(values.confirmpassword || '')
  if (name.length < 3) errors.name = 'Informe o nome completo.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Informe um e-mail válido.'
  if (cpf.length !== 11) errors.cpf = 'Informe um CPF com 11 dígitos.'
  if (phone.length < 10) errors.phone = 'Informe um telefone com DDD.'
  if (password.length < 6) errors.password = 'A senha deve ter no mínimo 6 caracteres.'
  if (password !== confirmpassword) errors.confirmpassword = 'As senhas não coincidem.'
  if (!agreeTerms) errors.agreeTerms = 'É preciso concordar com os termos de uso.'
  return { errors, payload: { name, email, cpf, phone, password, confirmpassword } }
}

export async function registerAccount(values, agreeTerms) {
  const { errors, payload } = validateRegister(values, agreeTerms)
  if (Object.keys(errors).length) {
    const error = new Error('Corrija os campos destacados antes de continuar.')
    error.errors = errors
    throw error
  }
  const response = await fetch('/api/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      acceptedTermsAt: new Date().toISOString(),
      acceptedTermsVersion: '1.0',
      userType: 'Pessoa Física',
    }),
  })
  const data = await readBody(response)
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Não foi possível criar o cadastro.')
    if (data.field) error.field = data.field
    throw error
  }
  return data
}
