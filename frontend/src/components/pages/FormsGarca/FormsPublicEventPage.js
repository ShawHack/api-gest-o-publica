import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarDays, CheckCircle2, MapPin, UploadCloud } from 'lucide-react'
import NotFoundPage from '../NotFound/NotFoundPage'
import { getPublicEvent, publicInscribe, publicUpload } from '../../../services/formsGarcaService'
import styles from './FormsPublicEventPage.module.css'

const emptyPerson = { userName: '', userEmail: '', userPhone: '', userCpf: '' }

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(date)
}

function Field({ field, value, onChange, onFile, uploading }) {
  const id = `public-field-${field.fieldId}`
  const common = {
    id,
    name: field.fieldId,
    required: !!field.required,
    'aria-describedby': field.helpText ? `${id}-help` : undefined,
  }
  const options = field.options || []

  let control
  if (field.type === 'textarea') {
    control = <textarea {...common} rows="5" placeholder={field.placeholder || ''} value={value || ''} onChange={(e) => onChange(e.target.value)} />
  } else if (field.type === 'select') {
    control = <select {...common} value={value || ''} onChange={(e) => onChange(e.target.value)}><option value="">Selecione</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
  } else if (field.type === 'radio') {
    control = <div className={styles.options}>{options.map((option) => <label key={option} className={styles.option}><input type="radio" name={field.fieldId} value={option} checked={value === option} required={field.required} onChange={() => onChange(option)} /> <span>{option}</span></label>)}</div>
  } else if (field.type === 'checkbox') {
    const selected = Array.isArray(value) ? value : []
    control = <div className={styles.options}>{options.map((option) => <label key={option} className={styles.option}><input type="checkbox" value={option} checked={selected.includes(option)} onChange={(e) => onChange(e.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} /> <span>{option}</span></label>)}</div>
  } else if (field.type === 'terms') {
    control = <label className={styles.terms}><input {...common} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> <span>{field.placeholder || 'Li e concordo com os termos apresentados.'}</span></label>
  } else if (field.type === 'file') {
    control = <label className={styles.fileBox} htmlFor={id}><UploadCloud size={22} /><span>{uploading ? 'Enviando arquivo...' : value ? 'Arquivo enviado. Clique para substituir.' : 'Selecionar arquivo'}</span><input {...common} type="file" disabled={uploading} onChange={(e) => onFile(e.target.files?.[0])} /></label>
  } else {
    const type = field.type === 'phone' || field.type === 'cpf' ? 'text' : (['text', 'email', 'number', 'date'].includes(field.type) ? field.type : 'text')
    control = <input {...common} type={type} placeholder={field.placeholder || ''} value={value || ''} onChange={(e) => onChange(e.target.value)} />
  }

  return <div className={styles.field}><label className={styles.label} htmlFor={['radio', 'checkbox', 'terms', 'file'].includes(field.type) ? undefined : id}>{field.label}{field.required && <span aria-hidden="true"> *</span>}</label>{control}{field.helpText && <small id={`${id}-help`}>{field.helpText}</small>}</div>
}

export default function FormsPublicEventPage() {
  const { slug = '' } = useParams()
  const [event, setEvent] = useState(null)
  const [person, setPerson] = useState(emptyPerson)
  const [formData, setFormData] = useState({})
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadingField, setUploadingField] = useState('')
  const [receipt, setReceipt] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setNotFound(false)
    setLoadError('')
    getPublicEvent(slug)
      .then((data) => { if (active) setEvent(data.event || data) })
      .catch((error) => {
        if (!active) return
        if (error?.response?.status === 404) setNotFound(true)
        else setLoadError('Não foi possível carregar esta inscrição agora. Tente novamente em alguns instantes.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [slug])

  const address = useMemo(() => event ? [event.local, event.endereco, event.numero, event.bairro, event.cidade, event.estado].filter(Boolean).join(' · ') : '', [event])
  const unavailable = event && event.situacao !== 'disponivel'

  const uploadField = async (field, file) => {
    if (!file) return
    setSubmitError('')
    setUploadingField(field.fieldId)
    try {
      const result = await publicUpload(file)
      const link = result.fileLink || result.url || result.path
      if (!link) throw new Error('Upload sem endereço de arquivo')
      setFormData((current) => ({ ...current, [field.fieldId]: link }))
      setFiles((current) => [...current.filter((item) => item.fieldId !== field.fieldId), { fieldId: field.fieldId, label: field.label, url: link, name: file.name }])
    } catch (error) {
      setSubmitError(error?.response?.data?.message || 'Não foi possível enviar o arquivo.')
    } finally {
      setUploadingField('')
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')
    try {
      const result = await publicInscribe(slug, { ...person, formData, arquivos: files })
      setReceipt(result.inscription || result)
    } catch (error) {
      setSubmitError(error?.response?.data?.message || 'Não foi possível concluir a inscrição. Confira os dados e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <main className={styles.statePage}><div className={styles.loader} aria-label="Carregando inscrição" /><p>Carregando inscrição...</p></main>
  if (notFound) return <NotFoundPage />
  if (loadError) return <main className={styles.statePage}><section className={styles.stateCard}><p className={styles.brand}>Sistemas SEMIT</p><h1>Conteúdo temporariamente indisponível</h1><p>{loadError}</p><button type="button" onClick={() => window.location.reload()}>Tentar novamente</button></section></main>
  if (!event) return <NotFoundPage />

  if (receipt) return <main className={styles.page} style={{ '--event-color': event.corPrimaria || '#1e3a8a' }}><section className={styles.success}><CheckCircle2 size={54} /><p className={styles.brand}>Forms Garça</p><h1>Inscrição confirmada</h1><p>{receipt.mensagemConfirmacao || 'Sua inscrição foi realizada com sucesso.'}</p><div className={styles.voucher}><span>Seu comprovante</span><strong>{receipt.voucherCode}</strong></div><p>Guarde este código para consultar ou apresentar sua inscrição.</p><button type="button" onClick={() => window.print()}>Imprimir comprovante</button></section></main>

  return <main className={styles.page} style={{ '--event-color': event.corPrimaria || '#1e3a8a' }}>
    <header className={styles.hero}>
      {event.bannerUrl && <img className={styles.banner} src={event.bannerUrl} alt="" />}
      <div className={styles.heroOverlay} />
      <div className={styles.heroContent}>
        {event.logoUrl && <img className={styles.logo} src={event.logoUrl} alt={`Logo de ${event.titulo}`} />}
        <p className={styles.brand}>Forms Garça · Prefeitura de Garça</p>
        <h1>{event.titulo}</h1>
        {event.subtitulo && <p className={styles.subtitle}>{event.subtitulo}</p>}
        <div className={styles.meta}>{event.dataEvento && <span><CalendarDays size={18} /> {formatDate(event.dataEvento)}</span>}{address && <span><MapPin size={18} /> {address}</span>}</div>
      </div>
    </header>

    <div className={styles.content}>
      <section className={styles.intro}>
        {event.descricao && <p>{event.descricao}</p>}
        {event.orientacoesInscricao && <aside><strong>Orientações para inscrição</strong><p>{event.orientacoesInscricao}</p></aside>}
        {unavailable && <div className={styles.unavailable} role="status"><strong>Inscrições indisponíveis</strong><p>{event.motivo || 'Este formulário não está recebendo novas inscrições.'}</p></div>}
      </section>

      {!unavailable && <form className={styles.form} onSubmit={submit}>
        <div className={styles.formHeading}><span>Inscrição</span><h2>Preencha seus dados</h2><p>Os campos marcados com * são obrigatórios.</p></div>
        <div className={styles.grid}>
          <div className={styles.field}><label className={styles.label} htmlFor="public-name">Nome completo *</label><input id="public-name" required autoComplete="name" value={person.userName} onChange={(e) => setPerson({ ...person, userName: e.target.value })} /></div>
          <div className={styles.field}><label className={styles.label} htmlFor="public-email">E-mail *</label><input id="public-email" type="email" required autoComplete="email" value={person.userEmail} onChange={(e) => setPerson({ ...person, userEmail: e.target.value })} /></div>
          <div className={styles.field}><label className={styles.label} htmlFor="public-phone">Telefone</label><input id="public-phone" autoComplete="tel" value={person.userPhone} onChange={(e) => setPerson({ ...person, userPhone: e.target.value })} /></div>
          <div className={styles.field}><label className={styles.label} htmlFor="public-cpf">CPF</label><input id="public-cpf" inputMode="numeric" value={person.userCpf} onChange={(e) => setPerson({ ...person, userCpf: e.target.value })} /></div>
        </div>
        {(event.campos || []).length > 0 && <div className={styles.customFields}>{event.campos.map((field) => <Field key={field.fieldId} field={field} value={formData[field.fieldId]} uploading={uploadingField === field.fieldId} onChange={(value) => setFormData((current) => ({ ...current, [field.fieldId]: value }))} onFile={(file) => uploadField(field, file)} />)}</div>}
        {submitError && <div className={styles.error} role="alert">{submitError}</div>}
        <button className={styles.submit} type="submit" disabled={submitting || !!uploadingField}>{submitting ? 'Confirmando inscrição...' : 'Confirmar inscrição'}</button>
      </form>}
      <footer className={styles.footer}>Prefeitura Municipal de Garça · Secretaria Municipal de Inovação e Tecnologia</footer>
    </div>
  </main>
}
