import { useState } from 'react'
import { api, CENTRAL_LOGIN_PATH, storeToken } from './api'

function formatCpf(val) {
  const digits = val.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatPhone(val) {
  const digits = val.replace(/\D/g, '').slice(0, 11)
  if (digits.length > 10) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  if (digits.length > 6) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  }
  if (digits.length > 2) {
    return digits.replace(/(\d{2})(\d{0,5})/, '($1) $2')
  }
  return digits
}

export default function Register({ onLogin, onToggleLogin }) {
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmpassword, setConfirmpassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')

    const cleanCpf = cpf.replace(/\D/g, '')
    if (cleanCpf.length !== 11) {
      setError('Informe um CPF válido com 11 dígitos.')
      return
    }

    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setError('Informe um telefone com DDD válido.')
      return
    }

    if (password !== confirmpassword) {
      setError('As senhas não coincidem.')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    if (!agreeTerms) {
      setError('Você precisa concordar com os Termos de Uso.')
      return
    }

    setBusy(true)
    try {
      // 1. Efetua o cadastro central
      await api('/api/users/register', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          cpf: cleanCpf,
          phone: cleanPhone,
          email: email.trim().toLowerCase(),
          password,
          confirmpassword,
          acceptedTermsAt: new Date().toISOString(),
          acceptedTermsVersion: '1.0',
          userType: 'Pessoa Física',
        }),
      })

      // 2. Faz login automático logo em seguida
      try {
        const loginData = await api(CENTRAL_LOGIN_PATH, {
          method: 'POST',
          body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        })
        storeToken(loginData.token)
        await onLogin()
      } catch {
        // Se precisar de login manual ou confirmação
        onToggleLogin?.()
      }
    } catch (err) {
      setError(err.message || 'Falha ao criar cadastro. Verifique os dados informados.')
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
          <p>Crie sua conta única municipal para agendar atendimentos ou acessar como servidor.</p>
        </section>

        <section className="login-form">
          <h2>Criar cadastro</h2>
          <p className="muted">Preencha seus dados para criar sua conta municipal.</p>

          <form onSubmit={submit}>
            <label>
              Nome completo
              <input
                type="text"
                autoComplete="name"
                required
                maxLength="160"
                placeholder="Ex.: Carlos Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <div className="compact-fields">
              <label>
                CPF
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                />
              </label>

              <label>
                Telefone / Celular
                <input
                  type="tel"
                  autoComplete="tel"
                  required
                  placeholder="(14) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                />
              </label>
            </div>

            <label>
              E-mail
              <input
                type="email"
                autoComplete="email"
                required
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <div className="compact-fields">
              <label>
                Senha
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
                Confirmar senha
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="Repita a senha"
                  value={confirmpassword}
                  onChange={(e) => setConfirmpassword(e.target.value)}
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '.2rem 0 .6rem' }}>
              <label className="toggle-row" style={{ margin: 0, fontSize: '.82rem' }}>
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                />
                Mostrar senha
              </label>

              <label className="toggle-row" style={{ margin: 0, fontSize: '.82rem' }}>
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                />
                Concordo com os Termos
              </label>
            </div>

            {error && <p role="alert" className="error">{error}</p>}

            <button disabled={busy}>{busy ? 'Cadastrando…' : 'Criar minha conta'}</button>
          </form>

          <nav className="login-links" aria-label="Acesso à conta">
            <button type="button" className="link-button" onClick={onToggleLogin}>
              Já tenho cadastro · <b>Fazer Login</b>
            </button>
          </nav>
        </section>
      </div>
    </main>
  )
}
