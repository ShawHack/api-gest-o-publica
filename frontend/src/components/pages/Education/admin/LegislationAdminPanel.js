import { useEffect, useMemo, useState } from 'react'
import {
  listAdminLegislation,
  createLegislation,
  updateLegislation,
  deleteLegislation,
} from '../../../../services/educationService'
import { LEGISLATION_LABELS, mediaUrl, MAX_EDUCATION_UPLOAD_BYTES, MAX_EDUCATION_UPLOAD_LABEL } from '../educationUtils'
import styles from './EducationAdminPortal.module.css'

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function extractLegislationError(err, fallback = 'Erro ao publicar.') {
  const status = err?.response?.status
  if (status === 413) {
    return `Arquivo muito grande para o servidor (máx. ${MAX_EDUCATION_UPLOAD_LABEL} por PDF).`
  }
  if (status === 401) {
    return 'Sessão expirada. Faça login novamente no painel.'
  }
  if (status === 403) {
    return err?.response?.data?.error || err?.response?.data?.message || 'Sem permissão para gerenciar esta legislação.'
  }
  const data = err?.response?.data
  if (data?.errors && typeof data.errors === 'object') {
    const lines = Object.values(data.errors).flat().filter(Boolean)
    if (lines.length) return lines.join(' ')
  }
  return data?.error || data?.message || fallback
}

function validateLegislationFile(file) {
  if (!file) return 'Selecione o arquivo PDF.'
  if (file.size > MAX_EDUCATION_UPLOAD_BYTES) {
    return `O arquivo tem ${formatFileSize(file.size)}. O máximo permitido é ${MAX_EDUCATION_UPLOAD_LABEL}.`
  }
  return null
}

function scopeLabel(item) {
  const entity = item.educationEntityId
  if (!entity) return 'Secretaria / municipal'
  if (typeof entity === 'object') return entity.name || 'Conselho'
  return 'Conselho'
}

const EMPTY_FORM = {
  title: '',
  category: 'lei_municipal',
  number: '',
  year: String(new Date().getFullYear()),
  description: '',
}

export default function LegislationAdminPanel({ showMsg }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [file, setFile] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingScope, setEditingScope] = useState('')
  const [editFile, setEditFile] = useState(null)
  const [search, setSearch] = useState('')
  const [scopeFilter, setScopeFilter] = useState('all')
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await listAdminLegislation({ limit: 200 })
      setItems(res.data?.data || [])
    } catch {
      showMsg('Erro ao carregar legislação.', false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredItems = useMemo(() => {
    let list = items
    if (scopeFilter === 'global') {
      list = list.filter((item) => !item.educationEntityId)
    } else if (scopeFilter === 'council') {
      list = list.filter((item) => Boolean(item.educationEntityId))
    }

    const term = search.trim().toLowerCase()
    if (!term) return list
    return list.filter((item) => {
      const haystack = [
        item.title,
        item.description,
        item.number,
        item.year,
        LEGISLATION_LABELS[item.category],
        scopeLabel(item),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [items, search, scopeFilter])

  function resetForm() {
    setForm(EMPTY_FORM)
    setFile(null)
    setEditingId(null)
    setEditingScope('')
    setEditFile(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const fileError = validateLegislationFile(file)
    if (fileError) {
      showMsg(fileError, false)
      return
    }
    setSubmitting(true)
    const fd = new FormData()
    fd.append('title', form.title)
    fd.append('category', form.category)
    fd.append('description', form.description)
    if (form.number) fd.append('number', form.number)
    if (form.year) fd.append('year', form.year)
    fd.append('status', 'published')
    fd.append('file', file)
    try {
      await createLegislation(fd)
      showMsg('Legislação publicada.')
      resetForm()
      load()
    } catch (err) {
      showMsg(extractLegislationError(err), false)
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(item) {
    setEditingId(item._id)
    setEditingScope(scopeLabel(item))
    setForm({
      title: item.title,
      category: item.category,
      number: item.number || '',
      year: String(item.year || new Date().getFullYear()),
      description: item.description || '',
    })
    setEditFile(null)
    requestAnimationFrame(() => {
      document.getElementById('legislation-edit-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  async function handleUpdate(e) {
    e.preventDefault()
    if (!editingId) return
    if (editFile) {
      const fileError = validateLegislationFile(editFile)
      if (fileError) {
        showMsg(fileError, false)
        return
      }
    }
    setSubmitting(true)
    const fd = new FormData()
    fd.append('title', form.title)
    fd.append('category', form.category)
    fd.append('description', form.description)
    if (form.number) fd.append('number', form.number)
    if (form.year) fd.append('year', form.year)
    fd.append('status', 'published')
    if (editFile) fd.append('file', editFile)
    try {
      await updateLegislation(editingId, fd)
      showMsg(editFile ? 'Legislação atualizada e PDF substituído.' : 'Legislação atualizada.')
      resetForm()
      load()
    } catch (err) {
      showMsg(extractLegislationError(err, 'Erro ao atualizar.'), false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(item) {
    const name = item.title || 'esta legislação'
    if (!window.confirm(`Remover permanentemente?\n\n"${name}"\n\nO documento sairá da visão pública.`)) return
    try {
      await deleteLegislation(item._id)
      showMsg('Legislação removida do portal.')
      if (editingId === item._id) resetForm()
      load()
    } catch (err) {
      showMsg(extractLegislationError(err, 'Erro ao remover.'), false)
    }
  }

  return (
    <div className={styles.panel}>
      <h3 style={{ marginTop: 0 }}>Legislação educacional</h3>
      <p className={styles.muted}>
        Cadastre normas da secretaria abaixo. Na lista, você vê <strong>todas</strong> as legislações
        (secretaria e conselhos), podendo editar, substituir o PDF ou excluir.
      </p>

      <form onSubmit={handleSubmit}>
        <h4 style={{ marginBottom: '0.5rem' }}>Nova legislação (secretaria / municipal)</h4>
        <div className={styles.formRow}>
          <label className={styles.field}>
            Título
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} disabled={Boolean(editingId)} />
          </label>
          <label className={styles.field}>
            Categoria
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} disabled={Boolean(editingId)}>
              {Object.entries(LEGISLATION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Número
            <input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} disabled={Boolean(editingId)} />
          </label>
          <label className={styles.field}>
            Ano
            <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} disabled={Boolean(editingId)} />
          </label>
          <label className={`${styles.field} ${styles.formRowFull}`}>
            Descrição
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={Boolean(editingId)} />
          </label>
          <label className={styles.field}>
            Arquivo PDF
            <input
              type="file"
              accept=".pdf,application/pdf"
              required
              disabled={Boolean(editingId)}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <span className={styles.muted}>Máximo {MAX_EDUCATION_UPLOAD_LABEL} por arquivo.</span>
          </label>
        </div>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting || Boolean(editingId)}>
          {submitting && !editingId ? 'Publicando...' : 'Publicar'}
        </button>
      </form>

      {editingId && (
        <form id="legislation-edit-form" onSubmit={handleUpdate} style={{ margin: '1rem 0', padding: '1rem', background: '#f4f7fb', borderRadius: 8 }}>
          <h4 style={{ marginTop: 0 }}>Editar / substituir PDF</h4>
          <p className={styles.muted}>Âmbito: <strong>{editingScope}</strong></p>
          <div className={styles.formRow}>
            <label className={styles.field}>
              Título
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className={styles.field}>
              Categoria
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(LEGISLATION_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              Número
              <input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            </label>
            <label className={styles.field}>
              Ano
              <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </label>
            <label className={`${styles.field} ${styles.formRowFull}`}>
              Descrição
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label className={styles.field}>
              Substituir PDF (opcional)
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setEditFile(e.target.files?.[0] || null)}
              />
              <span className={styles.muted}>Envie um novo arquivo para trocar o PDF publicado. Máximo {MAX_EDUCATION_UPLOAD_LABEL}.</span>
            </label>
          </div>
          <div className={styles.formActions}>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar alterações'}
            </button>
            <button type="button" className={styles.btn} onClick={resetForm}>Cancelar</button>
          </div>
        </form>
      )}

      <h3>Legislação cadastrada ({filteredItems.length}{search.trim() || scopeFilter !== 'all' ? ` de ${items.length}` : ''})</h3>
      <div className={styles.formRow} style={{ marginBottom: '1rem' }}>
        <label className={styles.field}>
          Âmbito
          <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)}>
            <option value="all">Todas</option>
            <option value="global">Só secretaria / municipal</option>
            <option value="council">Só conselhos</option>
          </select>
        </label>
        <label className={`${styles.field} ${styles.formRowFull}`}>
          Buscar
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Título, número, categoria ou conselho..."
          />
        </label>
      </div>
      {(search.trim() || scopeFilter !== 'all') && (
        <p style={{ marginTop: 0 }}>
          <button
            type="button"
            className={styles.btn}
            onClick={() => { setSearch(''); setScopeFilter('all') }}
          >
            Limpar filtros
          </button>
        </p>
      )}
      {loading ? (
        <p className={styles.muted}>Carregando...</p>
      ) : filteredItems.length === 0 ? (
        <p className={styles.muted}>
          {items.length === 0
            ? 'Nenhuma legislação cadastrada.'
            : `Há ${items.length} registro(s) cadastrado(s), mas nenhum corresponde aos filtros atuais. Limpe a busca e selecione Âmbito "Todas".`}
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Título</th>
                <th>Âmbito</th>
                <th>Categoria</th>
                <th>Nº/Ano</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item._id}>
                  <td>
                    <a href={mediaUrl(item.fileUrl)} target="_blank" rel="noopener noreferrer">{item.title}</a>
                  </td>
                  <td>{scopeLabel(item)}</td>
                  <td>{LEGISLATION_LABELS[item.category] || item.category}</td>
                  <td>{item.number}{item.year ? `/${item.year}` : ''}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button type="button" className={styles.btn} onClick={() => handleEdit(item)}>Editar</button>
                      <button type="button" className={styles.btn} onClick={() => handleDelete(item)}>Excluir</button>
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
