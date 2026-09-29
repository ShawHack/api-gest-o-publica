import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ClipboardList, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import api from '../../../utils/api'
import styles from './FormsLoginPage.module.css'

export default function FormsVerifyEmailPage() {
  const { search } = useLocation()
  const [state, setState] = useState({
    loading: true,
    success: false,
    message: 'Validando seu e-mail…',
  })

  useEffect(() => {
    const params = new URLSearchParams(search)
    const token = params.get('token')
    const email = params.get('email')

    if (!token || !email) {
      setState({
        loading: false,
        success: false,
        message: 'Link de confirmação inválido ou incompleto. Verifique o link recebido no seu e-mail.',
      })
      return
    }

    api.get('/users/verify-email', { params: { token, email } })
      .then(({ data }) => {
        setState({
          loading: false,
          success: true,
          message: data?.message || 'E-mail verificado com sucesso! Sua conta agora está ativa.',
        })
      })
      .catch((error) => {
        setState({
          loading: false,
          success: false,
          message: error?.response?.data?.message || 'Não foi possível verificar seu e-mail ou o link expirou.',
        })
      })
  }, [search])

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
      </header>

      {/* Main Container */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div className={styles.card} style={{ maxWidth: '520px', width: '100%', textAlign: 'center' }}>
          <div className={styles.cardLogoWrap}>
            <img
              src="/logos/forms_fundo_escuro.png"
              alt="Forms Garça"
              className={styles.cardLogoImg}
            />
          </div>
          {state.loading && (
            <div style={{ padding: '30px 10px' }}>
              <Loader2 size={48} className={styles.spinner} style={{ margin: '0 auto 20px', borderColor: '#6366f1', borderTopColor: 'transparent', width: 44, height: 44 }} />
              <h2 className={styles.cardTitle}>Verificando E-mail</h2>
              <p className={styles.cardSubtitle}>Aguarde um instante enquanto confirmamos seu endereço de e-mail…</p>
            </div>
          )}

          {!state.loading && state.success && (
            <div style={{ padding: '20px 10px' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', display: 'grid', placeItems: 'center', margin: '0 auto 18px', color: '#22c55e' }}>
                <CheckCircle2 size={36} />
              </div>
              <h2 className={styles.cardTitle} style={{ color: '#22c55e' }}>E-mail Confirmado!</h2>
              <p className={styles.cardSubtitle} style={{ marginTop: 8, marginBottom: 28, fontSize: '0.95rem', color: '#cbd5e1' }}>
                {state.message}
              </p>
              <Link to="/formularios/login" className={styles.btnPrimary} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span>Acessar Forms Garça</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          )}

          {!state.loading && !state.success && (
            <div style={{ padding: '20px 10px' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'grid', placeItems: 'center', margin: '0 auto 18px', color: '#ef4444' }}>
                <AlertCircle size={36} />
              </div>
              <h2 className={styles.cardTitle} style={{ color: '#ef4444' }}>Falha na Confirmação</h2>
              <p className={styles.cardSubtitle} style={{ marginTop: 8, marginBottom: 28, fontSize: '0.95rem', color: '#cbd5e1' }}>
                {state.message}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Link to="/formularios/login" className={styles.btnPrimary} style={{ textDecoration: 'none' }}>
                  Ir para a tela de Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        &copy; {new Date().getFullYear()} Prefeitura do Município de Garça — SEMIT
      </footer>
    </div>
  )
}
