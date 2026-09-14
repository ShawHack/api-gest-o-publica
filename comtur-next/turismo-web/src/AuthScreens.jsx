import { useEffect, useRef, useState } from 'react'
import { href, portalName } from './catalog.js'
import {
  clearSession, fetchCurrentUser, getUserInitials, isManager,
  loginWithEmail, maskCpf, maskPhone, readRefreshToken, readUser, registerAccount, userAvatarUrl
} from './auth.js'

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm8 7 8-5H4l8 5Zm0 2-8-5v7h16v-7l-8 5Z" /></svg>
  )
}
function IconLock() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M17 9h-1V7a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V7Zm3 8.7V19h-2v-3.3a2 2 0 1 1 2 0Z" /></svg>
  )
}

function IconChevronDown() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style={{ transition: 'transform 0.2s ease' }}><path fill="currentColor" d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" /></svg>
  )
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4Zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8Z" /></svg>
  )
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="m17 7-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5ZM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5Z" /></svg>
  )
}

export default function AuthScreens({ mode, branding, onNavigate }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [phone, setPhone] = useState('')
  const [confirm, setConfirm] = useState('')
  const [agree, setAgree] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const title = portalName(branding)
  const panelImage = branding.heroImageUrl || branding.logoUrl || ''

  useEffect(() => {
    setError('')
    setMessage('')
    setFieldErrors({})
  }, [mode])

  async function onLogin(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await loginWithEmail(email, password)
      setMessage('Acesso confirmado. Redirecionando…')
      const user = { role: data.role, nome: data.name, image: data?.image || data?.photo || data?.user?.image }
      window.setTimeout(() => {
        if (isManager(user)) window.location.href = '/comtur-admin.html'
        else onNavigate('')
      }, 700)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function onRegister(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    setFieldErrors({})
    try {
      const data = await registerAccount({
        name, cpf, phone, email, password, confirmpassword: confirm,
      }, agree)
      setMessage(data.message || 'Cadastro realizado. Verifique seu e-mail e entre com a mesma conta dos serviços municipais.')
      window.setTimeout(() => onNavigate('entrar'), 2200)
    } catch (err) {
      if (err.errors) {
        setFieldErrors(err.errors)
        setError(err.message)
      } else {
        setError(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden="true">
        <span className="auth-blob a" />
        <span className="auth-blob b" />
        <span className="auth-blob c" />
      </div>
      <a className="auth-back" href={href('')} onClick={(event) => { event.preventDefault(); onNavigate('') }}>Voltar ao portal</a>
      <div className={`auth-card ${mode === 'register' ? 'is-register' : ''}`}>
        <aside className="auth-visual" style={panelImage ? { backgroundImage: `url(${panelImage})` } : undefined}>
          <div>
            {branding.logoUrl ? <img src={branding.logoUrl} alt="" /> : null}
            <small>{branding.organizationName || 'Prefeitura Municipal de Garça'}</small>
            <strong>{title}</strong>
            <p>Uma conta municipal. O mesmo acesso da Cultura, da Agenda e dos demais serviços da Prefeitura.</p>
          </div>
        </aside>
        <section className="auth-form">
          {mode === 'login' ? (
            <>
              <h2>Entrar</h2>
              <p className="auth-lead">Use seu e-mail cadastrado nos serviços municipais.</p>
              {message ? <p className="auth-alert is-ok" role="status">{message}</p> : null}
              {error ? <p className="auth-alert is-error" role="alert">{error}</p> : null}
              <form onSubmit={onLogin}>
                <label className="auth-field">
                  <span>E-mail</span>
                  <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" placeholder="nome@exemplo.com" />
                  <IconMail />
                </label>
                <label className="auth-field">
                  <span>Senha</span>
                  <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Sua senha" />
                  <button type="button" className="auth-eye" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Ocultar' : 'Mostrar'}</button>
                  <IconLock />
                </label>
                <button className="auth-submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
              </form>
              <p className="auth-links">
                <a href={href('cadastro')} onClick={(event) => { event.preventDefault(); onNavigate('cadastro') }}>Criar conta</a>
                <a href="/login.html">Recuperar senha</a>
              </p>
            </>
          ) : (
            <>
              <h2>Cadastro</h2>
              <p className="auth-lead">Crie seu acesso único aos serviços digitais da Prefeitura de Garça.</p>
              {message ? <p className="auth-alert is-ok" role="status">{message}</p> : null}
              {error ? <p className="auth-alert is-error" role="alert">{error}</p> : null}
              <form className="auth-grid" onSubmit={onRegister}>
                <label className="auth-field span-2">
                  <span>Nome completo</span>
                  <input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Seu nome" />
                  {fieldErrors.name ? <em>{fieldErrors.name}</em> : null}
                </label>
                <label className="auth-field">
                  <span>CPF</span>
                  <input required value={cpf} onChange={(event) => setCpf(maskCpf(event.target.value))} maxLength={14} placeholder="000.000.000-00" />
                  {fieldErrors.cpf ? <em>{fieldErrors.cpf}</em> : null}
                </label>
                <label className="auth-field">
                  <span>Telefone</span>
                  <input required value={phone} onChange={(event) => setPhone(maskPhone(event.target.value))} maxLength={15} placeholder="(14) 99999-9999" />
                  {fieldErrors.phone ? <em>{fieldErrors.phone}</em> : null}
                </label>
                <label className="auth-field span-2">
                  <span>E-mail</span>
                  <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="nome@exemplo.com" />
                  <IconMail />
                  {fieldErrors.email ? <em>{fieldErrors.email}</em> : null}
                </label>
                <label className="auth-field">
                  <span>Senha</span>
                  <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="Mínimo 6 caracteres" />
                  <button type="button" className="auth-eye" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Ocultar' : 'Mostrar'}</button>
                  {fieldErrors.password ? <em>{fieldErrors.password}</em> : null}
                </label>
                <label className="auth-field">
                  <span>Confirmar senha</span>
                  <input type={showConfirm ? 'text' : 'password'} required value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" placeholder="Repita a senha" />
                  <button type="button" className="auth-eye" onClick={() => setShowConfirm((value) => !value)}>{showConfirm ? 'Ocultar' : 'Mostrar'}</button>
                  {fieldErrors.confirmpassword ? <em>{fieldErrors.confirmpassword}</em> : null}
                </label>
                <label className="auth-terms span-2">
                  <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} />
                  <span>Li e concordo com os termos de uso dos serviços digitais da Prefeitura de Garça. A conta é única para Cultura, Turismo e demais módulos.</span>
                </label>
                {fieldErrors.agreeTerms ? <em className="span-2">{fieldErrors.agreeTerms}</em> : null}
                <button className="auth-submit span-2" disabled={busy}>{busy ? 'Cadastrando…' : 'Cadastrar'}</button>
              </form>
              <p className="auth-links">
                Já possui conta? <a href={href('entrar')} onClick={(event) => { event.preventDefault(); onNavigate('entrar') }}>Faça login</a>
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export function AccountMenu({ onNavigate }) {
  const [user, setUser] = useState(() => readUser())
  const [open, setOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    fetchCurrentUser().then((u) => {
      if (u) {
        setUser(u)
        setImgError(false)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setImgError(false)
  }, [user?.image, user?.photo])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!user?.email && !user?.nome) {
    return (
      <div className="account-links">
        <a href={href('entrar')} onClick={(event) => { event.preventDefault(); onNavigate('entrar') }}>Entrar</a>
        <a className="account-cta" href={href('cadastro')} onClick={(event) => { event.preventDefault(); onNavigate('cadastro') }}>Cadastro</a>
      </div>
    )
  }

  const avatarSrc = userAvatarUrl(user)
  const initials = getUserInitials(user.nome || user.name || user.email)
  const displayName = user.nome || user.name || user.email?.split('@')[0] || 'Minha Conta'
  const manager = isManager(user)
  const roleLabel = manager ? 'Gestor COMTUR' : 'Cidadão'

  return (
    <div className="account-menu-container" ref={menuRef}>
      <button
        type="button"
        className={`account-btn ${open ? 'is-active' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        title={user.nome || user.email}
      >
        <div className="account-avatar-wrap">
          {avatarSrc && !imgError ? (
            <img
              src={avatarSrc}
              alt=""
              className="account-avatar"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="account-avatar-fallback">{initials}</span>
          )}
        </div>
        <span className="account-btn-name">{displayName}</span>
        <span className={`account-chevron ${open ? 'is-rotated' : ''}`}><IconChevronDown /></span>
      </button>

      {open && (
        <div className="account-dropdown" role="menu">
          <div className="account-dropdown-header">
            <div className="account-dropdown-avatar">
              {avatarSrc && !imgError ? (
                <img src={avatarSrc} alt="" className="account-avatar-lg" />
              ) : (
                <span className="account-avatar-fallback-lg">{initials}</span>
              )}
            </div>
            <div className="account-dropdown-info">
              <strong className="account-dropdown-name">{user.nome || user.name || displayName}</strong>
              <span className="account-dropdown-email">{user.email}</span>
              <span className={`account-role-badge ${manager ? 'is-manager' : ''}`}>{roleLabel}</span>
            </div>
          </div>

          <div className="account-dropdown-divider" />

          <div className="account-dropdown-items">
            {manager && (
              <>
                <a className="account-dropdown-item is-highlight" href="/comtur-admin.html">
                  <IconShield />
                  <span>Painel de Gestão COMTUR</span>
                </a>
                <a className="account-dropdown-item" href="/comtur-meetings-admin.html">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
                  <span>Reuniões e Documentos</span>
                </a>
                <a className="account-dropdown-item" href="/comtur-content-admin.html">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                  <span>Notícias e Conteúdo</span>
                </a>
                <div className="account-dropdown-divider" />
              </>
            )}

            <a
              className="account-dropdown-item"
              href={href('comtur')}
              onClick={(event) => {
                event.preventDefault()
                setOpen(false)
                onNavigate('comtur')
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
              <span>Conselho COMTUR</span>
            </a>

            <div className="account-dropdown-divider" />

            <button
              type="button"
              className="account-dropdown-item is-logout"
              onClick={async () => {
                setOpen(false)
                try {
                  const refresh = readRefreshToken()
                  if (refresh) {
                    fetch('/api/users/logout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ refreshToken: refresh }),
                    }).catch(() => {})
                  }
                } catch {}
                clearSession()
                setUser(null)
                onNavigate('')
                window.location.reload()
              }}
            >
              <IconLogout />
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
