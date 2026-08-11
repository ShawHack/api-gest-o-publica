import { useEffect, useState } from 'react'
import { deleteManagedRuralProperty, listManagedRuralProperties, updateManagedRuralProperty } from '../../../services/ruralPortalService'
import styles from './RuralPortal.module.css'

const messageOf = (error) => error?.response?.data?.message || error?.message || 'Não foi possível concluir a operação.'

export default function RuralPropertyManager() {
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    try { setItems((await listManagedRuralProperties()).items || []) }
    catch (requestError) { setError(messageOf(requestError)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function save(event) {
    event.preventDefault(); setLoading(true); setError('')
    try {
      await updateManagedRuralProperty(editing._id, { codigoUpa: editing.codigoUpa, name: editing.name })
      setEditing(null); await load()
    } catch (requestError) { setError(messageOf(requestError)); setLoading(false) }
  }

  async function remove(property) {
    if (!window.confirm(`Excluir a propriedade ${property.name || property.codigoUpa}? O acesso do proprietário será desativado.`)) return
    setLoading(true); setError('')
    try { await deleteManagedRuralProperty(property._id); await load() }
    catch (requestError) { setError(messageOf(requestError)); setLoading(false) }
  }

  if (editing) return <form className={styles.form} onSubmit={save}>
    <h2>Editar propriedade</h2>
    <label className={styles.field}>Plus Code<input value={editing.plusCode} disabled /></label>
    <label className={styles.field}>Código da UPA *<input value={editing.codigoUpa} onChange={({ target }) => setEditing((current) => ({ ...current, codigoUpa: target.value }))} required /></label>
    <label className={styles.field}>Nome da propriedade<input value={editing.name || ''} onChange={({ target }) => setEditing((current) => ({ ...current, name: target.value }))} /></label>
    <div className={styles.actions}>
      <button className={styles.button} disabled={loading}>Salvar alterações</button>
      <button className={styles.buttonSecondary} type="button" onClick={() => setEditing(null)}>Cancelar</button>
    </div>
    {error && <div role="alert" className={styles.error}>{error}</div>}
  </form>

  return <section>
    <div className={styles.managerHeading}><div><h2>Propriedades cadastradas</h2><p>Consulte, edite ou exclua propriedades da lista ativa.</p></div><button className={styles.buttonSecondary} type="button" onClick={load}>Atualizar</button></div>
    {error && <div role="alert" className={styles.error}>{error}</div>}
    {loading && <p>Carregando propriedades…</p>}
    {!loading && !items.length && <p>Nenhuma propriedade ativa cadastrada.</p>}
    <div className={styles.propertyList}>
      {items.map((property) => <article className={styles.propertyItem} key={property._id}>
        <div><strong>{property.name || 'Propriedade sem nome'}</strong><span>UPA: {property.codigoUpa}</span><code>{property.plusCode}</code><small>Situação: {property.status}{property.account ? ` • CPF final ${property.account.cpfLast4}` : ' • sem acesso vinculado'}</small></div>
        <div className={styles.actions}><button className={styles.buttonSecondary} type="button" onClick={() => setEditing(property)}>Editar</button><button className={styles.buttonDanger} type="button" onClick={() => remove(property)}>Excluir</button></div>
      </article>)}
    </div>
  </section>
}
