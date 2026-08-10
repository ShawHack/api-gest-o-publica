import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { listGalleries } from '../../../../services/educationService'
import { formatDate, mediaUrl } from '../educationUtils'
import styles from '../EducationPortal.module.css'

export default function CouncilGalleries() {
  const { slug } = useOutletContext()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listGalleries({ entitySlug: slug, limit: 20 })
      .then(({ data }) => setItems(data?.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <section className={styles.council_section}>
      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Nenhuma galeria deste conselho.</div>
      ) : (
        <div className={styles.card_row}>
          {items.map((g) => (
            <Link
              key={g._id}
              to={`/educacao/conselhos/${slug}/galerias/${g._id}`}
              className={`${styles.card} ${styles.card_clickable}`}
            >
              {g.items?.[0]?.mediaUrl && (
                <div className={`${styles.cover_frame} ${styles.cover_frame_inset}`}>
                  <img src={mediaUrl(g.items[0].mediaUrl)} alt="" className={styles.cover_thumb} />
                </div>
              )}
              <h3>{g.title}</h3>
              {g.eventDate && <p className={styles.muted}>{formatDate(g.eventDate)}</p>}
              {g.description && <p>{g.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
