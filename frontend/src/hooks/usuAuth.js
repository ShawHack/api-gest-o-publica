// src/hooks/useAuth.js
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import useFlashMessage from './useFlashMessage'

function normalizeToken(t) {
  if (!t) return ''
  const s = typeof t === 'string' ? t : String(t)
  return s.replace(/^"+|"+$/g, '') // remove aspas excedentes
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
  // Compat com monkey-patch de JSON.parse que pode retornar null
  if (raw && !raw.trim().startsWith('{')) {
    return { token: normalizeToken(raw) }
  }
  return {}
}
function readAuthLS() {
  const ls = parseAuthStorage()
  const token = ls.token || localStorage.getItem('token') || ''
  return { token: normalizeToken(token), role: ls.role, userId: ls.userId, name: ls.name, email: ls.email }
}
function writeAuthLS(obj) {
  const prev = parseAuthStorage()
  localStorage.setItem('auth', JSON.stringify({ ...prev, ...obj }))
  if (obj.token) localStorage.setItem('token', normalizeToken(obj.token))
}
function clearAuthLS() {
  localStorage.removeItem('auth')
  localStorage.removeItem('token')
}
function setAxiosAuth(token) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  else delete api.defaults.headers.common['Authorization']
}

export default function useAuth() {
  const [authenticated, setAuthenticated] = useState(false)
  const [user, setUser] = useState(null)       // objeto do /users/checkuser
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { setFlashMessage } = useFlashMessage()

  // Carrega sessão ao iniciar a app
  useEffect(() => {
    (async () => {
      const { token } = readAuthLS()
      if (!token) {
        setAxiosAuth('')
        setAuthenticated(false)
        setUser(null)
        setLoading(false)
        return
      }
      try {
        setAxiosAuth(token)
        const { data } = await api.get('/users/checkuser', { headers: { Authorization: `Bearer ${token}` } })
        const u = data?.user || data?.currentUser || data
        const role = String(u?.role || 'usuario')
        const userId = String(u?._id || u?.id || '')
        writeAuthLS({ token, role, userId, name: u?.name, email: u?.email })
        setUser(u)
        setAuthenticated(true)
      } catch {
        // token inválido/expirado → limpa sessão
        setAxiosAuth('')
        clearAuthLS()
        setAuthenticated(false)
        setUser(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const login = useCallback(async ({ email, password }, redirectTo = '/') => {
    try {
      // 1) login → token
      const { data: loginData } = await api.post('/users/login', { email, password })
      const token = normalizeToken(loginData?.token)
      if (!token) throw new Error('Token ausente no login')

      setAxiosAuth(token)
      writeAuthLS({ token })

      // 2) confirma usuário/papel
      const { data: meData } = await api.get('/users/checkuser', { headers: { Authorization: `Bearer ${token}` } })
      const u = meData?.user || meData?.currentUser || meData
      const role = String(u?.role || 'usuario')
      const userId = String(u?._id || u?.id || '')
      writeAuthLS({ role, userId, name: u?.name, email: u?.email })

      // 3) atualiza estado global de auth
      setUser(u)
      setAuthenticated(true)

      // 4) remove a flag de validação pendente (email foi validado com sucesso)
      localStorage.removeItem('emailValidationPending')

      setFlashMessage('Login realizado com sucesso!', 'success')
      if (redirectTo.startsWith('/sama') || redirectTo.startsWith('/semit-a-pet')) {
        window.location.href = redirectTo
      } else {
        navigate(redirectTo)
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao fazer login'
      setFlashMessage(msg, 'error')
      setAuthenticated(false)
      setUser(null)
      setAxiosAuth('')
      clearAuthLS()
    }
  }, [navigate, setFlashMessage])







  const register = useCallback(async (payload) => {
    try {
      // 1. Faça a chamada e guarde a resposta da API
      const response = await api.post('/users/register', payload);
      const data = response.data; // data = { ok: true, message: '...' }

      // 2. Marcar que há validação de email pendente
      localStorage.setItem('emailValidationPending', 'true');

      // 3. Use a mensagem que veio da API (data.message)
      setFlashMessage(data.message, 'success');

      // 4. Redirecione para o login
      navigate('/login');

    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao cadastrar';
      setFlashMessage(msg, 'error');
      // Opcional, mas recomendado: lançar o erro para o componente saber que falhou
      throw err;
    }
  }, [navigate, setFlashMessage]);

  const logout = useCallback((redirectPath = '/login') => {
    setAxiosAuth('')
    clearAuthLS()
    setAuthenticated(false)
    setUser(null)
    const target = (typeof redirectPath === 'string' && redirectPath) ? redirectPath : '/login'
    navigate(target)
  }, [navigate])

  return { authenticated, user, loading, register, logout, login }





}
