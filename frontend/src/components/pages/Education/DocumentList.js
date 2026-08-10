import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listDocuments } from '../../../services/educationService'
import { DOCUMENT_TYPE_LABELS } from './councilUtils'
import { formatDate, mediaUrl } from './educationUtils'
import styles from './EducationPortal.module.css'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 12 }, (_, i) => CURRENT_YEAR - i)

export default function DocumentList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const q = searchParams.get('q') || ''
  const year = searchParams.get('year') || ''
  const documentType = searchParams.get('documentType') || ''
  const page = Number(searchParams.get('page') || 1)
  const [pages, setPages] = useState(1)

  useEffect(() => {
    setLoading(true)
    const params = { page, limit: 20, sort: 'publishedAt', sortDir: 'desc' }
    if (q.trim()) params.q = q.trim()
    if (year) params.year = year
    if (documentType) params.documentType = documentType

    listDocuments(params)
      .then(({ data }) => {
        setItems(data?.data || [])
        setPages(data?.pages || 1)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [q, year, documentType, page])

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setSearchParams(next)
  }

  return (
    <>
      <h2 className={styles.section_title}>Documentos públicos</h2>
      <div className={styles.doc_filters}>
        <label className={styles.field}>
          Busca
          <input
            type="search"
            value={q}
            onChange={(e) => updateParam('q', e.target.value)}
            placeholder="Título..."
          />
        </label>
        <label className={styles.field}>
          Ano
          <select value={year} onChange={(e) => updateParam('year', e.target.value)}>
            <option value="">Todos</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Tipo
          <select value={documentType} onChange={(e) => updateParam('documentType', e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Nenhum documento encontrado.</div>
      ) : (
        <ul className={styles.doc_list}>
          {items.map((doc) => (
            <li key={doc._id}>
              <article className={styles.doc_list_item}>
                <div className={styles.doc_list_meta}>
                  <span className={styles.badge}>
                    {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                  </span>
                  <span className={styles.muted}>
                    {formatDate(doc.publishedAt || doc.createdAt)}
                  </span>
                </div>
                <h4>
                  <a href={mediaUrl(doc.fileUrl)} target="_blank" rel="noopener noreferrer">{doc.title}</a>
                </h4>
                {doc.educationEntityId?.name && (
                  <p className={styles.muted}>
                    {doc.educationEntityId.type === 'conselho' ? (
                      <Link to={`/educacao/conselhos/${doc.educationEntityId.slug}`}>
                        {doc.educationEntityId.name}
                      </Link>
                    ) : doc.educationEntityId.name}
                  </p>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.btn} disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))}>Anterior</button>
          <span className={styles.muted}>Página {page} de {pages}</span>
          <button className={styles.btn} disabled={page >= pages} onClick={() => updateParam('page', String(page + 1))}>Próxima</button>
        </div>
      )}
    </>
  )
}
