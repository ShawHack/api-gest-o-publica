import { useEffect, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { listLegislation } from '../../../../services/educationService'
import { LEGISLATION_LABELS, formatDate } from '../educationUtils'
import { councilBasePath } from '../councilUtils'
import styles from '../EducationPortal.module.css'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 12 }, (_, i) => CURRENT_YEAR - i)

export default function CouncilLegislation() {
  const { slug } = useOutletContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [pages, setPages] = useState(1)

  const q = searchParams.get('q') || ''
  const year = searchParams.get('year') || ''
  const category = searchParams.get('category') || ''
  const page = Number(searchParams.get('page') || 1)

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
    if (category) params.category = category

    listLegislation(params)
      .then(({ data }) => {
        setItems(data?.data || [])
        setPages(data?.pages || 1)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [slug, q, year, category, page])

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
        Legislação publicada deste conselho. Use os filtros abaixo para refinar a busca.
      </p>
      <div className={styles.doc_filters}>
        <label className={styles.field}>
          Buscar
          <input
            type="search"
            value={q}
            onChange={(e) => updateParam('q', e.target.value)}
            placeholder="Título ou número..."
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
          Categoria
          <select value={category} onChange={(e) => updateParam('category', e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(LEGISLATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando legislação...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          Nenhuma legislação publicada encontrada para este conselho.
          {q || year || category
            ? ' Tente limpar os filtros.'
            : ' Verifique no painel admin se os registros estão com status publicado.'}
        </div>
      ) : (
        <>
          <p className={styles.muted}>{items.length} registro(s) nesta página</p>
          <ul className={styles.doc_list}>
            {items.map((item) => (
              <li key={item._id}>
                <article className={styles.doc_list_item}>
                  <span className={styles.badge}>
                    {LEGISLATION_LABELS[item.category] || item.category}
                  </span>
                  <h4>
                    <Link to={`${base}/legislacao/${item._id}`}>{item.title}</Link>
                  </h4>
                  <p className={styles.muted}>
                    {item.number && `Nº ${item.number} · `}
                    {item.year || formatDate(item.publicationDate)}
                  </p>
                  {item.description && <p className={styles.muted}>{item.description}</p>}
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
