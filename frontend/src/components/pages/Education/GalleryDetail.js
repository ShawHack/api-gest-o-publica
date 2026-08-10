import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getGallery } from '../../../services/educationService'
import { formatDate, mediaUrl } from './educationUtils'
import styles from './EducationPortal.module.css'

export default function GalleryDetail() {
  const { id } = useParams()
  const [gallery, setGallery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError('')
    getGallery(id)
      .then(({ data }) => setGallery(data?.data || null))
      .catch(() => {
        setGallery(null)
        setError('Galeria não encontrada.')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className={styles.loading}>Carregando...</div>
  if (error || !gallery) return <div className={styles.error}>{error || 'Não encontrado.'}</div>

  const items = gallery.items || []
  const active = items[activeIndex]
  const entity = gallery.educationEntityId
  const backTo = entity?.type === 'conselho' && entity?.slug
    ? `/educacao/conselhos/${entity.slug}/galerias`
    : '/educacao/galerias'

  return (
    <section className={styles.council_section}>
      <p><Link to={backTo}>← Voltar para galerias</Link></p>
      <h2 className={styles.section_title}>{gallery.title}</h2>
      {entity?.name && (
        <p className={styles.muted}>
          {entity.type === 'conselho' ? (
            <Link to={`/educacao/conselhos/${entity.slug}`}>{entity.name}</Link>
          ) : entity.name}
        </p>
      )}
      {gallery.eventDate && <p className={styles.muted}>{formatDate(gallery.eventDate)}</p>}
      {gallery.description && <p className={styles.prose}>{gallery.description}</p>}

      {items.length === 0 ? (
        <div className={styles.empty}>Esta galeria não possui imagens.</div>
      ) : (
        <>
          <div className={styles.gallery_viewer}>
            {active?.mediaUrl && (
              active.mediaType === 'video' ? (
                <video src={mediaUrl(active.mediaUrl)} controls className={styles.gallery_viewer_media} />
              ) : (
                <img
                  src={mediaUrl(active.mediaUrl)}
                  alt={active.caption || gallery.title}
                  className={styles.gallery_viewer_media}
                />
              )
            )}
            {active?.caption && <p className={styles.gallery_caption}>{active.caption}</p>}
          </div>
          {items.length > 1 && (
            <div className={styles.gallery_thumbs}>
              {items.map((item, index) => (
                <button
                  key={item._id || index}
                  type="button"
                  className={`${styles.gallery_thumb} ${index === activeIndex ? styles.gallery_thumb_active : ''}`}
                  onClick={() => setActiveIndex(index)}
                >
                  <img src={mediaUrl(item.mediaUrl)} alt="" />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
