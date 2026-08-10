import { useEffect, useState } from 'react'
import { ENTITY_TYPE_LABELS, mediaUrl } from '../educationUtils'
import {
  EMPTY_UNIT_FORM,
  SCHOOL_UNIT_TYPES,
  buildSchoolUnitFormData,
  entityToUnitForm,
  fetchAddressByCep,
  formatCep,
  formatPhone,
  getUnitImagePath,
} from './entityUnitFormUtils'
import styles from './EducationAdminPortal.module.css'

const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

export default function EntityUnitForm({
  mode = 'create',
  entity = null,
  variant = 'unit',
  onSubmit,
  onCancel,
  submitting = false,
  submitLabel,
}) {
  const isCouncilVariant = variant === 'council'
  const [form, setForm] = useState(() => {
    if (mode === 'edit' && entity) return entityToUnitForm(entity)
    if (isCouncilVariant) return { ...EMPTY_UNIT_FORM, type: 'conselho' }
    return { ...EMPTY_UNIT_FORM }
  })
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [managerPhotoFile, setManagerPhotoFile] = useState(null)
  const [managerPhotoPreview, setManagerPhotoPreview] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError] = useState('')

  useEffect(() => {
    if (mode === 'edit' && entity) {
      setForm(entityToUnitForm(entity))
      setCoverFile(null)
      setManagerPhotoFile(null)
      const imagePath = getUnitImagePath(entity)
      setCoverPreview(imagePath ? mediaUrl(imagePath) : '')
      setManagerPhotoPreview(entity.managerPhotoUrl ? mediaUrl(entity.managerPhotoUrl) : '')
      return
    }
    if (mode === 'create') {
      setForm(isCouncilVariant ? { ...EMPTY_UNIT_FORM, type: 'conselho' } : { ...EMPTY_UNIT_FORM })
      setCoverFile(null)
      setCoverPreview('')
      setManagerPhotoFile(null)
      setManagerPhotoPreview('')
    }
  }, [entity, mode])

  useEffect(() => {
    if (!coverFile) return undefined
    const url = URL.createObjectURL(coverFile)
    setCoverPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [coverFile])

  useEffect(() => {
    if (!managerPhotoFile) return undefined
    const url = URL.createObjectURL(managerPhotoFile)
    setManagerPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [managerPhotoFile])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleCepBlur() {
    const digits = form.cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setCepLoading(true)
    setCepError('')
    try {
      const data = await fetchAddressByCep(form.cep)
      if (!data) {
        setCepError('CEP não encontrado.')
        return
      }
      setForm((prev) => ({
        ...prev,
        street: data.street || prev.street,
        neighborhood: data.neighborhood || prev.neighborhood,
        city: data.city || prev.city,
        state: data.state || prev.state,
        complement: prev.complement || data.complement || '',
      }))
    } catch {
      setCepError('Não foi possível consultar o CEP.')
    } finally {
      setCepLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const fd = buildSchoolUnitFormData(form, {
      coverFile,
      managerPhotoFile,
      includeStatus: mode === 'edit',
    })
    onSubmit(fd)
  }

  const isCouncil = form.type === 'conselho'

  return (
    <form onSubmit={handleSubmit} className={styles.entityForm}>
      <section className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>Identificação</h4>
        <div className={styles.formRow}>
          <label className={`${styles.field} ${styles.formRowFull}`}>
            {isCouncil ? 'Nome do conselho' : 'Nome da unidade'}
            <input
              required
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder={isCouncil ? 'Ex.: Conselho Municipal de Educação' : 'Ex.: EMEF Prof. João Silva'}
            />
          </label>
          {!isCouncilVariant && (
          <label className={styles.field}>
            Tipo
            <select
              value={form.type}
              onChange={(e) => updateField('type', e.target.value)}
            >
              {SCHOOL_UNIT_TYPES.map((k) => (
                <option key={k} value={k}>{ENTITY_TYPE_LABELS[k] || k}</option>
              ))}
            </select>
          </label>
          )}
          <label className={styles.field}>
            Slug (opcional)
            <input
              value={form.slug}
              onChange={(e) => updateField('slug', e.target.value)}
              placeholder="gerado automaticamente se vazio"
            />
          </label>
          {mode === 'edit' && (
            <label className={styles.field}>
              Unidade ativa
              <select
                value={form.isActive ? '1' : '0'}
                onChange={(e) => updateField('isActive', e.target.value === '1')}
              >
                <option value="1">Sim</option>
                <option value="0">Não</option>
              </select>
            </label>
          )}
          <label className={`${styles.field} ${styles.formRowFull}`}>
            Descrição institucional (opcional)
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Breve apresentação da unidade para o portal público"
            />
          </label>
        </div>
      </section>

      <section className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>Imagem da unidade</h4>
        <div className={styles.formRow}>
          <label className={`${styles.field} ${styles.formRowFull}`}>
            Foto da unidade
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
            />
            <span className={styles.fieldHint}>JPG, PNG ou WebP — recomendado 1200×630 px</span>
          </label>
          {coverPreview && (
            <div className={styles.formRowFull}>
              <img src={coverPreview} alt="Prévia da unidade" className={styles.previewThumb} />
            </div>
          )}
        </div>
      </section>

      {!isCouncil && (
        <section className={styles.formSection}>
          <h4 className={styles.formSectionTitle}>Diretor(a)</h4>
          <div className={styles.formRow}>
            <label className={`${styles.field} ${styles.formRowFull}`}>
              Nome do diretor(a)
              <input
                value={form.managerName}
                onChange={(e) => updateField('managerName', e.target.value)}
                placeholder="Ex.: Profª Maria Silva"
              />
            </label>
            <label className={`${styles.field} ${styles.formRowFull}`}>
              Foto do diretor(a)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setManagerPhotoFile(e.target.files?.[0] || null)}
              />
              <span className={styles.fieldHint}>JPG, PNG ou WebP — foto institucional</span>
            </label>
            {managerPhotoPreview && (
              <div className={styles.formRowFull}>
                <img
                  src={managerPhotoPreview}
                  alt="Prévia do diretor(a)"
                  className={styles.directorThumb}
                />
              </div>
            )}
          </div>
        </section>
      )}

      <section className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>Contato</h4>
        <div className={styles.formRow}>
          <label className={styles.field}>
            Telefone fixo
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => updateField('phone', formatPhone(e.target.value))}
              placeholder="(17) 3456-7890"
            />
          </label>
          <label className={styles.field}>
            WhatsApp
            <input
              type="tel"
              value={form.whatsapp}
              onChange={(e) => updateField('whatsapp', formatPhone(e.target.value))}
              placeholder="(17) 99999-9999"
            />
          </label>
          <label className={`${styles.field} ${styles.formRowFull}`}>
            E-mail
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="unidade@garca.sp.gov.br (opcional)"
            />
          </label>
        </div>
      </section>

      <section className={styles.formSection}>
        <h4 className={styles.formSectionTitle}>Endereço completo (opcional)</h4>
        <div className={styles.formRow}>
          <label className={styles.field}>
            CEP
            <input
              value={form.cep}
              onChange={(e) => updateField('cep', formatCep(e.target.value))}
              onBlur={handleCepBlur}
              placeholder="17400-000"
              inputMode="numeric"
            />
            {cepLoading && <span className={styles.fieldHint}>Consultando CEP...</span>}
            {cepError && <span className={styles.fieldError}>{cepError}</span>}
          </label>
          <label className={`${styles.field} ${styles.formRowFull}`}>
            Rua / Logradouro
            <input
              value={form.street}
              onChange={(e) => updateField('street', e.target.value)}
              placeholder="Av. São Paulo"
            />
          </label>
          <label className={styles.field}>
            Número
            <input
              value={form.number}
              onChange={(e) => updateField('number', e.target.value)}
              placeholder="123"
            />
          </label>
          <label className={styles.field}>
            Complemento
            <input
              value={form.complement}
              onChange={(e) => updateField('complement', e.target.value)}
              placeholder="Sala, bloco, referência"
            />
          </label>
          <label className={styles.field}>
            Bairro
            <input
              value={form.neighborhood}
              onChange={(e) => updateField('neighborhood', e.target.value)}
              placeholder="Centro"
            />
          </label>
          <label className={styles.field}>
            Cidade
            <input
              value={form.city}
              onChange={(e) => updateField('city', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            Estado
            <select value={form.state} onChange={(e) => updateField('state', e.target.value)}>
              {BRAZIL_STATES.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {isCouncil && (
        <section className={styles.formSection}>
          <h4 className={styles.formSectionTitle}>Dados do conselho</h4>
          <div className={styles.formRow}>
            <label className={styles.field}>
              Código do conselho
              <input
                value={form.councilCode}
                onChange={(e) => updateField('councilCode', e.target.value)}
                placeholder="CME, CAE, CACS-FUNDEB..."
              />
            </label>
            <label className={`${styles.field} ${styles.formRowFull}`}>
              Competências
              <textarea
                rows={3}
                value={form.competencies}
                onChange={(e) => updateField('competencies', e.target.value)}
              />
            </label>
            <label className={`${styles.field} ${styles.formRowFull}`}>
              Base legal
              <textarea
                rows={2}
                value={form.legalBasis}
                onChange={(e) => updateField('legalBasis', e.target.value)}
              />
            </label>
            <label className={`${styles.field} ${styles.formRowFull}`}>
              Apresentação institucional
              <textarea
                rows={3}
                value={form.institutionalAbout}
                onChange={(e) => updateField('institutionalAbout', e.target.value)}
              />
            </label>
          </div>
        </section>
      )}

      <div className={styles.formActions}>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
          {submitting ? 'Salvando...' : (submitLabel || (mode === 'edit' ? 'Salvar alterações' : 'Criar unidade'))}
        </button>
        {onCancel && (
          <button type="button" className={styles.btn} onClick={onCancel} disabled={submitting}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
