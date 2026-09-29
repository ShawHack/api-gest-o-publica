import { useContext, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { Context } from '../../../context/UserContext'
import api from '../../../utils/api'
import styles from './FormsLoginPage.module.css'

const TERMS_URL = 'https://docs.google.com/document/d/1zhhrT0VLFMh_mUFs5ydWIfh2elEvRMUE3tkeaWzv0Rk/view'

const EMPTY_REG = {
  name: '',
  email: '',
  phone: '',
  cpf: '',
  password: '',
  confirmpassword: '',
  agreeTerms: false,
}

function maskCPF(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function maskPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

function isValidCPF(cpf) {
  const clean = String(cpf).replace(/\D/g, '')
  if (clean.length !== 11 || /^(\d)\1{10}$/.test(clean)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i), 10) * (10 - i)
  let rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(clean.charAt(9), 10)) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i), 10) * (11 - i)
  rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  return rev === parseInt(clean.charAt(10), 10)
}

export default function FormsLoginPage() {
  const { login } = useContext(Context)
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [registration, setRegistration] = useState(EMPTY_REG)
  const [showPass, setShowPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  /* Password strength indicators */
  const strength = useMemo(() => {
    const p = mode === 'register' ? registration.password : ''
    return {
      upper: /[A-Z]/.test(p),
      lower: /[a-z]/.test(p),
      number: /[0-9]/.test(p),
      special: /[^A-Za-z0-9]/.test(p),
      length: p.length >= 6,
    }
  }, [registration.password, mode])

  /* Login */
  async function submitLogin(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await login(credentials, '/formularios')
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao fazer login. Verifique suas credenciais.')
    } finally {
      setLoading(false)
    }
  }

  /* Register */
  async function submitRegister(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const nameTrim = registration.name.trim()
    const emailTrim = registration.email.trim().toLowerCase()
    const rawCpf = registration.cpf.replace(/\D/g, '')
    const rawPhone = registration.phone.replace(/\D/g, '')

    if (!nameTrim) {
      setError('Preencha seu nome completo.')
      setLoading(false)
      return
    }
    if (!emailTrim || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setError('Informe um e-mail válido.')
      setLoading(false)
      return
    }
    if (!rawPhone || rawPhone.length < 10) {
      setError('Informe um telefone válido com DDD.')
      setLoading(false)
      return
    }
    if (!rawCpf || rawCpf.length !== 11 || !isValidCPF(rawCpf)) {
      setError('CPF inválido. Verifique os números digitados.')
      setLoading(false)
      return
    }
    if (!strength.length || !strength.upper || !strength.lower || !strength.number || !strength.special) {
      setError('A senha deve ter no mínimo 6 caracteres, incluindo maiúscula, minúscula, número e caractere especial.')
      setLoading(false)
      return
    }
    if (registration.password !== registration.confirmpassword) {
      setError('As senhas não conferem.')
      setLoading(false)
      return
    }
    if (!registration.agreeTerms) {
      setError('Você precisa concordar com os Termos de Uso.')
      setLoading(false)
      return
    }

    try {
      const payload = {
        name: nameTrim,
        email: emailTrim,
        phone: rawPhone,
        cpf: rawCpf,
        password: registration.password,
        confirmpassword: registration.confirmpassword,
        agreeTerms: true,
        acceptedTermsAt: new Date().toISOString(),
        acceptedTermsVersion: '2.0',
        acceptedTermsUrl: TERMS_URL,
        client: 'formularios',
      }
      const { data } = await api.post('/users/register', payload)
      setMessage(data?.message || 'Cadastro realizado com sucesso! Enviamos um link de confirmação para o seu e-mail.')
      setRegistration(EMPTY_REG)
    } catch (err) {
      setError(err?.response?.data?.message || 'Não foi possível realizar o cadastro. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const updateCred = ({ target }) => setCredentials(c => ({ ...c, [target.name]: target.value }))
  
  const updateReg = ({ target }) => {
    let val = target.type === 'checkbox' ? target.checked : target.value
    if (target.name === 'cpf') val = maskCPF(val)
    if (target.name === 'phone') val = maskPhone(val)
    setRegistration(r => ({ ...r, [target.name]: val }))
  }

  const changeMode = (m) => {
    setMode(m)
    setError('')
    setMessage('')
  }

  return (
    <div className={styles.shell}>
      {/* Top bar */}
      <header className={styles.topBar}>
        <Link to="/formularios" className={styles.logoLink}>
          <img
            src="/logos/forms_fundo_escuro.png"
            alt="Forms Garça - Prefeitura de Garça"
            className={styles.brandLogoImg}
          />
        </Link>
        <Link to="/dashboard" className={styles.backLink}>
          Ir para a Dashboard
        </Link>
      </header>

      {/* Main Container */}
      <div className={styles.pageBody}>
        {/* Left Hero */}
        <div className={styles.heroSide}>
          <h1 className={styles.heroTitle}>
            Prefeitura Municipal de Garça
          </h1>
        </div>

        {/* Right Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardLogoWrap}>
              <img
                src="/logos/forms_fundo_escuro.png"
                alt="Forms Garça"
                className={styles.cardLogoImg}
              />
            </div>
            <h2 className={styles.cardTitle}>
              {mode === 'login' ? 'Bem-vindo de volta' : 'Criar nova conta'}
            </h2>
            <p className={styles.cardSubtitle}>
              {mode === 'login'
                ? 'Insira suas credenciais para gerenciar seus formulários'
                : 'Preencha seus dados para solicitar acesso ao Forms Garça'}
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className={styles.modeTabs}>
            <button
              className={mode === 'login' ? styles.modeTabActive : styles.modeTab}
              onClick={() => changeMode('login')}
              type="button"
            >
              Entrar
            </button>
            <button
              className={mode === 'register' ? styles.modeTabActive : styles.modeTab}
              onClick={() => changeMode('register')}
              type="button"
            >
              Cadastrar
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className={styles.alertError} role="alert">
              <AlertCircle size={18} style={{ minWidth: 18, marginTop: 2 }} />
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className={styles.alertSuccess} role="status">
              <CheckCircle2 size={18} style={{ minWidth: 18, marginTop: 2 }} />
              <div>
                <strong>Sucesso!</strong> {message}
                {mode === 'register' && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => changeMode('login')}
                      style={{ background: 'none', border: 'none', color: '#16a34a', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                    >
                      Clique aqui para ir para a tela de login
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form className={styles.form} onSubmit={submitLogin} noValidate>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>E-mail</span>
                <input
                  className={styles.fieldInput}
                  type="email"
                  name="email"
                  value={credentials.email}
                  onChange={updateCred}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Senha</span>
                <div className={styles.passwordWrap}>
                  <input
                    className={styles.fieldInput}
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    value={credentials.password}
                    onChange={updateCred}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className={styles.toggleEye}
                    aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowPass(v => !v)}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <div className={styles.forgotLink}>
                <Link to="/auth/forgot-password">Esqueci minha senha</Link>
              </div>

              <button className={styles.btnPrimary} disabled={loading} type="submit">
                {loading && <span className={styles.spinner} />}
                {loading ? 'Entrando…' : 'Entrar no Forms Garça'}
              </button>

              <div className={styles.switchText}>
                Não tem uma conta?{' '}
                <button type="button" onClick={() => changeMode('register')}>
                  Cadastre-se gratuitamente
                </button>
              </div>
            </form>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <form className={styles.form} onSubmit={submitRegister} noValidate>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Nome completo</span>
                <input
                  className={styles.fieldInput}
                  type="text"
                  name="name"
                  value={registration.name}
                  onChange={updateReg}
                  placeholder="Seu nome completo"
                  autoComplete="name"
                  required
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>E-mail</span>
                <input
                  className={styles.fieldInput}
                  type="email"
                  name="email"
                  value={registration.email}
                  onChange={updateReg}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Telefone / WhatsApp</span>
                <input
                  className={styles.fieldInput}
                  type="tel"
                  name="phone"
                  value={registration.phone}
                  onChange={updateReg}
                  placeholder="(14) 99999-9999"
                  autoComplete="tel"
                  required
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>CPF</span>
                <input
                  className={styles.fieldInput}
                  type="text"
                  name="cpf"
                  value={registration.cpf}
                  onChange={updateReg}
                  placeholder="000.000.000-00"
                  autoComplete="off"
                  maxLength={14}
                  required
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Senha</span>
                <div className={styles.passwordWrap}>
                  <input
                    className={styles.fieldInput}
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    value={registration.password}
                    onChange={updateReg}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className={styles.toggleEye}
                    aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowPass(v => !v)}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              {/* Password strength hints */}
              <div className={styles.passwordHint}>
                <span className={strength.length ? styles.hintPillOk : styles.hintPill}>6+ chars</span>
                <span className={strength.upper ? styles.hintPillOk : styles.hintPill}>Maiúscula (A-Z)</span>
                <span className={strength.lower ? styles.hintPillOk : styles.hintPill}>Minúscula (a-z)</span>
                <span className={strength.number ? styles.hintPillOk : styles.hintPill}>Número (0-9)</span>
                <span className={strength.special ? styles.hintPillOk : styles.hintPill}>Especial (!@#$)</span>
              </div>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Confirmar senha</span>
                <div className={styles.passwordWrap}>
                  <input
                    className={styles.fieldInput}
                    type={showConfirmPass ? 'text' : 'password'}
                    name="confirmpassword"
                    value={registration.confirmpassword}
                    onChange={updateReg}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className={styles.toggleEye}
                    aria-label={showConfirmPass ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowConfirmPass(v => !v)}
                  >
                    {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              {/* Terms of use */}
              <label className={styles.termsRow}>
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={registration.agreeTerms}
                  onChange={updateReg}
                  required
                />
                <span>
                  Li e concordo com os{' '}
                  <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">
                    Termos de Uso
                  </a>.
                </span>
              </label>

              <button className={styles.btnPrimary} disabled={loading} type="submit">
                {loading && <span className={styles.spinner} />}
                {loading ? 'Criando conta…' : 'Criar minha conta'}
              </button>

              <div className={styles.switchText}>
                Já tem uma conta cadastrada?{' '}
                <button type="button" onClick={() => changeMode('login')}>
                  Faça login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        &copy; {new Date().getFullYear()} Prefeitura do Município de Garça — Secretaria Municipal de Informação e Tecnologia (SEMIT)
      </footer>
    </div>
  )
}
