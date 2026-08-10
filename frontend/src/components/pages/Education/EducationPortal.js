import { useEffect, useState } from 'react'
import { NavLink, Routes, Route, Outlet, Link, Navigate } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { listEntities } from '../../../services/educationService'
import styles from './EducationPortal.module.css'
import EducationHome from './EducationHome'
import EntityList from './EntityList'
import EntityProfile from './EntityProfile'
import NewsList from './NewsList'
import NewsDetail from './NewsDetail'
import CouncilList from './CouncilList'
import LegislationList from './LegislationList'
import LegislationDetail from './LegislationDetail'
import TransparencyList from './TransparencyList'
import CalendarView from './CalendarView'
import LessonAssignmentView from './LessonAssignmentView'
import PartnerEntityList from './PartnerEntityList'
import PartnerEntityProfile from './PartnerEntityProfile'
import GalleryList from './GalleryList'
import GalleryDetail from './GalleryDetail'
import DocumentList from './DocumentList'
import PlanoMunicipalEducacao from './PlanoMunicipalEducacao'
import PoliticaQualidadeEquidadeEducacaoInfantil from './PoliticaQualidadeEquidadeEducacaoInfantil'
import CardapioEscolar from './CardapioEscolar'
import EducationSearch from './EducationSearch'
import EducationSearchResults from './EducationSearchResults'
import CouncilPortal from './councils/CouncilPortal'
import CouncilAbout from './councils/CouncilAbout'
import CouncilMembers from './councils/CouncilMembers'
import CouncilDocuments from './councils/CouncilDocuments'
import CouncilDocumentDetail from './councils/CouncilDocumentDetail'
import CouncilMeetings from './councils/CouncilMeetings'
import CouncilNews from './councils/CouncilNews'
import CouncilGalleries from './councils/CouncilGalleries'
import CouncilLegislation from './councils/CouncilLegislation'
import CouncilTransparency from './councils/CouncilTransparency'

const NAV_GROUPS = [
  {
    items: [{ to: '/educacao', label: 'Início', end: true }],
  },
  {
    label: 'Rede',
    items: [
      { to: '/educacao/unidades', label: 'Unidades' },
      { to: '/educacao/conselhos', label: 'Conselhos' },
    ],
  },
  {
    label: 'Conteúdo',
    items: [
      { to: '/educacao/noticias', label: 'Notícias' },
      { to: '/educacao/calendario', label: 'Calendário' },
      { to: '/educacao/galerias', label: 'Galerias' },
      { to: '/educacao/documentos', label: 'Documentos' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { to: '/educacao/legislacao', label: 'Legislação' },
      { to: '/educacao/transparencia', label: 'Transparência' },
    ],
  },
]

const FOOTER_LINKS = [
  { to: '/educacao/unidades', label: 'Unidades escolares' },
  { to: '/educacao/noticias', label: 'Notícias' },
  { to: '/educacao/calendario', label: 'Calendário' },
  { to: '/educacao/legislacao', label: 'Legislação' },
  { to: '/educacao/transparencia', label: 'Transparência' },
  { to: '/educacao/documentos', label: 'Documentos' },
]

function EducationFooter() {
  const [secretaria, setSecretaria] = useState(null)

  useEffect(() => {
    listEntities({ type: 'secretaria', limit: 1 })
      .then(({ data }) => setSecretaria(data?.data?.[0] || null))
      .catch(() => setSecretaria(null))
  }, [])

  return (
    <footer className={styles.footer}>
      <div className={styles.footer_grid}>
        <div className={styles.footer_col}>
          <h3 className={styles.footer_title}>Secretaria Municipal de Educação</h3>
          <p className={styles.footer_text}>
            {secretaria?.description ||
              'Portal oficial da rede municipal de ensino de Garça — informações, notícias e serviços à comunidade escolar.'}
          </p>
        </div>
        <div className={styles.footer_col}>
          <h3 className={styles.footer_title}>Acesso rápido</h3>
          <ul className={styles.footer_links}>
            {FOOTER_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.footer_col}>
          <h3 className={styles.footer_title}>Contato</h3>
          {secretaria?.address && (
            <p className={styles.footer_text}>{secretaria.address}</p>
          )}
          {secretaria?.phone && (
            <p className={styles.footer_text}>
              <a href={`tel:${secretaria.phone.replace(/\D/g, '')}`}>{secretaria.phone}</a>
            </p>
          )}
          {secretaria?.email && (
            <p className={styles.footer_text}>
              <a href={`mailto:${secretaria.email}`}>{secretaria.email}</a>
            </p>
          )}
          {secretaria?.openingHours && (
            <p className={styles.footer_text}>{secretaria.openingHours}</p>
          )}
          {!secretaria?.phone && !secretaria?.email && (
            <p className={styles.footer_text}>
              Prefeitura Municipal de Garça — SP
            </p>
          )}
        </div>
      </div>
      <div className={styles.footer_bottom}>
        © {new Date().getFullYear()} Prefeitura de Garça ·{' '}
        <Link to="/educacao/admin">Área administrativa</Link>
      </div>
    </footer>
  )
}

function Layout() {
  return (
    <>
      <main className={styles.main}>
        <Outlet />
      </main>
      <EducationFooter />
    </>
  )
}

export default function EducationPortal() {
  return (
    <div className={styles.page}>
      <nav className={styles.navbar}>
        <div className={styles.navbar_inner}>
          <div className={styles.navbar_top}>
            <Link to="/educacao" className={styles.navbar_brand}>
              <div className={styles.navbar_logo}>
                <GraduationCap size={26} />
              </div>
              <div>
                <h1>Portal da Educação</h1>
                <span>Prefeitura de Garça</span>
              </div>
            </Link>
            <EducationSearch />
          </div>
          <div className={styles.nav_links}>
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.label || `group-${gi}`} className={styles.nav_group}>
                {gi > 0 && <span className={styles.nav_group_sep} aria-hidden />}
                {group.label && (
                  <span className={styles.nav_group_label}>{group.label}</span>
                )}
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `${styles.nav_link} ${isActive ? styles.nav_link_active : ''}`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </div>
        </div>
      </nav>

      <Routes>
        <Route element={<Layout />}>
          <Route index element={<EducationHome />} />
          <Route path="busca" element={<EducationSearchResults />} />
          <Route path="unidades" element={<EntityList />} />
          <Route path="unidades/:slug" element={<EntityProfile />} />
          <Route path="noticias" element={<NewsList />} />
          <Route path="noticias/:slug" element={<NewsDetail />} />
          <Route path="conselhos" element={<CouncilList />} />
          <Route path="conselhos/:slug" element={<CouncilPortal />}>
            <Route index element={<Navigate to="sobre" replace />} />
            <Route path="sobre" element={<CouncilAbout />} />
            <Route path="composicao" element={<CouncilMembers />} />
            <Route path="documentos" element={<CouncilDocuments />} />
            <Route path="documentos/:id" element={<CouncilDocumentDetail />} />
            <Route path="reunioes" element={<CouncilMeetings />} />
            <Route path="noticias" element={<CouncilNews />} />
            <Route path="galerias" element={<CouncilGalleries />} />
            <Route path="galerias/:id" element={<GalleryDetail />} />
            <Route path="legislacao" element={<CouncilLegislation />} />
            <Route path="legislacao/:id" element={<LegislationDetail />} />
            <Route path="transparencia" element={<CouncilTransparency />} />
          </Route>
          <Route path="legislacao" element={<LegislationList />} />
          <Route path="legislacao/:id" element={<LegislationDetail />} />
          <Route path="plano-municipal-educacao" element={<PlanoMunicipalEducacao />} />
          <Route path="politica-qualidade-equidade-educacao-infantil" element={<PoliticaQualidadeEquidadeEducacaoInfantil />} />
          <Route path="cardapio-escolar" element={<CardapioEscolar />} />
          <Route path="transparencia" element={<TransparencyList />} />
          <Route path="calendario" element={<CalendarView />} />
          <Route path="atribuicao-aulas" element={<LessonAssignmentView />} />
          <Route path="entidades-conveniadas" element={<PartnerEntityList />} />
          <Route path="entidades-conveniadas/:slug" element={<PartnerEntityProfile />} />
          <Route path="galerias" element={<GalleryList />} />
          <Route path="galerias/:id" element={<GalleryDetail />} />
          <Route path="documentos" element={<DocumentList />} />
        </Route>
      </Routes>
    </div>
  )
}
