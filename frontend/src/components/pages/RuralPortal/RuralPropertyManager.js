import { useEffect, useState } from 'react'
import { deleteManagedRuralProperty, listManagedRuralProperties, updateManagedRuralProperty } from '../../../services/ruralPortalService'
import { RURAL_NEIGHBORHOODS } from './ruralNeighborhoods'
import styles from './RuralPortal.module.css'

const messageOf = (error) => error?.response?.data?.message || error?.message || 'Não foi possível concluir a operação.'

function editableProperty(property) {
  const profile = property.profile || {}
  return {
    ...property,
    personal: {
      fullName: profile.personal?.fullName || '', birthDate: profile.personal?.birthDate ? String(profile.personal.birthDate).slice(0, 10) : '',
      phone: profile.personal?.phone || '', whatsapp: profile.personal?.whatsapp || '', email: profile.personal?.email || '', mailingAddress: profile.personal?.mailingAddress || '',
    },
    profileProperty: {
      name: profile.property?.name || property.name || '', ruralNeighborhood: profile.property?.ruralNeighborhood || '',
      totalAreaHectares: profile.property?.totalAreaHectares ?? '', relationship: profile.property?.relationship || 'owner',
      activities: (profile.property?.activities || []).join(', '), residents: profile.property?.residents ?? '',
      accessNotes: profile.property?.accessNotes || '', notes: profile.property?.notes || '',
    },
  }
}

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
      const payload = { codigoUpa: editing.codigoUpa, name: editing.name }
      if (editing.profile) payload.profile = {
        personal: editing.personal,
        property: {
          ...editing.profileProperty,
          totalAreaHectares: editing.profileProperty.totalAreaHectares === '' ? null : Number(editing.profileProperty.totalAreaHectares),
          residents: editing.profileProperty.residents === '' ? null : Number(editing.profileProperty.residents),
          activities: editing.profileProperty.activities.split(',').map((item) => item.trim()).filter(Boolean),
        },
      }
      await updateManagedRuralProperty(editing._id, payload)
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
    {editing.profile ? <>
      <h3>Dados do proprietário</h3>
      <div className={styles.gridTwo}>
        <EditField label="Nome completo *" name="fullName" value={editing.personal.fullName} setEditing={setEditing} group="personal" required />
        <EditField label="Data de nascimento" name="birthDate" type="date" value={editing.personal.birthDate} setEditing={setEditing} group="personal" />
        <EditField label="Telefone *" name="phone" value={editing.personal.phone} setEditing={setEditing} group="personal" required />
        <EditField label="WhatsApp" name="whatsapp" value={editing.personal.whatsapp} setEditing={setEditing} group="personal" />
        <EditField label="E-mail" name="email" type="email" value={editing.personal.email} setEditing={setEditing} group="personal" />
        <EditField label="Endereço para correspondência" name="mailingAddress" value={editing.personal.mailingAddress} setEditing={setEditing} group="personal" />
      </div>
      <h3>Dados informados da propriedade</h3>
      <div className={styles.gridTwo}>
        <EditField label="Nome informado" name="name" value={editing.profileProperty.name} setEditing={setEditing} group="profileProperty" />
        <label className={styles.field}>Bairro rural<select value={editing.profileProperty.ruralNeighborhood} onChange={({ target }) => updateGroup(setEditing, 'profileProperty', 'ruralNeighborhood', target.value)}><option value="">Selecione</option>{RURAL_NEIGHBORHOODS.map((name) => <option key={name}>{name}</option>)}</select></label>
        <EditField label="Área total (hectares)" name="totalAreaHectares" type="number" value={editing.profileProperty.totalAreaHectares} setEditing={setEditing} group="profileProperty" />
        <EditField label="Moradores" name="residents" type="number" value={editing.profileProperty.residents} setEditing={setEditing} group="profileProperty" />
        <label className={styles.field}>Vínculo<select value={editing.profileProperty.relationship} onChange={({ target }) => updateGroup(setEditing, 'profileProperty', 'relationship', target.value)}><option value="owner">Proprietário</option><option value="tenant">Arrendatário</option><option value="partner">Parceiro</option><option value="possessor">Possuidor</option><option value="other">Outro</option></select></label>
        <EditField label="Atividades" name="activities" value={editing.profileProperty.activities} setEditing={setEditing} group="profileProperty" />
      </div>
      <EditField label="Condições de acesso" name="accessNotes" value={editing.profileProperty.accessNotes} setEditing={setEditing} group="profileProperty" textarea />
      <EditField label="Observações" name="notes" value={editing.profileProperty.notes} setEditing={setEditing} group="profileProperty" textarea />
    </> : <p>O proprietário ainda não preencheu o cadastro detalhado.</p>}
    <div className={styles.actions}><button className={styles.button} disabled={loading}>Salvar alterações</button><button className={styles.buttonSecondary} type="button" onClick={() => setEditing(null)}>Cancelar</button></div>
    {error && <div role="alert" className={styles.error}>{error}</div>}
  </form>

  return <section>
    <div className={styles.managerHeading}><div><h2>Propriedades cadastradas</h2><p>Consulte, edite ou exclua propriedades da lista ativa.</p></div><button className={styles.buttonSecondary} type="button" onClick={load}>Atualizar</button></div>
    {error && <div role="alert" className={styles.error}>{error}</div>}{loading && <p>Carregando propriedades…</p>}{!loading && !items.length && <p>Nenhuma propriedade ativa cadastrada.</p>}
    <div className={styles.propertyList}>{items.map((property) => <article className={styles.propertyItem} key={property._id}>
      <div><strong>{property.name || 'Propriedade sem nome'}</strong><span>UPA: {property.codigoUpa}</span><code>{property.plusCode}</code><small>Situação: {property.status}{property.account ? ` • CPF final ${property.account.cpfLast4}` : ' • sem acesso vinculado'}</small></div>
      <div className={styles.actions}><button className={styles.buttonSecondary} type="button" onClick={() => setEditing(editableProperty(property))}>Editar</button><button className={styles.buttonDanger} type="button" onClick={() => remove(property)}>Excluir</button></div>
    </article>)}</div>
  </section>
}

function updateGroup(setEditing, group, name, value) { setEditing((current) => ({ ...current, [group]: { ...current[group], [name]: value } })) }

function EditField({ label, name, value, setEditing, group, type = 'text', required = false, textarea = false }) {
  const control = textarea ? <textarea value={value} onChange={({ target }) => updateGroup(setEditing, group, name, target.value)} required={required} /> : <input type={type} value={value} onChange={({ target }) => updateGroup(setEditing, group, name, target.value)} required={required} />
  return <label className={styles.field}>{label}{control}</label>
}
