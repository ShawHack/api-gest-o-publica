import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listNews } from '../../../services/educationService'
import NewsCard from './NewsCard'
import styles from './EducationPortal.module.css'

export default function NewsList() {
  const [searchParams] = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [q, setQ] = useState(initialQ)

  useEffect(() => {
    setQ(searchParams.get('q') || '')
    setPage(1)
  }, [searchParams])

  useEffect(() => {
    setLoading(true)
    const params = { page, limit: 12 }
    if (q.trim()) params.q = q.trim()
    listNews(params)
      .then(({ data }) => {
        setItems(data?.data || [])
        setPages(data?.pages || 1)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [page, q])

  return (
    <>
      <h2 className={styles.section_title}>Notícias e comunicados</h2>
      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Nenhuma publicação no momento.</div>
      ) : (
        <div className={styles.card_row}>
          {items.map((item) => (
            <NewsCard key={item._id} post={item} />
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.btn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <span className={styles.muted}>Página {page} de {pages}</span>
          <button className={styles.btn} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Próxima</button>
        </div>
      )}
    </>
  )
}
