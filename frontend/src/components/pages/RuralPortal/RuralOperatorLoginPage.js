import { useContext, useState } from 'react'
import { Context } from '../../../context/UserContext'
import { registerRuralOperator } from '../../../services/ruralPortalService'
import RuralNavbar from './RuralNavbar'
import styles from './RuralPortal.module.css'

const TERMS_URL = 'https://docs.google.com/document/d/1zhhrT0VLFMh_mUFs5ydWIfh2elEvRMUE3tkeaWzv0Rk/view'
const initialRegistration = { name: '', email: '', phone: '', cpf: '', password: '', agreeTerms: false }

export default function RuralOperatorLoginPage() {
  const { login } = useContext(Context)
  const [mode, setMode] = useState('login')
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [registration, setRegistration] = useState(initialRegistration)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function submitLogin(event) {
    event.preventDefault(); setLoading(true); setError('')
    try { await login(credentials, '/rotas-rurais/operador') }
    finally { setLoading(false) }
  }

  async function submitRegistration(event) {
    event.preventDefault(); setLoading(true); setError(''); setMessage('')
    try {
      const { agreeTerms, ...fields } = registration
      const result = await registerRuralOperator({ ...fields, acceptedTermsAt: new Date().toISOString(), acceptedTermsVersion: '2.0' })
      setMessage(result.message); setRegistration(initialRegistration)
    } catch (requestError) { setError(requestError?.response?.data?.message || 'Não foi possível realizar o cadastro.') }
    finally { setLoading(false) }
  }

  const updateCredentials = ({ target }) => setCredentials((current) => ({ ...current, [target.name]: target.value }))
  const updateRegistration = ({ target }) => setRegistration((current) => ({ ...current, [target.name]: target.type === 'checkbox' ? target.checked : target.value }))
  const changeMode = (nextMode) => { setMode(nextMode); setError(''); setMessage('') }

  return <div className={styles.appShell}>
    <RuralNavbar section={mode === 'login' ? 'Acesso do operador' : 'Cadastro de usuário'} />
    <main className={styles.loginPage}><section className={styles.loginCard}>
      {mode === 'login' ? <>
        <header className={styles.header}><h1>Entrar em Estradas Rurais</h1><p>Acesso para operadores autorizados e administradores.</p></header>
        <form className={styles.form} onSubmit={submitLogin}>
          <Field label="E-mail" name="email" type="email" value={credentials.email} onChange={updateCredentials} autoComplete="email" />
          <Field label="Senha" name="password" type="password" value={credentials.password} onChange={updateCredentials} autoComplete="current-password" />
          <button className={styles.button} disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
        </form>
        <button className={styles.buttonSecondary} type="button" onClick={() => changeMode('register')}>Cadastre-se</button>
      </> : <>
        <header className={styles.header}><h1>Cadastro em Estradas Rurais</h1><p>Crie sua conta e confirme o link enviado ao seu e-mail. Depois, o acesso operacional será liberado por um administrador.</p></header>
        <form className={styles.form} onSubmit={submitRegistration}>
          <Field label="Nome completo" name="name" value={registration.name} onChange={updateRegistration} />
          <Field label="E-mail" name="email" type="email" value={registration.email} onChange={updateRegistration} />
          <Field label="Telefone" name="phone" value={registration.phone} onChange={updateRegistration} />
          <Field label="CPF" name="cpf" value={registration.cpf} onChange={updateRegistration} />
          <Field label="Senha" name="password" type="password" value={registration.password} onChange={updateRegistration} />
          <small>A senha deve conter maiúscula, minúscula, número e caractere especial.</small>
          <label className={styles.termsAcceptance}><input name="agreeTerms" type="checkbox" checked={registration.agreeTerms} onChange={updateRegistration} required /> <span>Li e concordo com os <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">Termos de Uso</a>.</span></label>
          <button className={styles.button} disabled={loading}>{loading ? 'Cadastrando…' : 'Cadastrar'}</button>
        </form>
        <button className={styles.buttonSecondary} type="button" onClick={() => changeMode('login')}>Voltar para entrar</button>
      </>}
      {error && <div role="alert" className={styles.error}>{error}</div>}{message && <div role="status" className={styles.success}>{message}</div>}
    </section></main>
  </div>
}

function Field({ label, ...props }) { return <label className={styles.field}>{label}<input {...props} required /></label> }
