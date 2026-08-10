import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listLegislation } from '../../../services/educationService'
import { LEGISLATION_LABELS, formatDate } from './educationUtils'
import styles from './EducationPortal.module.css'

const CATEGORY_ORDER = Object.keys(LEGISLATION_LABELS)

export default function LegislationList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [year, setYear] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  useEffect(() => {
    setLoading(true)
    const params = { page, limit: 100 }
    if (q.trim()) params.q = q.trim()
    if (category) params.category = category
    if (year) params.year = year
    listLegislation(params)
      .then(({ data }) => {
        setItems(data?.data || [])
        setPages(data?.pages || 1)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [q, category, year, page])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const item of items) {
      const key = item.category || 'outro'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    }

    const ordered = []
    for (const key of CATEGORY_ORDER) {
      if (map.has(key)) {
        ordered.push({ key, label: LEGISLATION_LABELS[key] || key, items: map.get(key) })
        map.delete(key)
      }
    }
    for (const [key, groupItems] of map.entries()) {
      ordered.push({
        key,
        label: LEGISLATION_LABELS[key] || key,
        items: groupItems,
      })
    }
    return ordered
  }, [items])

  return (
    <>
      <h2 className={styles.section_title}>Legislação educacional</h2>
      <p className={styles.section_lead}>
        Documentos organizados por categoria. Clique no card para ver os detalhes.
      </p>

      <div className={styles.filters}>
        <label className={styles.field}>
          Busca
          <input
            type="search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1) }}
            placeholder="Título ou número"
          />
        </label>
        <label className={styles.field}>
          Categoria
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }}>
            <option value="">Todas</option>
            {Object.entries(LEGISLATION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Ano
          <input
            type="number"
            min="1990"
            max="2100"
            value={year}
            onChange={(e) => { setYear(e.target.value); setPage(1) }}
            placeholder="Ex.: 2024"
          />
        </label>
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Nenhum documento encontrado.</div>
      ) : (
        <div className={styles.legislation_groups}>
          {grouped.map((group) => (
            <section key={group.key} className={styles.legislation_group}>
              <h3 className={styles.subsection_title}>
                {group.label}
                <span className={styles.muted}> ({group.items.length})</span>
              </h3>
              <ul className={styles.doc_list}>
                {group.items.map((item) => (
                  <li key={item._id}>
                    <Link
                      to={`/educacao/legislacao/${item._id}`}
                      className={styles.doc_list_card}
                    >
                      <h4 className={styles.doc_list_card_title}>{item.title}</h4>
                      <p className={styles.muted}>
                        {item.number
                          ? `Nº ${item.number}${item.year ? `/${item.year}` : ''}`
                          : null}
                        {item.number && item.publicationDate ? ' · ' : null}
                        {item.publicationDate ? formatDate(item.publicationDate) : null}
                      </p>
                      <span className={styles.doc_list_card_action}>Ver detalhes</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.btn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span className={styles.muted}>Página {page} de {pages}</span>
          <button className={styles.btn} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </button>
        </div>
      )}
    </>
  )
}
