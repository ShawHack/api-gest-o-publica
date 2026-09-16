import { useEffect, useState } from 'react'
import {
  accessFlags, applyTheme, CATEGORIES, categoryId, categoryLabel, contentHref, contentLines, coverImage, href,
  isGovernanceContent, mediaAsDocuments, MEETING_DOC_LABELS, meetingHeadline, meetingTitle, meetingWhen, parsePath,
  portalFooter, portalHeadline, portalKicker, portalLead, portalName, fileNameFromUrl, footerContacts, governanceLabel,
  AMENITIES_CATALOG, GASTRO_SERVICES_CATALOG, PAYMENT_METHODS_CATALOG, PRICE_RANGE_LABELS, DAYS_OF_WEEK_MAP, cleanWhatsapp, galleryImages,
  EVENT_FEATURES_CATALOG, EVENT_AGE_RATINGS_CATALOG, eventTemporalStatus, formatEventDateTime,
  ATTRACTION_FEATURES_CATALOG, ATTRACTION_ACCESS_CATALOG, ATTRACTION_AUDIENCES_CATALOG,
} from './catalog.js'
import { fetchBranding, fetchContent, fetchContentBySlug, fetchMeetingBySlug, fetchMeetings } from './api.js'
import AuthScreens, { AccountMenu } from './AuthScreens.jsx'

function navigate(path) {
  window.history.pushState({}, '', href(path))
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const MAPA_TURISTICO = '/mapaturistico/'
const MAPA_TURISTICO_ATTRS = { href: MAPA_TURISTICO, target: '_blank', rel: 'noopener noreferrer' }

function PlaceCard({ item }) {
  const flags = accessFlags(item)
  const image = coverImage(item)
  const isEvent = item.type === 'event'
  const tempStatus = isEvent ? eventTemporalStatus(item.startsAt || item.metadata?.startsAt, item.endsAt || item.metadata?.endsAt, item.metadata?.allDay) : null

  return (
    <a className="card" href={contentHref(item)} onClick={(event) => {
      if (item?.type === 'open_data' || item?.type === 'research' || item?.type === 'integration') return
      event.preventDefault(); navigate(`p/${item.slug}`)
    }}>
      {image ? <img src={image} alt="" /> : <div className="thumb" aria-hidden="true" />}
      <div className="card-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <span className="kind">{categoryLabel(item)}</span>
          {tempStatus && (
            <span className={`badge-temporal badge-temporal-${tempStatus.variant}`}>
              {tempStatus.label}
            </span>
          )}
        </div>
        <h3>{item.title}</h3>
        {item.summary ? <p>{item.summary}</p> : null}
        {(flags.wheelchair || flags.petFriendly) && (
          <div className="flags">
            {flags.wheelchair ? <span>Acessível</span> : null}
            {flags.petFriendly ? <span>Aceita animais</span> : null}
          </div>
        )}
      </div>
    </a>
  )
}

function FeaturedCarousel({ items, onOpen }) {
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const total = items.length

  useEffect(() => {
    if (total <= 1 || isPaused) return
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % total)
    }, 5500)
    return () => clearInterval(timer)
  }, [total, isPaused])

  if (!total) return null

  const nextSlide = () => setCurrent((prev) => (prev + 1) % total)
  const prevSlide = () => setCurrent((prev) => (prev - 1 + total) % total)

  return (
    <div
      className="carousel-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Destaques em evidência"
    >
      <div className="carousel-track" style={{ transform: `translateX(-${current * 100}%)` }}>
        {items.map((item, index) => {
          const image = coverImage(item)
          const flags = accessFlags(item)
          return (
            <div
              key={item._id || item.slug}
              className={`carousel-slide ${index === current ? 'is-active' : ''}`}
              aria-hidden={index !== current}
            >
              <a
                className="featured-hero-card"
                href={contentHref(item)}
                onClick={(event) => {
                  if (item?.type === 'open_data' || item?.type === 'research' || item?.type === 'integration') return
                  event.preventDefault()
                  onOpen(`p/${item.slug}`)
                }}
              >
                <div className="featured-hero-media">
                  {image ? (
                    <img src={image} alt="" className="featured-hero-img" />
                  ) : (
                    <div className="featured-hero-fallback" />
                  )}
                  <div className="featured-hero-shade" />
                </div>
                <div className="featured-hero-content">
                  <div className="featured-hero-badges">
                    <span className="featured-badge">{categoryLabel(item)}</span>
                    <span className="featured-star-badge">★ Em Evidência</span>
                    {flags.wheelchair && <span className="featured-flag-badge">♿ Acessível</span>}
                    {flags.petFriendly && <span className="featured-flag-badge">🐾 Pet Friendly</span>}
                  </div>
                  <h3 className="featured-hero-title">{item.title}</h3>
                  {item.summary && <p className="featured-hero-summary">{item.summary}</p>}
                  <span className="featured-hero-cta">
                    <span>Ver detalhes</span>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                  </span>
                </div>
              </a>
            </div>
          )
        })}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            className="carousel-btn prev"
            onClick={prevSlide}
            aria-label="Destaque anterior"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
          </button>
          <button
            type="button"
            className="carousel-btn next"
            onClick={nextSlide}
            aria-label="Próximo destaque"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
          </button>

          <div className="carousel-nav">
            <div className="carousel-dots">
              {items.map((item, index) => (
                <button
                  key={`dot-${item._id || item.slug}`}
                  type="button"
                  className={`carousel-dot ${index === current ? 'is-active' : ''}`}
                  onClick={() => setCurrent(index)}
                  aria-label={`Ir para destaque ${index + 1}`}
                />
              ))}
            </div>
            <span className="carousel-counter">{current + 1} / {total}</span>
          </div>
        </>
      )}
    </div>
  )
}

function EmptyState({ title, children }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  )
}

function MeetingDocuments({ documents, compact = false }) {
  const files = Array.isArray(documents) ? documents.filter((doc) => doc?.url) : []
  if (!files.length) {
    return <p className={`file-empty${compact ? ' compact' : ''}`}>Sem arquivo para baixar</p>
  }
  return (
    <div className={`file-list${compact ? ' compact' : ''}`}>
      {files.map((doc, index) => {
        const label = doc.title || MEETING_DOC_LABELS[doc.kind] || 'Documento'
        const kind = MEETING_DOC_LABELS[doc.kind] || doc.kind
        return (
          <div className="file-row" key={doc._id || `${doc.url}-${index}`}>
            <div className="file-meta">
              <span className="file-kind">{kind}</span>
              <strong title={label}>{label}</strong>
            </div>
            <div className="file-actions">
              <a href={doc.url} target="_blank" rel="noopener noreferrer">Visualizar</a>
              <a className="primary" href={doc.url} download={fileNameFromUrl(doc.url, label)}>Baixar</a>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MeetingCard({ item, onOpen }) {
  const when = meetingWhen(item)
  return (
    <article className="meeting-card">
      <div className="meeting-copy">
        <span className="kind">{meetingTitle(item)}</span>
        <h3>
          <a href={href(`comtur/${item.slug}`)} onClick={(event) => { event.preventDefault(); onOpen(item.slug) }}>{meetingHeadline(item)}</a>
        </h3>
        <p>{[when, item.location].filter(Boolean).join(' · ')}</p>
        <p className="meeting-hint">Ver reunião e arquivos</p>
      </div>
      <MeetingDocuments documents={item.documents} compact />
    </article>
  )
}

function ContentCard({ item, onOpen }) {
  const names = item.type === 'council_member' ? contentLines(item.body) : []
  return (
    <article className="meeting-card content-card">
      {coverImage(item) ? <img className="content-thumb" src={coverImage(item)} alt="" /> : null}
      <div className="meeting-copy">
        <span className="kind">{governanceLabel(item.type)}</span>
        <h3>
          <a href={href(`comtur/doc/${item.slug}`)} onClick={(event) => { event.preventDefault(); onOpen(item.slug) }}>{item.title}</a>
        </h3>
        {item.summary ? <p>{item.summary}</p> : null}
        {names.length ? (
          <ul className="member-list">
            {names.map((name) => <li key={name}>{name}</li>)}
          </ul>
        ) : null}
      </div>
      <MeetingDocuments documents={mediaAsDocuments(item.media)} compact />
    </article>
  )
}

function LegislationCard({ item, onOpen }) {
  const meta = item.metadata || {}
  const docType = meta.documentType || meta.docType || 'Documento Legal'
  const title = item.title || meta.officialIdentifier || 'Documento sem título'
  const docDate = meta.documentDate ? new Date(meta.documentDate).toLocaleDateString('pt-BR') : (item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('pt-BR') : '')
  const pdfMedia = (Array.isArray(item.media) && item.media.find((m) => m.kind === 'document' || m.mimeType === 'application/pdf' || (m.url && m.url.toLowerCase().endsWith('.pdf')))) || meta.pdfFile || null
  const pdfUrl = pdfMedia?.url || ''
  const pdfSize = pdfMedia?.sizeFormatted || (pdfMedia?.size ? `${(pdfMedia.size / (1024 * 1024)).toFixed(1).replace('.', ',')} MB` : '1,8 MB')

  return (
    <article className="meeting-card legislation-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px 24px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
        <div style={{ width: '48px', height: '48px', background: '#dc2626', color: '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.95rem', flexShrink: 0, boxShadow: '0 2px 4px rgba(220,38,38,0.2)' }}>
          PDF
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: '800', color: '#0f2740', lineHeight: '1.3' }}>
            {title}
          </h3>
          {item.summary ? <p style={{ margin: '0 0 10px', fontSize: '0.92rem', color: '#475569', lineHeight: '1.4' }}>{item.summary}</p> : null}
          <div style={{ fontSize: '0.86rem', color: '#64748b', display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
            {docDate ? <span>Publicado em: <strong style={{ color: '#1e293b' }}>{docDate}</strong></span> : null}
            <span>Tipo: <strong style={{ color: '#0f766e' }}>{docType}</strong></span>
            {pdfUrl ? <span style={{ color: '#dc2626', fontWeight: '700' }}>Arquivo: PDF | {pdfSize}</span> : null}
          </div>
        </div>
      </div>
      {pdfUrl ? (
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '2px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 18px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.88rem', fontWeight: '700', color: '#1e293b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            👁️ VISUALIZAR
          </a>
          <a href={pdfUrl} download style={{ padding: '8px 18px', background: '#0f766e', color: '#fff', borderRadius: '6px', fontSize: '0.88rem', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            📥 BAIXAR
          </a>
        </div>
      ) : null}
    </article>
  )
}

function LegislationRepositoryBlock({ items, onOpen }) {
  const [nameInput, setNameInput] = useState('')
  const [docTypeInput, setDocTypeInput] = useState('Todos')
  const [periodMode, setPeriodMode] = useState('year')
  const [yearInput, setYearInput] = useState('')
  const [startDateInput, setStartDateInput] = useState('')
  const [endDateInput, setEndDateInput] = useState('')

  // Active filter state applied when clicking "BUSCAR" or typing
  const [appliedFilters, setAppliedFilters] = useState({
    name: '',
    docType: 'Todos',
    periodMode: 'year',
    year: '',
    startDate: '',
    endDate: ''
  })

  const handleSearch = (e) => {
    if (e) e.preventDefault()
    setAppliedFilters({
      name: nameInput,
      docType: docTypeInput,
      periodMode,
      year: yearInput,
      startDate: startDateInput,
      endDate: endDateInput
    })
  }

  const handleReset = () => {
    setNameInput('')
    setDocTypeInput('Todos')
    setPeriodMode('year')
    setYearInput('')
    setStartDateInput('')
    setEndDateInput('')
    setAppliedFilters({
      name: '',
      docType: 'Todos',
      periodMode: 'year',
      year: '',
      startDate: '',
      endDate: ''
    })
  }

  const filtered = (items || []).filter((item) => {
    if (item.type !== 'legislation') return false
    const meta = item.metadata || {}
    const title = (item.title || '').toLowerCase()
    const summary = (item.summary || meta.description || '').toLowerCase()
    const q = appliedFilters.name.toLowerCase().trim()

    if (q) {
      const match = title.includes(q) || summary.includes(q) || (meta.documentType || '').toLowerCase().includes(q)
      if (!match) return false
    }

    if (appliedFilters.docType !== 'Todos') {
      const itemType = (meta.documentType || meta.docType || '').trim()
      const filterType = appliedFilters.docType.trim()
      if (filterType === 'Regimento') {
        if (!itemType.toLowerCase().includes('regimento')) return false
      } else if (itemType.toLowerCase() !== filterType.toLowerCase()) {
        return false
      }
    }

    const docDateStr = meta.documentDate || item.publishedAt || ''
    if (appliedFilters.periodMode === 'year' && appliedFilters.year) {
      const itemYear = meta.year ? String(meta.year) : (docDateStr ? new Date(docDateStr).getFullYear().toString() : '')
      if (itemYear !== String(appliedFilters.year).trim()) return false
    } else if (appliedFilters.periodMode === 'range') {
      if (appliedFilters.startDate && docDateStr && new Date(docDateStr) < new Date(appliedFilters.startDate)) return false
      if (appliedFilters.endDate && docDateStr && new Date(docDateStr) > new Date(appliedFilters.endDate + 'T23:59:59')) return false
    }

    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const dateA = new Date(a.metadata?.documentDate || a.publishedAt || a.createdAt || 0).getTime()
    const dateB = new Date(b.metadata?.documentDate || b.publishedAt || b.createdAt || 0).getTime()
    return dateB - dateA
  })

  const hasActiveFilters = appliedFilters.name || appliedFilters.docType !== 'Todos' || appliedFilters.year || appliedFilters.startDate || appliedFilters.endDate

  return (
    <div className="legislation-repository-section" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Box de Busca e Filtros */}
      <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '24px', boxShadow: '0 4px 12px rgba(15,23,42,0.05)' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '1.25rem', fontWeight: '800', color: '#0f2740', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔍</span> BUSCAR DOCUMENTOS
        </h2>

        <form onSubmit={handleSearch}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '18px' }}>
            {/* Campo Nome */}
            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>Nome</label>
              <input
                type="text"
                style={{ width: '100%', height: '42px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.92rem', boxSizing: 'border-box' }}
                placeholder="Ex.: Lei de criação do COMTUR..."
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              />
            </div>

            {/* Filtro Tipo */}
            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>Tipo</label>
              <select
                style={{ width: '100%', height: '42px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.92rem', background: '#fff', boxSizing: 'border-box' }}
                value={docTypeInput}
                onChange={(e) => setDocTypeInput(e.target.value)}
              >
                <option value="Todos">Todos</option>
                <option value="Lei">Lei</option>
                <option value="Lei Complementar">Lei Complementar</option>
                <option value="Decreto">Decreto</option>
                <option value="Portaria">Portaria</option>
                <option value="Resolução">Resolução</option>
                <option value="Regimento">Regimento</option>
                <option value="Deliberação">Deliberação</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          {/* Filtro por Período */}
          <div style={{ paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: '700', color: '#1e293b' }}>Filtro:</span>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: periodMode === 'range' ? '700' : '500' }}>
                <input type="radio" name="periodMode" checked={periodMode === 'range'} onChange={() => setPeriodMode('range')} style={{ accentColor: '#0f766e' }} />
                Intervalo de datas
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: periodMode === 'year' ? '700' : '500' }}>
                <input type="radio" name="periodMode" checked={periodMode === 'year'} onChange={() => setPeriodMode('year')} style={{ accentColor: '#0f766e' }} />
                Ano
              </label>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {periodMode === 'year' ? (
                <div style={{ width: '180px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Ano</label>
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    placeholder="Ex.: 2026"
                    style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    value={yearInput}
                    onChange={(e) => setYearInput(e.target.value)}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Data inicial</label>
                    <input
                      type="date"
                      style={{ height: '40px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
                      value={startDateInput}
                      onChange={(e) => setStartDateInput(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Data final</label>
                    <input
                      type="date"
                      style={{ height: '40px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
                      value={endDateInput}
                      onChange={(e) => setEndDateInput(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Botão BUSCAR */}
              <button
                type="submit"
                style={{ height: '40px', padding: '0 24px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', letterSpacing: '0.03em' }}
              >
                🔍 BUSCAR
              </button>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleReset}
                  style={{ height: '40px', padding: '0 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.86rem', fontWeight: '700', color: '#475569', cursor: 'pointer' }}
                >
                  Limpar filtros
                </button>
              ) : null}
            </div>
          </div>
        </form>
      </div>

      {/* Contagem de Resultados */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 -8px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f2740' }}>
          {sorted.length} {sorted.length === 1 ? 'documento encontrado' : 'documentos encontrados'}
        </h3>
      </div>

      {/* Lista de Resultados */}
      {sorted.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {sorted.map((item) => (
            <LegislationCard key={item.slug || item._id} item={item} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>📜</div>
          <strong style={{ fontSize: '1.1rem', color: '#1e293b', display: 'block', marginBottom: '4px' }}>Nenhum documento encontrado</strong>
          <span>Nenhum documento legal encontrado para os filtros informados.</span>
        </div>
      )}
    </div>
  )
}

function AccountabilityCard({ item, onOpen }) {
  const meta = item.metadata || {}
  const docType = meta.documentType || meta.docType || 'Prestação de Contas'
  const title = item.title || 'Prestação de Contas'
  const docDate = meta.documentDate ? new Date(meta.documentDate).toLocaleDateString('pt-BR') : (item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('pt-BR') : '')
  const period = meta.period || meta.periodReference || meta.periodType || ''
  const pdfMedia = (Array.isArray(item.media) && item.media.find((m) => m.kind === 'document' || m.mimeType === 'application/pdf' || (m.url && m.url.toLowerCase().endsWith('.pdf')))) || meta.pdfFile || null
  const pdfUrl = pdfMedia?.url || ''
  const pdfSize = pdfMedia?.sizeFormatted || (pdfMedia?.size ? `${(pdfMedia.size / (1024 * 1024)).toFixed(2).replace('.', ',')} MB` : 'PDF')

  return (
    <article className="meeting-card accountability-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px 24px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
        <div style={{ width: '48px', height: '48px', background: '#dc2626', color: '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.95rem', flexShrink: 0, boxShadow: '0 2px 4px rgba(220,38,38,0.2)' }}>
          PDF
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: '800', color: '#0f2740', lineHeight: '1.3' }}>
            {title}
          </h3>
          {item.summary ? <p style={{ margin: '0 0 10px', fontSize: '0.92rem', color: '#475569', lineHeight: '1.4' }}>{item.summary}</p> : null}
          <div style={{ fontSize: '0.86rem', color: '#64748b', display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
            {docDate ? <span>Publicado em: <strong style={{ color: '#1e293b' }}>{docDate}</strong></span> : null}
            {period ? <span>Período: <strong style={{ color: '#0f766e' }}>{period}</strong></span> : null}
            <span>Tipo: <strong style={{ color: '#0f766e' }}>{docType}</strong></span>
            {pdfUrl ? <span style={{ color: '#dc2626', fontWeight: '700' }}>Arquivo: PDF | {pdfSize}</span> : null}
          </div>
        </div>
      </div>
      {pdfUrl ? (
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '2px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 18px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.88rem', fontWeight: '700', color: '#1e293b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            👁️ VISUALIZAR
          </a>
          <a href={pdfUrl} download style={{ padding: '8px 18px', background: '#0f766e', color: '#fff', borderRadius: '6px', fontSize: '0.88rem', fontWeight: '700', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            📥 BAIXAR
          </a>
        </div>
      ) : null}
    </article>
  )
}

function AccountabilityRepositoryBlock({ items, onOpen }) {
  const [nameInput, setNameInput] = useState('')
  const [docTypeInput, setDocTypeInput] = useState('Todos')
  const [periodTypeInput, setPeriodTypeInput] = useState('Todos')
  const [periodMode, setPeriodMode] = useState('year')
  const [yearInput, setYearInput] = useState('')
  const [startDateInput, setStartDateInput] = useState('')
  const [endDateInput, setEndDateInput] = useState('')

  const [appliedFilters, setAppliedFilters] = useState({
    name: '',
    docType: 'Todos',
    periodType: 'Todos',
    periodMode: 'year',
    year: '',
    startDate: '',
    endDate: ''
  })

  const handleSearch = (e) => {
    if (e) e.preventDefault()
    setAppliedFilters({
      name: nameInput,
      docType: docTypeInput,
      periodType: periodTypeInput,
      periodMode,
      year: yearInput,
      startDate: startDateInput,
      endDate: endDateInput
    })
  }

  const handleReset = () => {
    setNameInput('')
    setDocTypeInput('Todos')
    setPeriodTypeInput('Todos')
    setPeriodMode('year')
    setYearInput('')
    setStartDateInput('')
    setEndDateInput('')
    setAppliedFilters({
      name: '',
      docType: 'Todos',
      periodType: 'Todos',
      periodMode: 'year',
      year: '',
      startDate: '',
      endDate: ''
    })
  }

  const filtered = (items || []).filter((item) => {
    if (item.type !== 'accountability') return false
    const meta = item.metadata || {}
    const title = (item.title || '').toLowerCase()
    const summary = (item.summary || meta.description || '').toLowerCase()
    const q = appliedFilters.name.toLowerCase().trim()

    if (q) {
      const match = title.includes(q) || summary.includes(q) || (meta.documentType || '').toLowerCase().includes(q) || (meta.period || '').toLowerCase().includes(q)
      if (!match) return false
    }

    if (appliedFilters.docType !== 'Todos') {
      const itemType = (meta.documentType || meta.docType || '').trim()
      if (itemType.toLowerCase() !== appliedFilters.docType.toLowerCase()) {
        return false
      }
    }

    if (appliedFilters.periodType !== 'Todos') {
      const itemPType = (meta.periodType || '').trim()
      const itemPeriod = (meta.period || meta.periodReference || '').trim()
      if (itemPType.toLowerCase() !== appliedFilters.periodType.toLowerCase() && !itemPeriod.toLowerCase().includes(appliedFilters.periodType.toLowerCase())) {
        return false
      }
    }

    const docDateStr = meta.documentDate || item.publishedAt || ''
    if (appliedFilters.periodMode === 'year' && appliedFilters.year) {
      const itemYear = meta.year ? String(meta.year) : (docDateStr ? new Date(docDateStr).getFullYear().toString() : '')
      if (itemYear !== String(appliedFilters.year).trim()) return false
    } else if (appliedFilters.periodMode === 'range') {
      if (appliedFilters.startDate && docDateStr && new Date(docDateStr) < new Date(appliedFilters.startDate)) return false
      if (appliedFilters.endDate && docDateStr && new Date(docDateStr) > new Date(appliedFilters.endDate + 'T23:59:59')) return false
    }

    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    const yearA = parseInt(a.metadata?.year, 10) || 0
    const yearB = parseInt(b.metadata?.year, 10) || 0
    if (yearB !== yearA) return yearB - yearA
    const dateA = new Date(a.metadata?.documentDate || a.publishedAt || a.createdAt || 0).getTime()
    const dateB = new Date(b.metadata?.documentDate || b.publishedAt || b.createdAt || 0).getTime()
    return dateB - dateA
  })

  const hasActiveFilters = appliedFilters.name || appliedFilters.docType !== 'Todos' || appliedFilters.periodType !== 'Todos' || appliedFilters.year || appliedFilters.startDate || appliedFilters.endDate

  return (
    <div className="legislation-repository-section accountability-repository-section" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Box de Busca e Filtros */}
      <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '24px', boxShadow: '0 4px 12px rgba(15,23,42,0.05)' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: '1.25rem', fontWeight: '800', color: '#0f2740', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔍</span> BUSCAR DOCUMENTOS
        </h2>

        <form onSubmit={handleSearch}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '18px' }}>
            {/* Campo Nome */}
            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>Nome</label>
              <input
                type="text"
                style={{ width: '100%', height: '42px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.92rem', boxSizing: 'border-box' }}
                placeholder="Ex.: Prestação de Contas 1º Quadrimestre..."
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              />
            </div>

            {/* Filtro Tipo */}
            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>Tipo de documento</label>
              <select
                style={{ width: '100%', height: '42px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.92rem', background: '#fff', boxSizing: 'border-box' }}
                value={docTypeInput}
                onChange={(e) => setDocTypeInput(e.target.value)}
              >
                <option value="Todos">Todos</option>
                <option value="Prestação de Contas">Prestação de Contas</option>
                <option value="Relatório Financeiro">Relatório Financeiro</option>
                <option value="Relatório de Execução">Relatório de Execução</option>
                <option value="Demonstrativo">Demonstrativo</option>
                <option value="Balancete">Balancete</option>
                <option value="Relatório de Atividades">Relatório de Atividades</option>
                <option value="Parecer">Parecer</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            {/* Filtro Período */}
            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>Período</label>
              <select
                style={{ width: '100%', height: '42px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.92rem', background: '#fff', boxSizing: 'border-box' }}
                value={periodTypeInput}
                onChange={(e) => setPeriodTypeInput(e.target.value)}
              >
                <option value="Todos">Todos os períodos</option>
                <option value="Quadrimestral">Quadrimestral</option>
                <option value="Semestral">Semestral</option>
                <option value="Trimestral">Trimestral</option>
                <option value="Bimestral">Bimestral</option>
                <option value="Mensal">Mensal</option>
                <option value="Anual">Anual</option>
              </select>
            </div>
          </div>

          {/* Filtro por Período */}
          <div style={{ paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: '700', color: '#1e293b' }}>Exercício / Data:</span>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: periodMode === 'year' ? '700' : '500' }}>
                <input type="radio" name="accPeriodMode" checked={periodMode === 'year'} onChange={() => setPeriodMode('year')} style={{ accentColor: '#0f766e' }} />
                Ano
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: periodMode === 'range' ? '700' : '500' }}>
                <input type="radio" name="accPeriodMode" checked={periodMode === 'range'} onChange={() => setPeriodMode('range')} style={{ accentColor: '#0f766e' }} />
                Intervalo de datas
              </label>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {periodMode === 'year' ? (
                <div style={{ width: '180px' }}>
                  <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Exercício / Ano</label>
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    placeholder="Ex.: 2026"
                    style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    value={yearInput}
                    onChange={(e) => setYearInput(e.target.value)}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Data inicial</label>
                    <input
                      type="date"
                      style={{ height: '40px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
                      value={startDateInput}
                      onChange={(e) => setStartDateInput(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Data final</label>
                    <input
                      type="date"
                      style={{ height: '40px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem' }}
                      value={endDateInput}
                      onChange={(e) => setEndDateInput(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Botão BUSCAR */}
              <button
                type="submit"
                style={{ height: '40px', padding: '0 24px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', letterSpacing: '0.03em' }}
              >
                🔍 BUSCAR
              </button>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={handleReset}
                  style={{ height: '40px', padding: '0 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.86rem', fontWeight: '700', color: '#475569', cursor: 'pointer' }}
                >
                  Limpar filtros
                </button>
              ) : null}
            </div>
          </div>
        </form>
      </div>

      {/* Contagem de Resultados */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 -8px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f2740' }}>
          {sorted.length} {sorted.length === 1 ? 'arquivo encontrado' : 'arquivos encontrados'}
        </h3>
      </div>

      {/* Lista de Resultados */}
      {sorted.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {sorted.map((item) => (
            <AccountabilityCard key={item.slug || item._id} item={item} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>📊</div>
          <strong style={{ fontSize: '1.1rem', color: '#1e293b', display: 'block', marginBottom: '4px' }}>
            {hasActiveFilters ? 'Nenhum documento encontrado para os filtros informados.' : 'Nenhuma prestação de contas encontrada.'}
          </strong>
          <span>{hasActiveFilters ? 'Tente ajustar os critérios de pesquisa ou limpar os filtros.' : 'Novas prestações de contas serão publicadas em breve.'}</span>
        </div>
      )}
    </div>
  )
}

function getSystemMetricValue(metricKey, allContents) {
  const items = Array.isArray(allContents) ? allContents : []
  switch (metricKey) {
    case 'attractions.total':
      return items.filter((i) => i.type === 'attraction' && i.status === 'published').length
    case 'lodging.total':
      return items.filter((i) => i.type === 'lodging' && i.status === 'published').length
    case 'lodging.units':
      return items.filter((i) => i.type === 'lodging' && i.status === 'published').reduce((acc, i) => {
        const val = parseInt(i.metadata?.totalUnits, 10)
        if (!isNaN(val) && val > 0) return acc + val
        if (Array.isArray(i.metadata?.rooms)) {
          return acc + i.metadata.rooms.reduce((rAcc, r) => rAcc + (parseInt(r.unitsCount, 10) || 1), 0)
        }
        return acc
      }, 0)
    case 'lodging.beds':
      return items.filter((i) => i.type === 'lodging' && i.status === 'published').reduce((acc, i) => {
        const val = parseInt(i.metadata?.totalBeds, 10)
        return acc + (!isNaN(val) && val > 0 ? val : 0)
      }, 0)
    case 'lodging.capacity':
      return items.filter((i) => i.type === 'lodging' && i.status === 'published').reduce((acc, i) => {
        const val = parseInt(i.metadata?.maxGuests, 10)
        return acc + (!isNaN(val) && val > 0 ? val : 0)
      }, 0)
    case 'gastronomy.total':
      return items.filter((i) => i.type === 'gastronomy' && i.status === 'published').length
    case 'events.total':
      return items.filter((i) => i.type === 'event' && i.status === 'published').length
    case 'routes.total':
      return items.filter((i) => i.type === 'route' && i.status === 'published').length
    case 'shopping.total':
      return items.filter((i) => i.type === 'shopping' && i.status === 'published').length
    case 'services.total':
      return items.filter((i) => i.type === 'service' && i.status === 'published').length
    case 'council_members.total':
      return items.filter((i) => i.type === 'council_member' && i.status === 'published').length
    case 'legislation.total':
      return items.filter((i) => i.type === 'legislation' && i.status === 'published').length
    case 'work_plans.total':
      return items.filter((i) => i.type === 'work_plan' && i.status === 'published').length
    case 'accountability.total':
      return items.filter((i) => i.type === 'accountability' && i.status === 'published').length
    case 'documents.total':
      return items.filter((i) => ['legislation', 'work_plan', 'accountability'].includes(i.type) && i.status === 'published').length
    default:
      return 0
  }
}

function IndicatorCard({ item, allContents }) {
  const meta = item?.metadata || {}
  const isAuto = meta.sourceType === 'automatic' || (!meta.sourceType && !!meta.metricKey)
  const category = meta.category || 'Geral'
  const title = meta.publicTitle || item.title || 'Indicador'
  const desc = meta.publicDesc || meta.description || item.summary || ''
  const visType = meta.visualizationType || 'card'

  let displayValue = '0'
  let unit = meta.unit || ''
  let measurements = Array.isArray(meta.measurements) ? meta.measurements : []

  if (isAuto) {
    const rawVal = getSystemMetricValue(meta.metricKey, allContents)
    displayValue = typeof rawVal === 'number' ? rawVal.toLocaleString('pt-BR') : String(rawVal)
    if (!unit) {
      unit = meta.metricKey?.includes('lodging.beds') ? 'leitos'
        : meta.metricKey?.includes('lodging.units') ? 'UHs'
        : meta.metricKey?.includes('lodging.capacity') ? 'hóspedes'
        : meta.metricKey?.includes('council_members') ? 'membros'
        : meta.metricKey?.includes('documents') || meta.metricKey?.includes('legislation') || meta.metricKey?.includes('accountability') ? 'documentos'
        : 'itens'
    }
  } else {
    if (measurements.length > 0) {
      const latest = measurements[measurements.length - 1]
      displayValue = latest.value || '0'
    } else {
      displayValue = '-'
    }
  }

  const latestMeas = measurements.length > 0 ? measurements[measurements.length - 1] : null

  return (
    <article
      className="meeting-card indicator-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '22px 24px',
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        boxShadow: '0 2px 6px rgba(15,23,42,0.04)',
        position: 'relative'
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', background: isAuto ? '#f0fdf4' : '#fffbeb', color: isAuto ? '#16a34a' : '#d97706', padding: '4px 10px', borderRadius: '6px', border: `1px solid ${isAuto ? '#bbf7d0' : '#fde68a'}` }}>
            {category}
          </span>
          <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {isAuto ? '⚡ Tempo Real' : `📝 ${meta.periodicity || 'Periódico'}`}
          </span>
        </div>

        <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: '800', color: '#0f2740', lineHeight: '1.3' }}>
          {title}
        </h3>
        {desc ? <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#475569', lineHeight: '1.4' }}>{desc}</p> : null}

        {/* Big Number KPI */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '14px 0' }}>
          <span style={{ fontSize: '2.4rem', fontWeight: '900', color: '#0f766e', lineHeight: 1 }}>
            {displayValue}
          </span>
          {unit ? <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#64748b' }}>{unit}</span> : null}
        </div>

        {/* History / Series breakdown if manual */}
        {!isAuto && measurements.length > 1 && (visType === 'bar_chart' || visType === 'line_chart' || visType === 'history_table') && (
          <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>
              Evolução Recente
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '54px', paddingBottom: '4px' }}>
              {measurements.slice(-5).map((m, idx) => (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#0f766e' }}>{m.value}</div>
                  <div style={{ width: '100%', height: '14px', background: '#0f766e', borderRadius: '3px', opacity: 0.25 + (idx * 0.18) }}></div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{m.period}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '18px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', fontSize: '0.8rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <span>
          Fonte: <strong>{isAuto ? 'Base de Dados COMTUR' : (meta.source || 'Não especificada')}</strong>
        </span>
        {latestMeas?.period ? (
          <span style={{ color: '#0f766e', fontWeight: '700' }}>Ref.: {latestMeas.period}</span>
        ) : null}
      </div>
    </article>
  )
}

function ObservatoryBlock({ indicators, allContents, onOpen }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todas')

  const categories = ['Todas', 'Hospedagem & Ocupação', 'Fluxo Turístico', 'Economia & Gastos', 'Atrativos & Equipamentos', 'Gastronomia & Comércio', 'Eventos', 'Gestão & Governança']

  // Pre-calculated Top KPI summary metrics
  const totalAttractions = getSystemMetricValue('attractions.total', allContents)
  const totalLodgings = getSystemMetricValue('lodging.total', allContents)
  const totalBeds = getSystemMetricValue('lodging.beds', allContents)
  const totalGastro = getSystemMetricValue('gastronomy.total', allContents)
  const totalEvents = getSystemMetricValue('events.total', allContents)

  const filtered = (indicators || []).filter((item) => {
    if (item.type !== 'indicator') return false
    const meta = item.metadata || {}
    if (meta.showObservatory === false) return false

    const title = (meta.publicTitle || item.title || '').toLowerCase()
    const desc = (meta.publicDesc || meta.description || item.summary || '').toLowerCase()
    const q = searchQuery.toLowerCase().trim()

    if (q && !title.includes(q) && !desc.includes(q) && !(meta.category || '').toLowerCase().includes(q)) {
      return false
    }

    if (selectedCategory !== 'Todas' && (meta.category || 'Geral') !== selectedCategory) {
      return false
    }

    return true
  })

  return (
    <div className="observatory-section" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Banner KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ padding: '18px 20px', background: 'linear-gradient(135deg, #0f766e 0%, #0d635c 100%)', color: '#fff', borderRadius: '14px', boxShadow: '0 4px 12px rgba(15,118,110,0.15)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', opacity: 0.85, letterSpacing: '0.04em' }}>Atrativos Turísticos</div>
          <div style={{ fontSize: '2.2rem', fontWeight: '900', margin: '6px 0 2px' }}>{totalAttractions}</div>
          <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>locais mapeados e ativos</div>
        </div>

        <div style={{ padding: '18px 20px', background: 'linear-gradient(135deg, #0b2740 0%, #1e3a5f 100%)', color: '#fff', borderRadius: '14px', boxShadow: '0 4px 12px rgba(11,39,64,0.15)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', opacity: 0.85, letterSpacing: '0.04em' }}>Rede Hoteleira</div>
          <div style={{ fontSize: '2.2rem', fontWeight: '900', margin: '6px 0 2px' }}>{totalLodgings}</div>
          <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>{totalBeds > 0 ? `${totalBeds} leitos cadastrados` : 'estabelecimentos ativos'}</div>
        </div>

        <div style={{ padding: '18px 20px', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#fff', borderRadius: '14px', boxShadow: '0 4px 12px rgba(217,119,6,0.15)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', opacity: 0.85, letterSpacing: '0.04em' }}>Gastronomia</div>
          <div style={{ fontSize: '2.2rem', fontWeight: '900', margin: '6px 0 2px' }}>{totalGastro}</div>
          <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>restaurantes e bares</div>
        </div>

        <div style={{ padding: '18px 20px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', borderRadius: '14px', boxShadow: '0 4px 12px rgba(37,99,235,0.15)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: '700', textTransform: 'uppercase', opacity: 0.85, letterSpacing: '0.04em' }}>Eventos & Calendário</div>
          <div style={{ fontSize: '2.2rem', fontWeight: '900', margin: '6px 0 2px' }}>{totalEvents}</div>
          <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>eventos programados</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '20px 24px', boxShadow: '0 2px 6px rgba(15,23,42,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f2740', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📈</span> INDICADORES DO TURISMO
          </h2>
          <div style={{ width: '100%', maxWidth: '320px' }}>
            <input
              type="text"
              placeholder="Buscar indicador ou dado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', height: '40px', padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: '700',
                cursor: 'pointer',
                border: 'none',
                whiteSpace: 'nowrap',
                background: selectedCategory === cat ? '#0f766e' : '#f1f5f9',
                color: selectedCategory === cat ? '#fff' : '#475569'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Indicators */}
      {filtered.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {filtered.map((item) => (
            <IndicatorCard key={item.slug || item._id} item={item} allContents={allContents} />
          ))}
        </div>
      ) : (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>📈</div>
          <strong style={{ fontSize: '1.1rem', color: '#1e293b', display: 'block', marginBottom: '4px' }}>
            {searchQuery || selectedCategory !== 'Todas' ? 'Nenhum indicador encontrado para estes filtros.' : 'Nenhum indicador cadastrado no momento.'}
          </strong>
          <span>Novos indicadores e métricas serão publicados pela gestão do turismo em breve.</span>
        </div>
      )}
    </div>
  )
}

function LightboxModal({ images, initialIndex = 0, onClose }) {
  const [current, setCurrent] = useState(initialIndex)
  const total = images.length

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && total > 1) setCurrent((prev) => (prev + 1) % total)
      if (e.key === 'ArrowLeft' && total > 1) setCurrent((prev) => (prev - 1 + total) % total)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [total, onClose])

  if (!total) return null
  const item = images[current]

  return (
    <div className="lightbox-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose} aria-label="Fechar galeria">✕</button>
        <div className="lightbox-media">
          <img src={item.url} alt={item.title || ''} className="lightbox-img" />
        </div>
        {total > 1 && (
          <>
            <button
              className="lightbox-btn prev"
              onClick={() => setCurrent((prev) => (prev - 1 + total) % total)}
              aria-label="Foto anterior"
            >
              ‹
            </button>
            <button
              className="lightbox-btn next"
              onClick={() => setCurrent((prev) => (prev + 1) % total)}
              aria-label="Próxima foto"
            >
              ›
            </button>
          </>
        )}
        <div className="lightbox-caption-bar">
          <span className="lightbox-caption">{item.title || 'Foto'}</span>
          {total > 1 && <span className="lightbox-counter">{current + 1} / {total}</span>}
        </div>
      </div>
    </div>
  )
}

function LodgingDetail({ item, onBack, onOpenLightbox }) {
  const meta = item.metadata || {}
  const addr = meta.address || {}
  const flags = accessFlags(item)
  const images = galleryImages(item)
  const amenities = Array.isArray(meta.amenities) ? meta.amenities : []
  const cover = coverImage(item)
  const whatsappDigits = cleanWhatsapp(meta.whatsapp || item.contact?.whatsapp)

  const mapsQuery = encodeURIComponent(
    item.location || [item.title, addr.street, addr.city || 'Garça', 'SP'].filter(Boolean).join(', ')
  )
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`

  return (
    <article className="fiche fiche-lodging">
      <div className="fiche-back-bar">
        <a className="btn-back" href={href('hospedagens')} onClick={(e) => { e.preventDefault(); onBack() }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          <span>Voltar para Hospedagens</span>
        </a>
      </div>

      <div className="lodging-hero-card">
        {cover ? <img className="lodging-hero-img" src={cover} alt="" /> : <div className="lodging-hero-fallback" />}
        <div className="lodging-hero-shade" />
        <div className="lodging-hero-info">
          <div className="lodging-badges">
            <span className="lodging-badge">{meta.lodgingType || 'Hospedagem'}</span>
            {item.featured && <span className="lodging-star-badge">★ Em evidência</span>}
            {flags.wheelchair && <span className="lodging-flag-badge">♿ Acessível PCD</span>}
            {flags.petFriendly && <span className="lodging-flag-badge">🐾 Aceita pets</span>}
          </div>
          <h1 className="lodging-title">{item.title}</h1>
          {item.summary && <p className="lodging-lead">{item.summary}</p>}
        </div>
      </div>

      {(meta.checkIn || meta.checkOut || meta.priceRange) && (
        <div className="lodging-quick-facts">
          {meta.checkIn && (
            <div className="fact-item">
              <span className="fact-icon">🕒</span>
              <div>
                <small>Check-in</small>
                <strong>{meta.checkIn}</strong>
              </div>
            </div>
          )}
          {meta.checkOut && (
            <div className="fact-item">
              <span className="fact-icon">🚪</span>
              <div>
                <small>Check-out</small>
                <strong>{meta.checkOut}</strong>
              </div>
            </div>
          )}
          {meta.priceRange && (
            <div className="fact-item">
              <span className="fact-icon">💰</span>
              <div>
                <small>Faixa de preço</small>
                <strong>{meta.priceRange}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {images.length > 1 && (
        <section className="lodging-section">
          <div className="section-title-wrap">
            <h3>Galeria de fotos</h3>
            <small className="muted">{images.length} fotos disponíveis · Clique para ampliar</small>
          </div>
          <div className="lodging-gallery-grid">
            {images.map((img, idx) => (
              <button
                key={img.url + idx}
                type="button"
                className="gallery-grid-item"
                onClick={() => onOpenLightbox(idx)}
                aria-label={`Ver foto ${idx + 1}`}
              >
                <img src={img.url} alt={img.title || ''} />
                {img.title && <span className="gallery-item-caption">{img.title}</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {amenities.length > 0 && (
        <section className="lodging-section">
          <h3>Comodidades e serviços</h3>
          <div className="lodging-amenities-grid">
            {amenities.map((id) => {
              const info = AMENITIES_CATALOG[id] || { icon: '✨', label: id }
              return (
                <div key={id} className="amenity-card">
                  <span className="amenity-icon">{info.icon}</span>
                  <span className="amenity-label">{info.label}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {item.body && (
        <section className="lodging-section">
          <h3>Sobre a hospedagem</h3>
          <div className="fiche-body lodging-body-text">{item.body}</div>
        </section>
      )}

      <section className="lodging-section">
        <h3>Localização</h3>
        <div className="lodging-location-box">
          <div className="location-info">
            <span className="location-icon">📍</span>
            <div>
              <strong>{item.location || 'Garça - SP'}</strong>
              {item.geo?.lat && item.geo?.lng && (
                <small className="muted d-block">Coordenadas: {item.geo.lat}, {item.geo.lng}</small>
              )}
            </div>
          </div>
          <a className="btn-map-route" href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
            <span>Ver no mapa / Traçar rota</span>
          </a>
        </div>
      </section>

      {(whatsappDigits || item.contact?.phone || item.contact?.website || meta.instagram) && (
        <section className="lodging-section contact-section">
          <h3>Contato e Reservas</h3>
          <div className="lodging-contact-grid">
            {whatsappDigits && (
              <a
                className="contact-card whatsapp"
                href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent('Olá! Vi o anúncio no Portal de Turismo de Garça e gostaria de mais informações.')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="contact-icon">💬</span>
                <div>
                  <small>WhatsApp</small>
                  <strong>{meta.whatsapp || item.contact?.phone}</strong>
                </div>
              </a>
            )}
            {item.contact?.phone && (
              <a className="contact-card phone" href={`tel:${item.contact.phone.replace(/\D/g, '')}`}>
                <span className="contact-icon">📞</span>
                <div>
                  <small>Telefone</small>
                  <strong>{item.contact.phone}</strong>
                </div>
              </a>
            )}
            {item.contact?.website && (
              <a className="contact-card website" href={item.contact.website} target="_blank" rel="noopener noreferrer">
                <span className="contact-icon">🌐</span>
                <div>
                  <small>Site oficial</small>
                  <strong>Acessar site</strong>
                </div>
              </a>
            )}
            {meta.instagram && (
              <a
                className="contact-card instagram"
                href={meta.instagram.startsWith('http') ? meta.instagram : `https://instagram.com/${meta.instagram.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="contact-icon">📸</span>
                <div>
                  <small>Instagram</small>
                  <strong>{meta.instagram}</strong>
                </div>
              </a>
            )}
          </div>
        </section>
      )}

      <div className="fiche-footer">
        <a className="btn-back" href={href('hospedagens')} onClick={(e) => { e.preventDefault(); onBack() }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          <span>Voltar para Hospedagens</span>
        </a>
      </div>
    </article>
  )
}

function GastronomyDetail({ item, onBack, onOpenLightbox }) {
  const meta = item.metadata || {}
  const addr = meta.address || {}
  const flags = accessFlags(item)
  const images = galleryImages(item)
  const services = Array.isArray(meta.services) ? meta.services : (Array.isArray(meta.amenities) ? meta.amenities : [])
  const paymentMethods = Array.isArray(meta.paymentMethods) ? meta.paymentMethods : []
  const openingHours = meta.openingHours || {}
  const cover = coverImage(item)
  const whatsappDigits = cleanWhatsapp(meta.whatsapp || item.contact?.whatsapp)

  const mapsQuery = encodeURIComponent(
    item.location || [item.title, addr.street, addr.city || 'Garça', 'SP'].filter(Boolean).join(', ')
  )
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`

  const hasHours = DAYS_OF_WEEK_MAP.some((d) => openingHours[d.id]?.closed || openingHours[d.id]?.p1 || openingHours[d.id]?.p2)

  return (
    <article className="fiche fiche-gastronomy">
      <div className="fiche-back-bar">
        <a className="btn-back" href={href('alimentacao')} onClick={(e) => { e.preventDefault(); onBack() }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          <span>Voltar para Alimentação</span>
        </a>
      </div>

      <div className="gastro-hero-card">
        {cover ? <img className="gastro-hero-img" src={cover} alt="" /> : <div className="gastro-hero-fallback" />}
        <div className="gastro-hero-shade" />
        <div className="gastro-hero-info">
          <div className="gastro-badges">
            <span className="gastro-badge">{meta.gastronomyCategory || 'Gastronomia'}</span>
            {meta.priceRange && <span className="gastro-price-badge">{PRICE_RANGE_LABELS[meta.priceRange] || meta.priceRange}</span>}
            {item.featured && <span className="gastro-star-badge">★ Em evidência</span>}
            {flags.wheelchair && <span className="gastro-flag-badge">♿ Acessível PCD</span>}
            {flags.petFriendly && <span className="gastro-flag-badge">🐾 Aceita pets</span>}
          </div>
          <h1 className="gastro-title">{item.title}</h1>
          {item.summary && <p className="gastro-lead">{item.summary}</p>}

          {(meta.menuUrl || meta.menuPdfUrl || whatsappDigits) && (
            <div className="gastro-hero-actions">
              {(meta.menuUrl || meta.menuPdfUrl) && (
                <a
                  className="gastro-menu-btn"
                  href={meta.menuUrl || meta.menuPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="menu-btn-icon">📖</span>
                  <span>Ver Cardápio</span>
                </a>
              )}
              {whatsappDigits && (
                <a
                  className="gastro-whatsapp-btn"
                  href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent('Olá! Vi seu anúncio no Portal de Turismo de Garça e gostaria de fazer um pedido/reserva.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="menu-btn-icon">💬</span>
                  <span>Pedir no WhatsApp</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Gallery Section */}
      {images.length > 1 && (
        <section className="lodging-section">
          <div className="section-title-wrap">
            <h3>Galeria de fotos</h3>
            <small className="muted">{images.length} fotos disponíveis · Clique para ampliar</small>
          </div>
          <div className="lodging-gallery-grid">
            {images.map((img, idx) => (
              <button
                key={img.url + idx}
                type="button"
                className="gallery-grid-item"
                onClick={() => onOpenLightbox(idx)}
                aria-label={`Ver foto ${idx + 1}`}
              >
                <img src={img.url} alt={img.title || ''} />
                {img.title && <span className="gallery-item-caption">{img.title}</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Opening Hours Section */}
      {hasHours && (
        <section className="lodging-section">
          <h3>Horário de Funcionamento</h3>
          <div className="gastro-hours-card">
            <div className="gastro-hours-grid">
              {DAYS_OF_WEEK_MAP.map((d) => {
                const dayData = openingHours[d.id] || {}
                const isClosed = dayData.closed === true
                const shifts = [dayData.p1, dayData.p2].filter(Boolean).join(' e ')

                return (
                  <div key={d.id} className={`hours-item ${isClosed ? 'is-closed' : ''}`}>
                    <strong className="hours-day-label">{d.label}</strong>
                    <span className="hours-shift-label">
                      {isClosed ? <span className="badge-closed">Fechado</span> : (shifts || 'Aberto')}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Services Section */}
      {services.length > 0 && (
        <section className="lodging-section">
          <h3>Serviços e Comodidades</h3>
          <div className="lodging-amenities-grid">
            {services.map((id) => {
              const info = GASTRO_SERVICES_CATALOG[id] || AMENITIES_CATALOG[id] || { icon: '✨', label: id }
              return (
                <div key={id} className="amenity-card">
                  <span className="amenity-icon">{info.icon}</span>
                  <span className="amenity-label">{info.label}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Payment Methods Section */}
      {paymentMethods.length > 0 && (
        <section className="lodging-section">
          <h3>Formas de Pagamento</h3>
          <div className="gastro-payments-grid">
            {paymentMethods.map((id) => {
              const info = PAYMENT_METHODS_CATALOG[id] || { icon: '💳', label: id }
              return (
                <div key={id} className="payment-method-chip">
                  <span>{info.icon}</span>
                  <span>{info.label}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Full Description */}
      {item.body && (
        <section className="lodging-section">
          <h3>Sobre o estabelecimento</h3>
          <div className="fiche-body lodging-body-text">{item.body}</div>
        </section>
      )}

      {/* Location Section */}
      <section className="lodging-section">
        <h3>Endereço do estabelecimento</h3>
        <div className="lodging-location-box">
          <div className="location-info">
            <span className="location-icon">📍</span>
            <div>
              <strong>{item.location || 'Garça - SP'}</strong>
              {addr.cep && <span className="d-block muted">CEP: {addr.cep}</span>}
              {item.geo?.lat && item.geo?.lng && (
                <small className="muted d-block">Coordenadas: {item.geo.lat}, {item.geo.lng}</small>
              )}
            </div>
          </div>
          <a className="btn-map-route" href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
            <span>Ver no mapa / Traçar rota</span>
          </a>
        </div>
      </section>

      {/* Contact & Social Section */}
      {(whatsappDigits || item.contact?.phone || item.contact?.website || meta.instagram || meta.facebook) && (
        <section className="lodging-section contact-section">
          <h3>Contato e Redes</h3>
          <div className="lodging-contact-grid">
            {whatsappDigits && (
              <a
                className="contact-card whatsapp"
                href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent('Olá! Vi seu anúncio no Portal de Turismo de Garça e gostaria de mais informações.')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="contact-icon">💬</span>
                <div>
                  <small>WhatsApp</small>
                  <strong>{meta.whatsapp || item.contact?.phone}</strong>
                </div>
              </a>
            )}
            {item.contact?.phone && (
              <a className="contact-card phone" href={`tel:${item.contact.phone.replace(/\D/g, '')}`}>
                <span className="contact-icon">📞</span>
                <div>
                  <small>Telefone</small>
                  <strong>{item.contact.phone}</strong>
                </div>
              </a>
            )}
            {item.contact?.website && (
              <a className="contact-card website" href={item.contact.website} target="_blank" rel="noopener noreferrer">
                <span className="contact-icon">🌐</span>
                <div>
                  <small>Site oficial</small>
                  <strong>Acessar site</strong>
                </div>
              </a>
            )}
            {meta.instagram && (
              <a
                className="contact-card instagram"
                href={meta.instagram.startsWith('http') ? meta.instagram : `https://instagram.com/${meta.instagram.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="contact-icon">📸</span>
                <div>
                  <small>Instagram</small>
                  <strong>{meta.instagram}</strong>
                </div>
              </a>
            )}
            {meta.facebook && (
              <a
                className="contact-card facebook"
                href={meta.facebook.startsWith('http') ? meta.facebook : `https://facebook.com/${meta.facebook}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="contact-icon">👥</span>
                <div>
                  <small>Facebook</small>
                  <strong>Página no Facebook</strong>
                </div>
              </a>
            )}
          </div>
        </section>
      )}

      <div className="fiche-footer">
        <a className="btn-back" href={href('alimentacao')} onClick={(e) => { e.preventDefault(); onBack() }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          <span>Voltar para Alimentação</span>
        </a>
      </div>
    </article>
  )
}

function EventDetail({ item, onBack, onOpenLightbox }) {
  const meta = item.metadata || {}
  const addr = meta.address || {}
  const flags = accessFlags(item)
  const images = galleryImages(item)
  const features = Array.isArray(meta.features) ? meta.features : (Array.isArray(meta.amenities) ? meta.amenities : [])
  const schedule = Array.isArray(meta.schedule) ? meta.schedule.filter((s) => s.title) : []
  const cover = coverImage(item)
  const whatsappDigits = cleanWhatsapp(meta.whatsapp || item.contact?.whatsapp)

  const startsAt = item.startsAt || meta.startsAt
  const endsAt = item.endsAt || meta.endsAt
  const tempStatus = eventTemporalStatus(startsAt, endsAt, meta.allDay)
  const whenFormatted = formatEventDateTime(startsAt, endsAt, meta.allDay)

  const isOnline = meta.isOnline === true
  const mapsQuery = encodeURIComponent(
    item.location || [meta.venueName, item.title, addr.street, addr.city || 'Garça', 'SP'].filter(Boolean).join(', ')
  )
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`

  const ageRatingInfo = EVENT_AGE_RATINGS_CATALOG[meta.ageRating] || (meta.ageRating ? { label: meta.ageRating, icon: '🏷️' } : null)

  return (
    <article className="fiche fiche-event">
      <div className="fiche-back-bar">
        <a className="btn-back" href={href('eventos')} onClick={(e) => { e.preventDefault(); onBack() }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          <span>Voltar para Eventos</span>
        </a>
      </div>

      <div className="event-hero-card">
        {cover ? <img className="event-hero-img" src={cover} alt="" /> : <div className="event-hero-fallback" />}
        <div className="event-hero-shade" />
        <div className="event-hero-info">
          <div className="event-badges">
            <span className="event-badge">{meta.eventCategory || 'Evento'}</span>
            {tempStatus && (
              <span className={`badge-temporal badge-temporal-${tempStatus.variant}`}>
                {tempStatus.label}
              </span>
            )}
            {ageRatingInfo && (
              <span className="event-age-badge" title={ageRatingInfo.label}>
                {ageRatingInfo.icon} {ageRatingInfo.label}
              </span>
            )}
            {isOnline && <span className="event-online-badge">🌐 Transmissão Online</span>}
            {item.featured && <span className="event-star-badge">★ Em evidência</span>}
            {flags.wheelchair && <span className="event-flag-badge">♿ Acessível PCD</span>}
            {flags.petFriendly && <span className="event-flag-badge">🐾 Aceita pets</span>}
          </div>
          <h1 className="event-title">{item.title}</h1>
          {item.summary && <p className="event-lead">{item.summary}</p>}
        </div>
      </div>

      {/* TOP 4 PRIORITY INFORMATION GRID */}
      <div className="event-priority-grid">
        {/* 1. QUANDO */}
        <div className="priority-card when-card">
          <div className="priority-icon-wrap">📅</div>
          <div className="priority-content">
            <small className="priority-label">Quando</small>
            <strong className="priority-main-text">{whenFormatted || 'Data a confirmar'}</strong>
            {meta.recurring && meta.recurringNote && (
              <span className="priority-sub-text">🔄 {meta.recurringNote}</span>
            )}
          </div>
        </div>

        {/* 2. ONDE */}
        <div className="priority-card where-card">
          <div className="priority-icon-wrap">📍</div>
          <div className="priority-content">
            <small className="priority-label">Onde</small>
            {isOnline ? (
              <>
                <strong className="priority-main-text">Evento Online / Transmissão</strong>
                {meta.onlineUrl && (
                  <a className="priority-link" href={meta.onlineUrl} target="_blank" rel="noopener noreferrer">
                    Acessar transmissão →
                  </a>
                )}
              </>
            ) : (
              <>
                {meta.venueName && <strong className="priority-venue-name">{meta.venueName}</strong>}
                <span className="priority-address">{item.location || 'Garça - SP'}</span>
                <a className="priority-link" href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  Ver no mapa / Traçar rota →
                </a>
              </>
            )}
          </div>
        </div>

        {/* 3. QUANTO CUSTA */}
        <div className="priority-card price-card">
          <div className="priority-icon-wrap">🎟️</div>
          <div className="priority-content">
            <small className="priority-label">Quanto custa</small>
            <strong className="priority-main-text">{meta.entryType || 'Gratuito'}</strong>
            {meta.price && <span className="priority-sub-text">{meta.price}</span>}
          </div>
        </div>

        {/* 4. COMO PARTICIPAR / AÇÕES */}
        <div className="priority-card action-card">
          <div className="priority-icon-wrap">🚀</div>
          <div className="priority-content">
            <small className="priority-label">Como participar</small>
            <div className="priority-actions-list">
              {meta.ticketUrl && (
                <a className="btn-priority-cta ticket" href={meta.ticketUrl} target="_blank" rel="noopener noreferrer">
                  <span>Comprar Ingressos</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                </a>
              )}
              {meta.registrationUrl && (
                <a className="btn-priority-cta register" href={meta.registrationUrl} target="_blank" rel="noopener noreferrer">
                  <span>Fazer Inscrição</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                </a>
              )}
              {isOnline && meta.onlineUrl && !meta.ticketUrl && !meta.registrationUrl && (
                <a className="btn-priority-cta online" href={meta.onlineUrl} target="_blank" rel="noopener noreferrer">
                  <span>Assistir ao Vivo</span>
                </a>
              )}
              {!meta.ticketUrl && !meta.registrationUrl && (!isOnline || !meta.onlineUrl) && (
                <span className="priority-entry-note">
                  {meta.entryType === 'Gratuito' ? 'Entrada livre · Não é necessário agendamento prévio' : 'Ingressos disponíveis na portaria do evento'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SCHEDULE / CRONOGRAMA */}
      {schedule.length > 0 && (
        <section className="event-section">
          <div className="section-title-wrap">
            <h3>Programação e Atrações</h3>
            <small className="muted">Cronograma oficial das atividades</small>
          </div>
          <div className="event-schedule-timeline">
            {schedule.map((entry, idx) => (
              <div key={idx} className="timeline-item">
                <div className="timeline-badge-wrap">
                  <span className="timeline-time">{entry.time || `${idx + 1}º`}</span>
                </div>
                <div className="timeline-content">
                  <strong className="timeline-title">{entry.title}</strong>
                  {entry.description && <p className="timeline-desc">{entry.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* RECURSOS E ESTRUTURA */}
      {features.length > 0 && (
        <section className="event-section">
          <h3>Estrutura e Recursos</h3>
          <div className="event-features-grid">
            {features.map((id) => {
              const info = EVENT_FEATURES_CATALOG[id] || { icon: '✨', label: id }
              return (
                <div key={id} className="feature-card">
                  <span className="feature-icon">{info.icon}</span>
                  <span className="feature-label">{info.label}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* SOBRE O EVENTO / DESCRIÇÃO */}
      {item.body && (
        <section className="event-section">
          <h3>Sobre o Evento</h3>
          <div className="fiche-body event-body-text">{item.body}</div>
        </section>
      )}

      {/* GALERIA DE FOTOS */}
      {images.length > 1 && (
        <section className="event-section">
          <div className="section-title-wrap">
            <h3>Cartaz e Fotos</h3>
            <small className="muted">{images.length} imagens disponíveis · Clique para ampliar</small>
          </div>
          <div className="event-gallery-grid">
            {images.map((img, idx) => (
              <button
                key={img.url + idx}
                type="button"
                className="gallery-grid-item"
                onClick={() => onOpenLightbox(idx)}
                aria-label={`Ver imagem ${idx + 1}`}
              >
                <img src={img.url} alt={img.title || ''} />
                {img.title && <span className="gallery-item-caption">{img.title}</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ORGANIZAÇÃO E CONTATO */}
      {(meta.organizer || whatsappDigits || item.contact?.phone || item.contact?.email || item.contact?.website || meta.instagram) && (
        <section className="event-section contact-section">
          <h3>Organização e Informações</h3>
          {meta.organizer && (
            <p className="event-organizer-note">
              Realização / Organização: <strong>{meta.organizer}</strong>
            </p>
          )}
          <div className="event-contact-grid">
            {whatsappDigits && (
              <a
                className="contact-card whatsapp"
                href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Olá! Gostaria de informações sobre o evento: ${item.title}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="contact-icon">💬</span>
                <div>
                  <small>WhatsApp</small>
                  <strong>{meta.whatsapp || item.contact?.phone}</strong>
                </div>
              </a>
            )}
            {item.contact?.phone && (
              <a className="contact-card phone" href={`tel:${item.contact.phone.replace(/\D/g, '')}`}>
                <span className="contact-icon">📞</span>
                <div>
                  <small>Telefone</small>
                  <strong>{item.contact.phone}</strong>
                </div>
              </a>
            )}
            {item.contact?.email && (
              <a className="contact-card email" href={`mailto:${item.contact.email}`}>
                <span className="contact-icon">✉️</span>
                <div>
                  <small>E-mail</small>
                  <strong>{item.contact.email}</strong>
                </div>
              </a>
            )}
            {item.contact?.website && (
              <a className="contact-card website" href={item.contact.website} target="_blank" rel="noopener noreferrer">
                <span className="contact-icon">🌐</span>
                <div>
                  <small>Site oficial</small>
                  <strong>Acessar site</strong>
                </div>
              </a>
            )}
            {meta.instagram && (
              <a
                className="contact-card instagram"
                href={meta.instagram.startsWith('http') ? meta.instagram : `https://instagram.com/${meta.instagram.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="contact-icon">📸</span>
                <div>
                  <small>Instagram</small>
                  <strong>{meta.instagram}</strong>
                </div>
              </a>
            )}
          </div>
        </section>
      )}

      <div className="fiche-footer">
        <a className="btn-back" href={href('eventos')} onClick={(e) => { e.preventDefault(); onBack() }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          <span>Voltar para Eventos</span>
        </a>
      </div>
    </article>
  )
}

function AttractionDetail({ item, onBack, onOpenLightbox }) {
  const meta = item.metadata || {}
  const addr = meta.address || {}
  const flags = accessFlags(item)
  const images = galleryImages(item)
  const features = Array.isArray(meta.features) ? meta.features : (Array.isArray(meta.amenities) ? meta.amenities : [])
  const accessDetails = Array.isArray(meta.accessDetails) ? meta.accessDetails : []
  const audiences = Array.isArray(meta.audiences) ? meta.audiences : []
  const cover = coverImage(item)
  const whatsappDigits = cleanWhatsapp(meta.whatsapp || item.contact?.whatsapp)

  const mapsQuery = encodeURIComponent(
    item.location || [item.title, meta.referencePoint, addr.street, addr.city || 'Garça', 'SP'].filter(Boolean).join(', ')
  )
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`

  const openingHours = meta.hours || {}
  const hasHours = Object.keys(openingHours).length > 0 && !meta.freeVisit

  // Format entry fee / price
  const entryTypeLabels = {
    free: 'Entrada Gratuita',
    paid: 'Entrada Paga',
    free_booking: 'Gratuita com Agendamento',
    paid_booking: 'Paga com Agendamento',
  }
  const entryTypeLabel = entryTypeLabels[meta.entryType] || (meta.entryType ? meta.entryType : (meta.entryFee ? 'Entrada Paga' : 'Gratuita'))

  return (
    <article className="fiche fiche-attraction">
      <div className="fiche-back-bar">
        <a className="btn-back" href={href('atrativos')} onClick={(e) => { e.preventDefault(); onBack() }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          <span>Voltar para Atrativos</span>
        </a>
      </div>

      {/* HERO CARD */}
      <div className="attraction-hero-card">
        {cover ? <img className="attraction-hero-img" src={cover} alt="" /> : <div className="attraction-hero-fallback" />}
        <div className="attraction-hero-shade" />
        <div className="attraction-hero-info">
          <div className="attraction-badges">
            <span className="attraction-badge">{meta.attractionCategory || 'Ponto Turístico'}</span>
            {item.featured && <span className="attraction-star-badge">★ Em evidência</span>}
            {flags.wheelchair && <span className="attraction-flag-badge">♿ Acessível PCD</span>}
            {flags.petFriendly && <span className="attraction-flag-badge">🐾 Aceita pets</span>}
          </div>
          <h1 className="attraction-title">{item.title}</h1>
          {item.summary && <p className="attraction-lead">{item.summary}</p>}

          {/* QUICK HERO ACTIONS */}
          <div className="attraction-hero-actions">
            <a className="hero-action-btn primary" href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <span className="btn-icon">🚗</span>
              <span>Como Chegar / Traçar Rota</span>
            </a>
            {whatsappDigits && (
              <a
                className="hero-action-btn whatsapp"
                href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Olá! Gostaria de informações sobre o atrativo: ${item.title}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="btn-icon">💬</span>
                <span>WhatsApp</span>
              </a>
            )}
            {item.contact?.website && (
              <a className="hero-action-btn secondary" href={item.contact.website} target="_blank" rel="noopener noreferrer">
                <span className="btn-icon">🌐</span>
                <span>Site Oficial</span>
              </a>
            )}
            {meta.ticketUrl && (
              <a className="hero-action-btn ticket" href={meta.ticketUrl} target="_blank" rel="noopener noreferrer">
                <span className="btn-icon">🎟️</span>
                <span>Comprar Ingressos</span>
              </a>
            )}
            {meta.bookingUrl && (
              <a className="hero-action-btn booking" href={meta.bookingUrl} target="_blank" rel="noopener noreferrer">
                <span className="btn-icon">📅</span>
                <span>Agendar Visita</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* QUICK FACTS STRIP */}
      <div className="attraction-facts-grid">
        <div className="attraction-fact-card">
          <span className="fact-icon">🕒</span>
          <div>
            <small>Visitação</small>
            <strong>{meta.freeVisit ? 'Visitação Livre / Ar livre' : (hasHours ? 'Consulte horários semanais' : 'Aberto para visitação')}</strong>
          </div>
        </div>
        <div className="attraction-fact-card">
          <span className="fact-icon">🎟️</span>
          <div>
            <small>Entrada / Acesso</small>
            <strong>{entryTypeLabel}</strong>
            {meta.entryFee && <span className="fact-sub">{meta.entryFee}</span>}
          </div>
        </div>
        {meta.suggestedTime && (
          <div className="attraction-fact-card">
            <span className="fact-icon">⌛</span>
            <div>
              <small>Tempo sugerido</small>
              <strong>{meta.suggestedTime}</strong>
            </div>
          </div>
        )}
        {audiences.length > 0 && (
          <div className="attraction-fact-card">
            <span className="fact-icon">👥</span>
            <div>
              <small>Indicado para</small>
              <strong>{audiences.map((id) => ATTRACTION_AUDIENCES_CATALOG[id]?.label || id).slice(0, 3).join(', ')}{audiences.length > 3 ? '...' : ''}</strong>
            </div>
          </div>
        )}
      </div>

      {/* DICAS IMPORTANTES AO VISITANTE */}
      {meta.visitorTips && (
        <section className="attraction-tips-box">
          <div className="tips-header">
            <span className="tips-icon">💡</span>
            <h3>Dicas e Recomendações ao Visitante</h3>
          </div>
          <div className="tips-content">
            {meta.visitorTips}
          </div>
        </section>
      )}

      {/* SOBRE O ATRATIVO / DESCRIÇÃO */}
      {item.body && (
        <section className="lodging-section">
          <h3>Sobre o Atrativo</h3>
          <div className="fiche-body attraction-body-text">{item.body}</div>
        </section>
      )}

      {/* GALERIA DE FOTOS */}
      {images.length > 1 && (
        <section className="lodging-section">
          <div className="section-title-wrap">
            <h3>Galeria de fotos</h3>
            <small className="muted">{images.length} fotos disponíveis · Clique para ampliar</small>
          </div>
          <div className="lodging-gallery-grid">
            {images.map((img, idx) => (
              <button
                key={img.url + idx}
                type="button"
                className="gallery-grid-item"
                onClick={() => onOpenLightbox(idx)}
                aria-label={`Ver foto ${idx + 1}`}
              >
                <img src={img.url} alt={img.title || ''} />
                {img.title && <span className="gallery-item-caption">{img.title}</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* HORÁRIOS DE FUNCIONAMENTO */}
      {hasHours && (
        <section className="lodging-section">
          <h3>Horário de Visitação</h3>
          <div className="gastro-hours-card">
            <div className="gastro-hours-grid">
              {DAYS_OF_WEEK_MAP.map((d) => {
                const dayData = openingHours[d.id] || {}
                const isClosed = dayData.closed === true
                const shifts = [dayData.p1, dayData.p2].filter(Boolean).join(' e ')

                return (
                  <div key={d.id} className={`hours-item ${isClosed ? 'is-closed' : ''}`}>
                    <strong className="hours-day-label">{d.label}</strong>
                    <span className="hours-shift-label">
                      {isClosed ? <span className="badge-closed">Fechado</span> : (shifts || 'Aberto')}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* INGRESSOS E REGRAS DE ACESSO */}
      {(meta.entryType === 'paid' || meta.entryType === 'paid_booking' || meta.entryFee || meta.entryDiscountRules || meta.ticketUrl || meta.bookingUrl) && (
        <section className="lodging-section">
          <h3>Ingressos e Valores</h3>
          <div className="attraction-entry-details-box">
            <div className="entry-details-main">
              <span className="entry-icon">🏷️</span>
              <div>
                <strong>{entryTypeLabel}</strong>
                {meta.entryFee && <p className="entry-fee-text">Valor: <span>{meta.entryFee}</span></p>}
                {meta.entryDiscountRules && (
                  <p className="entry-discount-note">
                    <small>Meia-entrada / Isenções:</small> {meta.entryDiscountRules}
                  </p>
                )}
              </div>
            </div>
            {(meta.ticketUrl || meta.bookingUrl) && (
              <div className="entry-actions-row">
                {meta.ticketUrl && (
                  <a className="btn-ticket-link" href={meta.ticketUrl} target="_blank" rel="noopener noreferrer">
                    <span>🎟️ Comprar Ingressos Online</span>
                  </a>
                )}
                {meta.bookingUrl && (
                  <a className="btn-booking-link" href={meta.bookingUrl} target="_blank" rel="noopener noreferrer">
                    <span>📅 Agendar Visita Prévia</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ESTRUTURA E FACILIDADES */}
      {(features.length > 0 || accessDetails.length > 0) && (
        <section className="lodging-section">
          <h3>Estrutura e Acessibilidade</h3>
          {features.length > 0 && (
            <div className="lodging-amenities-grid" style={{ marginBottom: accessDetails.length > 0 ? '16px' : '0' }}>
              {features.map((id) => {
                const info = ATTRACTION_FEATURES_CATALOG[id] || { icon: '✨', label: id }
                return (
                  <div key={id} className="amenity-card">
                    <span className="amenity-icon">{info.icon}</span>
                    <span className="amenity-label">{info.label}</span>
                  </div>
                )
              })}
            </div>
          )}
          {accessDetails.length > 0 && (
            <div className="attraction-access-grid">
              {accessDetails.map((id) => {
                const info = ATTRACTION_ACCESS_CATALOG[id] || { icon: '♿', label: id }
                return (
                  <div key={id} className="access-chip">
                    <span className="access-icon">{info.icon}</span>
                    <span className="access-label">{info.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* PÚBLICO INDICADO */}
      {audiences.length > 0 && (
        <section className="lodging-section">
          <h3>Público Indicado</h3>
          <div className="attraction-audiences-grid">
            {audiences.map((id) => {
              const info = ATTRACTION_AUDIENCES_CATALOG[id] || { icon: '👤', label: id }
              return (
                <div key={id} className="audience-chip">
                  <span className="audience-icon">{info.icon}</span>
                  <span className="audience-label">{info.label}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* LOCALIZAÇÃO E MAPA */}
      <section className="lodging-section">
        <h3>Localização</h3>
        <div className="lodging-location-box">
          <div className="location-info">
            <span className="location-icon">📍</span>
            <div>
              <strong>{item.location || 'Garça - SP'}</strong>
              {meta.referencePoint && <span className="d-block reference-text">Ponto de referência: {meta.referencePoint}</span>}
              {addr.cep && <span className="d-block muted">CEP: {addr.cep}</span>}
              {item.geo?.lat && item.geo?.lng && (
                <small className="muted d-block">Coordenadas: {item.geo.lat}, {item.geo.lng}</small>
              )}
            </div>
          </div>
          <a className="btn-map-route" href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
            <span>Ver no mapa / Traçar rota</span>
          </a>
        </div>
      </section>

      {/* CONTATO E INFORMAÇÕES */}
      {(whatsappDigits || item.contact?.phone || item.contact?.email || item.contact?.website || meta.instagram) && (
        <section className="lodging-section contact-section">
          <h3>Contato e Informações</h3>
          <div className="lodging-contact-grid">
            {whatsappDigits && (
              <a
                className="contact-card whatsapp"
                href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Olá! Gostaria de informações sobre: ${item.title}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="contact-icon">💬</span>
                <div>
                  <small>WhatsApp</small>
                  <strong>{meta.whatsapp || item.contact?.phone}</strong>
                </div>
              </a>
            )}
            {item.contact?.phone && (
              <a className="contact-card phone" href={`tel:${item.contact.phone.replace(/\D/g, '')}`}>
                <span className="contact-icon">📞</span>
                <div>
                  <small>Telefone</small>
                  <strong>{item.contact.phone}</strong>
                </div>
              </a>
            )}
            {item.contact?.email && (
              <a className="contact-card email" href={`mailto:${item.contact.email}`}>
                <span className="contact-icon">✉️</span>
                <div>
                  <small>E-mail</small>
                  <strong>{item.contact.email}</strong>
                </div>
              </a>
            )}
            {item.contact?.website && (
              <a className="contact-card website" href={item.contact.website} target="_blank" rel="noopener noreferrer">
                <span className="contact-icon">🌐</span>
                <div>
                  <small>Site oficial</small>
                  <strong>Acessar site</strong>
                </div>
              </a>
            )}
            {meta.instagram && (
              <a
                className="contact-card instagram"
                href={meta.instagram.startsWith('http') ? meta.instagram : `https://instagram.com/${meta.instagram.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="contact-icon">📸</span>
                <div>
                  <small>Instagram</small>
                  <strong>{meta.instagram}</strong>
                </div>
              </a>
            )}
          </div>
        </section>
      )}

      <div className="fiche-footer">
        <a className="btn-back" href={href('atrativos')} onClick={(e) => { e.preventDefault(); onBack() }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          <span>Voltar para Atrativos</span>
        </a>
      </div>
    </article>
  )
}

export default function App() {
  const [route, setRoute] = useState(() => parsePath(window.location.pathname, window.location.search))
  const [branding, setBranding] = useState({})
  const [featured, setFeatured] = useState([])
  const [attractions, setAttractions] = useState([])
  const [news, setNews] = useState([])
  const [list, setList] = useState([])
  const [detail, setDetail] = useState(null)
  const [meetings, setMeetings] = useState([])
  const [governance, setGovernance] = useState([])
  const [allContents, setAllContents] = useState([])
  const [query, setQuery] = useState(route.query || '')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Carregando…')
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    const onPop = () => {
      const next = parsePath(window.location.pathname, window.location.search)
      setRoute(next)
      setQuery(next.query || '')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    function loadBrand() {
      fetchBranding().then((data) => {
        setBranding(data)
        applyTheme(data)
      }).catch(() => {})
    }
    loadBrand()
    const onShow = () => loadBrand()
    window.addEventListener('focus', onShow)
    document.addEventListener('visibilitychange', onShow)
    return () => {
      window.removeEventListener('focus', onShow)
      document.removeEventListener('visibilitychange', onShow)
    }
  }, [])

  useEffect(() => {
    setError('')
    setDetail(null)
    const run = async () => {
      if (route.view === 'login' || route.view === 'register') {
        setStatus('')
        return
      }
      try {
        if (route.view === 'home') {
          setStatus('Carregando o catálogo…')
          const [top, all, publishedNews] = await Promise.all([
            fetchContent({ featured: true, limit: 8 }),
            fetchContent({ type: 'attraction', limit: 12 }),
            fetchContent({ type: 'news', limit: 6 }),
          ])
          setFeatured(top)
          setAttractions(all)
          setNews(publishedNews)
        } else if (route.view === 'category') {
          setStatus('Carregando categoria…')
          setList(await fetchContent({ type: route.category.type, limit: 48 }))
        } else if (route.view === 'search') {
          setStatus('Buscando…')
          setList(route.query ? await fetchContent({ q: route.query, limit: 48 }) : [])
        } else if (route.view === 'map') {
          window.open(MAPA_TURISTICO, '_blank', 'noopener,noreferrer')
          navigate('')
          return
        } else if (route.view === 'detail') {
          setStatus('Carregando ficha…')
          setDetail(await fetchContentBySlug(route.slug))
        } else if (route.view === 'comtur') {
          setStatus('Carregando o COMTUR…')
          const [sessions, published, allPub] = await Promise.all([
            fetchMeetings(),
            fetchContent({ limit: 100 }),
            fetchContent({ limit: 500 }),
          ])
          setMeetings(sessions)
          setGovernance(published.filter(isGovernanceContent))
          setAllContents(allPub)
        } else if (route.view === 'legislation') {
          setStatus('Carregando legislação…')
          const published = await fetchContent({ type: 'legislation', limit: 100 })
          setGovernance(published)
        } else if (route.view === 'accountability') {
          setStatus('Carregando prestações de contas…')
          const published = await fetchContent({ type: 'accountability', limit: 100 })
          setGovernance(published)
        } else if (route.view === 'observatory') {
          setStatus('Carregando Observatório do Turismo…')
          const [published, allPub] = await Promise.all([
            fetchContent({ type: 'indicator', limit: 100 }),
            fetchContent({ limit: 500 }),
          ])
          setGovernance(published)
          setAllContents(allPub)
        } else if (route.view === 'content') {
          setStatus('Carregando publicação…')
          setDetail(await fetchContentBySlug(route.slug))
        } else if (route.view === 'meeting') {
          setStatus('Carregando reunião…')
          setDetail(await fetchMeetingBySlug(route.slug))
        }
        setStatus('')
      } catch (err) {
        setError(err.message)
        setStatus('')
      }
    }
    run()
  }, [route])

  const activeCategory = route.view === 'category' ? route.category.id : ''

  if (route.view === 'login' || route.view === 'register') {
    return <AuthScreens mode={route.view} branding={branding} onNavigate={navigate} />
  }

  function onSearch(event) {
    event.preventDefault()
    const value = query.trim()
    window.history.pushState({}, '', value ? `${href('buscar')}?q=${encodeURIComponent(value)}` : href(''))
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  function go(event, path) {
    event.preventDefault()
    navigate(path)
  }

  const pageTitle = route.view === 'home'
    ? portalHeadline(branding)
    : route.view === 'category' ? route.category.label
    : route.view === 'search' ? 'Busca'
    : route.view === 'legislation' ? 'Legislação e Atos Oficiais'
    : route.view === 'accountability' ? 'Prestação de Contas'
    : route.view === 'observatory' ? 'Observatório do Turismo'
    : route.view === 'comtur' ? 'COMTUR'
    : route.view === 'meeting' ? (detail ? meetingHeadline(detail) : 'COMTUR')
    : route.view === 'content' && detail ? detail.title
    : route.view === 'detail' && detail ? detail.title
    : 'Página não encontrada'

  const pageLead = route.view === 'home'
    ? portalLead(branding)
    : route.view === 'category' ? route.category.blurb
    : route.view === 'search' ? (route.query ? `Resultados para “${route.query}”.` : 'Digite um termo para consultar o catálogo publicado.')
    : route.view === 'legislation' ? 'Repositório de leis, decretos, resoluções e regimentos oficiais do turismo e do COMTUR.'
    : route.view === 'accountability' ? 'Repositório oficial de prestações de contas, demonstrativos e relatórios financeiros do COMTUR.'
    : route.view === 'observatory' ? 'Painel de dados, indicadores estatísticos e inteligência do turismo de Garça.'
    : route.view === 'comtur' ? 'Membros, documentos e reuniões publicados pelo Conselho Municipal de Turismo de Garça.'
    : route.view === 'meeting' ? (detail ? [meetingWhen(detail), detail.location].filter(Boolean).join(' · ') : 'Carregando a reunião publicada.')
    : route.view === 'content' ? (detail?.summary || 'Publicação oficial do COMTUR.')
    : ''

  const contacts = footerContacts(branding)

  return (
    <>
      <a className="skip" href="#conteudo">Ir para o conteúdo</a>
      <header className="topbar">
        <a className="brand" href={href('')} onClick={(event) => go(event, '')}>
          {branding.logoUrl ? <img src={branding.logoUrl} alt="" /> : null}
          <span>
            <small>{branding.organizationName || 'Prefeitura Municipal de Garça'}</small>
            <strong>{portalName(branding)}</strong>
          </span>
        </a>
        <nav className="top-nav" aria-label="Seções do portal">
          <a href={href('')} aria-current={route.view === 'home' ? 'page' : undefined} onClick={(event) => go(event, '')}>Início</a>
          {CATEGORIES.map((item) => (
            <a key={item.id} href={href(item.id)} aria-current={activeCategory === item.id ? 'page' : undefined} onClick={(event) => go(event, item.id)}>{item.label}</a>
          ))}
          <a href={href('comtur')} aria-current={route.view === 'comtur' || route.view === 'meeting' || route.view === 'content' ? 'page' : undefined} onClick={(event) => go(event, 'comtur')}>COMTUR</a>
        </nav>
        <AccountMenu onNavigate={navigate} />
      </header>

      <section className={['hero', route.view === 'home' ? 'hero-home' : 'hero-page', branding.heroImageUrl ? 'has-photo' : ''].filter(Boolean).join(' ')}>
        {branding.heroImageUrl ? <img className="hero-media" src={`${branding.heroImageUrl}${branding.heroImageUrl.includes('?') ? '&' : '?'}v=${branding.version || 1}`} alt="" /> : <div className="hero-fallback" aria-hidden="true" />}
        <div className="hero-shade" />
        <div className="hero-copy">
          <p className="kicker">{portalKicker(branding)}</p>
          <h1>{pageTitle}</h1>
          {pageLead ? <p className="lead">{pageLead}</p> : null}
          <form className="hero-search" onSubmit={onSearch} role="search">
            <label className="sr" htmlFor="busca">Buscar no catálogo</label>
            <input id="busca" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={120} placeholder="Buscar atrativos, eventos, hospedagem…" />
            <button type="submit">Buscar</button>
          </form>
        </div>
      </section>

      <main id="conteudo" className="page">
        {error ? <EmptyState title="Não foi possível carregar">{error}</EmptyState> : null}
        {status ? <p className="status" role="status">{status}</p> : null}

        {route.view === 'home' && !error && !status && (
          <>
            <section className="block featured-section">
              <header className="block-head">
                <div>
                  <h2>Em evidência</h2>
                  <p>Escolhas da gestão para quem chega agora.</p>
                </div>
                <a {...MAPA_TURISTICO_ATTRS}>Ver mapa</a>
              </header>
              {featured.length ? (
                <FeaturedCarousel items={featured} onOpen={navigate} />
              ) : (
                <EmptyState title="Ainda sem destaques">
                  Quando a secretaria marcar um item como evidência, ele ocupa este espaço em formato de carrossel.
                </EmptyState>
              )}
            </section>
            {news.length ? (
              <section className="block">
                <header className="block-head">
                  <div>
                    <h2>Notícias</h2>
                    <p>Matérias publicadas pela gestão de turismo.</p>
                  </div>
                  <a href={href('noticias')} onClick={(event) => go(event, 'noticias')}>Ver todas</a>
                </header>
                <div className="grid">{news.map((item) => <PlaceCard key={item._id || item.slug} item={item} />)}</div>
              </section>
            ) : null}
            <section className="block">
              <header className="block-head">
                <div>
                  <h2>Atrativos</h2>
                  <p>O que ver e visitar, a partir do cadastro oficial.</p>
                </div>
                <a href={href('atrativos')} onClick={(event) => go(event, 'atrativos')}>Ver todos</a>
              </header>
              {attractions.length
                ? <div className="grid">{attractions.map((item) => <PlaceCard key={item._id || item.slug} item={item} />)}</div>
                : <EmptyState title="Catálogo em preparação">Os atrativos publicados pela Prefeitura aparecerão aqui, com foto, resumo e localização.</EmptyState>}
            </section>
          </>
        )}

        {route.view === 'category' && !error && !status && (
          <section className="block">
            {list.length
              ? <div className="grid">{list.map((item) => <PlaceCard key={item._id || item.slug} item={item} />)}</div>
              : <EmptyState title={`Nada publicado em ${route.category.label}`}>Esta seção espera o cadastro oficial da secretaria.</EmptyState>}
          </section>
        )}

        {route.view === 'search' && !error && !status && (
          <section className="block">
            {list.length
              ? <div className="grid">{list.map((item) => <PlaceCard key={item._id || item.slug} item={item} />)}</div>
              : <EmptyState title="Nenhum resultado">{route.query ? 'Nada publicado corresponde a essa busca.' : 'Use o campo no topo para procurar no catálogo.'}</EmptyState>}
          </section>
        )}

        {route.view === 'detail' && detail && (
          detail.type === 'event' ? (
            <EventDetail
              item={detail}
              onBack={() => {
                if (window.history.length > 1) window.history.back()
                else navigate('eventos')
              }}
              onOpenLightbox={(idx) => setLightbox({ images: galleryImages(detail), index: idx })}
            />
          ) : detail.type === 'lodging' ? (
            <LodgingDetail
              item={detail}
              onBack={() => {
                if (window.history.length > 1) window.history.back()
                else navigate('hospedagens')
              }}
              onOpenLightbox={(idx) => setLightbox({ images: galleryImages(detail), index: idx })}
            />
          ) : detail.type === 'gastronomy' ? (
            <GastronomyDetail
              item={detail}
              onBack={() => {
                if (window.history.length > 1) window.history.back()
                else navigate('alimentacao')
              }}
              onOpenLightbox={(idx) => setLightbox({ images: galleryImages(detail), index: idx })}
            />
          ) : detail.type === 'attraction' ? (
            <AttractionDetail
              item={detail}
              onBack={() => {
                if (window.history.length > 1) window.history.back()
                else navigate('atrativos')
              }}
              onOpenLightbox={(idx) => setLightbox({ images: galleryImages(detail), index: idx })}
            />
          ) : (
            <article className="fiche">
              <div className="fiche-back-bar">
                <a
                  className="btn-back"
                  href={categoryId(detail) ? href(categoryId(detail)) : href('')}
                  onClick={(event) => {
                    event.preventDefault()
                    if (window.history.length > 1) {
                      window.history.back()
                    } else {
                      navigate(categoryId(detail) || '')
                    }
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
                  <span>Voltar {categoryId(detail) ? `para ${categoryLabel(detail)}` : 'ao início'}</span>
                </a>
              </div>
              {coverImage(detail) ? <img className="fiche-cover" src={coverImage(detail)} alt="" /> : null}
              <div className="fiche-header">
                <span className="kind">{categoryLabel(detail)}</span>
                <h2>{detail.title}</h2>
              </div>
              {detail.summary ? <p className="lead">{detail.summary}</p> : null}
              {detail.body ? <div className="fiche-body">{detail.body}</div> : null}
              {detail.location ? <p className="fiche-location">{detail.location}</p> : null}

              {galleryImages(detail).length > 1 && (
                <section className="lodging-section" style={{ marginTop: '32px' }}>
                  <div className="section-title-wrap">
                    <h3>Galeria de fotos</h3>
                    <small className="muted">{galleryImages(detail).length} fotos · Clique para ampliar</small>
                  </div>
                  <div className="lodging-gallery-grid">
                    {galleryImages(detail).map((img, idx) => (
                      <button
                        key={img.url + idx}
                        type="button"
                        className="gallery-grid-item"
                        onClick={() => setLightbox({ images: galleryImages(detail), index: idx })}
                        aria-label={`Ver foto ${idx + 1}`}
                      >
                        <img src={img.url} alt={img.title || ''} />
                        {img.title && <span className="gallery-item-caption">{img.title}</span>}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <div className="fiche-footer">
                <a
                  className="btn-back"
                  href={categoryId(detail) ? href(categoryId(detail)) : href('')}
                  onClick={(event) => {
                    event.preventDefault()
                    if (window.history.length > 1) {
                      window.history.back()
                    } else {
                      navigate(categoryId(detail) || '')
                    }
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
                  <span>Voltar {categoryId(detail) ? `para ${categoryLabel(detail)}` : 'ao início'}</span>
                </a>
              </div>
            </article>
          )
        )}

        {route.view === 'legislation' && !error && !status && (
          <section className="block">
            <LegislationRepositoryBlock items={governance} onOpen={(slug) => navigate(`comtur/doc/${slug}`)} />
          </section>
        )}

        {route.view === 'accountability' && !error && !status && (
          <section className="block">
            <AccountabilityRepositoryBlock items={governance} onOpen={(slug) => navigate(`comtur/doc/${slug}`)} />
          </section>
        )}

        {route.view === 'observatory' && !error && !status && (
          <section className="block">
            <ObservatoryBlock
              indicators={governance}
              allContents={allContents}
              onOpen={(slug) => navigate(`comtur/doc/${slug}`)}
            />
          </section>
        )}

        {route.view === 'comtur' && !error && !status && (
          <>
            {governance.filter((item) => item.type === 'indicator').length ? (
              <section className="block">
                <header className="block-head">
                  <div>
                    <h2>Observatório do Turismo & Indicadores</h2>
                    <p>Indicadores estatísticos, capacidade instalada e inteligência do turismo.</p>
                  </div>
                  <a className="btn-action" href={href('observatorio')} onClick={(event) => go(event, 'observatorio')}>
                    Ver observatório completo →
                  </a>
                </header>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {governance.filter((item) => item.type === 'indicator').slice(0, 4).map((item) => (
                    <IndicatorCard key={item.slug || item._id} item={item} allContents={allContents} />
                  ))}
                </div>
              </section>
            ) : null}
            {governance.filter((item) => item.type === 'council_member').length ? (
              <section className="block">
                <header className="block-head">
                  <div>
                    <h2>Membros do Conselho</h2>
                    <p>Composição publicada pela gestão do COMTUR.</p>
                  </div>
                </header>
                <div className="map-list">
                  {governance.filter((item) => item.type === 'council_member').map((item) => (
                    <ContentCard key={item.slug} item={item} onOpen={(slug) => navigate(`comtur/doc/${slug}`)} />
                  ))}
                </div>
              </section>
            ) : null}
            {governance.filter((item) => item.type === 'legislation').length ? (
              <section className="block">
                <header className="block-head">
                  <div>
                    <h2>Legislação e Atos Normativos</h2>
                    <p>Leis, decretos, resoluções e regimentos do turismo e do COMTUR.</p>
                  </div>
                  <a className="btn-action" href={href('legislacao')} onClick={(event) => go(event, 'legislacao')}>
                    Ver repositório completo →
                  </a>
                </header>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {governance.filter((item) => item.type === 'legislation').slice(0, 5).map((item) => (
                    <LegislationCard key={item.slug} item={item} onOpen={(slug) => navigate(`comtur/doc/${slug}`)} />
                  ))}
                </div>
              </section>
            ) : null}
            {governance.filter((item) => item.type === 'accountability').length ? (
              <section className="block">
                <header className="block-head">
                  <div>
                    <h2>Prestação de Contas</h2>
                    <p>Relatórios financeiros, demonstrativos e prestações de contas oficiais.</p>
                  </div>
                  <a className="btn-action" href={href('prestacao-contas')} onClick={(event) => go(event, 'prestacao-contas')}>
                    Ver repositório completo →
                  </a>
                </header>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {governance.filter((item) => item.type === 'accountability').slice(0, 5).map((item) => (
                    <AccountabilityCard key={item.slug} item={item} onOpen={(slug) => navigate(`comtur/doc/${slug}`)} />
                  ))}
                </div>
              </section>
            ) : null}
            {governance.filter((item) => item.type !== 'council_member' && item.type !== 'legislation' && item.type !== 'accountability' && item.type !== 'indicator').length ? (
              <section className="block">
                <header className="block-head">
                  <div>
                    <h2>Outros Documentos e Publicações</h2>
                    <p>Planos de trabalho e demais atos oficiais.</p>
                  </div>
                </header>
                <div className="map-list">
                  {governance.filter((item) => item.type !== 'council_member' && item.type !== 'legislation' && item.type !== 'accountability' && item.type !== 'indicator').map((item) => (
                    <ContentCard key={item.slug} item={item} onOpen={(slug) => navigate(`comtur/doc/${slug}`)} />
                  ))}
                </div>
              </section>
            ) : null}
            <section className="block">
              <header className="block-head">
                <div>
                  <h2>Reuniões</h2>
                  <p>Visualize ou baixe ata, pauta e anexos em cada card.</p>
                </div>
              </header>
              {meetings.length ? (
                <div className="map-list">
                  {meetings.map((item) => (
                    <MeetingCard key={item.slug} item={item} onOpen={(slug) => navigate(`comtur/${slug}`)} />
                  ))}
                </div>
              ) : <EmptyState title="Nenhuma reunião publicada">Cadastre a sessão em Gestão e clique em Publicar. Só então ela aparece aqui.</EmptyState>}
            </section>
            {!governance.length && !meetings.length ? (
              <EmptyState title="Nada publicado no COMTUR">Publique membros, documentos ou reuniões na gestão para exibir nesta página.</EmptyState>
            ) : null}
          </>
        )}

        {route.view === 'content' && detail && !error && !status && (
          <article className="fiche meeting-fiche">
            <div className="fiche-back-bar">
              <a className="btn-back" href={href('comtur')} onClick={(event) => go(event, 'comtur')}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
                <span>Voltar ao COMTUR</span>
              </a>
            </div>
            <span className="kind">{governanceLabel(detail.type)}</span>
            <h2>{detail.title}</h2>
            {detail.summary ? <p className="lead">{detail.summary}</p> : null}
            {detail.type === 'council_member' && contentLines(detail.body).length ? (
              <ul className="deliberations">
                {contentLines(detail.body).map((name) => <li key={name}>{name}</li>)}
              </ul>
            ) : (detail.body ? <p>{detail.body}</p> : null)}
            {detail.location ? <p>{detail.location}</p> : null}
            <MeetingDocuments documents={mediaAsDocuments(detail.media)} />
            <div className="fiche-footer">
              <a className="btn-back" href={href('comtur')} onClick={(event) => go(event, 'comtur')}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
                <span>Voltar ao COMTUR</span>
              </a>
            </div>
          </article>
        )}

        {route.view === 'meeting' && detail && !error && !status && (
          <article className="fiche meeting-fiche">
            <div className="fiche-back-bar">
              <a className="btn-back" href={href('comtur')} onClick={(event) => go(event, 'comtur')}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
                <span>Voltar às reuniões</span>
              </a>
            </div>
            <span className="kind">{meetingTitle(detail)}</span>
            <h2>{meetingHeadline(detail)}</h2>
            {detail.summary && detail.summary !== detail.slug && !/^reuniao-\d+/i.test(detail.summary)
              ? <p className="lead">{detail.summary}</p>
              : null}
            <p>{[meetingWhen(detail), detail.location].filter(Boolean).join(' · ')}</p>
            {Array.isArray(detail.deliberations) && detail.deliberations.length ? (
              <ul className="deliberations">
                {detail.deliberations.map((entry) => <li key={entry}>{entry}</li>)}
              </ul>
            ) : null}
            <MeetingDocuments documents={detail.documents} />
            <div className="fiche-footer">
              <a className="btn-back" href={href('comtur')} onClick={(event) => go(event, 'comtur')}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
                <span>Voltar às reuniões</span>
              </a>
            </div>
          </article>
        )}

        {route.view === 'notfound' && (
          <EmptyState title="Esta página não existe">Volte ao início do portal municipal de turismo.</EmptyState>
        )}
      </main>

      <footer className="site-foot">
        <div className={`foot-grid${contacts.length ? '' : ' no-contact'}`}>
          <div>
            {branding.logoUrl ? <img className="foot-logo" src={branding.logoUrl} alt="" /> : null}
            <strong>{portalName(branding)}</strong>
            <p>{portalFooter(branding)}</p>
          </div>
          {contacts.length ? (
            <div>
              <span>Contato</span>
              {contacts.map((item) => (
                item.kind === 'link' ? (
                  <p key={item.label}>
                    <a href={item.href} {...(item.external ? { rel: 'noopener noreferrer' } : {})}>{item.label}</a>
                  </p>
                ) : <p key={item.label}>{item.label}</p>
              ))}
            </div>
          ) : null}
          <div>
            <span>Portal</span>
            <p><a {...MAPA_TURISTICO_ATTRS}>Mapa turístico</a></p>
          </div>
        </div>
      </footer>

      {lightbox && (
        <LightboxModal
          images={lightbox.images}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  )
}
