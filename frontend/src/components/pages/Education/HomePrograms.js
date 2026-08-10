import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lightbulb } from 'lucide-react'
import { listEntities, listNews } from '../../../services/educationService'
import { ENTITY_TYPE_LABELS, entityThumbnail, postThumbnail } from './educationUtils'
import styles from './EducationPortal.module.css'

function ProgramThumb({ src, alt = '' }) {
  if (src) {
    return (
      <span className={styles.program_thumb}>
        <img src={src} alt={alt} loading="lazy" />
      </span>
    )
  }

  return (
    <span className={styles.program_icon} aria-hidden>
      <Lightbulb size={20} />
    </span>
  )
}

export default function HomePrograms({ limit = 4 }) {
  const [programs, setPrograms] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      listEntities({ type: 'projeto_educacional', limit }).then(({ data }) => data?.data || []).catch(() => []),
      listNews({ type: 'projeto', limit }).then(({ data }) => data?.data || []).catch(() => []),
    ])
      .then(([entityItems, newsItems]) => {
        setPrograms(entityItems)
        setProjects(newsItems)
      })
      .finally(() => setLoading(false))
  }, [limit])

  if (loading || (programs.length === 0 && projects.length === 0)) return null

  return (
    <section className={styles.home_section}>
      <div className={styles.section_header}>
        <h2 className={styles.section_title}>Programas e projetos</h2>
        <Link to="/educacao/unidades?type=projeto_educacional" className={styles.section_link}>Ver todos</Link>
      </div>
      <div className={styles.program_grid}>
        {programs.map((item) => (
          <Link
            key={item._id}
            to={`/educacao/unidades/${item.slug}`}
            className={`${styles.program_card} ${styles.card_clickable}`}
          >
            <ProgramThumb src={entityThumbnail(item)} alt={item.name} />
            <div>
              <h3>{item.name}</h3>
              <p className={styles.muted}>{ENTITY_TYPE_LABELS[item.type] || item.type}</p>
            </div>
          </Link>
        ))}
        {projects.map((post) => (
          <Link
            key={post._id}
            to={`/educacao/noticias/${post.slug}`}
            className={`${styles.program_card} ${styles.card_clickable}`}
          >
            <ProgramThumb src={postThumbnail(post)} alt={post.title} />
            <div>
              <h3>{post.title}</h3>
              <p className={styles.muted}>Projeto · {post.educationEntityId?.name || 'Secretaria'}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
