import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getLegislation } from '../../../services/educationService'
import { LEGISLATION_LABELS, formatDate, mediaUrl } from './educationUtils'
import styles from './EducationPortal.module.css'

export default function LegislationDetail() {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    getLegislation(id)
      .then(({ data }) => setItem(data?.data || null))
      .catch(() => {
        setItem(null)
        setError('Legislação não encontrada.')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className={styles.loading}>Carregando...</div>
  if (error || !item) return <div className={styles.error}>{error || 'Não encontrado.'}</div>

  const entity = item.educationEntityId
  const backTo = entity?.type === 'conselho' && entity?.slug
    ? `/educacao/conselhos/${entity.slug}/legislacao`
    : '/educacao/legislacao'

  return (
    <section className={styles.council_section}>
      <p><Link to={backTo}>← Voltar para legislação</Link></p>
      <span className={styles.badge}>
        {LEGISLATION_LABELS[item.category] || item.category}
      </span>
      <h2 className={styles.section_title}>{item.title}</h2>
      <div className={styles.meta_list}>
        {item.number && (
          <div><strong>Número:</strong> {item.number}{item.year ? `/${item.year}` : ''}</div>
        )}
        {!item.number && item.year && (
          <div><strong>Ano:</strong> {item.year}</div>
        )}
        {item.publicationDate && (
          <div><strong>Publicação:</strong> {formatDate(item.publicationDate)}</div>
        )}
        {entity?.name && (
          <div>
            <strong>Conselho:</strong>{' '}
            {entity.type === 'conselho' && entity.slug ? (
              <Link to={`/educacao/conselhos/${entity.slug}`}>{entity.name}</Link>
            ) : entity.name}
          </div>
        )}
      </div>
      {item.description && <p className={styles.prose}>{item.description}</p>}
      <a
        href={mediaUrl(item.fileUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className={`${styles.btn} ${styles.btn_primary}`}
      >
        Abrir documento (PDF)
      </a>
    </section>
  )
}
