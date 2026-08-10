import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getEntity, getCouncil } from '../../../services/educationService'
import { ENTITY_TYPE_LABELS, formatDate, mediaUrl } from './educationUtils'
import NewsCard from './NewsCard'
import styles from './EducationPortal.module.css'

export default function EntityProfile({ councilMode = false }) {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    const fetcher = councilMode ? getCouncil(slug) : getEntity(slug)
    fetcher
      .then(({ data: res }) => setData(res?.data || null))
      .catch(() => {
        setData(null)
        setError('Unidade não encontrada.')
      })
      .finally(() => setLoading(false))
  }, [slug, councilMode])

  if (loading) return <div className={styles.loading}>Carregando...</div>
  if (error || !data) return <div className={styles.error}>{error || 'Não encontrado.'}</div>

  const backTo = councilMode ? '/educacao/conselhos' : '/educacao/unidades'
  const backLabel = councilMode ? 'Conselhos' : 'Unidades'

  return (
    <>
      <p><Link to={backTo}>← Voltar para {backLabel}</Link></p>

      <div className={styles.profile_header}>
        {data.coverImageUrl && (
          <figure className={styles.profile_cover_frame}>
            <img
              src={mediaUrl(data.coverImageUrl)}
              alt=""
              className={styles.profile_cover_img}
            />
          </figure>
        )}
        <div className={styles.profile_title_row}>
          {data.logoUrl && !data.coverImageUrl && (
            <img
              src={mediaUrl(data.logoUrl)}
              alt=""
              className={styles.profile_logo}
            />
          )}
          <div className={styles.profile_title_body}>
            <span className={styles.badge}>{ENTITY_TYPE_LABELS[data.type] || data.type}</span>
            <h2>{data.name}</h2>
          </div>
        </div>
        {data.description && <p>{data.description}</p>}
        <div className={styles.meta_list}>
          {data.address && <div><strong>Endereço:</strong> {data.address}</div>}
          {data.phone && <div><strong>Telefone:</strong> {data.phone}</div>}
          {data.email && <div><strong>E-mail:</strong> {data.email}</div>}
          {data.openingHours && <div><strong>Horário:</strong> {data.openingHours}</div>}
          {data.managerName && (
            <div className={styles.manager_block}>
              {data.managerPhotoUrl && (
                <img
                  src={mediaUrl(data.managerPhotoUrl)}
                  alt=""
                  className={styles.manager_photo}
                />
              )}
              <div>
                <strong>{data.managerRole || 'Diretor(a)'}:</strong> {data.managerName}
              </div>
            </div>
          )}
        </div>
      </div>

      {data.news?.length > 0 && (
        <>
          <h3 className={styles.section_title}>Notícias e comunicados</h3>
          <div className={styles.card_row}>
            {data.news.map((post) => (
              <NewsCard key={post._id} post={post} entitySlug={data.slug} />
            ))}
          </div>
        </>
      )}

      {data.projects?.length > 0 && (
        <>
          <h3 className={styles.section_title}>Projetos</h3>
          <div className={styles.card_row}>
            {data.projects.map((post) => (
              <article key={post._id} className={styles.card}>
                <h3>{post.title}</h3>
                {post.summary && <p className={styles.muted}>{post.summary}</p>}
              </article>
            ))}
          </div>
        </>
      )}

      {data.documents?.length > 0 && (
        <>
          <h3 className={styles.section_title}>Documentos públicos</h3>
          <div className={styles.card_row}>
            {data.documents.map((doc) => (
              <article key={doc._id} className={styles.card}>
                <h3>
                  <a href={mediaUrl(doc.fileUrl)} target="_blank" rel="noopener noreferrer">
                    {doc.title}
                  </a>
                </h3>
                <p className={styles.muted}>{formatDate(doc.createdAt)}</p>
              </article>
            ))}
          </div>
        </>
      )}

      {data.galleries?.length > 0 && (
        <>
          <h3 className={styles.section_title}>Galerias</h3>
          <div className={styles.card_row}>
            {data.galleries.map((g) => (
              <article key={g._id} className={styles.card}>
                <h3>{g.title}</h3>
                {g.description && <p className={styles.muted}>{g.description}</p>}
              </article>
            ))}
          </div>
        </>
      )}
    </>
  )
}
