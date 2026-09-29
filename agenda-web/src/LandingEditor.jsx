import { useEffect, useState } from 'react'
import { api } from './api'
import BannerField from './BannerField.jsx'

export default function LandingEditor({ service, unit, onSaved }) {
  const [form, setForm] = useState({
    landingBannerUrl: service.landingBannerUrl || '',
    landingAddress: service.landingAddress || unit?.address || '',
    bookingFrom: service.bookingFrom || '',
    bookingUntil: service.bookingUntil || '',
    description: service.description || '',
  })

  useEffect(() => {
    setForm({
      landingBannerUrl: service.landingBannerUrl || '',
      landingAddress: service.landingAddress || unit?.address || '',
      bookingFrom: service.bookingFrom || '',
      bookingUntil: service.bookingUntil || '',
      description: service.description || '',
    })
  }, [service, unit])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const result = await api(`/api/agenda/admin/services/${service._id}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      })
      setMessage('Página pública atualizada.')
      onSaved?.(result.service)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="landing-editor" onSubmit={save}>
      <div className="section-title">
        <div>
          <p className="eyebrow">Página pública</p>
          <h3>Configurar landing</h3>
        </div>
      </div>
      <p className="form-help">Banner, período em que o cidadão pode marcar e o endereço que aparece no cartaz.</p>
      {message && <p className="notice">{message}</p>}
      <BannerField
        serviceId={service._id}
        value={form.landingBannerUrl}
        onChangeUrl={(url) => setForm((curr) => ({ ...curr, landingBannerUrl: url }))}
        onUploaded={(url, updated) => {
          setForm((current) => ({ ...current, landingBannerUrl: url }))
          onSaved?.(updated)
        }}
      />
      <label>Endereço do atendimento
        <input maxLength="500" value={form.landingAddress} onChange={(e) => setForm({ ...form, landingAddress: e.target.value })} placeholder="Rua, número, bairro, Garça/SP (opcional)" />
      </label>
      <div className="compact-fields">
        <label>Período — de<input type="date" value={form.bookingFrom} onChange={(e) => setForm({ ...form, bookingFrom: e.target.value })} /></label>
        <label>até<input type="date" value={form.bookingUntil} onChange={(e) => setForm({ ...form, bookingUntil: e.target.value })} /></label>
      </div>
      <label>Texto da página
        <input maxLength="2000" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex.: Inscrições para o transporte escolar 2026" />
      </label>
      <button disabled={busy || !service._id}>Salvar página</button>
    </form>
  )
}
