import { useState, useEffect } from 'react'
import { api } from './api'

export function ForgotPassword({ onToggleLogin }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)

    try {
      await api('/api/users/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          client: 'agenda',
        }),
      })
      setSent(true)
    } catch (err) {
      setError(err.message || 'Erro ao solicitar redefinição de senha.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login">
      <div className="login-shell">
        <section className="login-brand">
          <img src="./logos/logo_agenda_fundoescuro.png" alt="Agenda Garça" className="brand-logo-hero" />
          <p className="eyebrow" style={{ marginTop: '1rem' }}>Prefeitura de Garça</p>
          <p>Recuperação de acesso à sua conta única dos serviços municipais.</p>
        </section>

        <section className="login-form">
          <h2>Recuperar senha</h2>
          <p className="muted">
            {sent
              ? 'Verifique as instruções enviadas para o seu e-mail.'
              : 'Informe o e-mail cadastrado na sua conta municipal.'}
          </p>

          {sent ? (
            <div style={{ marginTop: '1.2rem' }}>
              <div
                style={{
                  background: '#ecfdf5',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                  padding: '1rem',
                  borderRadius: '.6rem',
                  fontSize: '.92rem',
                  lineHeight: 1.5,
                  marginBottom: '1.2rem',
                }}
              >
                ✅ <b>Instruções enviadas!</b> Se o e-mail <b>{email}</b> estiver cadastrado, você receberá um link válido por 1 hora para cadastrar sua nova senha.
              </div>
              <button
                type="button"
                className="dark"
                style={{ width: '100%', padding: '.75rem', borderRadius: '.6rem', fontWeight: 700 }}
                onClick={onToggleLogin}
              >
                Voltar para o Login
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <label>
                E-mail da conta
                <input
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              {error && <p role="alert" className="error">{error}</p>}

              <button disabled={busy}>
                {busy ? 'Enviando instruções…' : 'Enviar link de recuperação'}
              </button>

              <nav className="login-links" aria-label="Acesso à conta" style={{ marginTop: '1rem' }}>
                <button type="button" className="link-button" onClick={onToggleLogin}>
                  ← Voltar para o Login
                </button>
              </nav>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}

export function ResetPassword({ onDone }) {
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmpassword, setConfirmpassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // 1. Tentar ler da hash (#/redefinir-senha?token=...&email=...)
    let t = ''
    let em = ''
    if (typeof window !== 'undefined') {
      const hashStr = window.location.hash || ''
      const qIndex = hashStr.indexOf('?')
      if (qIndex >= 0) {
        const params = new URLSearchParams(hashStr.slice(qIndex))
        t = params.get('token') || ''
        em = params.get('email') || ''
      }
      // 2. Tentar ler da query string normal (?token=...&email=...)
      if (!t || !em) {
        const searchParams = new URLSearchParams(window.location.search)
        if (!t) t = searchParams.get('token') || ''
        if (!em) em = searchParams.get('email') || ''
      }
    }
    setToken(t)
    setEmail(em)
  }, [])

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (password !== confirmpassword) {
      setError('As senhas digitadas não conferem.')
      return
    }

    if (password.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.')
      return
    }

    setBusy(true)
    try {
      await api('/api/users/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          email: email.trim().toLowerCase(),
          password,
          confirmpassword,
        }),
      })
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Token inválido ou expirado. Solicite uma nova recuperação.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login">
      <div className="login-shell">
        <section className="login-brand">
          <img src="./logos/logo_agenda_fundoescuro.png" alt="Agenda Garça" className="brand-logo-hero" />
          <p className="eyebrow" style={{ marginTop: '1rem' }}>Prefeitura de Garça</p>
          <p>Crie uma nova senha segura para sua conta municipal.</p>
        </section>

        <section className="login-form">
          <h2>Redefinir senha</h2>
          <p className="muted">
            {success ? 'Sua senha foi redefinida com sucesso!' : `Conta: ${email || 'Confirme sua nova senha'}`}
          </p>

          {success ? (
            <div style={{ marginTop: '1.2rem' }}>
              <div
                style={{
                  background: '#ecfdf5',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                  padding: '1rem',
                  borderRadius: '.6rem',
                  fontSize: '.92rem',
                  lineHeight: 1.5,
                  marginBottom: '1.2rem',
                }}
              >
                🎉 <b>Senha alterada com sucesso!</b> Você já pode acessar a plataforma utilizando a sua nova senha.
              </div>
              <button
                type="button"
                className="dark"
                style={{ width: '100%', padding: '.75rem', borderRadius: '.6rem', fontWeight: 700 }}
                onClick={onDone}
              >
                Entrar com a nova senha
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              {!token && (
                <div
                  style={{
                    background: '#fff1f2',
                    color: '#be123c',
                    border: '1px solid #fecdd3',
                    padding: '.75rem',
                    borderRadius: '.5rem',
                    fontSize: '.85rem',
                    marginBottom: '1rem',
                  }}
                >
                  ⚠️ Token de recuperação não identificado no link. Caso tenha expirado, solicite uma nova recuperação.
                </div>
              )}

              <label>
                Nova Senha
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              <label>
                Confirmar Nova Senha
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="Repita a nova senha"
                  value={confirmpassword}
                  onChange={(e) => setConfirmpassword(e.target.value)}
                />
              </label>

              <div style={{ margin: '.2rem 0 .6rem' }}>
                <label className="toggle-row" style={{ fontSize: '.82rem' }}>
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  Mostrar senha
                </label>
              </div>

              {error && <p role="alert" className="error">{error}</p>}

              <button disabled={busy || !token}>
                {busy ? 'Salvando nova senha…' : 'Salvar nova senha'}
              </button>

              <nav className="login-links" aria-label="Acesso à conta" style={{ marginTop: '1rem' }}>
                <button type="button" className="link-button" onClick={onDone}>
                  ← Cancelar e voltar ao Login
                </button>
              </nav>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
