// src/hooks/useRole.js
import { useEffect, useState, useCallback } from 'react'
import api from '../utils/api'

function normalizeToken(value) {
  if (!value) return ''
  return String(value).replace(/^"+|"+$/g, '')
}

function parseAuthStorage() {
  const raw = localStorage.getItem('auth')
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed
    if (typeof parsed === 'string') return { token: normalizeToken(parsed) }
  } catch {
    return { token: normalizeToken(raw) }
  }
  if (raw && !raw.trim().startsWith('{')) {
    return { token: normalizeToken(raw) }
  }
  return {}
}

// Lê auth do localStorage (compatível com 'auth.token' e 'token' solto)
function readAuth() {
  const ls = parseAuthStorage()
  return {
    token: normalizeToken(ls.token || localStorage.getItem('token') || ''),
    role: ls.role || 'usuario',
    userId: ls.userId || '',
  }
}

// Escreve a role confirmada no localStorage
function writeRole(role) {
  const ls = parseAuthStorage()
  localStorage.setItem('auth', JSON.stringify({ ...ls, role }))
}

export default function useRole() {
  const [token, setToken] = useState('')
  const [role, setRole] = useState('usuario')
  const [userId, setUserId] = useState('')
  const [user, setUser] = useState(null)
  const [roleLoaded, setRoleLoaded] = useState(false) // quando true, já pode renderizar menus

  // Revalida no backend (aceita várias formas de resposta)
  const refreshRole = useCallback(async () => {
    if (!token) { setRoleLoaded(true); return null }
    try {
      const { data } = await api.get('/users/checkuser', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const u = data?.user || data?.currentUser || data // diferentes controladores
      const backendRole = String(u?.role || 'usuario')
      const backendId = String(u?._id || u?.id || '')
      if (backendRole !== role) {
        setRole(backendRole)
        writeRole(backendRole)
      }
      if (backendId && backendId !== userId) setUserId(backendId)
      setUser(u || null)
      return u
    } catch {
      // mantém estado local
      return null
    } finally {
      setRoleLoaded(true)
    }
  }, [token, role, userId])

  // Carrega do localStorage logo de cara (otimista para não “sumir” menu)
  useEffect(() => {
    const a = readAuth()
    setToken(a.token)
    setRole(a.role || 'usuario')
    setUserId(a.userId || '')
    setRoleLoaded(true)      // mostra já (otimista)
    // revalida com backend em seguida
    refreshRole()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ouve mudanças em outras abas
  useEffect(() => {
    const syncFromStorage = () => {
      const a = readAuth()
      setToken(a.token)
      setRole(a.role || 'usuario')
      setUserId(a.userId || '')
      setRoleLoaded(true)
      refreshRole()
    }
    window.addEventListener('storage', syncFromStorage)
    return () => window.removeEventListener('storage', syncFromStorage)
  }, [refreshRole])

  const normalizedRole = String(role || '').toLowerCase()
  const adminByFlag = !!user?.isAdmin
  const isAdmin = normalizedRole === 'admin' || adminByFlag
  const isConcessionario = normalizedRole === 'concessionario'
  const isUsuario = normalizedRole === 'usuario'
  const isMonitor = normalizedRole === 'monitor'
  const isSama = normalizedRole === 'sama'

  return {
    role, roleLoaded, token, userId, user,
    isAdmin,
    isConcessionario,
    isUsuario,
    isMonitor,
    isSama,
    refreshRole,
  }
}
