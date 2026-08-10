import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listCouncils } from '../../../services/educationService'
import { entityThumbnail } from './educationUtils'
import styles from './EducationPortal.module.css'

export default function CouncilList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listCouncils()
      .then(({ data }) => setItems(data?.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <h2 className={styles.section_title}>Conselhos municipais</h2>
      <p className={styles.muted}>
        CME, CAE, CACS-FUNDEB e demais conselhos da educação municipal.
      </p>
      {loading ? (
        <div className={styles.loading}>Carregando conselhos...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Nenhum conselho cadastrado.</div>
      ) : (
        <div className={styles.card_row}>
          {items.map((item) => {
            const thumb = entityThumbnail(item)
            return (
              <Link
                key={item._id}
                to={`/educacao/conselhos/${item.slug}`}
                className={`${styles.card} ${styles.card_clickable}`}
              >
                {thumb && (
                  <div className={styles.cover_frame}>
                    <img src={thumb} alt="" className={styles.cover_thumb} loading="lazy" />
                  </div>
                )}
                <div className={styles.card_body}>
                  <span className={styles.badge}>{item.councilCode || 'Conselho'}</span>
                  <h3 className={styles.card_title}>{item.name}</h3>
                  {item.description && (
                    <p className={styles.card_excerpt}>{item.description}</p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
