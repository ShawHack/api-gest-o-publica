import { useContext } from 'react'
import { Context } from '../../../context/UserContext'
import RuralNavbar from './RuralNavbar'
import styles from './RuralPortal.module.css'

export default function RuralAccessDeniedPage() {
  const auth = useContext(Context)
  return <div className={styles.appShell}>
    <RuralNavbar section="Acesso restrito" showLogout />
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <h1>Acesso não autorizado</h1>
          <p>Seu usuário está autenticado, mas não possui permissão para a área de operação das Estradas Rurais.</p>
        </header>
        <p>Solicite à SEMIT o perfil <strong>Operador de Rotas Rurais</strong> ou entre com uma conta autorizada.</p>
        <button className={styles.loginLink} type="button" onClick={() => auth?.logout?.('/rotas-rurais/login')}>Entrar com outra conta</button>
      </section>
    </main>
  </div>
}
