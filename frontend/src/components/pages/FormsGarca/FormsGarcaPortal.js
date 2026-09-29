import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Download, FilePlus2, Pencil, RefreshCw, Trash2, Users } from 'lucide-react'
import { createForm, deleteForm, getStatistics, listForms, listInscriptions, updateForm } from '../../../services/formsGarcaService'
import styles from './FormsGarcaPortal.module.css'

const FIELD_TYPES = [
  ['text', 'Texto'], ['number', 'Número'], ['date', 'Data'], ['email', 'E-mail'],
  ['phone', 'Telefone'], ['textarea', 'Texto longo'], ['select', 'Lista de opções'],
  ['checkbox', 'Caixa de seleção'], ['file', 'Arquivo'],
]
const EMPTY = { titulo: '', descricao: '', dataEvento: '', idSolicitacao1Doc: '', status: 'aberto', campos: [] }
const statusLabel = { aberto: 'Aberto', emAndamento: 'Em andamento', concluido: 'Concluído' }
const errorOf = (error) => error?.response?.data?.message || error?.message || 'Não foi possível concluir a operação.'
const localDate = (value) => value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'
const toInputDate = (value) => value ? new Date(value).toISOString().slice(0, 10) : ''

export default function FormsGarcaPortal() {
  const [tab, setTab] = useState('forms')
  const [forms, setForms] = useState([])
  const [statistics, setStatistics] = useState({})
  const [editing, setEditing] = useState(null)
  const [responsesFor, setResponsesFor] = useState(null)
  const [inscriptions, setInscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [formResult, stats] = await Promise.all([listForms(), getStatistics()])
      setForms(formResult.forms || []); setStatistics(stats || {})
    } catch (requestError) { setError(errorOf(requestError)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function remove(form) {
    if (!window.confirm(`Excluir “${form.titulo}” e todas as inscrições vinculadas? Esta ação não pode ser desfeita.`)) return
    setLoading(true); setError(''); setNotice('')
    try { await deleteForm(form._id); setNotice('Formulário excluído.'); await load() }
    catch (requestError) { setError(errorOf(requestError)); setLoading(false) }
  }

  async function openResponses(form) {
    setLoading(true); setError(''); setResponsesFor(form)
    try { setInscriptions((await listInscriptions(form._id)).inscriptions || []); setTab('responses') }
    catch (requestError) { setError(errorOf(requestError)) }
    finally { setLoading(false) }
  }

  function startEdit(form = EMPTY) {
    setEditing({ ...form, dataEvento: toInputDate(form.dataEvento), campos: (form.campos || []).map((field) => ({ ...field, id: field.fieldId || field.id })) })
    setTab('editor'); setError(''); setNotice('')
  }

  return <div className={styles.shell}>
    <header className={styles.hero}>
      <div><span className={styles.eyebrow}>Prefeitura de Garça</span><h1>Forms Garça</h1><p>Crie formulários, acompanhe inscrições e organize atendimentos em um só lugar.</p></div>
      <ClipboardList size={64} aria-hidden="true" />
    </header>
    <nav className={styles.tabs} aria-label="Módulo de formulários">
      <button className={tab === 'forms' ? styles.activeTab : ''} onClick={() => setTab('forms')}>Formulários</button>
      <button className={tab === 'editor' ? styles.activeTab : ''} onClick={() => startEdit()}>Novo formulário</button>
      {responsesFor && <button className={tab === 'responses' ? styles.activeTab : ''} onClick={() => setTab('responses')}>Inscrições</button>}
    </nav>
    <main className={styles.content}>
      {error && <div className={styles.error} role="alert">{error}</div>}
      {notice && <div className={styles.success} role="status">{notice}</div>}
      {tab === 'forms' && <FormsList forms={forms} statistics={statistics} loading={loading} onRefresh={load} onEdit={startEdit} onDelete={remove} onResponses={openResponses} />}
      {tab === 'editor' && <FormEditor initial={editing || EMPTY} onCancel={() => setTab('forms')} onSaved={async () => { setNotice('Formulário salvo com sucesso.'); setTab('forms'); await load() }} setError={setError} />}
      {tab === 'responses' && <Responses form={responsesFor} items={inscriptions} loading={loading} />}
    </main>
  </div>
}

function FormsList({ forms, statistics, loading, onRefresh, onEdit, onDelete, onResponses }) {
  const cards = [['total', 'Total'], ['aberto', 'Abertos'], ['emAndamento', 'Em andamento'], ['concluido', 'Concluídos']]
  return <>
    <section className={styles.stats}>{cards.map(([key, label]) => <article key={key}><strong>{statistics[key] || 0}</strong><span>{label}</span></article>)}</section>
    <div className={styles.heading}><div><h2>Formulários cadastrados</h2><p>Gerencie os formulários armazenados na API municipal.</p></div><div className={styles.actions}><button className={styles.secondary} onClick={onRefresh}><RefreshCw size={17} /> Atualizar</button><button className={styles.primary} onClick={() => onEdit()}><FilePlus2 size={17} /> Novo</button></div></div>
    {loading ? <p>Carregando…</p> : !forms.length ? <div className={styles.empty}>Nenhum formulário cadastrado.</div> : <div className={styles.list}>{forms.map((form) => <article className={styles.card} key={form._id}>
      <div className={styles.cardMain}><span className={`${styles.badge} ${styles[form.status]}`}>{statusLabel[form.status] || form.status}</span><h3>{form.titulo}</h3><p>{form.descricao || 'Sem descrição.'}</p><small>Evento: {localDate(form.dataEvento)} · {(form.campos || []).length} campo(s)</small></div>
      <div className={styles.actions}><button className={styles.secondary} onClick={() => onResponses(form)}><Users size={16} /> Inscrições</button><button className={styles.secondary} onClick={() => onEdit(form)}><Pencil size={16} /> Editar</button><button className={styles.danger} onClick={() => onDelete(form)}><Trash2 size={16} /> Excluir</button></div>
    </article>)}</div>}
  </>
}

function FormEditor({ initial, onCancel, onSaved, setError }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(form._id)
  const update = ({ target }) => setForm((current) => ({ ...current, [target.name]: target.value }))
  const addField = () => setForm((current) => ({ ...current, campos: [...current.campos, { id: `campo_${Date.now()}`, label: '', type: 'text', required: false, options: [] }] }))
  const updateField = (index, patch) => setForm((current) => ({ ...current, campos: current.campos.map((field, position) => position === index ? { ...field, ...patch } : field) }))
  const removeField = (index) => setForm((current) => ({ ...current, campos: current.campos.filter((_, position) => position !== index) }))

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const payload = { ...form, campos: form.campos.map((field) => ({ ...field, options: field.type === 'select' ? field.options : [] })) }
      if (isEdit) await updateForm(form._id, payload); else await createForm(payload)
      await onSaved()
    } catch (requestError) { setError(errorOf(requestError)) }
    finally { setSaving(false) }
  }

  return <form className={styles.editor} onSubmit={submit}>
    <div className={styles.heading}><div><h2>{isEdit ? 'Editar formulário' : 'Novo formulário'}</h2><p>Defina os dados gerais e os campos que serão respondidos.</p></div></div>
    <div className={styles.grid}><label>Título *<input name="titulo" value={form.titulo} onChange={update} required /></label><label>Data do evento *<input name="dataEvento" type="date" value={form.dataEvento} onChange={update} required /></label><label>Status<select name="status" value={form.status} onChange={update}><option value="aberto">Aberto</option><option value="emAndamento">Em andamento</option><option value="concluido">Concluído</option></select></label><label>ID da solicitação 1Doc<input name="idSolicitacao1Doc" value={form.idSolicitacao1Doc || ''} onChange={update} /></label></div>
    <label>Descrição<textarea name="descricao" value={form.descricao || ''} onChange={update} /></label>
    <div className={styles.heading}><h3>Campos do formulário</h3><button className={styles.secondary} type="button" onClick={addField}>+ Adicionar campo</button></div>
    <div className={styles.fields}>{form.campos.map((field, index) => <div className={styles.fieldRow} key={field.id || index}>
      <label>Rótulo *<input value={field.label} onChange={({ target }) => updateField(index, { label: target.value })} required /></label>
      <label>Tipo<select value={field.type} onChange={({ target }) => updateField(index, { type: target.value })}>{FIELD_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className={styles.check}><input type="checkbox" checked={Boolean(field.required)} onChange={({ target }) => updateField(index, { required: target.checked })} /> Obrigatório</label>
      {field.type === 'select' && <label className={styles.wide}>Opções (uma por linha)<textarea value={(field.options || []).join('\n')} onChange={({ target }) => updateField(index, { options: target.value.split('\n').map((option) => option.trim()).filter(Boolean) })} /></label>}
      <button className={styles.iconDanger} type="button" aria-label={`Remover campo ${field.label || index + 1}`} onClick={() => removeField(index)}><Trash2 size={18} /></button>
    </div>)}</div>
    <div className={styles.actions}><button className={styles.primary} disabled={saving}>{saving ? 'Salvando…' : 'Salvar formulário'}</button><button className={styles.secondary} type="button" onClick={onCancel}>Cancelar</button></div>
  </form>
}

function Responses({ form, items, loading }) {
  const fields = useMemo(() => form?.campos || [], [form])
  return <><div className={styles.heading}><div><h2>Inscrições — {form?.titulo}</h2><p>{items.length} resposta(s) encontrada(s).</p></div>{Boolean(items.length) && <button className={styles.secondary} onClick={() => exportCsv(form, fields, items)}><Download size={17} /> Exportar CSV</button>}</div>{loading ? <p>Carregando…</p> : !items.length ? <div className={styles.empty}>Nenhuma inscrição neste formulário.</div> : <div className={styles.responseTable}><table><thead><tr><th>Inscrito</th><th>Voucher</th>{fields.map((field) => <th key={field.fieldId}>{field.label}</th>)}<th>Data</th></tr></thead><tbody>{items.map((item) => <tr key={item._id}><td>{item.userName}</td><td><code>{item.voucherCode}</code></td>{fields.map((field) => <td key={field.fieldId}>{formatAnswer(item.formData?.[field.fieldId])}</td>)}<td>{localDate(item.createdAt)}</td></tr>)}</tbody></table></div>}</>
}

function formatAnswer(value) {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  return value == null || value === '' ? '—' : String(value)
}

function exportCsv(form, fields, items) {
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const header = ['Inscrito', 'Voucher', ...fields.map((field) => field.label), 'Data']
  const rows = items.map((item) => [item.userName, item.voucherCode, ...fields.map((field) => formatAnswer(item.formData?.[field.fieldId])), localDate(item.createdAt)])
  const csv = `\uFEFF${[header, ...rows].map((row) => row.map(quote).join(';')).join('\n')}`
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  link.download = `inscricoes-${String(form.titulo || 'formulario').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}