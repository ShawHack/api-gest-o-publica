import { useEffect, useMemo, useState } from 'react'
import {
  formatDateTime,
  mediaUrl,
  MAX_EDUCATION_UPLOAD_BYTES,
  MAX_EDUCATION_UPLOAD_LABEL,
} from '../educationUtils'
import styles from './EducationAdminPortal.module.css'

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validateFile(file, required = true) {
  if (!file) return required ? 'Selecione o arquivo PDF.' : null
  if (file.size > MAX_EDUCATION_UPLOAD_BYTES) {
    return `O arquivo tem ${formatFileSize(file.size)}. O máximo permitido é ${MAX_EDUCATION_UPLOAD_LABEL}.`
  }
  return null
}

/**
 * Painel genérico: lista incremental de PDFs (título + arquivo + data automática).
 */
export default function SimplePdfListAdminPanel({
  title,
  description,
  emptyLabel,
  showMsg,
  listItems,
  createItem,
  updateItem,
  deleteItem,
}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [file, setFile] = useState(null)
  const [formTitle, setFormTitle] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await listItems({ limit: 100 })
      setItems(res.data?.data || [])
    } catch {
      showMsg('Erro ao carregar documentos.', false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) => (item.title || '').toLowerCase().includes(term))
  }, [items, search])

  function resetForm() {
    setFormTitle('')
    setFile(null)
    setEditingId(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formTitle.trim()) {
      showMsg('Informe o título.', false)
      return
    }
    const fileError = validateFile(file, !editingId)
    if (fileError) {
      showMsg(fileError, false)
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('title', formTitle.trim())
      if (file) fd.append('file', file)

      if (editingId) {
        await updateItem(editingId, fd)
        showMsg('Documento atualizado.')
      } else {
        await createItem(fd)
        showMsg('Documento adicionado.')
      }
      resetForm()
      await load()
    } catch (err) {
      showMsg(err?.response?.data?.error || err?.response?.data?.message || 'Erro ao salvar documento.', false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover este documento?')) return
    try {
      await deleteItem(id)
      showMsg('Documento removido.')
      if (editingId === id) resetForm()
      await load()
    } catch {
      showMsg('Erro ao remover.', false)
    }
  }

  function startEdit(item) {
    setEditingId(item._id)
    setFormTitle(item.title || '')
    setFile(null)
  }

  return (
    <div className={styles.panel}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p className={styles.muted}>{description}</p>

      <form onSubmit={handleSubmit}>
        <div className={styles.formRow}>
          <label className={`${styles.field} ${styles.formRowFull}`}>
            Título
            <input
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Ex.: Documento oficial 2026"
            />
          </label>
          <label className={styles.field}>
            Arquivo PDF
            <input
              type="file"
              accept=".pdf,application/pdf"
              required={!editingId}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <span className={styles.muted}>
              {editingId
                ? `Opcional na edição. Máximo ${MAX_EDUCATION_UPLOAD_LABEL}.`
                : `Máximo ${MAX_EDUCATION_UPLOAD_LABEL}. A data/hora é registrada automaticamente.`}
            </span>
          </label>
        </div>
        <div className={styles.formActions}>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
            {submitting ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar documento'}
          </button>
          {editingId && (
            <button type="button" className={styles.btn} onClick={resetForm}>
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      <h3>
        Documentos cadastrados ({filteredItems.length}
        {search.trim() ? ` de ${items.length}` : ''})
      </h3>
      <label className={styles.field}>
        Buscar
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Título..."
        />
      </label>

      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : filteredItems.length === 0 ? (
        <p className={styles.muted}>
          {items.length === 0 ? emptyLabel : 'Nenhum registro corresponde à busca.'}
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Título</th>
                <th>Data / hora</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item._id}>
                  <td>{item.title}</td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <a href={mediaUrl(item.fileUrl)} target="_blank" rel="noopener noreferrer" className={styles.btn}>
                        PDF
                      </a>
                      <button type="button" className={styles.btn} onClick={() => startEdit(item)}>
                        Editar
                      </button>
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
