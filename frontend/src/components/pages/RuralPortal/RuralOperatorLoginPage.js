import { useContext, useState } from 'react'
import { Context } from '../../../context/UserContext'
import RuralNavbar from './RuralNavbar'
import styles from './RuralPortal.module.css'

export default function RuralOperatorLoginPage() {
  const { login } = useContext(Context)
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    try { await login(credentials, '/rotas-rurais/operador') }
    finally { setLoading(false) }
  }

  const update = ({ target }) => setCredentials((current) => ({ ...current, [target.name]: target.value }))

  return <div className={styles.appShell}>
    <RuralNavbar section="Acesso do operador" />
    <main className={styles.loginPage}>
      <section className={styles.loginCard}>
        <header className={styles.header}>
          <h1>Entrar em Estradas Rurais</h1>
          <p>Acesso exclusivo para operadores autorizados da Casa da Agricultura e administradores.</p>
        </header>
        <form className={styles.form} onSubmit={submit}>
          <label className={styles.field}>E-mail<input name="email" type="email" value={credentials.email} onChange={update} autoComplete="email" required /></label>
          <label className={styles.field}>Senha<input name="password" type="password" value={credentials.password} onChange={update} autoComplete="current-password" required /></label>
          <button className={styles.button} disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
        </form>
      </section>
    </main>
  </div>
}
