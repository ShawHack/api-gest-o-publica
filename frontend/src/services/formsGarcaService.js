import api from '../utils/api'

const BASE = '/forms-garca'

export const listForms = async (params) => {
  const query = typeof params === 'string' ? { status: params } : (params || {})
  return (await api.get(`${BASE}/forms`, { params: query })).data
}

export const getForm = async (id) => (await api.get(`${BASE}/forms/${id}`)).data
export const getFormDashboard = async (id) => (await api.get(`${BASE}/forms/${id}/dashboard`)).data
export const createForm = async (payload) => (await api.post(`${BASE}/forms`, payload)).data
export const updateForm = async (id, payload) => (await api.put(`${BASE}/forms/${id}`, payload)).data
export const duplicateForm = async (id) => (await api.post(`${BASE}/forms/${id}/duplicate`)).data
export const publishForm = async (id) => (await api.post(`${BASE}/forms/${id}/publish`)).data
export const archiveForm = async (id) => (await api.post(`${BASE}/forms/${id}/archive`)).data
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
export const updateInscriptionStatus = async (id, status) => (await api.patch(`${BASE}/inscriptions/${id}/status`, { status })).data

