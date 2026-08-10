import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listGalleries } from '../../../services/educationService'
import { formatDate, mediaUrl } from './educationUtils'
import styles from './EducationPortal.module.css'

function GalleryMosaic({ items }) {
  return (
    <div className={styles.gallery_mosaic}>
      {items.map((g) => {
        const thumb = g.items?.[0]?.mediaUrl ? mediaUrl(g.items[0].mediaUrl) : ''
        const entity = g.educationEntityId
        const to = entity?.type === 'conselho' && entity?.slug
          ? `/educacao/conselhos/${entity.slug}/galerias/${g._id}`
          : `/educacao/galerias/${g._id}`
        return (
          <Link
            key={g._id}
            to={to}
            className={styles.gallery_tile}
          >
            {thumb ? (
              <img src={thumb} alt="" className={styles.gallery_tile_img} loading="lazy" />
            ) : (
              <div className={styles.gallery_tile_placeholder} />
            )}
            <div className={styles.gallery_tile_overlay}>
              <h3>{g.title}</h3>
              {g.educationEntityId?.name && (
                <p>{g.educationEntityId.name}</p>
              )}
              {g.eventDate && <p>{formatDate(g.eventDate)}</p>}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export default function HomeGalleries({ limit = 3, showHeader = false }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listGalleries({ limit })
      .then(({ data }) => setItems(data?.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [limit])

  if (loading || items.length === 0) return null

  const content = <GalleryMosaic items={items} />

  if (!showHeader) return content

  return (
    <section className={styles.home_section}>
      <div className={styles.section_header}>
        <h2 className={styles.section_title}>Galerias em destaque</h2>
        <Link to="/educacao/galerias" className={styles.section_link}>Ver todas</Link>
      </div>
      {content}
    </section>
  )
}
