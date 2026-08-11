import axios from 'axios'
import api from '../utils/api'

const BASE = '/rotas-rurais'

export async function createRuralOwner(payload) {
  const { data } = await api.post(`${BASE}/operator/owners`, payload)
  return data
}

export async function resolveRuralProperty(plusCode) {
  const { data } = await api.get(`${BASE}/operator/properties/resolve`, { params: { plusCode } })
  return data
}

export async function listManagedRuralProperties() {
  const { data } = await api.get(`${BASE}/operator/properties`)
  return data
}

export async function updateManagedRuralProperty(id, payload) {
  const { data } = await api.patch(`${BASE}/operator/properties/${id}`, payload)
  return data
}

export async function deleteManagedRuralProperty(id) {
  const { data } = await api.delete(`${BASE}/operator/properties/${id}`)
  return data
}

function publicApi() {
  const configured = (process.env.REACT_APP_API || '/api').replace(/\/+$/, '')
  return axios.create({ baseURL: configured })
}

function ruralHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

export async function ruralLogin(username, password) {
  const { data } = await publicApi().post(`${BASE}/portal/login`, { username, password })
  return data
}

export async function registerRuralOperator(payload) {
  const { data } = await publicApi().post(`${BASE}/portal/register-operator`, payload)
  return data
}

export async function changeRuralPassword(token, password) {
  const { data } = await publicApi().post(
    `${BASE}/portal/change-password`,
    { password },
    { headers: ruralHeaders(token) },
  )
  return data
}

export async function getRuralProfile(token) {
  const { data } = await publicApi().get(`${BASE}/portal/me`, { headers: ruralHeaders(token) })
  return data
}

export async function saveRuralProfile(token, payload) {
  const { data } = await publicApi().put(`${BASE}/portal/profile`, payload, {
    headers: ruralHeaders(token),
  })
  return data
}

export async function listRuralProperties(status = 'pending_review') {
  const response = await api.get(`${BASE}/properties`, { params: { status } })
  return response.data
}

export async function reviewRuralProperty(id, status) {
  const response = await api.patch(`${BASE}/properties/${id}`, { status })
  return response.data
}

export async function listRuralUsers() {
  const { data } = await api.get(`${BASE}/users`)
  return data
}

export async function createRuralUser(payload) {
  const { data } = await api.post(`${BASE}/users`, payload)
  return data
}

export async function updateRuralUserRole(id, role) {
  const { data } = await api.patch(`${BASE}/users/${id}/role`, { role })
  return data
}
