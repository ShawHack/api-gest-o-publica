import { useEffect, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { listDocuments, listDocumentCategories } from '../../../../services/educationService'
import {
  DOCUMENT_TYPE_LABELS,
  MEETING_TYPE_LABELS,
  councilBasePath,
} from '../councilUtils'
import { formatDate, mediaUrl } from '../educationUtils'
import styles from '../EducationPortal.module.css'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 12 }, (_, i) => CURRENT_YEAR - i)

export default function CouncilDocuments() {
  const { slug } = useOutletContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [pages, setPages] = useState(1)

  const q = searchParams.get('q') || ''
  const year = searchParams.get('year') || ''
  const documentType = searchParams.get('documentType') || ''
  const categoryId = searchParams.get('categoryId') || ''
  const page = Number(searchParams.get('page') || 1)

  useEffect(() => {
    listDocumentCategories({ entitySlug: slug })
      .then(({ data }) => setCategories(data?.data || []))
      .catch(() => setCategories([]))
  }, [slug])

  useEffect(() => {
    setLoading(true)
    const params = {
      entitySlug: slug,
      page,
      limit: 100,
      sort: 'publishedAt',
      sortDir: 'desc',
    }
    if (q.trim()) params.q = q.trim()
    if (year) params.year = year
    if (documentType) params.documentType = documentType
    if (categoryId) params.categoryId = categoryId

    listDocuments(params)
      .then(({ data }) => {
        setItems(data?.data || [])
        setPages(data?.pages || 1)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [slug, q, year, documentType, categoryId, page])

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setSearchParams(next)
  }

  const base = councilBasePath(slug)

  return (
    <section className={styles.council_section}>
      <p className={styles.muted}>
        Documentos publicados deste conselho. Use os filtros abaixo para refinar a busca.
      </p>
      <div className={styles.doc_filters}>
        <label className={styles.field}>
          Buscar
          <input
            type="search"
            value={q}
            onChange={(e) => updateParam('q', e.target.value)}
            placeholder="Título do documento..."
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
        {categories.length > 0 && (
          <label className={styles.field}>
            Categoria
            <select value={categoryId} onChange={(e) => updateParam('categoryId', e.target.value)}>
              <option value="">Todas</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando documentos...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          Nenhum documento publicado encontrado para este conselho.
          {q || year || documentType || categoryId
            ? ' Tente limpar os filtros.'
            : ' Os documentos cadastrados como rascunho no painel admin precisam ser publicados para aparecer aqui.'}
        </div>
      ) : (
        <>
          <p className={styles.muted}>{items.length} documento(s) nesta página</p>
          <ul className={styles.doc_list}>
          {items.map((doc) => (
            <li key={doc._id}>
              <article className={styles.doc_list_item}>
                <div className={styles.doc_list_meta}>
                  <span className={styles.badge}>
                    {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                  </span>
                  {doc.meetingType && (
                    <span className={styles.muted}>
                      {MEETING_TYPE_LABELS[doc.meetingType] || doc.meetingType}
                    </span>
                  )}
                  <span className={styles.muted}>
                    {formatDate(doc.publishedAt || doc.meetingDate || doc.createdAt)}
                  </span>
                  {doc.sessionNumber && (
                    <span className={styles.muted}>Sessão {doc.sessionNumber}</span>
                  )}
                </div>
                <h4>
                  <Link to={`${base}/documentos/${doc._id}`}>{doc.title}</Link>
                </h4>
                {doc.description && <p className={styles.muted}>{doc.description}</p>}
                <a
                  href={mediaUrl(doc.fileUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.section_link_inline}
                >
                  Download direto
                </a>
              </article>
            </li>
          ))}
        </ul>
        </>
      )}

      {pages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.btn}
            disabled={page <= 1}
            onClick={() => updateParam('page', String(page - 1))}
          >
            Anterior
          </button>
          <span className={styles.muted}>Página {page} de {pages}</span>
          <button
            type="button"
            className={styles.btn}
            disabled={page >= pages}
            onClick={() => updateParam('page', String(page + 1))}
          >
            Próxima
          </button>
        </div>
      )}
    </section>
  )
}
