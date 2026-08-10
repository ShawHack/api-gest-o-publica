import { useEffect, useMemo, useState } from 'react'
import {
  listAdminLessonAssignments,
  createLessonAssignment,
  updateLessonAssignment,
  publishLessonAssignment,
  archiveLessonAssignment,
  deleteLessonAssignment,
} from '../../../../services/educationService'
import {
  LESSON_CATEGORY_LABELS,
  LESSON_DOCUMENT_TYPE_LABELS,
  LESSON_PROCESS_STATUS_LABELS,
  LESSON_PUBLICATION_STATUS_LABELS,
  LESSON_TEACHER_TYPE_LABELS,
  LESSON_VACANCY_STATUS_LABELS,
  mediaUrl,
} from '../educationUtils'
import {
  assignmentToForm,
  buildLessonAssignmentFormData,
  EMPTY_ASSIGNMENT_FORM,
  EMPTY_TEACHER,
  EMPTY_VACANCY,
  formatAssignmentSchedule,
} from '../lessonAssignmentUtils'
import styles from './EducationAdminPortal.module.css'

export default function LessonAssignmentAdminPanel({ entities, showMsg }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_ASSIGNMENT_FORM, teachers: [{ ...EMPTY_TEACHER }], vacancies: [{ ...EMPTY_VACANCY }] })
  const [newDocuments, setNewDocuments] = useState([])
  const [documentsMeta, setDocumentsMeta] = useState([])

  const [searchQ, setSearchQ] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterProcessStatus, setFilterProcessStatus] = useState('')
  const [filterPublication, setFilterPublication] = useState('')
  const [sortBy, setSortBy] = useState('date')

  const schoolEntities = useMemo(
    () => entities.filter((e) => e.type !== 'conselho'),
    [entities]
  )

  async function load() {
    setLoading(true)
    try {
      const params = { limit: 200, sortBy }
      if (searchQ.trim()) params.q = searchQ.trim()
      if (filterEntity) params.entityId = filterEntity
      if (filterCategory) params.category = filterCategory
      if (filterProcessStatus) params.processStatus = filterProcessStatus
      if (filterPublication) params.publicationStatus = filterPublication
      const res = await listAdminLessonAssignments(params)
      setItems(res.data?.data || [])
    } catch {
      showMsg('Erro ao carregar atribuições.', false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, filterEntity, filterCategory, filterProcessStatus, filterPublication, sortBy])

  function resetForm() {
    setEditingId(null)
    setForm({ ...EMPTY_ASSIGNMENT_FORM, teachers: [{ ...EMPTY_TEACHER }], vacancies: [{ ...EMPTY_VACANCY }] })
    setNewDocuments([])
    setDocumentsMeta([])
  }

  function startEdit(item) {
    setEditingId(item._id)
    setForm(assignmentToForm(item))
    setNewDocuments([])
    setDocumentsMeta([])
    document.getElementById('assignment-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateTeacher(index, field, value) {
    setForm((prev) => {
      const teachers = [...prev.teachers]
      teachers[index] = { ...teachers[index], [field]: value }
      return { ...prev, teachers }
    })
  }

  function addTeacher() {
    setForm((prev) => ({ ...prev, teachers: [...prev.teachers, { ...EMPTY_TEACHER }] }))
  }

  function removeTeacher(index) {
    setForm((prev) => ({
      ...prev,
      teachers: prev.teachers.filter((_, i) => i !== index),
    }))
  }

  function updateVacancy(index, field, value) {
    setForm((prev) => {
      const vacancies = [...prev.vacancies]
      vacancies[index] = { ...vacancies[index], [field]: value }
      return { ...prev, vacancies }
    })
  }

  function addVacancy() {
    setForm((prev) => ({ ...prev, vacancies: [...prev.vacancies, { ...EMPTY_VACANCY }] }))
  }

  function removeVacancy(index) {
    setForm((prev) => ({
      ...prev,
      vacancies: prev.vacancies.filter((_, i) => i !== index),
    }))
  }

  function handleDocumentFiles(e) {
    const files = Array.from(e.target.files || [])
    setNewDocuments(files)
    setDocumentsMeta(files.map((f) => ({ title: f.name.replace(/\.pdf$/i, ''), documentType: 'edital' })))
  }

  function removeExistingDocument(index) {
    setForm((prev) => ({
      ...prev,
      existingDocuments: (prev.existingDocuments || []).filter((_, i) => i !== index),
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title?.trim()) {
      showMsg('Informe o título do processo.', false)
      return
    }
    setSubmitting(true)
    try {
      const fd = buildLessonAssignmentFormData(form, { newDocuments, documentsMeta })
      if (editingId) {
        await updateLessonAssignment(editingId, fd)
        showMsg('Atribuição atualizada.')
      } else {
        await createLessonAssignment(fd)
        showMsg('Processo de atribuição cadastrado.')
      }
      resetForm()
      load()
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao salvar atribuição.', false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePublish(id) {
    try {
      await publishLessonAssignment(id)
      showMsg('Atribuição publicada.')
      load()
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao publicar.', false)
    }
  }

  async function handleArchive(id) {
    try {
      await archiveLessonAssignment(id)
      showMsg('Atribuição arquivada.')
      load()
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao arquivar.', false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Excluir este processo de atribuição?')) return
    try {
      await deleteLessonAssignment(id)
      showMsg('Atribuição excluída.')
      if (editingId === id) resetForm()
      load()
    } catch {
      showMsg('Erro ao excluir.', false)
    }
  }

  return (
    <div className={styles.panel}>
      <h3 id="assignment-form" style={{ marginTop: 0 }}>
        {editingId ? 'Editar processo de atribuição' : 'Novo processo de atribuição'}
      </h3>
      <p className={styles.muted}>
        Cadastre processos, professores, vagas e documentos. Publique para exibir no portal público.
      </p>

      <form onSubmit={handleSubmit}>
        <section className={styles.formSection}>
          <h4 className={styles.formSectionTitle}>Dados do processo</h4>
          <div className={styles.formRow}>
            <label className={`${styles.field} ${styles.formRowFull}`}>
              Título
              <input required value={form.title} onChange={(e) => updateField('title', e.target.value)} />
            </label>
            <label className={`${styles.field} ${styles.formRowFull}`}>
              Descrição
              <textarea rows={2} value={form.description} onChange={(e) => updateField('description', e.target.value)} />
            </label>
            <label className={styles.field}>
              Categoria
              <select value={form.category} onChange={(e) => updateField('category', e.target.value)}>
                {Object.entries(LESSON_CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              Status do processo
              <select value={form.processStatus} onChange={(e) => updateField('processStatus', e.target.value)}>
                {Object.entries(LESSON_PROCESS_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              Período
              <input value={form.period} onChange={(e) => updateField('period', e.target.value)} placeholder="Ex.: 2026" />
            </label>
            <label className={styles.field}>
              Data da atribuição
              <input type="date" value={form.assignmentDateOnly} onChange={(e) => updateField('assignmentDateOnly', e.target.value)} />
            </label>
            <label className={styles.field}>
              Horário início
              <input type="time" value={form.assignmentTime} onChange={(e) => updateField('assignmentTime', e.target.value)} />
            </label>
            <label className={styles.field}>
              Horário término
              <input type="time" value={form.assignmentEndTime} onChange={(e) => updateField('assignmentEndTime', e.target.value)} />
            </label>
            <label className={`${styles.field} ${styles.formRowFull}`}>
              Local
              <input value={form.location} onChange={(e) => updateField('location', e.target.value)} placeholder="Endereço ou unidade" />
            </label>
            <label className={`${styles.field} ${styles.formRowFull}`}>
              Observações
              <textarea rows={2} value={form.observations} onChange={(e) => updateField('observations', e.target.value)} />
            </label>
            <label className={`${styles.field} ${styles.formRowFull}`} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={form.showEffectiveTeachers}
                onChange={(e) => updateField('showEffectiveTeachers', e.target.checked)}
              />
              Exibir professores efetivos no portal público
            </label>
          </div>
        </section>

        <section className={styles.formSection}>
          <h4 className={styles.formSectionTitle}>Professores</h4>
          {form.teachers.map((teacher, index) => (
            <div key={teacher._id || `teacher-${index}`} className={styles.formRow} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e8eef8' }}>
              <label className={styles.field}>
                Nome
                <input value={teacher.name} onChange={(e) => updateTeacher(index, 'name', e.target.value)} />
              </label>
              <label className={styles.field}>
                Matrícula
                <input value={teacher.registration} onChange={(e) => updateTeacher(index, 'registration', e.target.value)} />
              </label>
              <label className={styles.field}>
                Tipo
                <select value={teacher.teacherType} onChange={(e) => updateTeacher(index, 'teacherType', e.target.value)}>
                  {Object.entries(LESSON_TEACHER_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                Unidade
                <select value={teacher.educationEntityId} onChange={(e) => updateTeacher(index, 'educationEntityId', e.target.value)}>
                  <option value="">Selecione...</option>
                  {schoolEntities.map((ent) => (
                    <option key={ent._id} value={ent._id}>{ent.name}</option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                Disciplina
                <input value={teacher.subject} onChange={(e) => updateTeacher(index, 'subject', e.target.value)} />
              </label>
              <label className={styles.field}>
                Cargo
                <input value={teacher.position} onChange={(e) => updateTeacher(index, 'position', e.target.value)} />
              </label>
              {form.teachers.length > 1 && (
                <button type="button" className={styles.btn} onClick={() => removeTeacher(index)}>Remover</button>
              )}
            </div>
          ))}
          <button type="button" className={styles.btn} onClick={addTeacher}>+ Adicionar professor</button>
        </section>

        <section className={styles.formSection}>
          <h4 className={styles.formSectionTitle}>Vagas por unidade</h4>
          {form.vacancies.map((vacancy, index) => (
            <div key={vacancy._id || `vacancy-${index}`} className={styles.formRow} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e8eef8' }}>
              <label className={styles.field}>
                Unidade
                <select required value={vacancy.educationEntityId} onChange={(e) => updateVacancy(index, 'educationEntityId', e.target.value)}>
                  <option value="">Selecione...</option>
                  {schoolEntities.map((ent) => (
                    <option key={ent._id} value={ent._id}>{ent.name}</option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                Cargo
                <input value={vacancy.position} onChange={(e) => updateVacancy(index, 'position', e.target.value)} />
              </label>
              <label className={styles.field}>
                Disciplina
                <input value={vacancy.subject} onChange={(e) => updateVacancy(index, 'subject', e.target.value)} />
              </label>
              <label className={styles.field}>
                Carga horária
                <input value={vacancy.workload} onChange={(e) => updateVacancy(index, 'workload', e.target.value)} placeholder="Ex.: 20h" />
              </label>
              <label className={styles.field}>
                Período
                <input value={vacancy.period} onChange={(e) => updateVacancy(index, 'period', e.target.value)} />
              </label>
              <label className={styles.field}>
                Qtd. aulas
                <input type="number" min="0" value={vacancy.classCount} onChange={(e) => updateVacancy(index, 'classCount', e.target.value)} />
              </label>
              <label className={styles.field}>
                Situação
                <select value={vacancy.vacancyStatus} onChange={(e) => updateVacancy(index, 'vacancyStatus', e.target.value)}>
                  {Object.entries(LESSON_VACANCY_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              {form.vacancies.length > 1 && (
                <button type="button" className={styles.btn} onClick={() => removeVacancy(index)}>Remover</button>
              )}
            </div>
          ))}
          <button type="button" className={styles.btn} onClick={addVacancy}>+ Adicionar vaga</button>
        </section>

        <section className={styles.formSection}>
          <h4 className={styles.formSectionTitle}>Editais e documentos (PDF)</h4>
          {(form.existingDocuments || []).map((doc, index) => (
            <div key={doc._id || doc.fileUrl} className={styles.formRow} style={{ alignItems: 'center' }}>
              <span className={styles.muted}>
                {doc.title} ({LESSON_DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType})
              </span>
              <a href={mediaUrl(doc.fileUrl)} target="_blank" rel="noreferrer" className={styles.btn}>Abrir</a>
              <button type="button" className={styles.btn} onClick={() => removeExistingDocument(index)}>Remover</button>
            </div>
          ))}
          <label className={`${styles.field} ${styles.formRowFull}`}>
            Novos arquivos PDF
            <input type="file" accept="application/pdf" multiple onChange={handleDocumentFiles} />
          </label>
          {documentsMeta.map((meta, index) => (
            <div key={`doc-meta-${index}`} className={styles.formRow}>
              <label className={styles.field}>
                Título do documento
                <input
                  value={meta.title}
                  onChange={(e) => {
                    const next = [...documentsMeta]
                    next[index] = { ...next[index], title: e.target.value }
                    setDocumentsMeta(next)
                  }}
                />
              </label>
              <label className={styles.field}>
                Tipo
                <select
                  value={meta.documentType}
                  onChange={(e) => {
                    const next = [...documentsMeta]
                    next[index] = { ...next[index], documentType: e.target.value }
                    setDocumentsMeta(next)
                  }}
                >
                  {Object.entries(LESSON_DOCUMENT_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </section>

        <div className={styles.formActions}>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
            {submitting ? 'Salvando...' : (editingId ? 'Salvar alterações' : 'Cadastrar processo')}
          </button>
          {editingId && (
            <button type="button" className={styles.btn} onClick={resetForm} disabled={submitting}>
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      <hr style={{ margin: '1.75rem 0', border: 'none', borderTop: '1px solid #d4e0f0' }} />

      <h3>Processos cadastrados ({items.length})</h3>
      <div className={styles.formRow} style={{ marginBottom: '1rem' }}>
        <label className={styles.field}>
          Pesquisar
          <input
            type="search"
            placeholder="Professor, unidade, disciplina, cargo..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          Unidade
          <select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)}>
            <option value="">Todas</option>
            {schoolEntities.map((ent) => (
              <option key={ent._id} value={ent._id}>{ent.name}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Categoria
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(LESSON_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Status processo
          <select value={filterProcessStatus} onChange={(e) => setFilterProcessStatus(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(LESSON_PROCESS_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Publicação
          <select value={filterPublication} onChange={(e) => setFilterPublication(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(LESSON_PUBLICATION_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Ordenar por
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Data</option>
            <option value="unit">Unidade / título</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p className={styles.muted}>Carregando...</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Título</th>
                <th>Data / Local</th>
                <th>Vagas</th>
                <th>Professores</th>
                <th>Status</th>
                <th>Publicação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.muted} style={{ textAlign: 'center', padding: '1.5rem' }}>
                    Nenhum processo cadastrado. Use o formulário acima.
                  </td>
                </tr>
              ) : items.map((item) => (
                <tr key={item._id}>
                  <td>
                    <strong>{item.title}</strong>
                    <br />
                    <span className={styles.muted}>{LESSON_CATEGORY_LABELS[item.category] || item.category}</span>
                  </td>
                  <td>
                    {formatAssignmentSchedule(item)}
                    {item.location && <><br /><span className={styles.muted}>{item.location}</span></>}
                  </td>
                  <td>{item.vacancies?.length || 0}</td>
                  <td>{item.teachers?.length || 0}</td>
                  <td>{LESSON_PROCESS_STATUS_LABELS[item.processStatus] || item.processStatus}</td>
                  <td>{LESSON_PUBLICATION_STATUS_LABELS[item.publicationStatus] || item.publicationStatus}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => startEdit(item)}>
                        Editar
                      </button>
                      {item.publicationStatus !== 'published' && (
                        <button type="button" className={styles.btn} onClick={() => handlePublish(item._id)}>
                          Publicar
                        </button>
                      )}
                      {item.publicationStatus === 'published' && (
                        <button type="button" className={styles.btn} onClick={() => handleArchive(item._id)}>
                          Arquivar
                        </button>
                      )}
                      <button type="button" className={styles.btn} onClick={() => handleDelete(item._id)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
