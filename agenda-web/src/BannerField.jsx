import { useState } from 'react'
import { apiUpload } from './api'

export default function BannerField({ serviceId, value, onChangeUrl, onUploaded, onFilePicked }) {
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function choose(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    const local = URL.createObjectURL(file)
    setPreview(local)

    if (!serviceId) {
      onFilePicked?.(file)
      return
    }

    setBusy(true)
    try {
      const body = new FormData()
      body.append('banner', file)
      const data = await apiUpload(`/api/agenda/admin/services/${serviceId}/banner`, body)
      if (data.landingBannerUrl) {
        onChangeUrl?.(data.landingBannerUrl)
      }
      onUploaded?.(data.landingBannerUrl, data.service)
    } catch (err) {
      setError(err.message || 'Falha ao enviar o arquivo de banner.')
    } finally {
      setBusy(false)
    }
  }

  function handleUrlChange(event) {
    setError('')
    setPreview('')
    onChangeUrl?.(event.target.value)
  }

  function clearBanner() {
    setError('')
    setPreview('')
    onChangeUrl?.('')
    onFilePicked?.(null)
    if (serviceId) {
      onUploaded?.('', null)
    }
  }

  const currentSrc = preview || value

  return (
    <div className="banner-field-container">
      <label>
        Banner (URL)
        <input
          type="text"
          maxLength="500"
          value={value || ''}
          onChange={handleUrlChange}
          placeholder="https://.../banner.jpg ou /images/agenda/..."
          disabled={busy}
        />
      </label>

      <div className="banner-upload-row">
        <label className="banner-file-btn">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={choose}
            disabled={busy}
          />
          {busy ? 'Enviando imagem…' : '📁 Ou selecione um arquivo para upload'}
        </label>
        {currentSrc && (
          <button type="button" className="ghost danger small-btn" onClick={clearBanner} disabled={busy}>
            Remover banner
          </button>
        )}
      </div>

      <small className="form-help">
        Informe a URL de uma imagem externa/interna ou envie um arquivo (JPG, PNG, WebP ou GIF até 5 MB).
      </small>

      {error && <p className="error">{error}</p>}

      {currentSrc && (
        <div className="banner-preview-box">
          <p className="preview-label">Prévia do banner:</p>
          <img src={currentSrc} alt="Prévia do banner" className="banner-preview" onError={() => setError('Não foi possível carregar a imagem da URL informada.')} />
        </div>
      )}
    </div>
  )
}
