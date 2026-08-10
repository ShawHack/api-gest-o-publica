import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { searchEducation } from '../../../services/educationService'
import NewsCard from './NewsCard'
import { DOCUMENT_TYPE_LABELS } from './councilUtils'
import { ENTITY_TYPE_LABELS, LEGISLATION_LABELS, mediaUrl } from './educationUtils'
import styles from './EducationPortal.module.css'

const TYPE_FILTERS = [
  { id: 'all', label: 'Tudo' },
  { id: 'entities', label: 'Unidades' },
  { id: 'news', label: 'Notícias' },
  { id: 'documents', label: 'Documentos' },
  { id: 'legislation', label: 'Legislação' },
  { id: 'galleries', label: 'Galerias' },
]

function docLink(doc) {
  const entity = doc.educationEntityId
  if (entity?.type === 'conselho' && entity?.slug) {
    return `/educacao/conselhos/${entity.slug}/documentos/${doc._id}`
  }
  return mediaUrl(doc.fileUrl)
}

function legislationLink(item) {
  const entity = item.educationEntityId
  if (entity?.type === 'conselho' && entity?.slug) {
    return `/educacao/conselhos/${entity.slug}/legislacao/${item._id}`
  }
  return `/educacao/legislacao/${item._id}`
}

function galleryLink(g) {
  const entity = g.educationEntityId
  if (entity?.type === 'conselho' && entity?.slug) {
    return `/educacao/conselhos/${entity.slug}/galerias/${g._id}`
  }
  return `/educacao/galerias/${g._id}`
}

export default function EducationSearchResults() {
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') || '').trim()
  const type = params.get('type') || 'all'
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!q) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    searchEducation({ q, type, limit: 12 })
      .then(({ data }) => setResults(data?.data || {}))
      .catch(() => setResults({}))
      .finally(() => setLoading(false))
  }, [q, type])

  const entities = results?.entities || []
  const news = results?.news || []
  const documents = results?.documents || []
  const legislation = results?.legislation || []
  const galleries = results?.galleries || []
  const total = entities.length + news.length + documents.length + legislation.length + galleries.length

  function setTypeFilter(next) {
    const nextParams = new URLSearchParams(params)
    if (next === 'all') nextParams.delete('type')
    else nextParams.set('type', next)
    setParams(nextParams)
  }

  return (
    <>
      <h2 className={styles.section_title}>Busca</h2>
      {!q ? (
        <p className={styles.section_lead}>Digite um termo na barra de busca do portal.</p>
      ) : (
        <>
          <div className={styles.search_filters}>
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`${styles.filter_chip} ${type === f.id ? styles.filter_chip_active : ''}`}
                onClick={() => setTypeFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          {loading ? (
            <div className={styles.loading}>Buscando...</div>
          ) : total === 0 ? (
            <div className={styles.empty}>Nenhum resultado para &ldquo;{q}&rdquo;.</div>
          ) : (
            <>
              {documents.length > 0 && (
                <section className={styles.home_section}>
                  <h3 className={styles.subsection_title}>Documentos</h3>
                  <ul className={styles.doc_list}>
                    {documents.map((doc) => (
                      <li key={doc._id}>
                        <article className={styles.doc_list_item}>
                          <span className={styles.badge}>
                            {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                          </span>
                          <h4>
                            {doc.educationEntityId?.type === 'conselho' ? (
                              <Link to={docLink(doc)}>{doc.title}</Link>
                            ) : (
                              <a href={docLink(doc)} target="_blank" rel="noopener noreferrer">{doc.title}</a>
                            )}
                          </h4>
                          {doc.educationEntityId?.name && (
                            <p className={styles.muted}>{doc.educationEntityId.name}</p>
                          )}
                        </article>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {legislation.length > 0 && (
                <section className={styles.home_section}>
                  <h3 className={styles.subsection_title}>Legislação</h3>
                  <ul className={styles.doc_list}>
                    {legislation.map((item) => (
                      <li key={item._id}>
                        <article className={styles.doc_list_item}>
                          <span className={styles.badge}>
                            {LEGISLATION_LABELS[item.category] || item.category}
                          </span>
                          <h4><Link to={legislationLink(item)}>{item.title}</Link></h4>
                        </article>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {galleries.length > 0 && (
                <section className={styles.home_section}>
                  <h3 className={styles.subsection_title}>Galerias</h3>
                  <div className={styles.card_row}>
                    {galleries.map((g) => (
                      <Link key={g._id} to={galleryLink(g)} className={`${styles.card} ${styles.card_clickable}`}>
                        <h3>{g.title}</h3>
                        {g.educationEntityId?.name && (
                          <p className={styles.muted}>{g.educationEntityId.name}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {entities.length > 0 && (
                <section className={styles.home_section}>
                  <h3 className={styles.subsection_title}>Unidades e conselhos</h3>
                  <ul className={styles.search_results_list}>
                    {entities.map((entity) => (
                      <li key={entity._id}>
                        <Link
                          to={entity.type === 'conselho'
                            ? `/educacao/conselhos/${entity.slug}`
                            : `/educacao/unidades/${entity.slug}`}
                          className={styles.search_result_link}
                        >
                          <strong>{entity.name}</strong>
                          <span className={styles.muted}>
                            {ENTITY_TYPE_LABELS[entity.type] || entity.type}
                            {entity.neighborhood ? ` · ${entity.neighborhood}` : ''}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {news.length > 0 && (
                <section className={styles.home_section}>
                  <h3 className={styles.subsection_title}>Notícias e comunicados</h3>
                  <div className={styles.card_row}>
                    {news.map((post) => (
                      <NewsCard key={post._id} post={post} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}
