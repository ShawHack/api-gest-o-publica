import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPartnerEntities } from '../../../services/educationService'
import { entityThumbnail, mediaUrl } from './educationUtils'
import { getUnitImagePath } from './admin/entityUnitFormUtils'
import { excerpt } from './partnerEntityUtils'
import styles from './EducationPortal.module.css'

function partnerThumbnail(item) {
  const path = getUnitImagePath(item)
  return path ? mediaUrl(path) : entityThumbnail(item)
}

export default function PartnerEntityList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  useEffect(() => {
    setLoading(true)
    const params = { page, limit: 12 }
    if (q.trim()) params.q = q.trim()
    listPartnerEntities(params)
      .then(({ data }) => {
        setItems(data?.data || [])
        setPages(data?.pages || 1)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [q, page])

  return (
    <>
      <h2 className={styles.section_title}>Entidades Conveniadas</h2>
      <p className={styles.muted}>
        Instituições parceiras e entidades conveniadas à Secretaria Municipal de Educação.
      </p>

      <div className={styles.filters}>
        <label className={styles.field}>
          Buscar
          <input
            type="search"
            placeholder="Nome ou descrição..."
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1) }}
          />
        </label>
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando entidades...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Nenhuma entidade conveniada encontrada.</div>
      ) : (
        <div className={styles.card_row}>
          {items.map((item) => {
            const thumb = partnerThumbnail(item)
            return (
              <article key={item._id} className={styles.card}>
                {thumb && (
                  <div className={styles.cover_frame}>
                    <img src={thumb} alt="" className={styles.cover_thumb} loading="lazy" />
                  </div>
                )}
                <div className={styles.card_body}>
                  {item.logoUrl && (
                    <img
                      src={mediaUrl(item.logoUrl)}
                      alt=""
                      style={{ maxHeight: 40, marginBottom: '0.5rem' }}
                    />
                  )}
                  <h3 className={styles.card_title}>{item.name}</h3>
                  {item.description && (
                    <p className={styles.card_excerpt}>{excerpt(item.description)}</p>
                  )}
                  <Link
                    to={`/educacao/entidades-conveniadas/${item.slug}`}
                    className={styles.btn_primary}
                    style={{ marginTop: '0.75rem', display: 'inline-block', textDecoration: 'none' }}
                  >
                    Saiba mais
                  </Link>
                </div>
              </article>
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
