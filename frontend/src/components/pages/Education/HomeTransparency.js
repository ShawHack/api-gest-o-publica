import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listTransparency } from '../../../services/educationService'
import { formatDate, mediaUrl } from './educationUtils'
import styles from './EducationPortal.module.css'

const CATEGORY_LABELS = {
  prestacao_contas: 'Prestação de contas',
  aplicacao_recursos: 'Aplicação de recursos',
  fundeb: 'FUNDEB',
  alimentacao_escolar: 'Alimentação escolar',
  relatorio_institucional: 'Relatório institucional',
  indicador_educacional: 'Indicadores',
  documento_publico: 'Documento público',
}

export default function HomeTransparency({ limit = 4 }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listTransparency({ limit })
      .then(({ data }) => setItems(data?.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [limit])

  if (loading || items.length === 0) return null

  return (
    <section className={styles.home_section}>
      <div className={styles.section_header}>
        <h2 className={styles.section_title}>Transparência e prestação de contas</h2>
        <Link to="/educacao/transparencia" className={styles.section_link}>Ver todos</Link>
      </div>
      <ul className={styles.doc_list}>
        {items.map((item) => (
          <li key={item._id}>
            <article className={styles.doc_list_item}>
              <span className={styles.badge}>
                {CATEGORY_LABELS[item.category] || item.category}
              </span>
              <h4>
                <a href={mediaUrl(item.fileUrl)} target="_blank" rel="noopener noreferrer">{item.title}</a>
              </h4>
              <p className={styles.muted}>{formatDate(item.publishedAt || item.createdAt)}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
