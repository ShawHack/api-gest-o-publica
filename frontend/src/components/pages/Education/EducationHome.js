import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  School,
  Users,
  Scale,
  Eye,
  Calendar,
  Images,
  FileText,
  ClipboardList,
  Baby,
  UtensilsCrossed,
  NotebookPen,
  Handshake,
} from 'lucide-react'
import { overview } from '../../../services/educationService'
import FeaturedCarousel from './FeaturedCarousel'
import UpcomingEvents from './UpcomingEvents'
import HomePrograms from './HomePrograms'
import HomeTransparency from './HomeTransparency'
import styles from './EducationPortal.module.css'

const QUICK_ACCESS = [
  { to: '/educacao/unidades', label: 'Unidades escolares', icon: School },
  { to: '/educacao/conselhos', label: 'Conselhos municipais', icon: Users },
  { to: '/educacao/legislacao', label: 'Legislação', icon: Scale },
  { to: '/educacao/plano-municipal-educacao', label: 'Plano Municipal da Educação', icon: ClipboardList },
  { to: '/educacao/politica-qualidade-equidade-educacao-infantil', label: 'Política de Qualidade e Equidade da Educação Infantil', icon: Baby },
  { to: '/educacao/cardapio-escolar', label: 'Cardápio Escolar', icon: UtensilsCrossed },
  { to: '/educacao/transparencia', label: 'Transparência', icon: Eye },
  { to: '/educacao/calendario', label: 'Calendário', icon: Calendar },
  { to: '/educacao/atribuicao-aulas', label: 'Atribuição de Aulas', icon: NotebookPen },
  { to: '/educacao/entidades-conveniadas', label: 'Entidades Conveniadas', icon: Handshake },
  { to: '/educacao/galerias', label: 'Galerias', icon: Images },
  { to: '/educacao/documentos', label: 'Documentos', icon: FileText },
]

export default function EducationHome() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    overview()
      .then(({ data }) => setStats(data?.data || null))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <FeaturedCarousel />

      <section className={styles.home_section}>
        <h2 className={styles.section_title}>O que você procura?</h2>
        <p className={styles.section_lead}>
          Encontre escolas, documentos e serviços da rede municipal de ensino.
        </p>
        <div className={styles.quick_access}>
          {QUICK_ACCESS.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.label} to={item.to} className={styles.quick_access_item}>
                <span className={styles.quick_access_icon} aria-hidden>
                  <Icon size={22} />
                </span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </section>

      <UpcomingEvents limit={5} showHeader />

      <HomePrograms limit={4} />

      <HomeTransparency limit={4} />

      {!loading && stats && (
        <section className={`${styles.home_section} ${styles.home_section_stats}`}>
          <h2 className={styles.section_title}>Nossa rede em números</h2>
          <div className={styles.grid_stats}>
            <Link to="/educacao/unidades" className={styles.stat_card}>
              <strong>{stats.activeEntities ?? '—'}</strong>
              <span>Unidades ativas</span>
            </Link>
            <Link to="/educacao/noticias" className={styles.stat_card}>
              <strong>{stats.publishedPosts ?? '—'}</strong>
              <span>Publicações</span>
            </Link>
            <Link to="/educacao/conselhos" className={styles.stat_card}>
              <strong>{stats.councils ?? '—'}</strong>
              <span>Conselhos</span>
            </Link>
          </div>
        </section>
      )}

      {loading && <div className={styles.loading}>Carregando...</div>}
    </>
  )
}
