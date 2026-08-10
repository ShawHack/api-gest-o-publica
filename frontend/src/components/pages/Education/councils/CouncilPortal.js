import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { getCouncil } from '../../../../services/educationService'
import { mediaUrl } from '../educationUtils'
import { councilBasePath, COUNCIL_NAV } from '../councilUtils'
import styles from '../EducationPortal.module.css'

export default function CouncilPortal() {
  const { slug } = useParams()
  const [council, setCouncil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    getCouncil(slug)
      .then(({ data }) => setCouncil(data?.data || null))
      .catch(() => {
        setCouncil(null)
        setError('Conselho não encontrado.')
      })
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <div className={styles.loading}>Carregando...</div>
  if (error || !council) return <div className={styles.error}>{error || 'Não encontrado.'}</div>

  const base = councilBasePath(slug)

  return (
    <div className={styles.council_portal}>
      <p><Link to="/educacao/conselhos">← Voltar para Conselhos</Link></p>

      <header className={styles.council_header}>
        {council.logoUrl && (
          <img src={mediaUrl(council.logoUrl)} alt="" className={styles.council_logo} />
        )}
        <div className={styles.council_header_body}>
          {council.councilCode && (
            <span className={styles.badge}>{council.councilCode}</span>
          )}
          <h2 className={styles.council_title}>{council.name}</h2>
          {council.description && (
            <p className={styles.council_lead}>{council.description}</p>
          )}
        </div>
        {council.coverImageUrl && (
          <figure className={styles.council_cover_frame}>
            <img src={mediaUrl(council.coverImageUrl)} alt="" className={styles.council_cover} />
          </figure>
        )}
      </header>

      <nav className={styles.council_nav} aria-label="Navegação do conselho">
        {COUNCIL_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={`${base}/${item.to}`}
            className={({ isActive }) =>
              `${styles.council_nav_link} ${isActive ? styles.council_nav_link_active : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.council_content}>
        <Outlet context={{ council, slug }} />
      </div>
    </div>
  )
}
