import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../../../utils/api'
import RuralNavbar from './RuralNavbar'
import styles from './RuralPortal.module.css'

export default function RuralVerifyEmailPage() {
  const { search } = useLocation()
  const [state, setState] = useState({ loading: true, success: false, message: 'Validando seu e-mail…' })

  useEffect(() => {
    const params = new URLSearchParams(search)
    const token = params.get('token')
    const email = params.get('email')
    if (!token || !email) {
      setState({ loading: false, success: false, message: 'Link de validação inválido ou incompleto.' })
      return
    }
    api.get('/users/verify-email', { params: { token, email } })
      .then(({ data }) => setState({ loading: false, success: true, message: data?.message || 'E-mail verificado com sucesso.' }))
      .catch((error) => setState({ loading: false, success: false, message: error?.response?.data?.message || 'Não foi possível verificar o e-mail.' }))
  }, [search])

  return <div className={styles.appShell}>
    <RuralNavbar section="Validação de e-mail" />
    <main className={styles.loginPage}><section className={styles.loginCard}>
      <header className={styles.header}><h1>Validação de e-mail</h1><p>{state.loading ? 'Aguarde enquanto confirmamos seu cadastro.' : state.message}</p></header>
      {!state.loading && state.success && <div className={styles.success}>E-mail confirmado. Sua solicitação aguarda a permissão de um administrador.</div>}
      {!state.loading && !state.success && <div role="alert" className={styles.error}>{state.message}</div>}
      {!state.loading && <Link className={styles.loginLink} to="/rotas-rurais/login">Ir para o login de Estradas Rurais</Link>}
    </section></main>
  </div>
}
