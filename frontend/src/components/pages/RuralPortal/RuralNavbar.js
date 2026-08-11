import styles from './RuralPortal.module.css'

export default function RuralNavbar({ section }) {
  const assetPrefix = process.env.PUBLIC_URL || ''
  return <header className={styles.navbar}>
    <img
      className={styles.banner}
      src={`${assetPrefix}/banner-estradas.png`}
      alt="Estradas Rurais — conectando o campo, fortalecendo nossa terra — Garça/SP"
    />
    <nav className={styles.navStrip} aria-label="Navegação do módulo Estradas Rurais">
      <span className={styles.brand}>Estradas Rurais</span>
      <span className={styles.navSection}>{section}</span>
    </nav>
  </header>
}
