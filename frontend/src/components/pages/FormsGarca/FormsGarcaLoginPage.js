import { useContext, useState } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Context } from '../../../context/UserContext'
import styles from './FormsGarcaAuth.module.css'

export default function FormsGarcaLoginPage() {
  const { login } = useContext(Context)
  const location = useLocation()
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const redirectTo = location.state?.from?.pathname || '/formularios'
  const registrationMessage = location.state?.registrationMessage

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    try { await login(credentials, redirectTo) } finally { setLoading(false) }
  }

  const update = ({ target }) => setCredentials((current) => ({ ...current, [target.name]: target.value }))

  return <AuthLayout title="Formulários públicos, simples e seguros." subtitle="Acesse os formulários digitais da Prefeitura de Garça em um ambiente único e organizado.">
    <header className={styles.cardHeader}><h2>Bem-vindo</h2><p>Entre com seu e-mail e senha para acessar o Forms Garça.</p></header>
    {registrationMessage && <div className={`${styles.notice} ${styles.noticeSuccess}`} role="status">{registrationMessage}</div>}
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.field}>E-mail<input name="email" type="email" value={credentials.email} onChange={update} autoComplete="email" placeholder="nome@exemplo.com" required autoFocus /></label>
      <label className={styles.field}>Senha<span className={styles.passwordWrap}><input name="password" type={showPassword ? 'text' : 'password'} value={credentials.password} onChange={update} autoComplete="current-password" placeholder="Digite sua senha" required /><button className={styles.eyeButton} type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>
      <div className={styles.actions}><Link className={styles.helperLink} to="/forgot-password">Esqueci minha senha</Link></div>
      <button className={styles.submit} disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
    </form>
    <p className={styles.switch}>Ainda não possui conta? <Link to="/formularios/cadastro">Criar cadastro</Link></p>
    <div className={styles.security}><LockKeyhole size={14} /> Seus dados são transmitidos de forma segura.</div>
  </AuthLayout>
}

export function AuthLayout({ title, subtitle, children }) {
  return <main className={styles.page}>
    <aside className={styles.brandPanel}>
      <img className={styles.darkLogo} src="/logos/forms_fundo_escuro.png" alt="SEMIT Formulários" />
      <div className={styles.brandCopy}><span className={styles.eyebrow}>Prefeitura de Garça</span><h1>{title}</h1><p>{subtitle}</p><ul className={styles.benefits}><li><span className={styles.check}>✓</span>Envio digital, sem papelada</li><li><span className={styles.check}>✓</span>Informações centralizadas</li><li><span className={styles.check}>✓</span>Acompanhamento confiável</li></ul></div>
      <small className={styles.institutional}>Secretaria Municipal de Inovação e Tecnologia</small>
    </aside>
    <section className={styles.formPanel}><div className={styles.card}><img className={styles.lightLogo} src="/logos/forms_fundo_claro.png" alt="SEMIT Formulários" />{children}</div></section>
  </main>
}
