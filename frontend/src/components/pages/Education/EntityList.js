import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listEntities } from '../../../services/educationService'
import { ENTITY_TYPE_LABELS, entityThumbnail } from './educationUtils'
import styles from './EducationPortal.module.css'

const TYPES = Object.keys(ENTITY_TYPE_LABELS).filter((t) => t !== 'conselho')

export default function EntityList() {
  const [searchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const initialType = searchParams.get('type') || ''
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState(initialType)
  const [q, setQ] = useState(initialQ)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  useEffect(() => {
    setQ(searchParams.get('q') || '')
    setType(searchParams.get('type') || '')
    setPage(1)
  }, [searchParams])

  useEffect(() => {
    setLoading(true)
    const params = { page, limit: 12 }
    if (type) params.type = type
    if (q.trim()) params.q = q.trim()
    listEntities(params)
      .then(({ data }) => {
        setItems(data?.data || [])
        setPages(data?.pages || 1)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [type, q, page])

  return (
    <>
      <h2 className={styles.section_title}>Diretório das unidades</h2>
      <div className={styles.filters}>
        <label className={styles.field}>
          Tipo
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1) }}>
            <option value="">Todos</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>{ENTITY_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Nome
          <input
            type="search"
            placeholder="Buscar..."
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1) }}
          />
        </label>
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando unidades...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Nenhuma unidade encontrada.</div>
      ) : (
        <div className={styles.card_row}>
          {items.map((item) => {
            const thumb = entityThumbnail(item)
            return (
              <Link
                key={item._id}
                to={`/educacao/unidades/${item.slug}`}
                className={`${styles.card} ${styles.card_clickable}`}
              >
                {thumb && (
                  <div className={styles.cover_frame}>
                    <img src={thumb} alt="" className={styles.cover_thumb} loading="lazy" />
                  </div>
                )}
                <div className={styles.card_body}>
                  <span className={styles.badge}>{ENTITY_TYPE_LABELS[item.type] || item.type}</span>
                  <h3 className={styles.card_title}>{item.name}</h3>
                  {item.neighborhood && (
                    <p className={styles.muted}>Bairro: {item.neighborhood}</p>
                  )}
                  {item.address && (
                    <p className={styles.card_excerpt}>{item.address}</p>
                  )}
                </div>
              </Link>
            )
          })}
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
