import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listCouncils } from '../../../services/educationService'
import styles from './EducationPortal.module.css'

export default function CouncilList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    listCouncils()
      .then(({ data }) => setItems(data?.data || []))
      .catch(() => {
        setItems([])
        setError('Não foi possível carregar os conselhos municipais.')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <p>
        <Link to="/educacao">← Voltar ao início</Link>
      </p>

      <h2 className={styles.section_title}>Conselhos municipais</h2>
      <p className={styles.section_lead}>
        CME, CAE, CACS-FUNDEB e demais conselhos da educação municipal. Clique no card para acessar.
      </p>

      {loading && <div className={styles.loading}>Carregando conselhos...</div>}
      {error && !loading && <div className={styles.error}>{error}</div>}

      {!loading && !error && items.length === 0 && (
        <div className={styles.empty}>
          <p>Nenhum conselho cadastrado ainda.</p>
          <p className={styles.muted}>
            A Secretaria Municipal de Educação disponibilizará as informações em breve.
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className={styles.doc_list}>
          {items.map((item) => (
            <li key={item._id}>
              <Link
                to={`/educacao/conselhos/${item.slug}`}
                className={styles.doc_list_card}
              >
                <h4 className={styles.doc_list_card_title}>{item.name}</h4>
                {item.description && (
                  <p className={styles.muted}>{item.description}</p>
                )}
                <span className={styles.doc_list_card_action}>Acessar conselho</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}