import { useState } from 'react'
import { updateEntity } from '../../../../services/educationService'
import EntityUnitForm from './EntityUnitForm'
import styles from './EducationAdminPortal.module.css'

export default function EntityEditPanel({ entity, onSaved, onCancel, showMsg }) {
  const [saving, setSaving] = useState(false)

  async function handleSubmit(formData) {
    if (!entity?._id) return
    setSaving(true)
    try {
      await updateEntity(entity._id, formData)
      showMsg('Unidade atualizada.')
      onSaved?.()
    } catch (err) {
      showMsg(err?.response?.data?.error || 'Erro ao salvar.', false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.panel} style={{ marginTop: '1rem' }}>
      <h3 style={{ marginTop: 0 }}>Editar unidade: {entity.name}</h3>
      <EntityUnitForm
        key={entity._id}
        mode="edit"
        entity={entity}
        submitting={saving}
        onSubmit={handleSubmit}
        onCancel={onCancel}
      />
    </div>
  )
}
