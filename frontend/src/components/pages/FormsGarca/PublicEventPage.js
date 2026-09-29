import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Copy,
  Printer,
  ChevronRight,
  ExternalLink,
  UploadCloud,
  FileCheck,
  Building2,
  Sparkles
} from 'lucide-react'
import { getPublicEvent, publicInscribe, publicUpload } from '../../../services/formsGarcaService'
import styles from './PublicEventPage.module.css'

// Helper para formatar CPF
function formatCPF(val) {
  return String(val || '')
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

// Helper para formatar Telefone
function formatPhone(val) {
  const digits = String(val || '').replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
}

// Helper de formatação de data
function formatDate(isoStr) {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return isoStr
  }
}

export default function PublicEventPage() {
  const { slug } = useParams()
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')

  // Estado do formulário de inscrição
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [userCpf, setUserCpf] = useState('')
  const [formData, setFormData] = useState({})
  const [arquivos, setArquivos] = useState([])
  const [uploadingFiles, setUploadingFiles] = useState({})

  // Estado de envio e comprovante
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [copiedVoucher, setCopiedVoucher] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await getPublicEvent(slug)
        setEvent(res.event)
      } catch (err) {
        setError(err.response?.data?.message || 'Evento não encontrado ou indisponível no momento.')
      } finally {
        setLoading(false)
      }
    }
    if (slug) load()
  }, [slug])

  const handleFieldChange = (fieldId, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }))
  }

  const handleCheckboxChange = (fieldId, option, checked) => {
    setFormData((prev) => {
      const currentList = Array.isArray(prev[fieldId]) ? prev[fieldId] : []
      if (checked) {
        return { ...prev, [fieldId]: [...currentList, option] }
      }
      return { ...prev, [fieldId]: currentList.filter((item) => item !== option) }
    })
  }

  const handleFileUpload = async (fieldId, file) => {
    if (!file) return
    setUploadingFiles((prev) => ({ ...prev, [fieldId]: true }))
    setFormError('')
    try {
      const res = await publicUpload(file)
      handleFieldChange(fieldId, res.fileLink)
      setArquivos((prev) => [
        ...prev,
        {
          fieldId,
          originalName: res.originalName,
          size: res.size,
          fileLink: res.fileLink,
        },
      ])
    } catch (err) {
      setFormError(err.response?.data?.message || 'Erro ao realizar upload do arquivo.')
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [fieldId]: false }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!userName.trim() || !userEmail.trim()) {
      setFormError('Por favor, informe seu Nome Completo e E-mail.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        userName: userName.trim(),
        userEmail: userEmail.trim(),
        userPhone: userPhone.trim(),
        userCpf: userCpf.trim(),
        formData,
        arquivos,
      }
      const res = await publicInscribe(slug, payload)
      setConfirmation(res.inscription)
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Não foi possível concluir a inscrição. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const copyVoucher = () => {
    if (!confirmation?.voucherCode) return
    navigator.clipboard.writeText(confirmation.voucherCode)
    setCopiedVoucher(true)
    setTimeout(() => setCopiedVoucher(false), 2000)
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Carregando informações do evento...</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} className={styles.errorIcon} />
        <h2>Evento Indisponível</h2>
        <p>{error || 'O evento que você procura não está publicado ou foi finalizado.'}</p>
        <a href="https://garca.sp.gov.br" className={styles.btnBack}>
          Ir para o Portal da Prefeitura
        </a>
      </div>
    )
  }

  // TELA DE COMPROVANTE OFICIAL
  if (confirmation) {
    const qrTarget = `${window.location.origin}/formularios/evento/${slug}?voucher=${confirmation.voucherCode}`
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.voucherContainer}>
          <div className={styles.voucherHeader}>
            <CheckCircle2 size={54} color="#16a34a" />
            <h2>Inscrição Confirmada com Sucesso!</h2>
            <p>Guarde o comprovante abaixo com seu código de inscrição.</p>
          </div>

          <div className={styles.voucherCard} id="comprovante-oficial">
            <div className={styles.voucherCardHeader}>
              <div className={styles.voucherCardHeaderInfo}>
                <span className={styles.badgeGov}>Prefeitura Municipal de Garça</span>
                <h3>{event.titulo}</h3>
                {event.subtitulo && <p className={styles.cardSubtitle}>{event.subtitulo}</p>}
              </div>
              <div className={styles.voucherCodeBox}>
                <span className={styles.voucherCodeLabel}>CÓDIGO DE INSCRIÇÃO</span>
                <strong className={styles.voucherCodeText}>{confirmation.voucherCode}</strong>
              </div>
            </div>

            <div className={styles.voucherDetailsGrid}>
              <div>
                <span className={styles.detailLabel}>Participante:</span>
                <strong>{confirmation.userName}</strong>
              </div>
              <div>
                <span className={styles.detailLabel}>E-mail:</span>
                <strong>{confirmation.userEmail}</strong>
              </div>
              <div>
                <span className={styles.detailLabel}>Data do Evento:</span>
                <strong>{formatDate(event.dataEvento)}</strong>
              </div>
              <div>
                <span className={styles.detailLabel}>Localização:</span>
                <strong>{event.local || 'Garça / SP'}</strong>
              </div>
            </div>

            {confirmation.mensagemConfirmacao && (
              <div className={styles.voucherMessage}>
                <strong>Orientações:</strong>
                <p>{confirmation.mensagemConfirmacao}</p>
              </div>
            )}

            <div className={styles.voucherFooter}>
              <div className={styles.qrCodeBox}>
                <svg
                  className={styles.qrCodeSvg}
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="100" height="100" fill="#ffffff" />
                  <path
                    d="M10 10H40V40H10V10ZM16 16V34H34V16H16ZM60 10H90V40H60V10ZM66 16V34H84V16H66ZM10 60H40V90H10V60ZM16 66V84H34V66H16ZM50 50H60V60H50V50ZM60 60H70V70H60V60ZM70 70H80V80H70V70ZM80 80H90V90H80V80ZM50 70H60V80H50V70ZM70 50H80V60H70V50ZM80 60H90V70H80V60ZM60 80H70V90H60V80ZM22 22H28V28H22V22ZM72 22H78V28H72V22ZM22 72H28V78H22V72Z"
                    fill="#1e293b"
                  />
                </svg>
                <small>Autenticação oficial do voucher</small>
              </div>
              <div className={styles.voucherAuditInfo}>
                <span>Registrado em: {new Date(confirmation.createdAt).toLocaleString('pt-BR')}</span>
                <span>Validação oficial em: <code>{confirmation.voucherCode}</code></span>
              </div>
            </div>
          </div>

          <div className={styles.voucherActions}>
            <button type="button" className={styles.btnPrint} onClick={() => window.print()}>
              <Printer size={18} /> Imprimir Comprovante
            </button>
            <button type="button" className={styles.btnCopy} onClick={copyVoucher}>
              <Copy size={18} /> {copiedVoucher ? 'Copiado!' : 'Copiar Código'}
            </button>
            <button
              type="button"
              className={styles.btnReset}
              onClick={() => {
                setConfirmation(null)
                setUserName('')
                setUserEmail('')
                setUserPhone('')
                setUserCpf('')
                setFormData({})
                setArquivos([])
              }}
            >
              Nova Inscrição
            </button>
          </div>
        </div>
      </div>
    )
  }

  const primaryColor = event.corPrimaria || '#1e3a8a'
  const isAvailable = event.situacao === 'disponivel'

  return (
    <div className={styles.pageWrapper} style={{ '--event-primary': primaryColor }}>
      {/* BANNER SUPERIOR */}
      <header className={styles.bannerHeader}>
        {event.bannerUrl ? (
          <img src={event.bannerUrl} alt={event.titulo} className={styles.bannerImg} />
        ) : (
          <div className={styles.bannerFallback} style={{ background: `linear-gradient(135deg, ${primaryColor}, #0f172a)` }}>
            <Building2 size={64} className={styles.bannerIcon} />
          </div>
        )}
      </header>

      <main className={styles.contentContainer}>
        {/* IDENTIDADE E CABEÇALHO */}
        <section className={styles.eventOverview}>
          <div className={styles.identityRow}>
            {event.logoUrl ? (
              <img src={event.logoUrl} alt="Logo" className={styles.eventLogo} />
            ) : (
              <div className={styles.eventLogoFallback}>
                <Sparkles size={28} color={primaryColor} />
              </div>
            )}
            <div className={styles.titleGroup}>
              <div className={styles.badgeRow}>
                <span className={styles.badgeType}>
                  {event.tipoEvento === 'online' ? 'Evento Online' : event.tipoEvento === 'hibrido' ? 'Evento Híbrido' : 'Presencial'}
                </span>
                <span className={`${styles.badgeStatus} ${styles['status_' + event.situacao]}`}>
                  {event.situacao === 'disponivel' && 'Inscrições Abertas'}
                  {event.situacao === 'nao_iniciada' && 'Inscrições em Breve'}
                  {event.situacao === 'encerrada' && 'Inscrições Encerradas'}
                  {event.situacao === 'esgotada' && 'Vagas Esgotadas'}
                </span>
              </div>
              <h1 className={styles.eventTitle}>{event.titulo}</h1>
              {event.subtitulo && <p className={styles.eventSubtitle}>{event.subtitulo}</p>}
            </div>
          </div>

          {/* CARDS DE INFORMAÇÕES RÁPIDAS */}
          <div className={styles.infoCardsGrid}>
            <div className={styles.infoCard}>
              <Calendar className={styles.infoIcon} />
              <div>
                <span className={styles.infoCardLabel}>Data do Evento</span>
                <strong>{formatDate(event.dataEvento)}</strong>
                {event.dataFim && <small> até {formatDate(event.dataFim)}</small>}
              </div>
            </div>

            <div className={styles.infoCard}>
              <MapPin className={styles.infoIcon} />
              <div>
                <span className={styles.infoCardLabel}>Local</span>
                <strong>{event.local || 'Garça / SP'}</strong>
                {event.endereco && (
                  <p className={styles.infoAddress}>
                    {event.endereco}
                    {event.numero && `, ${event.numero}`}
                    {event.bairro && ` - ${event.bairro}`}
                  </p>
                )}
              </div>
            </div>

            {event.vagasRestantes !== null && (
              <div className={styles.infoCard}>
                <Users className={styles.infoIcon} />
                <div>
                  <span className={styles.infoCardLabel}>Vagas Restantes</span>
                  <strong>{event.vagasRestantes} de {event.limiteInscricoes}</strong>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* DESCRIÇÃO DO EVENTO */}
        {event.descricao && (
          <section className={styles.sectionBox}>
            <h2 className={styles.sectionTitle}>Sobre o Evento</h2>
            <div className={styles.descriptionText}>
              {event.descricao.split('\n').map((paragrafo, idx) => (
                <p key={idx}>{paragrafo}</p>
              ))}
            </div>
          </section>
        )}

        {/* ORIENTAÇÕES E REGRAS */}
        {event.orientacoesInscricao && (
          <section className={styles.sectionBox}>
            <h2 className={styles.sectionTitle}>Orientações ao Participante</h2>
            <div className={styles.descriptionText}>
              <p>{event.orientacoesInscricao}</p>
            </div>
          </section>
        )}

        {/* FORMULÁRIO DE INSCRIÇÃO */}
        <section className={styles.sectionBox} id="formulario-inscricao">
          <div className={styles.formHeader}>
            <h2 className={styles.sectionTitle}>Formulário de Inscrição</h2>
            {isAvailable ? (
              <p className={styles.formSub}>Preencha seus dados para garantir a sua participação.</p>
            ) : (
              <div className={styles.warningAlert}>
                <AlertCircle size={20} />
                <span>{event.motivo || 'As inscrições para este evento não estão disponíveis no momento.'}</span>
              </div>
            )}
          </div>

          {isAvailable && (
            <form onSubmit={handleSubmit} className={styles.formBody}>
              {formError && (
                <div className={styles.errorAlert}>
                  <AlertCircle size={18} />
                  <span>{formError}</span>
                </div>
              )}

              {/* DADOS DO PARTICIPANTE */}
              <div className={styles.fieldSection}>
                <h3 className={styles.fieldSectionTitle}>Identificação do Participante</h3>
                <div className={styles.formGrid}>
                  <label className={styles.formLabel}>
                    Nome Completo *
                    <input
                      type="text"
                      className={styles.formInput}
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Seu nome completo"
                      required
                    />
                  </label>

                  <label className={styles.formLabel}>
                    E-mail para Confirmação *
                    <input
                      type="email"
                      className={styles.formInput}
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      required
                    />
                  </label>
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.formLabel}>
                    Telefone / WhatsApp
                    <input
                      type="tel"
                      className={styles.formInput}
                      value={userPhone}
                      onChange={(e) => setUserPhone(formatPhone(e.target.value))}
                      placeholder="(14) 99999-9999"
                    />
                  </label>

                  <label className={styles.formLabel}>
                    CPF
                    <input
                      type="text"
                      className={styles.formInput}
                      value={userCpf}
                      onChange={(e) => setUserCpf(formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                    />
                  </label>
                </div>
              </div>

              {/* CAMPOS DINÂMICOS DO EVENTO */}
              {Array.isArray(event.campos) && event.campos.length > 0 && (
                <div className={styles.fieldSection}>
                  <h3 className={styles.fieldSectionTitle}>Informações Complementares</h3>
                  <div className={styles.dynamicFieldsGrid}>
                    {event.campos.map((campo) => {
                      const fieldKey = campo.fieldId || campo.label
                      const isFieldRequired = Boolean(campo.required)

                      if (campo.type === 'textarea') {
                        return (
                          <label key={fieldKey} className={styles.formLabelFull}>
                            {campo.label} {isFieldRequired && '*'}
                            <textarea
                              className={styles.formTextarea}
                              value={formData[fieldKey] || ''}
                              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                              placeholder={campo.placeholder || ''}
                              required={isFieldRequired}
                            />
                            {campo.helpText && <small className={styles.helpText}>{campo.helpText}</small>}
                          </label>
                        )
                      }

                      if (campo.type === 'select') {
                        return (
                          <label key={fieldKey} className={styles.formLabel}>
                            {campo.label} {isFieldRequired && '*'}
                            <select
                              className={styles.formSelect}
                              value={formData[fieldKey] || ''}
                              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                              required={isFieldRequired}
                            >
                              <option value="">Selecione uma opção...</option>
                              {(campo.options || []).map((opt, i) => (
                                <option key={i} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                            {campo.helpText && <small className={styles.helpText}>{campo.helpText}</small>}
                          </label>
                        )
                      }

                      if (campo.type === 'radio') {
                        return (
                          <div key={fieldKey} className={styles.formGroupRadio}>
                            <span className={styles.radioGroupLabel}>
                              {campo.label} {isFieldRequired && '*'}
                            </span>
                            <div className={styles.radioOptionsList}>
                              {(campo.options || []).map((opt, i) => (
                                <label key={i} className={styles.radioOption}>
                                  <input
                                    type="radio"
                                    name={fieldKey}
                                    value={opt}
                                    checked={formData[fieldKey] === opt}
                                    onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                                    required={isFieldRequired}
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                            {campo.helpText && <small className={styles.helpText}>{campo.helpText}</small>}
                          </div>
                        )
                      }

                      if (campo.type === 'checkbox') {
                        const checkedList = Array.isArray(formData[fieldKey]) ? formData[fieldKey] : []
                        return (
                          <div key={fieldKey} className={styles.formGroupRadio}>
                            <span className={styles.radioGroupLabel}>
                              {campo.label} {isFieldRequired && '*'}
                            </span>
                            <div className={styles.radioOptionsList}>
                              {(campo.options || []).map((opt, i) => (
                                <label key={i} className={styles.radioOption}>
                                  <input
                                    type="checkbox"
                                    checked={checkedList.includes(opt)}
                                    onChange={(e) => handleCheckboxChange(fieldKey, opt, e.target.checked)}
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                            {campo.helpText && <small className={styles.helpText}>{campo.helpText}</small>}
                          </div>
                        )
                      }

                      if (campo.type === 'file') {
                        const uploadedLink = formData[fieldKey]
                        const isUploading = uploadingFiles[fieldKey]
                        return (
                          <div key={fieldKey} className={styles.fileUploadBox}>
                            <span className={styles.fileUploadLabel}>
                              {campo.label} {isFieldRequired && '*'}
                            </span>
                            {uploadedLink ? (
                              <div className={styles.fileUploadedSuccess}>
                                <FileCheck size={20} color="#16a34a" />
                                <span>Arquivo anexado com sucesso!</span>
                                <a href={uploadedLink} target="_blank" rel="noreferrer" className={styles.linkViewFile}>
                                  Visualizar
                                </a>
                              </div>
                            ) : (
                              <label className={styles.fileDropArea}>
                                <UploadCloud size={24} />
                                <span>{isUploading ? 'Enviando arquivo...' : 'Clique para selecionar o arquivo'}</span>
                                <input
                                  type="file"
                                  className={styles.fileInputHidden}
                                  disabled={isUploading}
                                  onChange={(e) => handleFileUpload(fieldKey, e.target.files[0])}
                                  required={isFieldRequired && !uploadedLink}
                                />
                              </label>
                            )}
                            {campo.helpText && <small className={styles.helpText}>{campo.helpText}</small>}
                          </div>
                        )
                      }

                      if (campo.type === 'terms') {
                        return (
                          <label key={fieldKey} className={styles.termsLabel}>
                            <input
                              type="checkbox"
                              checked={Boolean(formData[fieldKey])}
                              onChange={(e) => handleFieldChange(fieldKey, e.target.checked)}
                              required={isFieldRequired}
                            />
                            <span>{campo.label}</span>
                          </label>
                        )
                      }

                      // Padrão para text, number, email, date, phone, cpf
                      return (
                        <label key={fieldKey} className={styles.formLabel}>
                          {campo.label} {isFieldRequired && '*'}
                          <input
                            type={
                              campo.type === 'number'
                                ? 'number'
                                : campo.type === 'email'
                                ? 'email'
                                : campo.type === 'date'
                                ? 'date'
                                : 'text'
                            }
                            className={styles.formInput}
                            value={formData[fieldKey] || ''}
                            onChange={(e) => {
                              let val = e.target.value
                              if (campo.type === 'cpf') val = formatCPF(val)
                              if (campo.type === 'phone') val = formatPhone(val)
                              handleFieldChange(fieldKey, val)
                            }}
                            placeholder={campo.placeholder || ''}
                            required={isFieldRequired}
                          />
                          {campo.helpText && <small className={styles.helpText}>{campo.helpText}</small>}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* BOTÃO DE CONFIRMAR INSCRIÇÃO */}
              <div className={styles.formSubmitRow}>
                <button
                  type="submit"
                  className={styles.btnSubmit}
                  disabled={submitting}
                  style={{ backgroundColor: primaryColor }}
                >
                  {submitting ? 'Confirmando inscrição...' : 'Confirmar Inscrição'}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* ORGANIZADOR / RODAPÉ DO EVENTO */}
        {event.organizadorNome && (
          <footer className={styles.eventFooter}>
            <div className={styles.organizerCard}>
              <span className={styles.organizerLabel}>Realização e Organização</span>
              <strong>{event.organizadorNome}</strong>
              {event.organizadorDescricao && <p>{event.organizadorDescricao}</p>}
            </div>
          </footer>
        )}
      </main>
    </div>
  )
}
