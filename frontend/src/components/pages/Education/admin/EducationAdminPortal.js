import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../../utils/api'
import { readStoredToken } from '../../../../utils/readStoredToken'
import { getAdminDashboard } from '../../../../services/educationService'
import EducationAdminDashboard from './EducationAdminDashboard'
import styles from './EducationAdminPortal.module.css'

function readToken() {
  return readStoredToken()
}

function writeAuth(token, role, userId) {
  localStorage.setItem('token', token)
  localStorage.setItem('auth', JSON.stringify({ token, role, userId }))
  api.defaults.headers.common.Authorization = `Bearer ${token}`
}

export default function EducationAdminPortal() {
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function validateSession() {
    const token = readToken()
    if (!token) {
      setAuthorized(false)
      setChecking(false)
      return
    }
    api.defaults.headers.common.Authorization = `Bearer ${token}`
    try {
      await getAdminDashboard()
      setAuthorized(true)
    } catch {
      delete api.defaults.headers.common.Authorization
      setAuthorized(false)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    validateSession()
    const onUnauthorized = () => {
      localStorage.removeItem('token')
      localStorage.removeItem('auth')
      delete api.defaults.headers.common.Authorization
      setAuthorized(false)
      setError('Sessão expirada ou inválida. Faça login novamente.')
    }
    window.addEventListener('education-admin-unauthorized', onUnauthorized)
    return () => window.removeEventListener('education-admin-unauthorized', onUnauthorized)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const emailNorm = email.trim().toLowerCase()
    const passwordNorm = password
    try {
      const { data } = await api.post('/users/login', { email: emailNorm, password: passwordNorm })
      const token = data?.token
      if (!token) throw new Error('Token inválido.')
      writeAuth(token, data?.role, data?.userId)
      await getAdminDashboard()
      setAuthorized(true)
    } catch (err) {
      const status = err?.response?.status
      if (status === 403) {
        setError(
          'Seu usuário não possui vínculo ativo no módulo Educação. '
          + 'Solicite à Secretaria de Educação um perfil válido '
          + '(education_admin, education_secretary, education_manager ou education_council).'
        )
      } else if (status === 422) {
        setError(err?.response?.data?.message || 'E-mail ou senha inválidos.')
      } else if (!err?.response) {
        setError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.')
      } else {
        setError(err?.response?.data?.message || err?.response?.data?.error || 'Falha no login.')
      }
      setAuthorized(false)
    } finally {
      setSubmitting(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('auth')
    setAuthorized(false)
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
          <div className={styles.title}>Educação — Acesso Administrativo</div>
        </header>
        <div className={styles.loginWrap}>
          <form className={styles.loginCard} onSubmit={handleLogin}>
            <h2 style={{ marginTop: 0 }}>Entrar no painel</h2>
            <p className={styles.muted}>
              Gestores, secretaria e administradores vinculados ao módulo.
            </p>
            <p className={styles.muted} style={{ fontSize: '0.85rem' }}>
              A senha diferencia maiúsculas e minúsculas. Copie e cole com cuidado se recebeu credenciais de demonstração.
            </p>
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
            <p style={{ marginTop: 16 }}>
              <Link to="/educacao">← Voltar ao portal público</Link>
            </p>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.portal}>
      <header className={styles.header}>
        <div className={styles.title}>Educação — Painel Administrativo</div>
        <div className={styles.actions}>
          <Link to="/educacao" className={styles.btn}>Portal público</Link>
          <a href="/dashboard.html" className={styles.btn}>Dashboard SEMIT</a>
          <button className={`${styles.btn} ${styles.btnPrimary}`} type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>
      <main className={styles.content}>
        <EducationAdminDashboard />
      </main>
    </div>
  )
}
