import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { landingUrl } from './adminConfig'

export default function LandingShare({ unitSlug, serviceSlug, serviceName }) {
  const [src, setSrc] = useState('')
  const [copied, setCopied] = useState(false)
  const url = landingUrl(unitSlug, serviceSlug)

  useEffect(() => {
    if (!unitSlug || !serviceSlug) return undefined
    let active = true
    QRCode.toDataURL(url, { width: 280, margin: 1, color: { dark: '#12265c', light: '#ffffff' } }).then((value) => {
      if (active) setSrc(value)
    })
    return () => { active = false }
  }, [url, unitSlug, serviceSlug])

  if (!unitSlug || !serviceSlug) return null

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <aside className="share-card">
      <div>
        <p className="eyebrow">Página exclusiva</p>
        <h3>Divulgue {serviceName}</h3>
        <p className="form-help">Quem abrir o QR ou o link cai direto no calendário deste serviço.</p>
        <code className="share-link">{url}</code>
        <div className="form-actions">
          <button type="button" onClick={copy}>{copied ? 'Link copiado' : 'Copiar link'}</button>
          <a className="button-link" href={url} target="_blank" rel="noreferrer">Abrir landing</a>
        </div>
      </div>
      {src && <img src={src} width="180" height="180" alt={`QR Code de ${serviceName}`} />}
    </aside>
  )
}
