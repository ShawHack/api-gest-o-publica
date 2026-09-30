import api from '../utils/api'

const BASE = '/forms-garca'

export const listForms = async (params) => {
  const query = typeof params === 'string' ? { status: params } : (params || {})
  return (await api.get(`${BASE}/forms`, { params: query })).data
}

export const getForm = async (id) => (await api.get(`${BASE}/forms/${id}`)).data

export const getFormDashboard = async (id) => {
  try {
    return (await api.get(`${BASE}/forms/${id}/dashboard`)).data
  } catch (err) {
    // Apenas realiza agregação se o backend retornar 404 (rota não implementada)
    if (err?.response?.status !== 404) {
      throw err
    }
    const [formRes, inscRes] = await Promise.all([
      getForm(id),
      listInscriptions({ formId: id }),
    ])
    const event = formRes.form || formRes
    const items = inscRes.inscriptions || inscRes || []
    const confirmados = items.filter((i) => i.status === 'confirmado').length
    const pendentes = items.filter((i) => i.status === 'pendente').length
    const cancelados = items.filter((i) => i.status === 'cancelado').length
    const limite = Number(event.limiteInscricoes) || null
    const vagasOcupadas = items.length
    const vagasRestantes = limite ? Math.max(0, limite - vagasOcupadas) : null

    return {
      event,
      indicators: {
        totalInscritos: items.length,
        confirmados,
        pendentes,
        cancelados,
        limite,
        vagasOcupadas,
        vagasRestantes,
      },
      alerts: [],
    }
  }
}

export const createForm = async (payload) => (await api.post(`${BASE}/forms`, payload)).data
export const updateForm = async (id, payload) => (await api.put(`${BASE}/forms/${id}`, payload)).data

export const duplicateForm = async (id) => {
  try {
    return (await api.post(`${BASE}/forms/${id}/duplicate`)).data
  } catch (err) {
    if (err?.response?.status !== 404) {
      throw err
    }
    const source = await getForm(id)
    const baseData = source.form || source
    const { _id, createdAt, updatedAt, __v, ...rest } = baseData
    return await createForm({
      ...rest,
      titulo: `${rest.titulo} (Cópia)`,
      status: 'rascunho',
      publicado: false,
    })
  }
}

export const publishForm = async (id) => {
  try {
    return (await api.post(`${BASE}/forms/${id}/publish`)).data
  } catch (err) {
    if (err?.response?.status !== 404) {
      throw err
    }
    return await updateForm(id, { status: 'aberto', publicado: true })
  }
}

export const archiveForm = async (id) => {
  try {
    return (await api.post(`${BASE}/forms/${id}/archive`)).data
  } catch (err) {
    if (err?.response?.status !== 404) {
      throw err
    }
    return await updateForm(id, { status: 'arquivado' })
  }
}

export const deleteForm = async (id) => (await api.delete(`${BASE}/forms/${id}`)).data
export const getStatistics = async () => (await api.get(`${BASE}/forms/statistics`)).data

export const listInscriptions = async (params) => {
  const query = typeof params === 'string' ? { formId: params } : (params || {})
  return (await api.get(`${BASE}/inscriptions`, { params: query })).data
}

export const getInscription = async (id) => (await api.get(`${BASE}/inscriptions/${id}`)).data
export const createInscription = async (payload) => (await api.post(`${BASE}/inscriptions`, payload)).data
export const updateInscription = async (id, payload) => (await api.put(`${BASE}/inscriptions/${id}`, payload)).data
export const deleteInscription = async (id) => (await api.delete(`${BASE}/inscriptions/${id}`)).data
export const isUserInscribed = async (formId, userId) => (await api.get(`${BASE}/inscriptions/check`, { params: { formId, userId } })).data

export const getPublicEvent = async (slug) => (await api.get(`${BASE}/public/forms/${slug}`)).data
export const publicInscribe = async (slug, payload) => (await api.post(`${BASE}/public/forms/${slug}/inscribe`, payload)).data
export const getPublicVoucher = async (voucherCode) => (await api.get(`${BASE}/public/vouchers/${voucherCode}`)).data

export const uploadFile = async (file) => {
  const data = new FormData()
  data.append('file', file)
  return (await api.post(`${BASE}/upload`, data, { headers: { 'Content-Type': 'multipart/form-data' } })).data
}

export const publicUpload = async (file) => {
  const data = new FormData()
  data.append('file', file)
  return (await api.post(`${BASE}/public/upload`, data, { headers: { 'Content-Type': 'multipart/form-data' } })).data
}

export const updateInscriptionStatus = async (id, status) => {
  try {
    return (await api.patch(`${BASE}/inscriptions/${id}/status`, { status })).data
  } catch (err) {
    if (err?.response?.status !== 404) {
      throw err
    }
    return await updateInscription(id, { status })
  }
}
