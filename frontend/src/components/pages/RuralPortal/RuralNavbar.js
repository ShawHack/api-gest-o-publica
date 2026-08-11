import { useContext } from 'react'
import { Context } from '../../../context/UserContext'
import styles from './RuralPortal.module.css'

export default function RuralNavbar({ section, showLogout = false }) {
  const auth = useContext(Context)
  const assetPrefix = process.env.PUBLIC_URL || ''
  return <header className={styles.navbar}>
    <img
      className={styles.banner}
      src={`${assetPrefix}/banner-estradas.png`}
      alt="Estradas Rurais — conectando o campo, fortalecendo nossa terra — Garça/SP"
    />
    <nav className={styles.navStrip} aria-label="Navegação do módulo Estradas Rurais">
      <span className={styles.brand}>Estradas Rurais</span>
      <span className={styles.navActions}>{section !== 'Mapa dos bairros' && <a className={styles.navLink} href="/rotas-rurais/mapa">Mapa dos bairros</a>}<span className={styles.navSection}>{section}</span>{showLogout && <button type="button" className={styles.logoutButton} onClick={() => auth?.logout?.('/rotas-rurais/login')}>Sair</button>}</span>
    </nav>
  </header>
}
