import { useEffect, useMemo, useState } from 'react'
import {
  listAssignments,
  createAssignmentByEmail,
  deleteAssignment,
} from '../../../../services/educationService'
import { EDUCATION_ROLE_LABELS, ENTITY_TYPE_LABELS } from '../educationUtils'
import styles from './EducationAdminPortal.module.css'

const SCHOOL_UNIT_TYPES = ['escola', 'creche', 'emei', 'centro_educacional', 'projeto_educacional']

const ROLE_OPTIONS = [
  {
    value: 'education_admin',
    label: EDUCATION_ROLE_LABELS.education_admin,
    entityMode: 'none',
    hint: 'Acesso total ao módulo. Não vincula a uma unidade específica.',
  },
  {
    value: 'education_secretary',
    label: EDUCATION_ROLE_LABELS.education_secretary,
    entityMode: 'secretaria',
    hint: 'Vincule à Secretaria Municipal de Educação.',
  },
  {
    value: 'education_manager',
    label: EDUCATION_ROLE_LABELS.education_manager,
    entityMode: 'school',
    hint: 'Cada gestor deve ser vinculado à unidade escolar que administra.',
  },
  {
    value: 'education_council',
    label: EDUCATION_ROLE_LABELS.education_council,
    entityMode: 'conselho',
    hint: 'Vincule ao conselho municipal (CME, CAE, CACS-FUNDEB, etc.).',
  },
]

function entityOptionsForRole(role, entities) {
  const spec = ROLE_OPTIONS.find((r) => r.value === role)
  if (!spec || spec.entityMode === 'none') return []
  if (spec.entityMode === 'secretaria') {
    return entities.filter((e) => e.type === 'secretaria' && e.isActive !== false)
  }
  if (spec.entityMode === 'school') {
    return entities.filter((e) => SCHOOL_UNIT_TYPES.includes(e.type) && e.isActive !== false)
  }
  if (spec.entityMode === 'conselho') {
    return entities.filter((e) => e.type === 'conselho' && e.isActive !== false)
  }
  return []
}

export default function AssignmentsAdminPanel({ entities, showMsg }) {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [filterRole, setFilterRole] = useState('')
  const [filterEntityId, setFilterEntityId] = useState('')
  const [form, setForm] = useState({
    email: '',
    role: 'education_manager',
    educationEntityId: '',
  })

  const selectedRole = ROLE_OPTIONS.find((r) => r.value === form.role)
  const entityChoices = useMemo(
    () => entityOptionsForRole(form.role, entities),
    [form.role, entities]
  )

  const filterEntityChoices = useMemo(() => {
    const active = entities.filter((e) => e.isActive !== false)
    return active.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [entities])

  async function loadAssignments() {
    setLoading(true)
    try {
      const params = { limit: 200 }
      if (filterRole) params.role = filterRole
      if (filterEntityId) params.entityId = filterEntityId
      const res = await listAssignments(params)
      setAssignments(res.data?.data || [])
    } catch {
      showMsg('Erro ao carregar vínculos.', false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssignments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRole, filterEntityId])

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      educationEntityId: entityChoices.length === 1 ? entityChoices[0]._id : '',
    }))
  }, [form.role, entityChoices])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email.trim()) {
      showMsg('Informe o e-mail do usuário.', false)
      return
    }
    if (selectedRole?.entityMode !== 'none' && !form.educationEntityId) {
      showMsg('Selecione a unidade para este perfil.', false)
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        role: form.role,
      }
      if (form.educationEntityId) {
        payload.educationEntityId = form.educationEntityId
      }
      await createAssignmentByEmail(payload)
      showMsg('Vínculo criado com sucesso.')
      setForm({ email: '', role: form.role, educationEntityId: '' })
      loadAssignments()
    } catch (err) {
      showMsg(err?.response?.data?.error || err?.response?.data?.message || 'Erro ao vincular usuário.', false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove(id) {
    if (!window.confirm('Remover este vínculo? O usuário perderá o acesso associado.')) return
    try {
      await deleteAssignment(id)
      showMsg('Vínculo removido.')
      loadAssignments()
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao remover vínculo.', false)
    }
  }

  return (
    <div className={styles.panel}>
      <h3 style={{ marginTop: 0 }}>Usuários e permissões</h3>
      <p className={styles.muted}>
        Atribua perfis do módulo Educação a usuários já cadastrados no sistema.
        Gestores devem ser vinculados <strong>por unidade escolar</strong> — cadastre uma escola e depois associe o diretor/gestor responsável.
      </p>

      <form onSubmit={handleSubmit}>
        <h4>Novo vínculo</h4>
        <div className={styles.formRow}>
          <label className={styles.field}>
            E-mail do usuário
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="gestor@emef-exemplo.sp.gov.br"
            />
          </label>
          <label className={styles.field}>
            Perfil
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value, educationEntityId: '' })}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
        </div>

        {selectedRole?.entityMode !== 'none' && (
          <label className={styles.field}>
            Unidade vinculada
            <select
              required
              value={form.educationEntityId}
              onChange={(e) => setForm({ ...form, educationEntityId: e.target.value })}
            >
              <option value="">Selecione...</option>
              {entityChoices.map((entity) => (
                <option key={entity._id} value={entity._id}>
                  {entity.name} ({ENTITY_TYPE_LABELS[entity.type] || entity.type})
                </option>
              ))}
            </select>
          </label>
        )}

        {selectedRole?.hint && (
          <p className={styles.muted} style={{ marginTop: 0 }}>{selectedRole.hint}</p>
        )}

        <div className={styles.formActions}>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
            {submitting ? 'Vinculando...' : 'Vincular usuário'}
          </button>
        </div>
      </form>

      <hr style={{ margin: '1.75rem 0', border: 'none', borderTop: '1px solid #d4e0f0' }} />

      <h4>Vínculos ativos</h4>
      <div className={styles.formRow}>
        <label className={styles.field}>
          Filtrar por perfil
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="">Todos</option>
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Filtrar por unidade
          <select value={filterEntityId} onChange={(e) => setFilterEntityId(e.target.value)}>
            <option value="">Todas</option>
            {filterEntityChoices.map((entity) => (
              <option key={entity._id} value={entity._id}>{entity.name}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className={styles.muted}>Carregando vínculos...</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Unidade</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.muted} style={{ textAlign: 'center', padding: '1.5rem' }}>
                    Nenhum vínculo encontrado.
                  </td>
                </tr>
              ) : assignments.map((item) => (
                <tr key={item._id}>
                  <td>
                    <div>{item.userId?.name || '—'}</div>
                    <div className={styles.muted} style={{ fontSize: '0.85rem' }}>
                      {item.userId?.email || item.userId}
                    </div>
                  </td>
                  <td>{EDUCATION_ROLE_LABELS[item.role] || item.role}</td>
                  <td>
                    {item.educationEntityId
                      ? `${item.educationEntityId.name} (${ENTITY_TYPE_LABELS[item.educationEntityId.type] || item.educationEntityId.type})`
                      : '— (global)'}
                  </td>
                  <td>
                    <button type="button" className={styles.btn} onClick={() => handleRemove(item._id)}>
                      Remover
                    </button>
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
