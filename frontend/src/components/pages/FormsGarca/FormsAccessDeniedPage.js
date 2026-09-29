import { useContext } from 'react'
import { Context as UserContext } from '../../../context/UserContext'
import styles from './FormsGarcaPortal.module.css'
import { ShieldAlert } from 'lucide-react'

export default function FormsAccessDeniedPage() {
  const ctx = useContext(UserContext) || {}
  let auth = {}
  try {
    auth = JSON.parse(localStorage.getItem('auth') || '{}') || {}
  } catch {
    auth = {}
  }
  const isAuthenticated = ctx.authenticated || Boolean(ctx.token || auth?.token)
  const userName = ctx.user?.name || auth.name || ''

  return (
    <div className={styles.shell}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Prefeitura de Garça</span>
          <h1>Forms Garça</h1>
          <p>Módulo de Gestão de Formulários e Inscrições</p>
        </div>
      </header>
      <main className={styles.content}>
        <div className={styles.editor} style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center', padding: '36px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <ShieldAlert size={56} color="#e11d48" />
          </div>
          <h2 style={{ margin: '0 0 10px', color: '#0f172a' }}>Acesso Restrito ao Forms Garça</h2>
          {isAuthenticated ? (
            <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: '1.5', margin: '0 0 24px' }}>
              Olá <strong>{userName || 'usuário'}</strong>. Sua conta está conectada, mas não possui permissão de <strong>Administrador</strong> para gerenciar formulários e inscrições.
            </p>
          ) : (
            <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: '1.5', margin: '0 0 24px' }}>
              Esta área é destinada aos administradores da Prefeitura de Garça. Para acessar o painel de formulários e gerenciar inscrições, faça login com uma conta administrativa.
            </p>
          )}
          <div className={styles.actions} style={{ justifyContent: 'center', gap: '12px' }}>
            <button
              className={styles.primary}
              type="button"
              onClick={() => {
                if (ctx?.logout) ctx.logout('/formularios/login')
                else {
                  localStorage.removeItem('token')
                  localStorage.removeItem('auth')
                  window.location.href = '/formularios/login'
                }
              }}
            >
              Entrar com conta de Administrador
            </button>
            <button
              className={styles.secondary}
              type="button"
              onClick={() => {
                window.location.href = '/dashboard'
              }}
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
