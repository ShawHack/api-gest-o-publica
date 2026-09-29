import { useCallback, useEffect, useState } from 'react'
import { api, apiUpload } from './api'
import BannerField from './BannerField.jsx'
import { buildWeeklyAvailability, findByName, lunchFromAvailability, slugify, validateDaySchedule } from './adminConfig'
import LandingShare from './LandingShare.jsx'
import LandingEditor from './LandingEditor.jsx'
import { blockedDatesForUnit, fullDayRange, monthDays } from './holidayCalendar'

const weekdays = [[1, 'Seg'], [2, 'Ter'], [3, 'Qua'], [4, 'Qui'], [5, 'Sex'], [6, 'Sáb'], [0, 'Dom']]

export default function AdminConfig() {
  const [units, setUnits] = useState([])
  const [services, setServices] = useState([])
  const [resources, setResources] = useState([])
  const [blocks, setBlocks] = useState([])
  const [panels, setPanels] = useState([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [unitForm, setUnitForm] = useState({ name: '', address: '' })
  const [serviceForm, setServiceForm] = useState({
    id: '', unitName: '', name: '', durationMinutes: 30, slotIntervalMinutes: 30, capacity: 1,
    start: '08:00', end: '17:00', lunch: true, lunchStart: '12:00', lunchEnd: '13:00',
    days: [1, 2, 3, 4, 5], attendantIds: [], newAttendant: '', newAttendantEmail: '',
    landingBannerUrl: '', landingAddress: '', bookingFrom: '', bookingUntil: '', description: '',
    panelSlug: '', panelPrefix: 'AG', panelLocationType: 'Guichê',
  })
  const [resourceForm, setResourceForm] = useState({ unitId: '', name: '', email: '', type: 'attendant' })
  const [blockForm, setBlockForm] = useState({ unitId: '', scope: 'unit', resourceId: '', startsAt: '', endsAt: '', category: 'holiday', reason: '' })
  const [holidayMonth, setHolidayMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [selectedHolidayDates, setSelectedHolidayDates] = useState([])
  const [panel, setPanel] = useState(1)
  const [share, setShare] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [editingAttendant, setEditingAttendant] = useState(null)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const [unitData, serviceData, resourceData, blockData, panelData] = await Promise.all([
        api('/api/agenda/admin/units'),
        api('/api/agenda/admin/services'),
        api('/api/agenda/admin/resources'),
        api('/api/agenda/admin/schedule-blocks'),
        api('/api/agenda/panels').catch(() => ({ items: [] })),
      ])
      setUnits(unitData.items)
      setServices(serviceData.items)
      setResources(resourceData.items)
      setBlocks(blockData.items)
      setPanels(panelData.items || [])
      if (unitData.items[0]) {
        setResourceForm((form) => ({ ...form, unitId: form.unitId || unitData.items[0]._id }))
        setBlockForm((form) => ({ ...form, unitId: form.unitId || unitData.items[0]._id }))
        setServiceForm((form) => ({ ...form, unitName: form.unitName || unitData.items[0].name }))
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function saveUnit(name, address = '') {
    const existing = findByName(units, name)
    if (existing) {
      if (address && address !== existing.address) {
        const updated = await api(`/api/agenda/admin/units/${existing._id}`, {
          method: 'PATCH',
          body: JSON.stringify({ address: address.trim() }),
        })
        return updated.unit
      }
      return existing
    }
    const created = await api('/api/agenda/admin/units', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), slug: slugify(name), address: address.trim() }),
    })
    return created.unit
  }

  async function createUnit(event) {
    event.preventDefault()
    setBusy(true)
    try {
      if (findByName(units, unitForm.name)) setMessage('Essa unidade já está cadastrada.')
      else {
        await saveUnit(unitForm.name, unitForm.address)
        setUnitForm({ name: '', address: '' })
        setMessage('Unidade cadastrada.')
        setPanel(2)
      }
      await load()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function ensureAttendant(unitId, name, email = '') {
    const existing = resources.find((item) => item.type === 'attendant' && String(item.unitId?._id || item.unitId) === String(unitId) && findByName([item], name))
    if (existing) {
      if (email && email.trim().toLowerCase() !== (existing.email || '')) {
        const updated = await api(`/api/agenda/admin/resources/${existing._id}`, {
          method: 'PATCH',
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        })
        return updated.resource
      }
      return existing
    }
    const result = await api('/api/agenda/admin/resources', {
      method: 'POST',
      body: JSON.stringify({
        unitId,
        name: name.trim(),
        slug: slugify(name),
        type: 'attendant',
        email: email.trim().toLowerCase(),
      }),
    })
    return result.resource
  }

  function editService(item) {
    const lunch = lunchFromAvailability(item.weeklyAvailability)
    const first = item.weeklyAvailability?.[0]
    setServiceForm({
      id: item._id,
      unitName: item.unitId?.name || serviceForm.unitName,
      name: item.name,
      durationMinutes: item.durationMinutes,
      slotIntervalMinutes: item.slotIntervalMinutes,
      capacity: item.capacity,
      start: first?.periods?.[0]?.start || '08:00',
      end: first?.periods?.[first.periods.length - 1]?.end || '17:00',
      lunch: lunch.enabled,
      lunchStart: lunch.start,
      lunchEnd: lunch.end,
      days: (item.weeklyAvailability || []).map((entry) => entry.dayOfWeek),
      attendantIds: (item.resourceIds || []).map((resource) => String(resource._id || resource)),
      newAttendant: '',
      newAttendantEmail: '',
      landingBannerUrl: item.landingBannerUrl || '',
      landingAddress: item.landingAddress || '',
      bookingFrom: item.bookingFrom || '',
      bookingUntil: item.bookingUntil || '',
      description: item.description || '',
      panelSlug: item.panelSlug || '',
      panelPrefix: item.panelPrefix || 'AG',
      panelLocationType: item.panelLocationType || 'Guichê',
    })
    setPanel(2)
    setMessage(`Editando ${item.name}.`)
  }

  async function saveService(event) {
    event.preventDefault()
    const hoursError = validateDaySchedule(serviceForm.start, serviceForm.end, { enabled: serviceForm.lunch, start: serviceForm.lunchStart, end: serviceForm.lunchEnd })
    if (hoursError) return setMessage(hoursError)
    if (!serviceForm.days.length) return setMessage('Selecione ao menos um dia de atendimento.')
    setBusy(true)
    try {
      const unit = await saveUnit(serviceForm.unitName)
      let attendantIds = [...serviceForm.attendantIds]
      if (serviceForm.newAttendant.trim()) {
        const created = await ensureAttendant(unit._id, serviceForm.newAttendant, serviceForm.newAttendantEmail)
        attendantIds = [...new Set([...attendantIds, String(created._id)])]
      }
      const payload = {
        unitId: unit._id,
        name: serviceForm.name.trim(),
        slug: slugify(serviceForm.name),
        durationMinutes: Number(serviceForm.durationMinutes),
        slotIntervalMinutes: Number(serviceForm.slotIntervalMinutes),
        capacity: Number(serviceForm.capacity),
        resourceRequired: attendantIds.length > 0,
        resourceIds: attendantIds,
        weeklyAvailability: buildWeeklyAvailability(
          serviceForm.days,
          serviceForm.start,
          serviceForm.end,
          serviceForm.lunch ? { start: serviceForm.lunchStart, end: serviceForm.lunchEnd } : null,
        ),
        landingBannerUrl: (serviceForm.landingBannerUrl || '').trim(),
        landingAddress: serviceForm.landingAddress.trim(),
        bookingFrom: serviceForm.bookingFrom,
        bookingUntil: serviceForm.bookingUntil,
        description: serviceForm.description.trim(),
        panelSlug: (serviceForm.panelSlug || '').trim(),
        panelPrefix: (serviceForm.panelPrefix || 'AG').trim().toUpperCase(),
        panelLocationType: (serviceForm.panelLocationType || 'Guichê').trim(),
      }
      let serviceId = serviceForm.id
      if (serviceForm.id) {
        await api(`/api/agenda/admin/services/${serviceForm.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        setMessage(`✅ Serviço "${serviceForm.name.trim()}" atualizado com sucesso!`)
      } else {
        const duplicate = services.find((item) => String(item.unitId?._id || item.unitId) === String(unit._id) && findByName([item], serviceForm.name))
        if (duplicate) {
          setMessage('Esse serviço já existe. Clique nele para editar almoço e atendentes.')
          await load()
          return
        }
        const created = await api('/api/agenda/admin/services', { method: 'POST', body: JSON.stringify(payload) })
        serviceId = created.service?._id
        setMessage(`✅ Serviço "${serviceForm.name.trim()}" cadastrado com sucesso!`)
      }
      if (bannerFile && serviceId) {
        const body = new FormData()
        body.append('banner', bannerFile)
        await apiUpload(`/api/agenda/admin/services/${serviceId}/banner`, body)
        setBannerFile(null)
      }
      setShare({ unitSlug: unit.slug, serviceSlug: slugify(serviceForm.name), serviceName: serviceForm.name.trim() })
      if (!serviceForm.id) {
        setServiceForm((form) => ({ ...form, id: '', name: '', newAttendant: '', attendantIds }))
      }
      await load()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function toggle(path, active) {
    try {
      await api(path, { method: 'PATCH', body: JSON.stringify({ active }) })
      await load()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function createResource(event) {
    event.preventDefault()
    try {
      await api('/api/agenda/admin/resources', { method: 'POST', body: JSON.stringify(resourceForm) })
      setResourceForm((form) => ({ ...form, name: '' }))
      setMessage('Recurso cadastrado.')
      await load()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function createBlock(event) {
    event.preventDefault()
    try {
      const payload = { ...blockForm, startsAt: new Date(blockForm.startsAt).toISOString(), endsAt: new Date(blockForm.endsAt).toISOString() }
      if (payload.scope === 'unit') delete payload.resourceId
      await api('/api/agenda/admin/schedule-blocks', { method: 'POST', body: JSON.stringify(payload) })
      setBlockForm((form) => ({ ...form, startsAt: '', endsAt: '', reason: '' }))
      setMessage('Bloqueio criado.')
      await load()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function createDayClosures(event) {
    event.preventDefault()
    if (!blockForm.unitId || !selectedHolidayDates.length || !blockForm.reason.trim()) {
      setMessage('Selecione a unidade, ao menos um dia e informe o motivo.')
      return
    }
    const dates = [...selectedHolidayDates].sort()
    if (!window.confirm(`Fechar ${dates.length} dia(s) para novos agendamentos? Agendamentos já existentes não serão cancelados.`)) return
    setBusy(true)
    let created = 0
    try {
      for (const date of dates) {
        await api('/api/agenda/admin/schedule-blocks', {
          method: 'POST',
          body: JSON.stringify({
            unitId: blockForm.unitId,
            scope: 'unit',
            category: blockForm.category,
            reason: blockForm.reason.trim(),
            ...fullDayRange(date),
          }),
        })
        created += 1
      }
      setSelectedHolidayDates([])
      setBlockForm((form) => ({ ...form, reason: '' }))
      setMessage(`${created} dia(s) marcado(s) como sem expediente.`)
      await load()
    } catch (error) {
      setMessage(created ? `${created} dia(s) foram salvos. O processo parou: ${error.message}` : error.message)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const blockedHolidayDates = blockedDatesForUnit(blocks, blockForm.unitId, holidayMonth)
  const calendarDays = monthDays(holidayMonth)
  const toggleHolidayDate = (date) => {
    if (blockedHolidayDates.has(date)) return
    setSelectedHolidayDates((current) => current.includes(date)
      ? current.filter((item) => item !== date)
      : [...current, date])
  }

  return (
    <section className="catalog" aria-label="Catálogo da Agenda">
      <nav className="stepper" aria-label="Passos do catálogo">
        <button type="button" className={units.length ? 'done' : ''} aria-current={panel === 1 ? 'step' : undefined} onClick={() => setPanel(1)}>
          <span className="n">1</span>Unidade<small>{units.length ? `${units.length} cadastrada(s)` : 'Local de atendimento'}</small>
        </button>
        <button type="button" className={services.length ? 'done' : ''} disabled={!units.length} aria-current={panel === 2 ? 'step' : undefined} onClick={() => units.length && setPanel(2)}>
          <span className="n">2</span>Serviço<small>{services.length ? `${services.length} cadastrado(s)` : 'O que o cidadão agenda'}</small>
        </button>
        <button type="button" disabled={!units.length} aria-current={panel === 3 ? 'step' : undefined} onClick={() => units.length && setPanel(3)}>
          <span className="n">3</span>Feriados<small>Folga pontual da unidade</small>
        </button>
      </nav>

      <div className="card panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">Gestão</p>
            <h2>{panel === 1 ? 'Cadastrar unidade' : panel === 2 ? 'Serviço, horário e equipe' : 'Feriados'}</h2>
          </div>
          <button className="dark" disabled={busy} onClick={load}>Atualizar</button>
        </div>
        {message && <p role="status" className="notice">{message}</p>}
        <datalist id="unit-history">{units.map((item) => <option key={item._id} value={item.name} />)}</datalist>
        <datalist id="service-history">{services.map((item) => <option key={item._id} value={item.name} />)}</datalist>

        {panel === 1 && (
          <>
            <p className="form-help">Diga o local. Ex.: Paço Municipal. Em seguida o passo Serviço é liberado.</p>
            {units.map((item) => (
              <article className="config-row" key={item._id}>
                <span><strong>{item.name}</strong><small>{item.address || 'Sem endereço'}</small></span>
                <button className={item.active ? 'danger' : ''} onClick={() => toggle(`/api/agenda/admin/units/${item._id}`, !item.active)}>{item.active ? 'Desativar' : 'Ativar'}</button>
              </article>
            ))}
            <form onSubmit={createUnit}>
              <label>Nome da unidade
                <input list="unit-history" required maxLength="160" placeholder="Ex.: Paço Municipal" value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} />
              </label>
              <label>Endereço (opcional)
                <input maxLength="300" placeholder="Rua, número, bairro" value={unitForm.address} onChange={(e) => setUnitForm({ ...unitForm, address: e.target.value })} />
              </label>
              <div className="form-actions">
                <button disabled={busy}>Salvar e ir ao serviço</button>
              </div>
            </form>
          </>
        )}

        {panel === 2 && (
          <>
            {/* Cabeçalho do Formulário de Serviço */}
            <div className="section-title" style={{ marginTop: '.5rem', marginBottom: '1rem', alignItems: 'center' }}>
              <div>
                <p className="eyebrow">{serviceForm.id ? 'Modo de Edição' : 'Novo Cadastro'}</p>
                <h3 style={{ margin: 0 }}>
                  {serviceForm.id ? `✏️ Editando: ${serviceForm.name}` : '➕ Cadastrar Novo Serviço'}
                </h3>
              </div>
              {serviceForm.id && (
                <button
                  type="button"
                  className="ghost small-btn"
                  style={{ background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', fontWeight: 700 }}
                  onClick={() => {
                    setServiceForm({
                      id: '',
                      unitName: units[0]?.name || '',
                      name: '',
                      durationMinutes: 30,
                      slotIntervalMinutes: 30,
                      capacity: 1,
                      start: '08:00',
                      end: '17:00',
                      lunch: true,
                      lunchStart: '12:00',
                      lunchEnd: '13:00',
                      days: [1, 2, 3, 4, 5],
                      attendantIds: [],
                      newAttendant: '',
                      newAttendantEmail: '',
                      landingBannerUrl: '',
                      landingAddress: '',
                      bookingFrom: '',
                      bookingUntil: '',
                      description: '',
                      panelSlug: '',
                      panelPrefix: 'AG',
                      panelLocationType: 'Guichê',
                    })
                    setShare(null)
                    setMessage('Formulário limpo para cadastrar novo serviço.')
                  }}
                >
                  + Criar novo serviço
                </button>
              )}
            </div>

            {/* Formulário de Criação / Edição */}
            <form id="service-form-top" onSubmit={saveService}>
              <label>Unidade
                {units.length > 0 ? (
                  <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
                    <select
                      required
                      value={serviceForm.unitName}
                      onChange={(e) => setServiceForm({ ...serviceForm, unitName: e.target.value })}
                      style={{ flex: 1 }}
                    >
                      <option value="">Selecione a unidade</option>
                      {units.map((u) => (
                        <option key={u._id} value={u.name}>{u.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="ghost small-btn"
                      style={{ whiteSpace: 'nowrap', padding: '.75rem .9rem', background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', fontWeight: 700 }}
                      onClick={() => setPanel(1)}
                      title="Cadastrar nova unidade"
                    >
                      + Nova unidade
                    </button>
                  </div>
                ) : (
                  <input
                    required
                    maxLength="160"
                    placeholder="Ex.: SEDETUR"
                    value={serviceForm.unitName}
                    onChange={(e) => setServiceForm({ ...serviceForm, unitName: e.target.value })}
                  />
                )}
              </label>
              <label>Nome do serviço
                <input required maxLength="160" placeholder="Ex.: Transporte Escolar" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} />
              </label>
              <div className="compact-fields">
                <label>Duração do atendimento (min)<input type="number" required min="5" max="480" value={serviceForm.durationMinutes} onChange={(e) => setServiceForm({ ...serviceForm, durationMinutes: e.target.value })} /></label>
                <label>De quanto em quanto (min)<input type="number" required min="5" max="480" value={serviceForm.slotIntervalMinutes} onChange={(e) => setServiceForm({ ...serviceForm, slotIntervalMinutes: e.target.value })} /></label>
                <label>Vagas simultâneas<input type="number" required min="1" max="20" value={serviceForm.capacity} onChange={(e) => setServiceForm({ ...serviceForm, capacity: e.target.value })} /></label>
              </div>
              <fieldset>
                <legend>Expediente</legend>
                <div className="compact-fields">
                  <label>Abre<input type="time" required value={serviceForm.start} onChange={(e) => setServiceForm({ ...serviceForm, start: e.target.value })} /></label>
                  <label>Fecha<input type="time" required value={serviceForm.end} onChange={(e) => setServiceForm({ ...serviceForm, end: e.target.value })} /></label>
                </div>
                <label className="toggle-row">
                  <input type="checkbox" checked={serviceForm.lunch} onChange={(e) => setServiceForm({ ...serviceForm, lunch: e.target.checked })} />
                  Intervalo de almoço (não agenda nesse período)
                </label>
                {serviceForm.lunch && (
                  <div className="compact-fields">
                    <label>Almoço das<input type="time" required value={serviceForm.lunchStart} onChange={(e) => setServiceForm({ ...serviceForm, lunchStart: e.target.value })} /></label>
                    <label>até<input type="time" required value={serviceForm.lunchEnd} onChange={(e) => setServiceForm({ ...serviceForm, lunchEnd: e.target.value })} /></label>
                  </div>
                )}
                <p className="muted">{serviceForm.lunch ? `Horários livres: ${serviceForm.start}–${serviceForm.lunchStart} e ${serviceForm.lunchEnd}–${serviceForm.end}.` : `Horários livres: ${serviceForm.start}–${serviceForm.end}.`}</p>
              </fieldset>
              <fieldset>
                <legend>Dias</legend>
                <div className="weekday-options">
                  {weekdays.map(([value, label]) => (
                    <label key={value}>
                      <input type="checkbox" checked={serviceForm.days.includes(value)} onChange={(e) => setServiceForm({ ...serviceForm, days: e.target.checked ? [...serviceForm.days, value] : serviceForm.days.filter((day) => day !== value) })} />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Atendentes</legend>
                <p className="form-help">Quem realiza este serviço. Marque a equipe ou cadastre novos atendentes com e-mail de login.</p>
                <div className="staff-grid">
                  {resources.filter((item) => item.active && item.type === 'attendant' && (!findByName(units, serviceForm.unitName) || String(item.unitId?._id || item.unitId) === String(findByName(units, serviceForm.unitName)?._id))).map((item) => (
                    <div key={item._id} className="attendant-row-item">
                      <label className="toggle-row" style={{ margin: 0, flex: 1, minWidth: '160px' }}>
                        <input
                          type="checkbox"
                          checked={serviceForm.attendantIds.includes(String(item._id))}
                          onChange={(e) => setServiceForm({
                            ...serviceForm,
                            attendantIds: e.target.checked
                              ? [...serviceForm.attendantIds, String(item._id)]
                              : serviceForm.attendantIds.filter((id) => id !== String(item._id)),
                          })}
                        />
                        <span>
                          <strong>{item.name}</strong>
                          {item.email ? (
                            <small className="email-tag"> ✉️ {item.email}</small>
                          ) : (
                            <small className="muted"> (sem e-mail)</small>
                          )}
                        </span>
                      </label>
                      <div style={{ display: 'flex', gap: '.35rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="ghost small-btn"
                          style={{ padding: '.3rem .6rem', fontSize: '.78rem', background: '#e2e8f0', color: '#1e293b', border: '1px solid #cbd5e1', fontWeight: 700 }}
                          onClick={() => setEditingAttendant({ id: item._id, name: item.name, email: item.email || '' })}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          className="ghost small-btn danger"
                          style={{ padding: '.3rem .6rem', fontSize: '.78rem', fontWeight: 700 }}
                          onClick={async () => {
                            if (!window.confirm(`Tem certeza que deseja remover o atendente "${item.name}"?`)) return
                            try {
                              await api(`/api/agenda/admin/resources/${item._id}`, { method: 'DELETE' })
                              setServiceForm((form) => ({
                                ...form,
                                attendantIds: form.attendantIds.filter((id) => id !== String(item._id)),
                              }))
                              setMessage(`Atendente "${item.name}" removido com sucesso.`)
                              await load()
                            } catch (err) {
                              setMessage(err.message)
                            }
                          }}
                        >
                          🗑️ Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="compact-fields" style={{ marginTop: '.8rem' }}>
                  <label>Novo atendente (Nome)
                    <input maxLength="160" placeholder="Ex.: Maria Silva" value={serviceForm.newAttendant} onChange={(e) => setServiceForm({ ...serviceForm, newAttendant: e.target.value })} />
                  </label>
                  <label>E-mail de login do servidor
                    <input type="email" maxLength="160" placeholder="maria.silva@garca.sp.gov.br" value={serviceForm.newAttendantEmail} onChange={(e) => setServiceForm({ ...serviceForm, newAttendantEmail: e.target.value })} />
                  </label>
                </div>
                <small className="form-help">Ao informar o e-mail, a conta do servidor terá acesso liberado na aba <b>Atendente</b> para este setor.</small>
              </fieldset>
              <fieldset>
                <legend>Landing pública</legend>
                <BannerField
                  serviceId={serviceForm.id}
                  value={serviceForm.landingBannerUrl}
                  onChangeUrl={(url) => setServiceForm((form) => ({ ...form, landingBannerUrl: url }))}
                  onUploaded={(url) => setServiceForm((form) => ({ ...form, landingBannerUrl: url }))}
                  onFilePicked={setBannerFile}
                />
                <label>Endereço do atendimento<input maxLength="500" value={serviceForm.landingAddress} onChange={(e) => setServiceForm({ ...serviceForm, landingAddress: e.target.value })} placeholder="Rua, número, bairro" /></label>
                <div className="compact-fields">
                  <label>Período de<input type="date" value={serviceForm.bookingFrom} onChange={(e) => setServiceForm({ ...serviceForm, bookingFrom: e.target.value })} /></label>
                  <label>até<input type="date" value={serviceForm.bookingUntil} onChange={(e) => setServiceForm({ ...serviceForm, bookingUntil: e.target.value })} /></label>
                </div>
                <label>Texto da página<input maxLength="2000" value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} /></label>
              </fieldset>
              <fieldset>
                <legend>📺 Painel / TV de Chamada</legend>
                <p className="form-help">Configure em qual TV da recepção este serviço chamará o cidadão com alerta sonoro e voz.</p>
                <label>Painel / TV
                  <select
                    value={serviceForm.panelSlug}
                    onChange={(e) => setServiceForm({ ...serviceForm, panelSlug: e.target.value })}
                  >
                    <option value="">Sem chamada em TV (Somente controle interno)</option>
                    {panels.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        📺 {p.name} {p.unitName ? `— ${p.unitName}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                {serviceForm.panelSlug && (
                  <div className="compact-fields" style={{ marginTop: '.8rem' }}>
                    <label>Sigla da Senha na TV
                      <input
                        maxLength="10"
                        placeholder="Ex.: AG, TE, CAD"
                        value={serviceForm.panelPrefix}
                        onChange={(e) => setServiceForm({ ...serviceForm, panelPrefix: e.target.value.toUpperCase() })}
                      />
                    </label>
                    <label>Tipo de Local Padrão
                      <select
                        value={serviceForm.panelLocationType}
                        onChange={(e) => setServiceForm({ ...serviceForm, panelLocationType: e.target.value })}
                      >
                        <option value="Guichê">Guichê</option>
                        <option value="Mesa">Mesa</option>
                        <option value="Sala">Sala</option>
                        <option value="Consultório">Consultório</option>
                        <option value="Balcão">Balcão</option>
                      </select>
                    </label>
                  </div>
                )}
              </fieldset>
              {message && <p className="notice" style={{ margin: '1rem 0' }}>{message}</p>}
              <div className="form-actions">
                <button type="button" className="dark" onClick={() => setPanel(1)}>Voltar</button>
                <button disabled={busy}>{serviceForm.id ? 'Salvar alterações' : 'Salvar serviço'}</button>
              </div>
            </form>

            {/* Listagem de Serviços Existentes (Abaixo do Formulário) */}
            <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '2px solid var(--line)' }}>
              <div className="section-title" style={{ marginBottom: '.8rem' }}>
                <div>
                  <p className="eyebrow">Catálogo</p>
                  <h3 style={{ margin: 0 }}>Serviços Cadastrados ({services.length})</h3>
                </div>
              </div>
              <p className="form-help">Clique em <b>Editar</b> para carregar os dados no formulário acima ou em <b>Link e QR</b> para compartilhar a página pública.</p>

              {services.map((item) => (
                <article className="config-row" key={item._id} style={{ background: serviceForm.id === item._id ? '#eff6ff' : '#fff', borderColor: serviceForm.id === item._id ? 'var(--brand)' : 'var(--line)' }}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.unitId?.name} · {(item.weeklyAvailability?.[0]?.periods || []).map((period) => `${period.start}–${period.end}`).join(' / ') || 'sem horário'} · {(item.resourceIds || []).length} atendente(s)</small>
                  </span>
                  <div className="actions">
                    <button
                      type="button"
                      className={serviceForm.id === item._id ? '' : 'dark'}
                      onClick={() => {
                        editService(item)
                        document.getElementById('service-form-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                    >
                      {serviceForm.id === item._id ? '✏️ Em edição' : 'Editar'}
                    </button>
                    <button type="button" onClick={() => {
                      editService(item)
                      setShare({ unitSlug: item.unitId?.slug, serviceSlug: item.slug, serviceName: item.name })
                    }}>Link e QR</button>
                    <button className={item.active ? 'danger' : ''} onClick={() => toggle(`/api/agenda/admin/services/${item._id}`, !item.active)}>{item.active ? 'Desativar' : 'Ativar'}</button>
                  </div>
                </article>
              ))}

              {share?.unitSlug && <LandingShare unitSlug={share.unitSlug} serviceSlug={share.serviceSlug} serviceName={share.serviceName} />}
            </div>
          </>
        )}

        {panel === 3 && (
          <>
            <p className="form-help">Selecione um ou mais dias sem expediente. Eles deixarão de oferecer novos horários para todos os serviços da unidade.</p>
            <form className="holiday-manager" onSubmit={createDayClosures}>
              <div className="holiday-toolbar">
                <label>Unidade
                  <select required value={blockForm.unitId} onChange={(e) => { setBlockForm({ ...blockForm, unitId: e.target.value, resourceId: '' }); setSelectedHolidayDates([]) }}>
                    <option value="">Selecione</option>
                    {units.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
                  </select>
                </label>
                <label>Mês
                  <input type="month" value={holidayMonth} onChange={(e) => { setHolidayMonth(e.target.value); setSelectedHolidayDates([]) }} />
                </label>
                <label>Motivo
                  <select value={blockForm.category} onChange={(e) => setBlockForm({ ...blockForm, category: e.target.value })}>
                    <option value="holiday">Feriado</option>
                    <option value="pause">Ponto facultativo</option>
                    <option value="maintenance">Manutenção</option>
                    <option value="other">Outro</option>
                  </select>
                </label>
              </div>
              <div className="holiday-calendar" aria-label={`Calendário ${holidayMonth}`}>
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => <strong className="weekday" key={day}>{day}</strong>)}
                {calendarDays.map((item) => item.placeholder
                  ? <span key={item.key} />
                  : <button key={item.date} type="button" disabled={!blockForm.unitId || blockedHolidayDates.has(item.date)} className={`${selectedHolidayDates.includes(item.date) ? 'selected' : ''} ${blockedHolidayDates.has(item.date) ? 'blocked' : ''}`} onClick={() => toggleHolidayDate(item.date)} aria-pressed={selectedHolidayDates.includes(item.date)} title={blockedHolidayDates.has(item.date) ? 'Dia já bloqueado' : `Selecionar ${item.date}`}><span>{item.day}</span><small>{blockedHolidayDates.has(item.date) ? 'Fechado' : selectedHolidayDates.includes(item.date) ? 'Selecionado' : ''}</small></button>)}
              </div>
              <div className="holiday-legend"><span><i className="legend-selected" /> Selecionado</span><span><i className="legend-blocked" /> Sem expediente</span></div>
              <label>Descrição do fechamento<input required maxLength="500" placeholder="Ex.: Feriado municipal" value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} /></label>
              <div className="holiday-warning"><strong>Atenção:</strong> o bloqueio impede novas reservas, mas não cancela agendamentos já existentes. Confira a Central de atendimento após salvar.</div>
              <div className="form-actions"><button type="button" className="dark" onClick={() => setPanel(2)}>Voltar</button><button disabled={busy || !selectedHolidayDates.length}>{busy ? 'Salvando…' : `Bloquear ${selectedHolidayDates.length || ''} dia(s)`}</button></div>
            </form>
            <div className="section-title holiday-list-title"><div><p className="eyebrow">Histórico ativo</p><h3>Dias e períodos bloqueados</h3></div></div>
            {blocks.map((item) => (
              <article className="config-row" key={item._id}>
                <span><strong>{item.reason}</strong><small>{new Date(item.startsAt).toLocaleString('pt-BR')} até {new Date(item.endsAt).toLocaleString('pt-BR')}</small></span>
                <button className="danger" onClick={async () => { await api(`/api/agenda/admin/schedule-blocks/${item._id}/revoke`, { method: 'PATCH' }); await load() }}>Revogar</button>
              </article>
            ))}
            <details className="advanced-block"><summary>Bloqueio avançado por horário ou atendente</summary><form onSubmit={createBlock}>
              <label>Unidade
                <select required value={blockForm.unitId} onChange={(e) => setBlockForm({ ...blockForm, unitId: e.target.value, resourceId: '' })}>
                  <option value="">Selecione</option>
                  {units.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
                </select>
              </label>
              <div className="compact-fields">
                <label>Escopo
                  <select value={blockForm.scope} onChange={(e) => setBlockForm({ ...blockForm, scope: e.target.value, resourceId: '' })}>
                    <option value="unit">Unidade inteira</option>
                    <option value="resource">Recurso</option>
                  </select>
                </label>
                {blockForm.scope === 'resource' && (
                  <label>Recurso
                    <select required value={blockForm.resourceId} onChange={(e) => setBlockForm({ ...blockForm, resourceId: e.target.value })}>
                      <option value="">Selecione</option>
                      {resources.filter((item) => item.active && item.unitId?._id === blockForm.unitId).map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
                    </select>
                  </label>
                )}
                <label>Categoria
                  <select value={blockForm.category} onChange={(e) => setBlockForm({ ...blockForm, category: e.target.value })}>
                    <option value="holiday">Feriado</option>
                    <option value="vacation">Férias</option>
                    <option value="pause">Pausa</option>
                    <option value="maintenance">Manutenção</option>
                    <option value="other">Outro</option>
                  </select>
                </label>
              </div>
              <div className="compact-fields">
                <label>Início<input type="datetime-local" required value={blockForm.startsAt} onChange={(e) => setBlockForm({ ...blockForm, startsAt: e.target.value })} /></label>
                <label>Fim<input type="datetime-local" required value={blockForm.endsAt} onChange={(e) => setBlockForm({ ...blockForm, endsAt: e.target.value })} /></label>
              </div>
              <label>Motivo<input required maxLength="500" value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })} /></label>
              <div className="form-actions">
                <button type="button" className="dark" onClick={() => setPanel(2)}>Voltar</button>
                <button disabled={!units.length}>Criar bloqueio</button>
              </div>
            </form></details>
          </>
        )}
      </div>

      {/* Modal de Edição do Atendente */}
      {editingAttendant && (
        <div className="modal-backdrop" onClick={() => setEditingAttendant(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="section-title" style={{ marginBottom: '1rem', alignItems: 'center' }}>
              <div>
                <p className="eyebrow">Equipe e Acessos</p>
                <h3 style={{ margin: 0 }}>✏️ Editar Atendente</h3>
              </div>
              <button
                type="button"
                className="ghost small-btn"
                style={{ background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', fontWeight: 700 }}
                onClick={() => setEditingAttendant(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault()
              try {
                await api(`/api/agenda/admin/resources/${editingAttendant.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({
                    name: editingAttendant.name.trim(),
                    email: (editingAttendant.email || '').trim().toLowerCase(),
                  }),
                })
                setMessage(`Atendente "${editingAttendant.name}" atualizado com sucesso.`)
                setEditingAttendant(null)
                await load()
              } catch (err) {
                setMessage(err.message)
              }
            }}>
              <label>
                Nome do atendente
                <input
                  type="text"
                  required
                  maxLength="160"
                  placeholder="Ex.: Carlos Junior"
                  value={editingAttendant.name}
                  onChange={(e) => setEditingAttendant({ ...editingAttendant, name: e.target.value })}
                />
              </label>

              <label>
                E-mail de login do servidor
                <input
                  type="email"
                  maxLength="160"
                  placeholder="servidor@garca.sp.gov.br"
                  value={editingAttendant.email}
                  onChange={(e) => setEditingAttendant({ ...editingAttendant, email: e.target.value })}
                />
              </label>
              <small className="form-help">Ao cadastrar o e-mail, a conta do servidor terá acesso liberado na aba <b>Atendente</b>.</small>

              <div className="form-actions" style={{ marginTop: '1.4rem', justifyContent: 'flex-end' }}>
                <button type="button" className="dark" onClick={() => setEditingAttendant(null)}>Cancelar</button>
                <button type="submit">Salvar alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
