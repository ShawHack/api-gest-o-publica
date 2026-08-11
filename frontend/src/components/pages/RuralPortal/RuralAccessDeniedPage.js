import { Link } from 'react-router-dom'
import RuralNavbar from './RuralNavbar'
import styles from './RuralPortal.module.css'

export default function RuralAccessDeniedPage() {
  return <div className={styles.appShell}>
    <RuralNavbar section="Acesso restrito" showLogout />
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <h1>Acesso não autorizado</h1>
          <p>Seu usuário está autenticado, mas não possui permissão para a área de operação das Estradas Rurais.</p>
        </header>
        <p>Solicite à SEMIT o perfil <strong>Operador de Rotas Rurais</strong> ou entre com uma conta autorizada.</p>
        <Link className={styles.loginLink} to="/login" state={{ from: { pathname: '/rotas-rurais/operador' } }}>Entrar com outra conta</Link>
      </section>
    </main>
  </div>
}
