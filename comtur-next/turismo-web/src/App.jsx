import { useEffect, useState } from 'react'
import {
  accessFlags, applyTheme, CATEGORIES, categoryId, categoryLabel, contentLines, coverImage, href,
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
    <a className="card" href={href(`p/${item.slug}`)} onClick={(event) => { event.preventDefault(); navigate(`p/${item.slug}`) }}>
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
                href={href(`p/${item.slug}`)}
                onClick={(event) => {
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
          const [sessions, published] = await Promise.all([
            fetchMeetings(),
            fetchContent({ limit: 100 }),
          ])
          setMeetings(sessions)
          setGovernance(published.filter(isGovernanceContent))
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
    : route.view === 'comtur' ? 'COMTUR'
    : route.view === 'meeting' ? (detail ? meetingHeadline(detail) : 'COMTUR')
    : route.view === 'content' && detail ? detail.title
    : route.view === 'detail' && detail ? detail.title
    : 'Página não encontrada'

  const pageLead = route.view === 'home'
    ? portalLead(branding)
    : route.view === 'category' ? route.category.blurb
    : route.view === 'search' ? (route.query ? `Resultados para “${route.query}”.` : 'Digite um termo para consultar o catálogo publicado.')
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

        {route.view === 'comtur' && !error && !status && (
          <>
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
            {governance.filter((item) => item.type !== 'council_member').length ? (
              <section className="block">
                <header className="block-head">
                  <div>
                    <h2>Documentos e publicações</h2>
                    <p>Legislação, planos, prestações de contas e demais atos oficiais.</p>
                  </div>
                </header>
                <div className="map-list">
                  {governance.filter((item) => item.type !== 'council_member').map((item) => (
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
