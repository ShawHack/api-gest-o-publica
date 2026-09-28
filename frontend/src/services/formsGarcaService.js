import api from '../utils/api'

const BASE = '/forms-garca'

export const listForms = async (status) => (await api.get(`${BASE}/forms`, { params: status ? { status } : {} })).data
export const getForm = async (id) => (await api.get(`${BASE}/forms/${id}`)).data
export const createForm = async (payload) => (await api.post(`${BASE}/forms`, payload)).data
export const updateForm = async (id, payload) => (await api.put(`${BASE}/forms/${id}`, payload)).data
export const deleteForm = async (id) => (await api.delete(`${BASE}/forms/${id}`)).data
export const getStatistics = async () => (await api.get(`${BASE}/forms/statistics`)).data
export const listInscriptions = async (formId) => (await api.get(`${BASE}/inscriptions`, { params: formId ? { formId } : {} })).data

