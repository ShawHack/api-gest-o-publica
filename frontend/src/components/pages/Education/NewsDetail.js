import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getNews } from '../../../services/educationService'
import { POST_TYPE_LABELS, formatDate, mediaUrl, postThumbnail, POST_ATTACHMENT_TYPE_LABELS } from './educationUtils'
import styles from './EducationPortal.module.css'

export default function NewsDetail() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const entitySlug = searchParams.get('entitySlug')
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = entitySlug ? { entitySlug } : {}
    getNews(slug, params)
      .then(({ data }) => setPost(data?.data || null))
      .catch(() => setPost(null))
      .finally(() => setLoading(false))
  }, [slug, entitySlug])

  if (loading) return <div className={styles.loading}>Carregando...</div>
  if (!post) return <div className={styles.error}>Publicação não encontrada.</div>

  const showYoutube = post.featuredMediaType === 'youtube' && post.embedUrl
  const showCoverImage = !showYoutube && post.coverImageUrl

  return (
    <>
      <p><Link to="/educacao/noticias">← Voltar para notícias</Link></p>
      <article className={styles.article}>
        {showYoutube && (
          <div className={styles.video_embed}>
            <iframe
              src={post.embedUrl}
              title={post.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        )}
        {showCoverImage && (
          <figure className={styles.cover_hero_frame}>
            <img
              src={mediaUrl(post.coverImageUrl)}
              alt=""
              className={styles.cover_hero}
            />
          </figure>
        )}
        <span className={styles.badge}>{POST_TYPE_LABELS[post.type] || post.type}</span>
        <h1>{post.title}</h1>
        <p className={styles.muted}>
          {formatDate(post.publishedAt)}
          {post.educationEntityId?.name && ` · ${post.educationEntityId.name}`}
          {post.authorName && ` · ${post.authorName}`}
        </p>
        {post.sourceUrl && (
          <p className={styles.muted}>
            <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer">Link complementar</a>
          </p>
        )}
        {post.summary && <p className={styles.article_lead}>{post.summary}</p>}
        {post.content ? (
          <div className={styles.article_content}>{post.content}</div>
        ) : (
          <p className={styles.muted}>Esta publicação não possui texto completo.</p>
        )}
        {post.attachments?.length > 0 && (
          <section className={styles.article_attachments}>
            <h2 className={styles.article_attachments_title}>Documentos para download</h2>
            <ul className={styles.article_attachments_list}>
              {post.attachments.map((doc, index) => (
                <li key={doc.fileUrl || index} className={styles.article_attachment_item}>
                  <a
                    href={mediaUrl(doc.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.article_attachment_link}
                  >
                    {doc.title || doc.originalName || 'Documento PDF'}
                  </a>
                  <div className={styles.article_attachment_meta}>
                    {doc.documentType && (
                      <span className={styles.badge}>
                        {POST_ATTACHMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                      </span>
                    )}
                    {doc.documentDate && (
                      <span className={styles.muted}>{formatDate(doc.documentDate)}</span>
                    )}
                  </div>
                  {doc.description && (
                    <p className={styles.muted}>{doc.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </>
  )
}
