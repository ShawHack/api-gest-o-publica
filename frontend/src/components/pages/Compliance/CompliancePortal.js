import { useEffect, useState } from 'react'
import api from '../../../utils/api'
import ComplianceDashboard from './ComplianceDashboard'
import styles from './CompliancePortal.module.css'

function readToken() {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    return auth.token || localStorage.getItem('token') || ''
  } catch {
    return localStorage.getItem('token') || ''
  }
}

function writeAuth(token, role, userId) {
  localStorage.setItem('token', token)
  localStorage.setItem('auth', JSON.stringify({ token, role, userId }))
}

export default function CompliancePortal() {
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function validateAdminSession() {
    const token = readToken()
    if (!token) {
      setAuthorized(false)
      setChecking(false)
      return
    }
    try {
      const { data } = await api.get('/users/checkuser', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const user = data?.user || data?.currentUser || data
      const role = String(user?.role || '').toLowerCase()
      const isAdmin = role === 'admin' || !!user?.isAdmin
      setAuthorized(isAdmin)
      if (!isAdmin) setError('Acesso restrito a administradores.')
    } catch {
      setAuthorized(false)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    validateAdminSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const { data } = await api.post('/users/login', { email, password })
      const token = data?.token
      const role = String(data?.role || '').toLowerCase()
      const userId = data?.userId || ''
      if (!token) throw new Error('Token inválido.')
      writeAuth(token, role, userId)
      if (role !== 'admin') {
        setAuthorized(false)
        setError('Seu usuário não possui acesso administrativo ao Compliance.')
      } else {
        setAuthorized(true)
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha no login de compliance.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('auth')
    setAuthorized(false)
    setEmail('')
    setPassword('')
  }

  if (checking) {
    return (
      <div className={styles.portal}>
        <div className={styles.loginWrap}>Validando sessão...</div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className={styles.portal}>
        <header className={styles.header}>
          <div className={styles.title}>Compliance LGPD - Acesso Administrativo</div>
        </header>
        <div className={styles.loginWrap}>
          <form className={styles.loginCard} onSubmit={handleLogin}>
            <h2 style={{ marginTop: 0 }}>Entrar no Compliance</h2>
            <p className={styles.muted}>Área independente para monitoramento LGPD.</p>
            {error && <div className={styles.error}>{error}</div>}
            <label className={styles.field}>
              E-mail
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className={styles.field}>
              Senha
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={submitting}>
              {submitting ? 'Entrando...' : 'Acessar painel'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.portal}>
      <header className={styles.header}>
        <div className={styles.title}>Compliance LGPD - Painel Administrativo</div>
        <div className={styles.actions}>
          <button className={styles.btn} type="button" onClick={() => (window.location.href = '/dashboard.html')}>
            Portal
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>
      <main className={styles.content}>
        <ComplianceDashboard />
      </main>
    </div>
  )
}
