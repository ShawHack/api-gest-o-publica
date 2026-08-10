import { Link } from 'react-router-dom'
import { POST_TYPE_LABELS, formatDate, postThumbnail } from './educationUtils'
import styles from './EducationPortal.module.css'

export default function NewsCard({ post, entitySlug, variant = 'default' }) {
  if (!post?.slug) return null

  const to = entitySlug
    ? `/educacao/noticias/${post.slug}?entitySlug=${encodeURIComponent(entitySlug)}`
    : `/educacao/noticias/${post.slug}`

  const thumb = postThumbnail(post)

  const cardClass = [
    styles.card,
    styles.card_clickable,
    variant === 'featured' ? styles.card_featured : '',
    variant === 'compact' ? styles.card_compact : '',
  ].filter(Boolean).join(' ')

  return (
    <Link to={to} className={cardClass}>
      {thumb && (
        <div className={styles.cover_frame}>
          <img src={thumb} alt="" className={styles.cover_thumb} loading="lazy" />
        </div>
      )}
      <div className={styles.card_body}>
        <span className={styles.badge}>
          {POST_TYPE_LABELS[post.type] || post.type}
          {post.featuredMediaType === 'youtube' ? ' · Vídeo' : ''}
        </span>
        <h3 className={styles.card_title}>{post.title}</h3>
        <p className={styles.muted}>{formatDate(post.publishedAt)}</p>
        {post.educationEntityId?.name && variant !== 'compact' && (
          <p className={styles.muted}>{post.educationEntityId.name}</p>
        )}
        {post.summary && variant !== 'compact' && (
          <p className={styles.card_excerpt}>{post.summary}</p>
        )}
        {variant !== 'compact' && (
          <span className={styles.read_more}>Ler matéria completa →</span>
        )}
      </div>
    </Link>
  )
}
