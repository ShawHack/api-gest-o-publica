import { Link } from 'react-router-dom'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  return <main className={styles.page}>
    <section className={styles.card}>
      <span className={styles.code}>404</span>
      <p className={styles.brand}>Sistemas SEMIT</p>
      <h1>Página não localizada</h1>
      <p>O endereço informado não existe ou foi alterado.</p>
      <Link to="/" className={styles.link}>Voltar ao início</Link>
    </section>
  </main>
}
