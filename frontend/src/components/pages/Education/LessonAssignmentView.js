import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Calendar,
  Clock,
  Download,
  GraduationCap,
  MapPin,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { listEntities, listLessonAssignments, listUpcomingLessonAssignments } from '../../../services/educationService'
import {
  LESSON_CATEGORY_LABELS,
  LESSON_DOCUMENT_TYPE_LABELS,
  LESSON_PROCESS_STATUS_COLORS,
  LESSON_PROCESS_STATUS_LABELS,
  LESSON_TEACHER_TYPE_LABELS,
  LESSON_VACANCY_STATUS_LABELS,
} from './educationUtils'
import {
  documentDownloadUrl,
  entityName,
  filterTeachersByType,
  formatAssignmentSchedule,
  groupVacanciesByEntity,
} from './lessonAssignmentUtils'
import styles from './LessonAssignmentView.module.css'

function StatusBadge({ status }) {
  const color = LESSON_PROCESS_STATUS_COLORS[status] || '#3460a4'
  return (
    <span className={styles.badge} style={{ background: color }}>
      {LESSON_PROCESS_STATUS_LABELS[status] || status}
    </span>
  )
}

function AssignmentDetailModal({ item, onClose }) {
  if (!item) return null

  const effectiveTeachers = filterTeachersByType(item.teachers, 'efetivo')
  const selectedTeachers = [
    ...filterTeachersByType(item.teachers, 'selecionado'),
    ...filterTeachersByType(item.teachers, 'convocado'),
  ]
  const vacancyGroups = groupVacanciesByEntity(item.vacancies)

  return (
    <div className={styles.modal} role="dialog" aria-modal="true">
      <button type="button" className={styles.modalBackdrop} aria-label="Fechar" onClick={onClose} />
      <div className={styles.modalContent}>
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        <StatusBadge status={item.processStatus} />
        <h3 style={{ margin: '0.5rem 0', color: '#1c345c' }}>{item.title}</h3>
        <p className={styles.meta}>{LESSON_CATEGORY_LABELS[item.category]} · {item.period}</p>

        {item.description && <p className={styles.excerpt}>{item.description}</p>}

        <p className={styles.meta}>
          <Calendar size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {formatAssignmentSchedule(item)}
        </p>
        {item.location && (
          <p className={styles.meta}>
            <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {item.location}
          </p>
        )}
        {item.observations && (
          <p className={styles.excerpt}><strong>Observações:</strong> {item.observations}</p>
        )}

        {item.showEffectiveTeachers && effectiveTeachers.length > 0 && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}><Users size={18} /> Professores efetivos</h4>
            <ul>
              {effectiveTeachers.map((t) => (
                <li key={t._id || t.name}>
                  {t.name}
                  {t.subject && ` — ${t.subject}`}
                  {entityName(t.educationEntityId) !== '—' && ` (${entityName(t.educationEntityId)})`}
                </li>
              ))}
            </ul>
          </section>
        )}

        {selectedTeachers.length > 0 && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}><GraduationCap size={18} /> Selecionados / convocados</h4>
            <ul>
              {selectedTeachers.map((t) => (
                <li key={t._id || `${t.name}-${t.teacherType}`}>
                  {t.name} — {LESSON_TEACHER_TYPE_LABELS[t.teacherType]}
                  {t.subject && ` · ${t.subject}`}
                </li>
              ))}
            </ul>
          </section>
        )}

        {vacancyGroups.length > 0 && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}><BookOpen size={18} /> Vagas por unidade</h4>
            {vacancyGroups.map((group) => (
              <div key={group.name} style={{ marginBottom: '0.75rem' }}>
                <strong>{group.name}</strong>
                <ul>
                  {group.vacancies.map((v) => (
                    <li key={v._id || `${v.subject}-${v.position}`}>
                      {v.subject} — {v.position}
                      {v.workload && ` · ${v.workload}`}
                      {v.classCount ? ` · ${v.classCount} aula(s)` : ''}
                      {' · '}
                      {LESSON_VACANCY_STATUS_LABELS[v.vacancyStatus]}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        {item.documents?.length > 0 && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}><Download size={18} /> Documentos</h4>
            <ul className={styles.docList}>
              {item.documents.map((doc) => (
                <li key={doc._id || doc.fileUrl}>
                  <a href={documentDownloadUrl(doc.fileUrl)} target="_blank" rel="noreferrer">
                    {doc.title} ({LESSON_DOCUMENT_TYPE_LABELS[doc.documentType] || 'PDF'})
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

export default function LessonAssignmentView() {
  const [items, setItems] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [entities, setEntities] = useState([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  const [searchQ, setSearchQ] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('')
  const [sortBy, setSortBy] = useState('date')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 12, sortBy }
      if (searchQ.trim()) params.q = searchQ.trim()
      if (filterEntity) params.entityId = filterEntity
      if (filterCategory) params.category = filterCategory
      if (filterStatus) params.processStatus = filterStatus
      if (filterSubject.trim()) params.subject = filterSubject.trim()
      if (filterPeriod.trim()) params.period = filterPeriod.trim()

      const [listRes, upcomingRes, entitiesRes] = await Promise.all([
        listLessonAssignments(params),
        listUpcomingLessonAssignments(6),
        listEntities({ limit: 100 }),
      ])

      setItems(listRes.data?.data || [])
      setPages(listRes.data?.pages || 1)
      setUpcoming(upcomingRes.data?.data || [])
      setEntities((entitiesRes.data?.data || []).filter((e) => e.type !== 'conselho'))
    } catch {
      setItems([])
      setUpcoming([])
    } finally {
      setLoading(false)
    }
  }, [page, searchQ, filterEntity, filterCategory, filterStatus, filterSubject, filterPeriod, sortBy])

  useEffect(() => {
    loadData()
  }, [loadData])

  const allVacancyGroups = useMemo(() => {
    const allVacancies = items.flatMap((item) => item.vacancies || [])
    return groupVacanciesByEntity(allVacancies)
  }, [items])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2 className={styles.title}>Atribuição de Aulas</h2>
        <p className={styles.subtitle}>
          Consulte processos de atribuição, vagas disponíveis, professores convocados e documentos oficiais.
        </p>

        <div className={styles.searchBar}>
          <Search size={18} color="#5a6b80" aria-hidden />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Pesquisar por professor, unidade, disciplina, cargo..."
            value={searchQ}
            onChange={(e) => { setSearchQ(e.target.value); setPage(1) }}
          />
        </div>

        <div className={styles.filters}>
          <label className={styles.field}>
            Unidade
            <select value={filterEntity} onChange={(e) => { setFilterEntity(e.target.value); setPage(1) }}>
              <option value="">Todas</option>
              {entities.map((e) => (
                <option key={e._id} value={e._id}>{e.name}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Categoria
            <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }}>
              <option value="">Todas</option>
              {Object.entries(LESSON_CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Status
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}>
              <option value="">Todos</option>
              {Object.entries(LESSON_PROCESS_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Disciplina
            <input value={filterSubject} onChange={(e) => { setFilterSubject(e.target.value); setPage(1) }} placeholder="Ex.: Matemática" />
          </label>
          <label className={styles.field}>
            Período
            <input value={filterPeriod} onChange={(e) => { setFilterPeriod(e.target.value); setPage(1) }} placeholder="Ex.: 2026" />
          </label>
          <label className={styles.field}>
            Ordenar
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date">Data</option>
              <option value="unit">Unidade / título</option>
            </select>
          </label>
        </div>
      </header>

      {upcoming.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <Sparkles size={20} />
            Próximas atribuições
          </h3>
          <div className={styles.upcomingGrid}>
            {upcoming.map((item) => (
              <article key={item._id} className={styles.card}>
                <StatusBadge status={item.processStatus} />
                <h4 className={styles.cardTitle}>{item.title}</h4>
                <p className={styles.meta}>
                  <Clock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {formatAssignmentSchedule(item)}
                </p>
                {item.location && (
                  <p className={styles.meta}>
                    <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {item.location}
                  </p>
                )}
                {item.description && <p className={styles.excerpt}>{item.description.slice(0, 120)}{item.description.length > 120 ? '…' : ''}</p>}
                <button type="button" className={styles.btn} onClick={() => setDetail(item)}>
                  Ver detalhes completos
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {allVacancyGroups.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <BookOpen size={20} />
            Vagas disponíveis por unidade
          </h3>
          <div className={styles.list}>
            {allVacancyGroups.map((group) => (
              <div key={group.name} className={styles.unitBlock}>
                <h4 className={styles.unitTitle}>{group.name}</h4>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Disciplina</th>
                        <th>Cargo</th>
                        <th>Carga horária</th>
                        <th>Período</th>
                        <th>Aulas</th>
                        <th>Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.vacancies.map((v) => (
                        <tr key={v._id || `${v.subject}-${v.position}`}>
                          <td>{v.subject}</td>
                          <td>{v.position}</td>
                          <td>{v.workload || '—'}</td>
                          <td>{v.period || '—'}</td>
                          <td>{v.classCount ?? '—'}</td>
                          <td>{LESSON_VACANCY_STATUS_LABELS[v.vacancyStatus]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Processos de atribuição</h3>
        {loading ? (
          <div className={styles.loading}>Carregando atribuições...</div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>Nenhum processo encontrado para os filtros selecionados.</div>
        ) : (
          <>
            <div className={styles.upcomingGrid}>
              {items.map((item) => {
                const selected = [
                  ...filterTeachersByType(item.teachers, 'selecionado'),
                  ...filterTeachersByType(item.teachers, 'convocado'),
                ]
                const effective = item.showEffectiveTeachers
                  ? filterTeachersByType(item.teachers, 'efetivo')
                  : []

                return (
                  <article key={item._id} className={styles.card}>
                    <StatusBadge status={item.processStatus} />
                    <h4 className={styles.cardTitle}>{item.title}</h4>
                    <p className={styles.meta}>{formatAssignmentSchedule(item)}</p>
                    {item.location && <p className={styles.meta}>{item.location}</p>}
                    <p className={styles.meta}>
                      {item.vacancies?.length || 0} vaga(s) · {item.teachers?.length || 0} professor(es)
                    </p>

                    {effective.length > 0 && (
                      <p className={styles.excerpt}>
                        <strong>Efetivos:</strong> {effective.map((t) => t.name).join(', ')}
                      </p>
                    )}
                    {selected.length > 0 && (
                      <p className={styles.excerpt}>
                        <strong>Selecionados:</strong> {selected.map((t) => t.name).join(', ')}
                      </p>
                    )}

                    {item.documents?.length > 0 && (
                      <p className={styles.meta}>
                        <Download size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {item.documents.length} documento(s) para download
                      </p>
                    )}

                    <button type="button" className={styles.btn} onClick={() => setDetail(item)}>
                      Ver detalhes completos
                    </button>
                  </article>
                )
              })}
            </div>

            {pages > 1 && (
              <div className={styles.pagination}>
                <button type="button" className={styles.btn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </button>
                <span className={styles.meta}>Página {page} de {pages}</span>
                <button type="button" className={styles.btn} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <AssignmentDetailModal item={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
