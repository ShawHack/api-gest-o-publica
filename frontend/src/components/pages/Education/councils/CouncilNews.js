import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { listNews } from '../../../../services/educationService'
import NewsCard from '../NewsCard'
import styles from '../EducationPortal.module.css'

export default function CouncilNews() {
  const { slug } = useOutletContext()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listNews({ entitySlug: slug, limit: 20 })
      .then(({ data }) => setItems(data?.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <section className={styles.council_section}>
      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Nenhuma publicação deste conselho.</div>
      ) : (
        <div className={styles.card_row}>
          {items.map((post) => (
            <NewsCard key={post._id} post={post} entitySlug={slug} />
          ))}
        </div>
      )}
    </section>
  )
}
